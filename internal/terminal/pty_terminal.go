package terminal

import (
	"context"
	"errors"
	"fmt"
	"galaxyterm/internal"
	"github.com/creack/pty"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"io"
	"os"
	"os/exec"
)

type PtyTerminal struct {
	options internal.TerminalOptions
	ctx     context.Context
	tty     *os.File
	rows    uint16
	cols    uint16
}

// NewPtyTerminal NewTerm creates a new instance of the Terminal struct.
func NewPtyTerminal(options internal.TerminalOptions) *PtyTerminal {
	return &PtyTerminal{options: options}
}

// Startup is called at application startup.
func (term *PtyTerminal) Startup(ctx context.Context) {
	term.ctx = ctx
}

func (term *PtyTerminal) Connect() error {
	err := term.startTTY()
	if err != nil {
		return err
	}
	go func() {
		for {
			buf := make([]byte, 20480)
			n, err := term.tty.Read(buf)
			if err != nil {
				if !errors.Is(err, io.EOF) {
					runtime.LogErrorf(term.ctx, "Read error: %s", err)
					continue
				}
				runtime.Quit(term.ctx)
				continue
			}
			runtime.EventsEmit(term.ctx, "local-pty", string(buf[:n]))
		}
	}()
	return nil
}

func (term *PtyTerminal) Disconnect() error {
	runtime.EventsEmit(term.ctx, "local-pty")
	return nil
}

func (term *PtyTerminal) Send(text string) error {
	_, err := term.tty.Write([]byte(text))
	return err
}

func (term *PtyTerminal) Resize(cols uint16, rows uint16) error {
	term.rows = rows
	term.cols = cols
	runtime.LogDebugf(term.ctx, "local pty terminal resize to cols: %d, rows: %d", cols, rows)
	return pty.Setsize(term.tty, &pty.Winsize{Rows: rows, Cols: cols})
}

func (term *PtyTerminal) startTTY() error {
	var cmd *exec.Cmd
	switch len(term.options.Args) {
	case 0:
		return fmt.Errorf("no command specified")
	case 1:
		cmd = exec.Command(term.options.Args[0])
	default:
		cmd = exec.Command(term.options.Args[0], term.options.Args[1:]...)
	}
	cmd.Env = os.Environ()
	cmd.Env = append(cmd.Env, "TERM="+string(internal.XTERM_256_COLOR))

	tty, err := pty.Start(cmd)
	if err != nil {
		return fmt.Errorf("failed to start pty: %w", err)
	}

	if term.rows != 0 && term.cols != 0 {
		err := pty.Setsize(tty, &pty.Winsize{Rows: term.rows, Cols: term.cols})
		if err != nil {
			fmt.Println("failed to resize")
		}
	}

	term.tty = tty
	return nil
}
