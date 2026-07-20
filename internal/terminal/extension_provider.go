package terminal

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"galaxyterm/internal/extensions"
	"galaxyterm/internal/session"
	"github.com/google/uuid"
)

const (
	terminalSidecarAPIVersion = "v1"
	maxTerminalSidecarFrame   = 16 << 20
	terminalCreateTimeout     = 15 * time.Second
	terminalOperationTimeout  = 5 * time.Second
	terminalCloseTimeout      = 2 * time.Second
)

type terminalSidecarRequest struct {
	APIVersion   string         `json:"apiVersion"`
	Type         string         `json:"type"`
	RequestID    string         `json:"requestId"`
	ProviderType string         `json:"providerType"`
	Operation    string         `json:"operation"`
	Config       map[string]any `json:"config,omitempty"`
	Auth         map[string]any `json:"auth,omitempty"`
	Data         string         `json:"data,omitempty"`
	Cols         uint16         `json:"cols,omitempty"`
	Rows         uint16         `json:"rows,omitempty"`
}

type terminalSidecarFrame struct {
	Type      string                `json:"type"`
	RequestID string                `json:"requestId,omitempty"`
	Event     string                `json:"event,omitempty"`
	Data      string                `json:"data,omitempty"`
	Error     *terminalSidecarError `json:"error,omitempty"`
}

type terminalSidecarError struct {
	Code           string         `json:"code"`
	MessageKey     string         `json:"messageKey,omitempty"`
	DefaultMessage string         `json:"defaultMessage"`
	Details        map[string]any `json:"details,omitempty"`
}

type terminalSidecarResponse struct {
	error *terminalSidecarError
}

type extensionCommandFactory func(context.Context, string) *exec.Cmd

type extensionDriver struct {
	runtimeInfo    extensions.TerminalProviderRuntime
	request        session.CreateSessionRequest
	commandFactory extensionCommandFactory

	mu       sync.Mutex
	command  *exec.Cmd
	stdin    io.WriteCloser
	emit     session.Emitter
	done     chan struct{}
	cancel   context.CancelFunc
	started  bool
	closing  bool
	closed   bool
	closeErr error

	writeMu   sync.Mutex
	pendingMu sync.Mutex
	pending   map[string]chan terminalSidecarResponse
	closeOnce sync.Once
	exitOnce  sync.Once
}

func newExtensionDriver(runtimeInfo extensions.TerminalProviderRuntime, request session.CreateSessionRequest) *extensionDriver {
	return &extensionDriver{
		runtimeInfo: runtimeInfo,
		request:     request,
		commandFactory: func(ctx context.Context, executable string) *exec.Cmd {
			return exec.CommandContext(ctx, executable)
		},
		pending: make(map[string]chan terminalSidecarResponse),
	}
}

func (driver *extensionDriver) Start(parent context.Context, emit session.Emitter) error {
	driver.mu.Lock()
	if driver.started || driver.closed {
		driver.mu.Unlock()
		return fmt.Errorf("terminal extension driver cannot be started twice")
	}
	ctx, cancel := context.WithCancel(parent)
	command := driver.commandFactory(ctx, driver.runtimeInfo.Executable)
	command.Dir = filepath.Dir(driver.runtimeInfo.Executable)
	if len(command.Env) == 0 {
		command.Env = safeTerminalSidecarEnvironment()
	}
	stdin, err := command.StdinPipe()
	if err != nil {
		cancel()
		driver.mu.Unlock()
		return fmt.Errorf("open terminal provider input: %w", err)
	}
	stdout, err := command.StdoutPipe()
	if err != nil {
		cancel()
		driver.mu.Unlock()
		return fmt.Errorf("open terminal provider output: %w", err)
	}
	stderr := &terminalLimitedBuffer{limit: 64 << 10}
	command.Stderr = stderr
	if err := command.Start(); err != nil {
		cancel()
		driver.mu.Unlock()
		return fmt.Errorf("start terminal provider process: %w", err)
	}
	driver.command = command
	driver.stdin = stdin
	driver.emit = emit
	driver.done = make(chan struct{})
	driver.cancel = cancel
	driver.started = true
	driver.mu.Unlock()

	go driver.readFrames(stdout)
	go driver.waitProcess(stderr)

	request := terminalSidecarRequest{
		ProviderType: driver.request.ProviderType,
		Operation:    "create",
		Config:       driver.request.Config,
		Auth:         driver.request.Auth,
	}
	if err := driver.sendRequest(request, terminalCreateTimeout, false); err != nil {
		driver.stopAfterStartFailure()
		return fmt.Errorf("create terminal extension session: %w", err)
	}
	go func() {
		select {
		case <-parent.Done():
			_ = driver.Close()
		case <-driver.done:
		}
	}()
	return nil
}

func (driver *extensionDriver) Send(data string) error {
	return driver.sendRequest(terminalSidecarRequest{
		ProviderType: driver.request.ProviderType,
		Operation:    "send",
		Data:         data,
	}, terminalOperationTimeout, false)
}

func (driver *extensionDriver) Resize(cols uint16, rows uint16) error {
	return driver.sendRequest(terminalSidecarRequest{
		ProviderType: driver.request.ProviderType,
		Operation:    "resize",
		Cols:         cols,
		Rows:         rows,
	}, terminalOperationTimeout, false)
}

func (driver *extensionDriver) Close() error {
	driver.closeOnce.Do(func() {
		driver.mu.Lock()
		if !driver.started || driver.closed {
			driver.closed = true
			driver.mu.Unlock()
			return
		}
		driver.closing = true
		stdin := driver.stdin
		done := driver.done
		command := driver.command
		cancel := driver.cancel
		driver.mu.Unlock()

		request := terminalSidecarRequest{ProviderType: driver.request.ProviderType, Operation: "close"}
		requestErr := driver.sendRequest(request, terminalCloseTimeout, true)
		if stdin != nil {
			_ = stdin.Close()
		}
		select {
		case <-done:
		case <-time.After(terminalCloseTimeout):
			cancel()
			if command != nil && command.Process != nil {
				_ = command.Process.Kill()
			}
			select {
			case <-done:
			case <-time.After(terminalCloseTimeout):
				if requestErr == nil {
					requestErr = fmt.Errorf("terminal provider process did not exit")
				}
			}
		}
		cancel()

		driver.mu.Lock()
		driver.closed = true
		if requestErr != nil && !errors.Is(requestErr, io.EOF) {
			driver.closeErr = requestErr
		}
		driver.mu.Unlock()
	})
	driver.mu.Lock()
	defer driver.mu.Unlock()
	return driver.closeErr
}

func (driver *extensionDriver) sendRequest(request terminalSidecarRequest, timeout time.Duration, allowClosing bool) error {
	driver.mu.Lock()
	if !driver.started || driver.closed || (driver.closing && !allowClosing) || driver.stdin == nil {
		driver.mu.Unlock()
		return fmt.Errorf("terminal provider process is not running")
	}
	stdin := driver.stdin
	done := driver.done
	driver.mu.Unlock()

	request.APIVersion = terminalSidecarAPIVersion
	request.Type = "request"
	request.RequestID = uuid.NewString()
	payload, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("encode terminal provider request: %w", err)
	}
	if len(payload) > maxTerminalSidecarFrame {
		return fmt.Errorf("terminal provider request exceeds %d bytes", maxTerminalSidecarFrame)
	}
	payload = append(payload, '\n')

	response := make(chan terminalSidecarResponse, 1)
	driver.pendingMu.Lock()
	driver.pending[request.RequestID] = response
	driver.pendingMu.Unlock()

	driver.writeMu.Lock()
	_, writeErr := stdin.Write(payload)
	driver.writeMu.Unlock()
	if writeErr != nil {
		driver.removePending(request.RequestID)
		return fmt.Errorf("write terminal provider request: %w", writeErr)
	}

	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case result := <-response:
		if result.error != nil {
			return sidecarSessionError(result.error)
		}
		return nil
	case <-done:
		driver.removePending(request.RequestID)
		return io.EOF
	case <-timer.C:
		driver.removePending(request.RequestID)
		return fmt.Errorf("terminal provider %s request timed out", request.Operation)
	}
}

func (driver *extensionDriver) readFrames(stdout io.Reader) {
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 64<<10), maxTerminalSidecarFrame)
	for scanner.Scan() {
		line := bytes.TrimSpace(scanner.Bytes())
		if len(line) == 0 {
			continue
		}
		var frame terminalSidecarFrame
		if err := json.Unmarshal(line, &frame); err != nil {
			driver.failProtocol(fmt.Errorf("decode terminal provider frame: %w", err))
			return
		}
		switch frame.Type {
		case "response":
			driver.deliverResponse(frame)
		case "event":
			driver.emitFrame(frame)
		default:
			driver.failProtocol(fmt.Errorf("terminal provider returned unknown frame type: %s", frame.Type))
			return
		}
	}
	if err := scanner.Err(); err != nil {
		driver.failProtocol(fmt.Errorf("read terminal provider output: %w", err))
	}
}

func (driver *extensionDriver) deliverResponse(frame terminalSidecarFrame) {
	driver.pendingMu.Lock()
	response := driver.pending[frame.RequestID]
	delete(driver.pending, frame.RequestID)
	driver.pendingMu.Unlock()
	if response != nil {
		response <- terminalSidecarResponse{error: frame.Error}
	}
}

func (driver *extensionDriver) emitFrame(frame terminalSidecarFrame) {
	switch frame.Event {
	case "data":
		driver.emitEvent(session.Event{Type: session.EventData, Data: frame.Data})
	case "status":
		driver.emitEvent(session.Event{Type: session.EventStatus, Data: frame.Data})
	case "error":
		driver.emitEvent(session.Event{Type: session.EventError, Error: sidecarSessionError(frame.Error)})
	case "exit":
		driver.emitExit(frame.Data)
	case "log":
		// Provider logs stay out of the terminal stream to avoid leaking credentials.
	default:
		driver.failProtocol(fmt.Errorf("terminal provider returned unknown event: %s", frame.Event))
	}
}

func (driver *extensionDriver) waitProcess(stderr *terminalLimitedBuffer) {
	driver.mu.Lock()
	command := driver.command
	done := driver.done
	driver.mu.Unlock()
	err := command.Wait()
	close(done)
	driver.failPending()

	driver.mu.Lock()
	closing := driver.closing
	driver.mu.Unlock()
	if closing {
		return
	}
	if stderr.Exceeded() {
		driver.emitError(fmt.Errorf("terminal provider stderr exceeded the allowed size"))
	} else if err != nil {
		driver.emitError(fmt.Errorf("terminal provider process failed: %w", err))
	}
	driver.emitExit("")
}

func (driver *extensionDriver) failProtocol(err error) {
	driver.emitError(err)
	driver.mu.Lock()
	command := driver.command
	closing := driver.closing
	driver.mu.Unlock()
	if !closing && command != nil && command.Process != nil {
		_ = command.Process.Kill()
	}
}

func (driver *extensionDriver) emitError(err error) {
	driver.emitEvent(session.Event{Type: session.EventError, Error: &session.AppError{
		Code: "EXTENSION_PROTOCOL_ERROR", MessageKey: "error.extension.protocol", DefaultMessage: err.Error(), Cause: err,
	}})
}

func (driver *extensionDriver) emitExit(data string) {
	driver.exitOnce.Do(func() {
		driver.emitEvent(session.Event{Type: session.EventExit, Data: data})
	})
}

func (driver *extensionDriver) emitEvent(event session.Event) {
	driver.mu.Lock()
	emit := driver.emit
	driver.mu.Unlock()
	if emit != nil {
		emit(event)
	}
}

func (driver *extensionDriver) removePending(requestID string) {
	driver.pendingMu.Lock()
	delete(driver.pending, requestID)
	driver.pendingMu.Unlock()
}

func (driver *extensionDriver) failPending() {
	driver.pendingMu.Lock()
	driver.pending = make(map[string]chan terminalSidecarResponse)
	driver.pendingMu.Unlock()
}

func (driver *extensionDriver) stopAfterStartFailure() {
	driver.mu.Lock()
	driver.closing = true
	stdin := driver.stdin
	command := driver.command
	done := driver.done
	cancel := driver.cancel
	driver.mu.Unlock()
	if stdin != nil {
		_ = stdin.Close()
	}
	if command != nil && command.Process != nil {
		_ = command.Process.Kill()
	}
	cancel()
	select {
	case <-done:
	case <-time.After(terminalCloseTimeout):
	}
	driver.mu.Lock()
	driver.closed = true
	driver.mu.Unlock()
}

func sidecarSessionError(value *terminalSidecarError) *session.AppError {
	if value == nil {
		return &session.AppError{
			Code: "EXTENSION_PROVIDER_ERROR", MessageKey: "error.extension.provider", DefaultMessage: "terminal extension provider error",
		}
	}
	code := strings.TrimSpace(value.Code)
	if code == "" {
		code = "EXTENSION_PROVIDER_ERROR"
	}
	message := strings.TrimSpace(value.DefaultMessage)
	if message == "" {
		message = "terminal extension provider error"
	}
	return &session.AppError{Code: code, MessageKey: value.MessageKey, DefaultMessage: message, Details: value.Details}
}

func safeTerminalSidecarEnvironment() []string {
	keys := []string{"HOME", "LANG", "LC_ALL", "PATH", "SystemRoot", "TEMP", "TMP", "TMPDIR", "USERPROFILE", "WINDIR"}
	environment := make([]string, 0, len(keys)+1)
	for _, key := range keys {
		if value, ok := os.LookupEnv(key); ok {
			environment = append(environment, key+"="+value)
		}
	}
	return append(environment, "GALAXYTERM_EXTENSION_API_VERSION="+terminalSidecarAPIVersion)
}

type terminalLimitedBuffer struct {
	mu       sync.Mutex
	buffer   bytes.Buffer
	exceeded bool
	limit    int
}

func (buffer *terminalLimitedBuffer) Write(value []byte) (int, error) {
	buffer.mu.Lock()
	defer buffer.mu.Unlock()
	remaining := buffer.limit - buffer.buffer.Len()
	if remaining <= 0 {
		buffer.exceeded = true
		return len(value), nil
	}
	if len(value) > remaining {
		buffer.exceeded = true
		_, _ = buffer.buffer.Write(value[:remaining])
		return len(value), nil
	}
	return buffer.buffer.Write(value)
}

func (buffer *terminalLimitedBuffer) Exceeded() bool {
	buffer.mu.Lock()
	defer buffer.mu.Unlock()
	return buffer.exceeded
}
