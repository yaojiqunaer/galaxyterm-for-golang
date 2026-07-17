package files

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"galaxyterm/internal/extensions"
	"github.com/google/uuid"
)

const (
	fileProviderAPIVersion = "v1"
	maxSidecarMessageSize  = 16 << 20
)

type sidecarRequest struct {
	APIVersion      string         `json:"apiVersion"`
	RequestID       string         `json:"requestId"`
	ProviderType    string         `json:"providerType"`
	Operation       string         `json:"operation"`
	Config          map[string]any `json:"config,omitempty"`
	Auth            map[string]any `json:"auth,omitempty"`
	Path            string         `json:"path,omitempty"`
	DestinationPath string         `json:"destinationPath,omitempty"`
	Content         string         `json:"content,omitempty"`
	LocalPath       string         `json:"localPath,omitempty"`
	Features        []string       `json:"features,omitempty"`
}

type sidecarResponse struct {
	Type      string           `json:"type,omitempty"`
	RequestID string           `json:"requestId"`
	Result    json.RawMessage  `json:"result,omitempty"`
	Error     *ProviderError   `json:"error,omitempty"`
	Progress  *sidecarProgress `json:"progress,omitempty"`
}

type sidecarProgress struct {
	Bytes int64 `json:"bytes"`
	Total int64 `json:"total,omitempty"`
}

func runSidecar(
	runtimeInfo extensions.FileProviderRuntime,
	operation string,
	request FileOperationRequest,
	result any,
	timeout time.Duration,
) error {
	return runSidecarWithContext(context.Background(), runtimeInfo, operation, request, result, timeout, nil)
}

func runSidecarWithContext(
	parent context.Context,
	runtimeInfo extensions.FileProviderRuntime,
	operation string,
	request FileOperationRequest,
	result any,
	timeout time.Duration,
	onProgress func(sidecarProgress),
) error {
	message := sidecarRequest{
		APIVersion:      fileProviderAPIVersion,
		RequestID:       uuid.NewString(),
		ProviderType:    request.ProviderType,
		Operation:       operation,
		Config:          request.Config,
		Auth:            request.Auth,
		Path:            request.Path,
		DestinationPath: request.DestinationPath,
		Content:         request.Content,
		LocalPath:       request.localPath,
		Features:        []string{"transfer-progress-v1"},
	}
	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("encode file provider request: %w", err)
	}
	if len(payload) > maxSidecarMessageSize {
		return fmt.Errorf("file provider request exceeds %d bytes", maxSidecarMessageSize)
	}
	payload = append(payload, '\n')

	ctx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	command := exec.CommandContext(ctx, runtimeInfo.Executable)
	command.Dir = filepath.Dir(runtimeInfo.Executable)
	command.Env = safeSidecarEnvironment()
	command.Stdin = bytes.NewReader(payload)
	stdout, err := command.StdoutPipe()
	if err != nil {
		return fmt.Errorf("open file provider output: %w", err)
	}
	stderr := newLimitedBuffer(64 << 10)
	command.Stderr = stderr
	if err := command.Start(); err != nil {
		return fmt.Errorf("start file provider process: %w", err)
	}

	var response sidecarResponse
	foundResponse := false
	outputSize := 0
	lastProgressBytes := int64(0)
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 64<<10), maxSidecarMessageSize)
	for scanner.Scan() {
		line := bytes.TrimSpace(scanner.Bytes())
		if len(line) == 0 {
			continue
		}
		outputSize += len(line) + 1
		if outputSize > maxSidecarMessageSize {
			_ = command.Process.Kill()
			_ = command.Wait()
			return fmt.Errorf("file provider output exceeded the allowed size")
		}
		var frame sidecarResponse
		if err := json.Unmarshal(line, &frame); err != nil {
			_ = command.Process.Kill()
			_ = command.Wait()
			return fmt.Errorf("decode file provider response: %w", err)
		}
		if frame.RequestID != message.RequestID {
			_ = command.Process.Kill()
			_ = command.Wait()
			return ErrMismatchedResponse
		}
		if frame.Type == "progress" {
			if frame.Progress == nil ||
				frame.Progress.Bytes < lastProgressBytes ||
				frame.Progress.Total < 0 ||
				(frame.Progress.Total > 0 && frame.Progress.Bytes > frame.Progress.Total) {
				_ = command.Process.Kill()
				_ = command.Wait()
				return fmt.Errorf("invalid transfer progress from file provider")
			}
			lastProgressBytes = frame.Progress.Bytes
			if onProgress != nil {
				onProgress(*frame.Progress)
			}
			continue
		}
		if foundResponse {
			_ = command.Process.Kill()
			_ = command.Wait()
			return fmt.Errorf("file provider returned multiple final responses")
		}
		response = frame
		foundResponse = true
	}
	if scanErr := scanner.Err(); scanErr != nil {
		_ = command.Process.Kill()
		_ = command.Wait()
		return fmt.Errorf("read file provider output: %w", scanErr)
	}
	runErr := command.Wait()
	if errors.Is(parent.Err(), context.Canceled) {
		return ErrTransferCanceled
	}
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return ErrProviderTimeout
	}
	if stderr.exceeded {
		return fmt.Errorf("file provider output exceeded the allowed size")
	}
	if runErr != nil {
		return fmt.Errorf("file provider process failed: %w", runErr)
	}
	if !foundResponse {
		return fmt.Errorf("file provider returned no final response")
	}
	if response.Error != nil {
		return response.Error
	}
	if result == nil || len(response.Result) == 0 || bytes.Equal(response.Result, []byte("null")) {
		return nil
	}
	if err := json.Unmarshal(response.Result, result); err != nil {
		return fmt.Errorf("decode file provider result: %w", err)
	}
	return nil
}

func safeSidecarEnvironment() []string {
	keys := []string{
		"HOME", "LANG", "LC_ALL", "PATH", "SystemRoot", "TEMP", "TMP", "TMPDIR", "USERPROFILE", "WINDIR",
	}
	environment := make([]string, 0, len(keys)+1)
	for _, key := range keys {
		if value, ok := os.LookupEnv(key); ok {
			environment = append(environment, key+"="+value)
		}
	}
	return append(environment, "GALAXYTERM_EXTENSION_API_VERSION="+fileProviderAPIVersion)
}

type limitedBuffer struct {
	buffer   bytes.Buffer
	exceeded bool
	limit    int
}

func newLimitedBuffer(limit int) *limitedBuffer {
	return &limitedBuffer{limit: limit}
}

func (buffer *limitedBuffer) Write(value []byte) (int, error) {
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

func (buffer *limitedBuffer) Bytes() []byte {
	return bytes.TrimSpace(buffer.buffer.Bytes())
}

func (buffer *limitedBuffer) String() string {
	return strings.TrimSpace(buffer.buffer.String())
}
