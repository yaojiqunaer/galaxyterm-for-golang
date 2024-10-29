package terminal

import (
	"context"
	"errors"
	"galaxyterm/internal"
	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/crypto/ssh"
	"io"
)

var GlobalSshSessions = make(map[string]*SshTerminal)

type SshTerminal struct {
	ctx     context.Context
	options internal.TerminalOptions
	addr    string
	auth    internal.Auth
	rows    uint16
	cols    uint16

	sessionId string
	in        io.WriteCloser
	out       io.Reader
	session   *ssh.Session
}

func NewSshTerminal(options internal.TerminalOptions, addr string, auth internal.Auth) *SshTerminal {
	return &SshTerminal{options: options, addr: addr, auth: auth}
}

// Startup is called at application startup.
func (term *SshTerminal) Startup(ctx context.Context) {
	term.ctx = ctx
}

func (term *SshTerminal) Connect() error {
	runtime.LogDebugf(term.ctx, "ssh pty terminal addr: %s", term.addr)
	config := &ssh.ClientConfig{
		User: term.auth.UserName,
		Auth: []ssh.AuthMethod{
			ssh.Password(term.auth.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}
	client, err := ssh.Dial("tcp", term.addr, config)
	if err != nil {
		return err
	}
	runtime.LogDebugf(term.ctx, "ssh client dial success")
	session, err := client.NewSession()
	runtime.LogDebugf(term.ctx, "ssh client create success")
	if err != nil {
		runtime.LogError(term.ctx, "ssh client create session error: "+err.Error())
		return err
	}
	runtime.LogDebugf(term.ctx, "ssh client create session success")
	modes := ssh.TerminalModes{
		ssh.ECHO:          0,     // 禁用回显
		ssh.TTY_OP_ISPEED: 14400, // 输入速率设置为 14.4kbaud
		ssh.TTY_OP_OSPEED: 14400, // 输出速率设置为 14.4kbaud
	}
	err = session.RequestPty(string(internal.XTERM_256_COLOR), 24, 80, modes)
	if err != nil {
		return err
	}
	runtime.LogDebugf(term.ctx, "ssh pty success")
	sessionId := uuid.NewString()
	term.sessionId = sessionId
	term.session = session
	GlobalSshSessions[sessionId] = term
	runtime.LogDebugf(term.ctx, "ssh pty session id: %s", sessionId)
	stdout, err := session.StdoutPipe()
	if err != nil {
		runtime.LogErrorf(term.ctx, "ssh pty stdout pipe error: %s", err)
		return err
	}
	stdin, err := session.StdinPipe()
	if err != nil {
		runtime.LogErrorf(term.ctx, "ssh pty stdin pipe error: %s", err)
		return err
	}
	term.in = stdin
	term.out = stdout
	runtime.LogDebugf(term.ctx, "ssh pty stdout pipe success")
	err = session.Shell()
	if err != nil {
		runtime.LogErrorf(term.ctx, "ssh pty shell error: %s", err)
		return err
	}
	runtime.LogDebugf(term.ctx, "ssh pty shell success")
	go func() {
		runtime.LogDebugf(term.ctx, "ssh pty stdout emit")
		for {
			buf := make([]byte, 20480)
			n, err := stdout.Read(buf)
			if err != nil {
				if !errors.Is(err, io.EOF) {
					runtime.LogErrorf(term.ctx, "Read error: %s", err)
					continue
				}
				runtime.Quit(term.ctx)
				continue
			}
			runtime.EventsEmit(term.ctx, "ssh-pty", string(buf[:n]))
		}
	}()

	return nil
}

func (term *SshTerminal) Disconnect() error {
	err := term.in.Close()
	runtime.LogDebugf(term.ctx, "ssh pty stdin close")
	if err != nil {
		return err
	}
	err = term.session.Close()
	runtime.LogDebugf(term.ctx, "ssh pty session close")
	if err != nil {
		return err
	}
	delete(GlobalSshSessions, term.sessionId)
	return nil
}

func (term *SshTerminal) Send(text string) error {
	_, err := term.in.Write([]byte(text))
	if err != nil {
		return err
	}
	return nil
}

func (term *SshTerminal) Resize(cols uint16, rows uint16) error {
	term.rows = rows
	term.cols = cols
	if term.session == nil {
		runtime.LogError(term.ctx, "session is nil")
		return nil
	}
	runtime.LogDebugf(term.ctx, "ssh pty terminal resize to cols: %d, rows: %d", cols, rows)
	err := term.session.WindowChange(int(rows), int(cols))
	if err != nil {
		runtime.LogError(term.ctx, "resize pty error: "+err.Error())
		return err
	}
	return err
}
