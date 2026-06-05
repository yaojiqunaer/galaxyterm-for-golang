package terminal

import (
	"context"
	"fmt"
	"galaxyterm/internal"
	"galaxyterm/internal/session"
	"io"
	"strconv"
	"sync"

	"golang.org/x/crypto/ssh"
)

type sshDriver struct {
	addr       string
	username   string
	authType   string
	password   string
	privateKey string
	passphrase string
	jumpHost   string
	jumpPort   int
	jumpUser   string
	jumpPass   string

	client  *ssh.Client
	session *ssh.Session
	stdin   io.WriteCloser
	mu      sync.Mutex
}

func NewSSHProvider() session.Provider {
	return session.Provider{
		Type:         "ssh",
		NameKey:      "provider.ssh.name",
		Name:         "SSH",
		Description:  "SSH terminal",
		Category:     "builtin",
		Capabilities: []string{"stream", "resize"},
		NewDriver: func(req session.CreateSessionRequest) (session.Driver, error) {
			return newSSHDriver(req)
		},
	}
}

func newSSHDriver(req session.CreateSessionRequest) (*sshDriver, error) {
	host := stringValue(req.Config, "host")
	if host == "" {
		return nil, configError("host")
	}

	port := intValue(req.Config, "port", 22)
	username := stringValue(req.Auth, "username")
	if username == "" {
		username = stringValue(req.Config, "username")
	}
	if username == "" {
		return nil, configError("username")
	}

	password := stringValue(req.Auth, "password")
	if password == "" {
		password = stringValue(req.Config, "password")
	}
	authType := stringValue(req.Auth, "authType")
	if authType == "" {
		authType = "password"
	}

	return &sshDriver{
		addr:       fmt.Sprintf("%s:%d", host, port),
		username:   username,
		authType:   authType,
		password:   password,
		privateKey: stringValue(req.Auth, "privateKey"),
		passphrase: stringValue(req.Auth, "passphrase"),
		jumpHost:   stringValue(req.Config, "jumpHost"),
		jumpPort:   intValue(req.Config, "jumpPort", 22),
		jumpUser:   stringValue(req.Auth, "jumpUsername"),
		jumpPass:   stringValue(req.Auth, "jumpPassword"),
	}, nil
}

func (d *sshDriver) Start(ctx context.Context, emit session.Emitter) error {
	authMethods, err := d.authMethods()
	if err != nil {
		return err
	}
	config := &ssh.ClientConfig{
		User:            d.username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	client, err := d.dial(config)
	if err != nil {
		return err
	}

	sshSession, err := client.NewSession()
	if err != nil {
		_ = client.Close()
		return err
	}

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	if err := sshSession.RequestPty(string(internal.XTERM_256_COLOR), 24, 80, modes); err != nil {
		_ = sshSession.Close()
		_ = client.Close()
		return err
	}

	stdout, err := sshSession.StdoutPipe()
	if err != nil {
		_ = sshSession.Close()
		_ = client.Close()
		return err
	}
	stderr, err := sshSession.StderrPipe()
	if err != nil {
		_ = sshSession.Close()
		_ = client.Close()
		return err
	}
	stdin, err := sshSession.StdinPipe()
	if err != nil {
		_ = sshSession.Close()
		_ = client.Close()
		return err
	}

	d.mu.Lock()
	d.client = client
	d.session = sshSession
	d.stdin = stdin
	d.mu.Unlock()

	if err := sshSession.Shell(); err != nil {
		_ = d.Close()
		return err
	}

	go readStream(ctx, stdout, emit, false)
	go readStream(ctx, stderr, emit, false)
	go func() {
		if err := sshSession.Wait(); err != nil {
			emit(session.Event{
				Type: session.EventError,
				Error: &session.AppError{
					Code:           "SSH_SESSION_WAIT_ERROR",
					MessageKey:     "error.ssh.sessionWait",
					DefaultMessage: err.Error(),
				},
			})
		}
		emit(session.Event{Type: session.EventExit})
	}()
	return nil
}

func (d *sshDriver) dial(config *ssh.ClientConfig) (*ssh.Client, error) {
	if d.jumpHost == "" {
		return ssh.Dial("tcp", d.addr, config)
	}

	jumpUser := d.jumpUser
	if jumpUser == "" {
		jumpUser = d.username
	}
	jumpConfig := &ssh.ClientConfig{
		User: jumpUser,
		Auth: []ssh.AuthMethod{
			ssh.Password(d.jumpPass),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	jumpClient, err := ssh.Dial("tcp", fmt.Sprintf("%s:%d", d.jumpHost, d.jumpPort), jumpConfig)
	if err != nil {
		return nil, err
	}

	conn, err := jumpClient.Dial("tcp", d.addr)
	if err != nil {
		_ = jumpClient.Close()
		return nil, err
	}

	clientConn, chans, reqs, err := ssh.NewClientConn(conn, d.addr, config)
	if err != nil {
		_ = conn.Close()
		_ = jumpClient.Close()
		return nil, err
	}

	return ssh.NewClient(clientConn, chans, reqs), nil
}

func (d *sshDriver) authMethods() ([]ssh.AuthMethod, error) {
	if d.authType == "privateKey" {
		if d.privateKey == "" {
			return nil, configError("privateKey")
		}
		var signer ssh.Signer
		var err error
		if d.passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(d.privateKey), []byte(d.passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(d.privateKey))
		}
		if err != nil {
			return nil, err
		}
		return []ssh.AuthMethod{ssh.PublicKeys(signer)}, nil
	}
	return []ssh.AuthMethod{ssh.Password(d.password)}, nil
}

func (d *sshDriver) Send(data string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.stdin == nil {
		return nil
	}
	_, err := d.stdin.Write([]byte(data))
	return err
}

func (d *sshDriver) Resize(cols uint16, rows uint16) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.session == nil {
		return nil
	}
	return d.session.WindowChange(int(rows), int(cols))
}

func (d *sshDriver) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	var firstErr error
	if d.stdin != nil {
		firstErr = d.stdin.Close()
		d.stdin = nil
	}
	if d.session != nil {
		if err := d.session.Close(); firstErr == nil && err != nil {
			firstErr = err
		}
		d.session = nil
	}
	if d.client != nil {
		if err := d.client.Close(); firstErr == nil && err != nil {
			firstErr = err
		}
		d.client = nil
	}
	return firstErr
}

func stringValue(values map[string]interface{}, key string) string {
	if values == nil {
		return ""
	}
	value, ok := values[key]
	if !ok || value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return typed
	default:
		return fmt.Sprint(typed)
	}
}

func intValue(values map[string]interface{}, key string, fallback int) int {
	if values == nil {
		return fallback
	}
	value, ok := values[key]
	if !ok || value == nil {
		return fallback
	}
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case string:
		parsed, err := strconv.Atoi(typed)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func configError(field string) error {
	return &session.AppError{
		Code:           "INVALID_CONFIG",
		MessageKey:     "error.config.required",
		DefaultMessage: fmt.Sprintf("missing required config field: %s", field),
		Details:        map[string]interface{}{"field": field},
	}
}
