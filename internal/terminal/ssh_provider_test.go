package terminal

import (
	"path/filepath"
	"testing"
	"time"

	"galaxyterm/internal/session"
)

func TestNewSSHDriverUsesConfiguredNetworkReliability(t *testing.T) {
	driver, err := newSSHDriver(session.CreateSessionRequest{
		Config: map[string]interface{}{
			"host":                     "example.com",
			"connectTimeoutSeconds":    45,
			"keepAliveIntervalSeconds": 20,
			"keepAliveMaxFailures":     5,
		},
		Auth: map[string]interface{}{"username": "root", "password": "secret"},
	})
	if err != nil {
		t.Fatalf("newSSHDriver returned error: %v", err)
	}
	if driver.network.ConnectTimeout != 45*time.Second ||
		driver.network.KeepAliveInterval != 20*time.Second ||
		driver.network.KeepAliveMaxFailures != 5 {
		t.Fatalf("network config = %+v", driver.network)
	}
}

func TestSSHDriverTracksIntentionalClose(t *testing.T) {
	driver := &sshDriver{}
	if err := driver.Close(); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}
	if !driver.closing {
		t.Fatal("driver did not retain intentional close state")
	}
}

func TestSSHDriverEmitsOnlyFirstRuntimeError(t *testing.T) {
	driver := &sshDriver{}
	emitted := 0
	emit := func(session.Event) { emitted++ }
	if !driver.emitErrorOnce(emit, session.Event{Type: session.EventError}) {
		t.Fatal("first runtime error was suppressed")
	}
	if driver.emitErrorOnce(emit, session.Event{Type: session.EventError}) {
		t.Fatal("duplicate runtime error was emitted")
	}
	if emitted != 1 {
		t.Fatalf("emitted errors = %d, want 1", emitted)
	}
}

func TestNewSSHDriverRejectsInvalidNetworkReliability(t *testing.T) {
	_, err := newSSHDriver(session.CreateSessionRequest{
		Config: map[string]interface{}{
			"host":                     "example.com",
			"keepAliveIntervalSeconds": 2,
		},
		Auth: map[string]interface{}{"username": "root", "password": "secret"},
	})
	if err == nil {
		t.Fatal("newSSHDriver accepted an invalid keepalive interval")
	}
}

func TestNewSSHDriverAcceptsPrivateKeyAuth(t *testing.T) {
	driver, err := newSSHDriver(session.CreateSessionRequest{
		Config: map[string]interface{}{
			"host": "127.0.0.1",
			"port": 22,
		},
		Auth: map[string]interface{}{
			"username":   "root",
			"authType":   "privateKey",
			"privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n-----END OPENSSH PRIVATE KEY-----",
			"passphrase": "secret",
		},
	})
	if err != nil {
		t.Fatalf("newSSHDriver returned error: %v", err)
	}
	if driver.authType != "privateKey" {
		t.Fatalf("authType = %q, want privateKey", driver.authType)
	}
	if driver.privateKey == "" {
		t.Fatal("privateKey was empty")
	}
}

func TestNewSSHDriverAcceptsJumpHostConfig(t *testing.T) {
	driver, err := newSSHDriver(session.CreateSessionRequest{
		Config: map[string]interface{}{
			"host":     "10.0.0.10",
			"jumpHost": "1.2.3.4",
			"jumpPort": 2222,
		},
		Auth: map[string]interface{}{
			"username":     "app",
			"password":     "secret",
			"jumpUsername": "jump",
			"jumpPassword": "jump-secret",
		},
	})
	if err != nil {
		t.Fatalf("newSSHDriver returned error: %v", err)
	}
	if driver.jumpHost != "1.2.3.4" {
		t.Fatalf("jumpHost = %q, want 1.2.3.4", driver.jumpHost)
	}
	if driver.jumpPort != 2222 {
		t.Fatalf("jumpPort = %d, want 2222", driver.jumpPort)
	}
}

func TestNewSSHDriverDefaultsHostKeyPolicyToAcceptNew(t *testing.T) {
	driver, err := newSSHDriver(session.CreateSessionRequest{
		Config: map[string]interface{}{"host": "example.com"},
		Auth: map[string]interface{}{
			"username": "root",
			"password": "secret",
		},
	})
	if err != nil {
		t.Fatalf("newSSHDriver returned error: %v", err)
	}
	if driver.hostKeyPolicy != "accept-new" {
		t.Fatalf("hostKeyPolicy = %q, want accept-new", driver.hostKeyPolicy)
	}
}

func TestNewSSHDriverPreservesStrictHostKeySettings(t *testing.T) {
	driver, err := newSSHDriver(session.CreateSessionRequest{
		Config: map[string]interface{}{
			"host":           "example.com",
			"hostKeyPolicy":  "strict",
			"knownHostsPath": "/tmp/galaxyterm-known-hosts",
		},
		Auth: map[string]interface{}{
			"username": "root",
			"password": "secret",
		},
	})
	if err != nil {
		t.Fatalf("newSSHDriver returned error: %v", err)
	}
	if driver.hostKeyPolicy != "strict" || driver.knownHostsPath != "/tmp/galaxyterm-known-hosts" {
		t.Fatalf("host key settings = %q, %q", driver.hostKeyPolicy, driver.knownHostsPath)
	}
}

func TestNewSSHDriverRejectsUnsupportedHostKeyPolicy(t *testing.T) {
	_, err := newSSHDriver(session.CreateSessionRequest{
		Config: map[string]interface{}{
			"host":          "example.com",
			"hostKeyPolicy": "insecure",
		},
		Auth: map[string]interface{}{
			"username": "root",
			"password": "secret",
		},
	})
	if err == nil {
		t.Fatal("newSSHDriver accepted unsupported host key policy")
	}
}

func TestNewSSHDriverAcceptsAgentAuthenticationConfig(t *testing.T) {
	t.Setenv("SSH_AUTH_SOCK", "")
	agentSocketPath := filepath.Join(t.TempDir(), "missing-agent.sock")
	driver, err := newSSHDriver(session.CreateSessionRequest{
		Config: map[string]interface{}{
			"host":            "example.com",
			"agentSocketPath": agentSocketPath,
		},
		Auth: map[string]interface{}{
			"username": "root",
			"authType": "agent",
		},
	})
	if err != nil {
		t.Fatalf("newSSHDriver returned error: %v", err)
	}
	if driver.authType != "agent" || driver.agentSocketPath != agentSocketPath {
		t.Fatalf("agent settings = %q, %q", driver.authType, driver.agentSocketPath)
	}
	if _, _, err := driver.authMethods(); err == nil {
		t.Fatal("authMethods accepted an unavailable agent socket")
	}
}

func TestTestSSHConnectionValidatesConfig(t *testing.T) {
	api := NewAPI()
	err := api.TestSSHConnection(session.CreateSessionRequest{
		ProviderType: "ssh",
		Auth: map[string]interface{}{
			"username": "root",
			"password": "secret",
		},
	})
	if err == nil {
		t.Fatal("TestSSHConnection returned nil error, want missing host error")
	}
}
