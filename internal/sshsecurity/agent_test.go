package sshsecurity

import (
	"crypto/ed25519"
	"crypto/rand"
	"net"
	"os"
	"runtime"
	"testing"

	"golang.org/x/crypto/ssh/agent"
)

func TestNewAgentAuthRequiresSocket(t *testing.T) {
	t.Setenv("SSH_AUTH_SOCK", "")

	if _, err := NewAgentAuth(""); err == nil {
		t.Fatal("NewAgentAuth returned nil error without SSH_AUTH_SOCK")
	}
}

func TestNewAgentAuthRejectsAgentWithoutIdentities(t *testing.T) {
	socketPath := serveTestAgent(t, agent.NewKeyring())

	if _, err := NewAgentAuth(socketPath); err == nil {
		t.Fatal("NewAgentAuth accepted an agent without identities")
	}
}

func TestNewAgentAuthUsesEnvironmentAndReleasesConnection(t *testing.T) {
	keyring := agent.NewKeyring()
	_, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	if err := keyring.Add(agent.AddedKey{PrivateKey: privateKey}); err != nil {
		t.Fatalf("add agent key: %v", err)
	}
	socketPath := serveTestAgent(t, keyring)
	t.Setenv("SSH_AUTH_SOCK", socketPath)

	auth, err := NewAgentAuth("")
	if err != nil {
		t.Fatalf("NewAgentAuth returned error: %v", err)
	}
	if auth.Method == nil {
		t.Fatal("NewAgentAuth returned nil auth method")
	}
	if auth.SocketPath != socketPath {
		t.Fatalf("SocketPath = %q, want %q", auth.SocketPath, socketPath)
	}
	if err := auth.Close(); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}
	if err := auth.Close(); err != nil {
		t.Fatalf("second Close returned error: %v", err)
	}
}

func serveTestAgent(t *testing.T, keyring agent.Agent) string {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("Unix-domain SSH agents are unavailable on Windows")
	}
	placeholder, err := os.CreateTemp("", "gt-agent-*.sock")
	if err != nil {
		t.Fatalf("reserve agent socket path: %v", err)
	}
	socketPath := placeholder.Name()
	_ = placeholder.Close()
	_ = os.Remove(socketPath)
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		t.Fatalf("listen agent socket: %v", err)
	}
	t.Cleanup(func() {
		_ = listener.Close()
		_ = os.Remove(socketPath)
	})
	go func() {
		connection, acceptErr := listener.Accept()
		if acceptErr == nil {
			_ = agent.ServeAgent(keyring, connection)
			_ = connection.Close()
		}
	}()
	return socketPath
}
