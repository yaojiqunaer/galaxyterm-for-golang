package files

import (
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
}

type sidecarResponse struct {
	RequestID string          `json:"requestId"`
	Result    json.RawMessage `json:"result,omitempty"`
	Error     *ProviderError  `json:"error,omitempty"`
}

func runSidecar(
	runtimeInfo extensions.FileProviderRuntime,
	operation string,
	request FileOperationRequest,
	result any,
	timeout time.Duration,
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
	}
	payload, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("encode file provider request: %w", err)
	}
	if len(payload) > maxSidecarMessageSize {
		return fmt.Errorf("file provider request exceeds %d bytes", maxSidecarMessageSize)
	}
	payload = append(payload, '\n')

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	command := exec.CommandContext(ctx, runtimeInfo.Executable)
	command.Dir = filepath.Dir(runtimeInfo.Executable)
	command.Env = safeSidecarEnvironment()
	command.Stdin = bytes.NewReader(payload)
	stdout := newLimitedBuffer(maxSidecarMessageSize)
	stderr := newLimitedBuffer(64 << 10)
	command.Stdout = stdout
	command.Stderr = stderr
	runErr := command.Run()
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return ErrProviderTimeout
	}
	if stdout.exceeded || stderr.exceeded {
		return fmt.Errorf("file provider output exceeded the allowed size")
	}
	if runErr != nil {
		return fmt.Errorf("file provider process failed: %w", runErr)
	}

	var response sidecarResponse
	if err := json.Unmarshal(stdout.Bytes(), &response); err != nil {
		return fmt.Errorf("decode file provider response: %w", err)
	}
	if response.RequestID != message.RequestID {
		return ErrMismatchedResponse
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
