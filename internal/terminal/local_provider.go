package terminal

import (
	"context"
	"errors"
	"fmt"
	"galaxyterm/internal"
	"galaxyterm/internal/session"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/creack/pty"
)

type localDriver struct {
	args             []string
	workingDirectory string
	tty              *os.File
	mu               sync.Mutex
}

func NewLocalProvider() session.Provider {
	return session.Provider{
		Type:         "local",
		NameKey:      "provider.local.name",
		Name:         "Local Shell",
		Description:  "Local shell terminal",
		Category:     "builtin",
		Capabilities: []string{"stream", "resize"},
		NewDriver: func(req session.CreateSessionRequest) (session.Driver, error) {
			homeDirectory, _ := os.UserHomeDir()
			return &localDriver{
				args:             localShellArgs(req.Config),
				workingDirectory: localWorkingDirectory(req.Config, homeDirectory),
			}, nil
		},
	}
}

func (d *localDriver) Start(ctx context.Context, emit session.Emitter) error {
	cmd, err := commandFromArgs(d.args)
	if err != nil {
		return err
	}
	cmd.Env = append(os.Environ(), "TERM="+string(internal.XTERM_256_COLOR))
	if d.workingDirectory != "" {
		cmd.Dir = d.workingDirectory
	}

	tty, err := pty.Start(cmd)
	if err != nil {
		return fmt.Errorf("failed to start local pty: %w", err)
	}

	d.mu.Lock()
	d.tty = tty
	d.mu.Unlock()

	go readStream(ctx, tty, emit, true)
	return nil
}

func (d *localDriver) Send(data string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.tty == nil {
		return nil
	}
	_, err := d.tty.Write([]byte(data))
	return err
}

func (d *localDriver) Resize(cols uint16, rows uint16) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.tty == nil {
		return nil
	}
	return pty.Setsize(d.tty, &pty.Winsize{Rows: rows, Cols: cols})
}

func (d *localDriver) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.tty == nil {
		return nil
	}
	err := d.tty.Close()
	d.tty = nil
	return err
}

func localShellArgs(config map[string]interface{}) []string {
	if rawShell, ok := config["shell"].(string); ok && strings.TrimSpace(rawShell) != "" {
		return []string{rawShell}
	}
	if runtime.GOOS == "windows" {
		return []string{"powershell.exe"}
	}
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/sh"
	}
	return []string{shell, "-li"}
}

func localWorkingDirectory(config map[string]interface{}, homeDirectory string) string {
	for _, key := range []string{"workingDirectory", "cwd"} {
		if raw, ok := config[key].(string); ok {
			if value := strings.TrimSpace(raw); value != "" {
				return expandHomeDirectory(value, homeDirectory)
			}
		}
	}
	return strings.TrimSpace(homeDirectory)
}

func expandHomeDirectory(value, homeDirectory string) string {
	home := strings.TrimSpace(homeDirectory)
	if value == "~" {
		return home
	}
	if strings.HasPrefix(value, "~/") || strings.HasPrefix(value, `~\`) {
		if home == "" {
			return ""
		}
		return filepath.Join(home, value[2:])
	}
	return value
}

func commandFromArgs(args []string) (*exec.Cmd, error) {
	switch len(args) {
	case 0:
		return nil, fmt.Errorf("no command specified")
	case 1:
		return exec.Command(args[0]), nil
	default:
		return exec.Command(args[0], args[1:]...), nil
	}
}

func readStream(ctx context.Context, reader io.Reader, emit session.Emitter, emitExit bool) {
	buf := make([]byte, 20480)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		n, err := reader.Read(buf)
		if n > 0 {
			emit(session.Event{Type: session.EventData, Data: string(buf[:n])})
		}
		if err != nil {
			if !errors.Is(err, io.EOF) {
				emit(session.Event{
					Type: session.EventError,
					Error: &session.AppError{
						Code:           "STREAM_READ_ERROR",
						MessageKey:     "error.stream.read",
						DefaultMessage: err.Error(),
					},
				})
			}
			if emitExit {
				emit(session.Event{Type: session.EventExit})
			}
			return
		}
	}
}
