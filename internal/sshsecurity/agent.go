package sshsecurity

import (
	"fmt"
	"net"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

const agentDialTimeout = 3 * time.Second

type AgentAuth struct {
	Method     ssh.AuthMethod
	SocketPath string

	connection net.Conn
	closeOnce  sync.Once
	closeErr   error
}

func NewAgentAuth(socketPath string) (*AgentAuth, error) {
	path := strings.TrimSpace(socketPath)
	if path == "" {
		path = strings.TrimSpace(os.Getenv("SSH_AUTH_SOCK"))
	}
	if path == "" {
		return nil, fmt.Errorf("ssh agent authentication is unavailable: SSH_AUTH_SOCK is not set")
	}
	if runtime.GOOS == "windows" {
		return nil, fmt.Errorf("ssh agent authentication through SSH_AUTH_SOCK is unavailable on Windows")
	}
	resolvedPath, err := resolveUserPath(path)
	if err != nil {
		return nil, fmt.Errorf("resolve ssh agent socket: %w", err)
	}
	connection, err := net.DialTimeout("unix", resolvedPath, agentDialTimeout)
	if err != nil {
		return nil, fmt.Errorf("ssh agent authentication is unavailable at %s: %w", resolvedPath, err)
	}
	client := agent.NewClient(connection)
	identities, err := client.List()
	if err != nil {
		_ = connection.Close()
		return nil, fmt.Errorf("read ssh agent identities: %w", err)
	}
	if len(identities) == 0 {
		_ = connection.Close()
		return nil, fmt.Errorf("ssh agent authentication is unavailable: the agent has no identities")
	}
	return &AgentAuth{
		Method:     ssh.PublicKeysCallback(client.Signers),
		SocketPath: resolvedPath,
		connection: connection,
	}, nil
}

func (auth *AgentAuth) Close() error {
	if auth == nil {
		return nil
	}
	auth.closeOnce.Do(func() {
		if auth.connection != nil {
			auth.closeErr = auth.connection.Close()
		}
	})
	return auth.closeErr
}
