package terminal

import (
	"context"
	"fmt"
	"io"
	"strconv"
	"sync"

	"galaxyterm/internal"
	"galaxyterm/internal/session"
	"galaxyterm/internal/sshsecurity"

	"golang.org/x/crypto/ssh"
)

type sshDriver struct {
	addr            string
	username        string
	authType        string
	password        string
	privateKey      string
	passphrase      string
	jumpHost        string
	jumpPort        int
	jumpUser        string
	jumpPass        string
	agentSocketPath string
	hostKeyPolicy   string
	knownHostsPath  string
	network         sshsecurity.NetworkConfig

	client          *ssh.Client
	session         *ssh.Session
	stdin           io.WriteCloser
	keepAliveCancel context.CancelFunc
	closing         bool
	errorReported   bool
	mu              sync.Mutex
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
	if authType != "password" && authType != "privateKey" && authType != "agent" {
		return nil, fmt.Errorf("unsupported ssh authentication type %q", authType)
	}

	hostKeyPolicy, err := sshsecurity.NormalizePolicy(stringValue(req.Config, "hostKeyPolicy"))
	if err != nil {
		return nil, err
	}
	network, err := sshsecurity.NormalizeNetworkConfig(
		intValue(req.Config, "connectTimeoutSeconds", 0),
		intValue(req.Config, "keepAliveIntervalSeconds", 0),
		intValue(req.Config, "keepAliveMaxFailures", 0),
	)
	if err != nil {
		return nil, err
	}

	return &sshDriver{
		addr:            fmt.Sprintf("%s:%d", host, port),
		username:        username,
		authType:        authType,
		password:        password,
		privateKey:      stringValue(req.Auth, "privateKey"),
		passphrase:      stringValue(req.Auth, "passphrase"),
		jumpHost:        stringValue(req.Config, "jumpHost"),
		jumpPort:        intValue(req.Config, "jumpPort", 22),
		jumpUser:        stringValue(req.Auth, "jumpUsername"),
		jumpPass:        stringValue(req.Auth, "jumpPassword"),
		agentSocketPath: stringValue(req.Config, "agentSocketPath"),
		hostKeyPolicy:   string(hostKeyPolicy),
		knownHostsPath:  stringValue(req.Config, "knownHostsPath"),
		network:         network,
	}, nil
}

func (d *sshDriver) Start(ctx context.Context, emit session.Emitter) error {
	authMethods, authCloser, err := d.authMethods()
	if err != nil {
		return err
	}
	if authCloser != nil {
		defer authCloser.Close()
	}
	config, err := d.clientConfig(authMethods)
	if err != nil {
		return err
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
	d.closing = false
	d.errorReported = false
	d.mu.Unlock()

	if err := sshSession.Shell(); err != nil {
		_ = d.Close()
		return err
	}
	d.startKeepAlive(ctx, emit, client)

	go readStream(ctx, stdout, emit, false)
	go readStream(ctx, stderr, emit, false)
	go func() {
		if err := sshSession.Wait(); err != nil {
			d.emitErrorOnce(emit, session.Event{
				Type: session.EventError,
				Error: &session.AppError{
					Code:           "SSH_SESSION_WAIT_ERROR",
					MessageKey:     "error.ssh.sessionWait",
					DefaultMessage: err.Error(),
				},
			})
		}
		d.stopKeepAlive()
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
		HostKeyCallback: config.HostKeyCallback,
		Timeout:         config.Timeout,
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

func (d *sshDriver) clientConfig(authMethods []ssh.AuthMethod) (*ssh.ClientConfig, error) {
	hostKeyCallback, err := sshsecurity.NewHostKeyCallback(
		sshsecurity.Policy(d.hostKeyPolicy),
		d.knownHostsPath,
	)
	if err != nil {
		return nil, err
	}
	return &ssh.ClientConfig{
		User:            d.username,
		Auth:            authMethods,
		HostKeyCallback: hostKeyCallback,
		Timeout:         d.network.ConnectTimeout,
	}, nil
}

func (d *sshDriver) startKeepAlive(parent context.Context, emit session.Emitter, client *ssh.Client) {
	if d.network.KeepAliveInterval <= 0 {
		return
	}
	ctx, cancel := context.WithCancel(parent)
	d.mu.Lock()
	if d.client != client {
		d.mu.Unlock()
		cancel()
		return
	}
	d.keepAliveCancel = cancel
	d.mu.Unlock()

	go func() {
		if err := sshsecurity.RunKeepAlive(ctx, client, d.network); err != nil {
			d.emitErrorOnce(emit, session.Event{
				Type: session.EventError,
				Error: &session.AppError{
					Code:           "SSH_KEEPALIVE_FAILED",
					MessageKey:     "error.ssh.keepalive",
					DefaultMessage: err.Error(),
					Cause:          err,
				},
			})
			_ = d.Close()
		}
	}()
}

func (d *sshDriver) stopKeepAlive() {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.keepAliveCancel != nil {
		d.keepAliveCancel()
		d.keepAliveCancel = nil
	}
}

func (d *sshDriver) emitErrorOnce(emit session.Emitter, event session.Event) bool {
	d.mu.Lock()
	if d.closing || d.errorReported {
		d.mu.Unlock()
		return false
	}
	d.errorReported = true
	d.mu.Unlock()
	emit(event)
	return true
}

func (d *sshDriver) authMethods() ([]ssh.AuthMethod, io.Closer, error) {
	if d.authType == "agent" {
		auth, err := sshsecurity.NewAgentAuth(d.agentSocketPath)
		if err != nil {
			return nil, nil, err
		}
		return []ssh.AuthMethod{auth.Method}, auth, nil
	}
	if d.authType == "privateKey" {
		if d.privateKey == "" {
			return nil, nil, configError("privateKey")
		}
		var signer ssh.Signer
		var err error
		if d.passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(d.privateKey), []byte(d.passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(d.privateKey))
		}
		if err != nil {
			return nil, nil, err
		}
		return []ssh.AuthMethod{ssh.PublicKeys(signer)}, nil, nil
	}
	return []ssh.AuthMethod{ssh.Password(d.password)}, nil, nil
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
	d.closing = true

	var firstErr error
	if d.keepAliveCancel != nil {
		d.keepAliveCancel()
		d.keepAliveCancel = nil
	}
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
