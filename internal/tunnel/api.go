package tunnel

import (
	"context"
	"fmt"
	"io"
	"net"
	"sort"
	"strings"
	"sync"
	"time"

	"galaxyterm/internal/sshsecurity"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

type API struct {
	mu      sync.Mutex
	tunnels map[string]*localTunnel
}

func NewAPI() *API {
	return &API{tunnels: make(map[string]*localTunnel)}
}

type StartRequest struct {
	Name                        string `json:"name"`
	SSHHost                     string `json:"sshHost"`
	SSHPort                     int    `json:"sshPort"`
	SSHUser                     string `json:"sshUser"`
	SSHAuthType                 string `json:"sshAuthType"`
	SSHPassword                 string `json:"sshPassword"`
	SSHPrivateKey               string `json:"sshPrivateKey"`
	SSHPassphrase               string `json:"sshPassphrase"`
	SSHAgentSocketPath          string `json:"sshAgentSocketPath"`
	SSHConnectTimeoutSeconds    int    `json:"sshConnectTimeoutSeconds"`
	SSHKeepAliveIntervalSeconds int    `json:"sshKeepAliveIntervalSeconds"`
	SSHKeepAliveMaxFailures     int    `json:"sshKeepAliveMaxFailures"`
	SSHHostKeyPolicy            string `json:"sshHostKeyPolicy"`
	SSHKnownHostsPath           string `json:"sshKnownHostsPath"`
	LocalHost                   string `json:"localHost"`
	LocalPort                   int    `json:"localPort"`
	RemoteHost                  string `json:"remoteHost"`
	RemotePort                  int    `json:"remotePort"`

	network sshsecurity.NetworkConfig
}

type Info struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	LocalAddr  string `json:"localAddr"`
	RemoteAddr string `json:"remoteAddr"`
	SSHAddr    string `json:"sshAddr"`
	Status     string `json:"status"`
	Error      string `json:"error,omitempty"`
}

type localTunnel struct {
	info            Info
	listener        net.Listener
	client          *ssh.Client
	keepAliveCancel context.CancelFunc
	closeOnce       sync.Once
	closeErr        error
}

func (api *API) Start(req StartRequest) (Info, error) {
	normalized, err := validateStartRequest(req)
	if err != nil {
		return Info{}, err
	}

	authMethods, authCloser, err := tunnelAuthMethods(normalized)
	if err != nil {
		return Info{}, err
	}
	if authCloser != nil {
		defer authCloser.Close()
	}
	hostKeyCallback, err := sshsecurity.NewHostKeyCallback(
		sshsecurity.Policy(normalized.SSHHostKeyPolicy),
		normalized.SSHKnownHostsPath,
	)
	if err != nil {
		return Info{}, err
	}
	config := &ssh.ClientConfig{
		User:            normalized.SSHUser,
		Auth:            authMethods,
		HostKeyCallback: hostKeyCallback,
		Timeout:         normalized.network.ConnectTimeout,
	}
	sshAddr := fmt.Sprintf("%s:%d", normalized.SSHHost, normalized.SSHPort)
	client, err := ssh.Dial("tcp", sshAddr, config)
	if err != nil {
		return Info{}, err
	}

	localAddr := fmt.Sprintf("%s:%d", normalized.LocalHost, normalized.LocalPort)
	listener, err := net.Listen("tcp", localAddr)
	if err != nil {
		_ = client.Close()
		return Info{}, err
	}

	info := Info{
		ID:         uuid.NewString(),
		Name:       normalized.Name,
		LocalAddr:  listener.Addr().String(),
		RemoteAddr: fmt.Sprintf("%s:%d", normalized.RemoteHost, normalized.RemotePort),
		SSHAddr:    sshAddr,
		Status:     "active",
	}
	keepAliveCtx, keepAliveCancel := context.WithCancel(context.Background())
	t := &localTunnel{
		info:            info,
		listener:        listener,
		client:          client,
		keepAliveCancel: keepAliveCancel,
	}

	api.mu.Lock()
	api.tunnels[info.ID] = t
	api.mu.Unlock()

	go t.accept()
	if normalized.network.KeepAliveInterval > 0 {
		go func() {
			if err := sshsecurity.RunKeepAlive(keepAliveCtx, client, normalized.network); err != nil {
				api.expire(info.ID, t, err)
			}
		}()
	}
	return info, nil
}

func (api *API) expire(id string, expected *localTunnel, cause error) {
	api.mu.Lock()
	current, ok := api.tunnels[id]
	if ok && current == expected {
		current.info.Status = "error"
		if cause != nil {
			current.info.Error = cause.Error()
		}
	}
	api.mu.Unlock()
	if ok && current == expected {
		_ = expected.close()
	}
}

func (api *API) Stop(id string) error {
	api.mu.Lock()
	t, ok := api.tunnels[id]
	if ok {
		delete(api.tunnels, id)
	}
	api.mu.Unlock()
	if !ok {
		return nil
	}
	return t.close()
}

func (api *API) StopAll() error {
	api.mu.Lock()
	tunnels := make([]*localTunnel, 0, len(api.tunnels))
	for id, t := range api.tunnels {
		tunnels = append(tunnels, t)
		delete(api.tunnels, id)
	}
	api.mu.Unlock()

	var firstErr error
	for _, t := range tunnels {
		if err := t.close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func (api *API) List() []Info {
	api.mu.Lock()
	defer api.mu.Unlock()

	infos := make([]Info, 0, len(api.tunnels))
	for _, t := range api.tunnels {
		infos = append(infos, t.info)
	}
	sort.Slice(infos, func(i, j int) bool {
		if infos[i].Status != infos[j].Status {
			return infos[i].Status < infos[j].Status
		}
		leftName := strings.ToLower(infos[i].Name)
		rightName := strings.ToLower(infos[j].Name)
		if leftName != rightName {
			return leftName < rightName
		}
		return infos[i].ID < infos[j].ID
	})
	return infos
}

func (t *localTunnel) accept() {
	for {
		localConn, err := t.listener.Accept()
		if err != nil {
			return
		}
		go t.forward(localConn)
	}
}

func (t *localTunnel) close() error {
	t.closeOnce.Do(func() {
		if t.keepAliveCancel != nil {
			t.keepAliveCancel()
		}
		if t.listener != nil {
			if err := t.listener.Close(); err != nil {
				t.closeErr = err
			}
		}
		if t.client != nil {
			if err := t.client.Close(); err != nil && t.closeErr == nil {
				t.closeErr = err
			}
		}
	})
	return t.closeErr
}

func (t *localTunnel) forward(localConn net.Conn) {
	defer localConn.Close()
	remoteConn, err := t.client.Dial("tcp", t.info.RemoteAddr)
	if err != nil {
		return
	}
	defer remoteConn.Close()

	done := make(chan struct{}, 2)
	go func() {
		_, _ = io.Copy(remoteConn, localConn)
		done <- struct{}{}
	}()
	go func() {
		_, _ = io.Copy(localConn, remoteConn)
		done <- struct{}{}
	}()
	<-done
}

func validateStartRequest(req StartRequest) (StartRequest, error) {
	req.Name = strings.TrimSpace(req.Name)
	req.SSHHost = strings.TrimSpace(req.SSHHost)
	req.SSHUser = strings.TrimSpace(req.SSHUser)
	req.SSHAuthType = strings.TrimSpace(req.SSHAuthType)
	req.SSHAgentSocketPath = strings.TrimSpace(req.SSHAgentSocketPath)
	req.SSHHostKeyPolicy = strings.TrimSpace(req.SSHHostKeyPolicy)
	req.SSHKnownHostsPath = strings.TrimSpace(req.SSHKnownHostsPath)
	req.LocalHost = strings.TrimSpace(req.LocalHost)
	req.RemoteHost = strings.TrimSpace(req.RemoteHost)

	if req.Name == "" {
		req.Name = "Tunnel"
	}
	if req.SSHHost == "" {
		return req, fmt.Errorf("missing ssh host")
	}
	if req.SSHUser == "" {
		return req, fmt.Errorf("missing ssh user")
	}
	if req.SSHAuthType == "" {
		req.SSHAuthType = "password"
	}
	if req.SSHAuthType != "password" && req.SSHAuthType != "privateKey" && req.SSHAuthType != "agent" {
		return req, fmt.Errorf("unsupported ssh authentication type %q", req.SSHAuthType)
	}
	network, err := sshsecurity.NormalizeNetworkConfig(
		req.SSHConnectTimeoutSeconds,
		req.SSHKeepAliveIntervalSeconds,
		req.SSHKeepAliveMaxFailures,
	)
	if err != nil {
		return req, err
	}
	req.network = network
	req.SSHConnectTimeoutSeconds = int(network.ConnectTimeout / time.Second)
	req.SSHKeepAliveIntervalSeconds = int(network.KeepAliveInterval / time.Second)
	req.SSHKeepAliveMaxFailures = network.KeepAliveMaxFailures
	hostKeyPolicy, err := sshsecurity.NormalizePolicy(req.SSHHostKeyPolicy)
	if err != nil {
		return req, err
	}
	req.SSHHostKeyPolicy = string(hostKeyPolicy)
	if req.LocalHost == "" {
		req.LocalHost = "127.0.0.1"
	}
	if req.LocalPort == 0 {
		return req, fmt.Errorf("missing local port")
	}
	if req.RemoteHost == "" {
		return req, fmt.Errorf("missing remote host")
	}
	if req.RemotePort == 0 {
		return req, fmt.Errorf("missing remote port")
	}
	if req.SSHPort == 0 {
		req.SSHPort = 22
	}
	return req, nil
}

func tunnelAuthMethods(req StartRequest) ([]ssh.AuthMethod, io.Closer, error) {
	if strings.EqualFold(req.SSHAuthType, "agent") {
		auth, err := sshsecurity.NewAgentAuth(req.SSHAgentSocketPath)
		if err != nil {
			return nil, nil, err
		}
		return []ssh.AuthMethod{auth.Method}, auth, nil
	}
	if strings.EqualFold(req.SSHAuthType, "privateKey") {
		if strings.TrimSpace(req.SSHPrivateKey) == "" {
			return nil, nil, fmt.Errorf("missing ssh private key")
		}
		var (
			signer ssh.Signer
			err    error
		)
		if req.SSHPassphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(req.SSHPrivateKey), []byte(req.SSHPassphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(req.SSHPrivateKey))
		}
		if err != nil {
			return nil, nil, fmt.Errorf("parse ssh private key: %w", err)
		}
		return []ssh.AuthMethod{ssh.PublicKeys(signer)}, nil, nil
	}
	return []ssh.AuthMethod{ssh.Password(req.SSHPassword)}, nil, nil
}
