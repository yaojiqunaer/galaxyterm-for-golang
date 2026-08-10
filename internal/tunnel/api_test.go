package tunnel

import (
	"errors"
	"net"
	"path/filepath"
	"testing"
	"time"
)

func TestValidateStartRequestDefaultsPorts(t *testing.T) {
	req := StartRequest{
		Name:       "mysql",
		SSHHost:    "127.0.0.1",
		SSHUser:    "root",
		LocalHost:  "127.0.0.1",
		LocalPort:  13306,
		RemoteHost: "127.0.0.1",
		RemotePort: 3306,
	}

	normalized, err := validateStartRequest(req)
	if err != nil {
		t.Fatalf("validateStartRequest returned error: %v", err)
	}
	if normalized.SSHPort != 22 {
		t.Fatalf("SSHPort = %d, want 22", normalized.SSHPort)
	}
	if normalized.SSHHostKeyPolicy != "accept-new" {
		t.Fatalf("SSHHostKeyPolicy = %q, want accept-new", normalized.SSHHostKeyPolicy)
	}
	if normalized.SSHConnectTimeoutSeconds != 10 || normalized.SSHKeepAliveMaxFailures != 3 {
		t.Fatalf("unexpected SSH reliability defaults: %+v", normalized)
	}
}

func TestValidateStartRequestPreservesNetworkReliability(t *testing.T) {
	normalized, err := validateStartRequest(StartRequest{
		SSHHost:                     "127.0.0.1",
		SSHUser:                     "root",
		SSHConnectTimeoutSeconds:    40,
		SSHKeepAliveIntervalSeconds: 15,
		SSHKeepAliveMaxFailures:     4,
		LocalPort:                   13306,
		RemoteHost:                  "127.0.0.1",
		RemotePort:                  3306,
	})
	if err != nil {
		t.Fatalf("validateStartRequest returned error: %v", err)
	}
	if normalized.network.ConnectTimeout != 40*time.Second ||
		normalized.network.KeepAliveInterval != 15*time.Second ||
		normalized.network.KeepAliveMaxFailures != 4 {
		t.Fatalf("unexpected normalized network config: %+v", normalized.network)
	}
}

func TestValidateStartRequestRequiresCoreFields(t *testing.T) {
	_, err := validateStartRequest(StartRequest{})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestValidateStartRequestRejectsUnsupportedHostKeyPolicy(t *testing.T) {
	_, err := validateStartRequest(StartRequest{
		SSHHost:          "127.0.0.1",
		SSHUser:          "root",
		SSHHostKeyPolicy: "insecure",
		LocalPort:        13306,
		RemoteHost:       "127.0.0.1",
		RemotePort:       3306,
	})
	if err == nil {
		t.Fatal("validateStartRequest accepted unsupported host key policy")
	}
}

func TestTunnelAuthMethodsSupportPassword(t *testing.T) {
	methods, closer, err := tunnelAuthMethods(StartRequest{SSHPassword: "secret"})
	if err != nil {
		t.Fatalf("tunnelAuthMethods returned error: %v", err)
	}
	if closer != nil {
		t.Fatal("password authentication returned an unexpected closer")
	}
	if len(methods) != 1 {
		t.Fatalf("len(methods) = %d, want 1", len(methods))
	}
}

func TestTunnelAuthMethodsRequirePrivateKeyContent(t *testing.T) {
	_, _, err := tunnelAuthMethods(StartRequest{SSHAuthType: "privateKey"})
	if err == nil {
		t.Fatal("expected private key validation error")
	}
}

func TestTunnelAuthMethodsUseConfiguredAgentSocket(t *testing.T) {
	t.Setenv("SSH_AUTH_SOCK", "")
	_, _, err := tunnelAuthMethods(StartRequest{
		SSHAuthType:        "agent",
		SSHAgentSocketPath: filepath.Join(t.TempDir(), "missing-agent.sock"),
	})
	if err == nil {
		t.Fatal("tunnelAuthMethods accepted an unavailable agent socket")
	}
}

func TestStopAllClosesAndClearsTunnels(t *testing.T) {
	api := NewAPI()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	api.tunnels["one"] = &localTunnel{listener: listener}

	if err := api.StopAll(); err != nil {
		t.Fatalf("StopAll returned error: %v", err)
	}
	if got := api.List(); len(got) != 0 {
		t.Fatalf("List returned %d tunnels, want 0", len(got))
	}
	if _, err := listener.Accept(); err == nil {
		t.Fatal("listener still accepts after StopAll")
	}
}

func TestExpiredTunnelRemainsVisibleUntilRemoved(t *testing.T) {
	api := NewAPI()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	tunnel := &localTunnel{
		info:     Info{ID: "one", Status: "active"},
		listener: listener,
	}
	api.tunnels["one"] = tunnel

	api.expire("one", tunnel, errors.New("keepalive timeout"))

	infos := api.List()
	if len(infos) != 1 || infos[0].Status != "error" || infos[0].Error != "keepalive timeout" {
		t.Fatalf("List after expiration = %+v", infos)
	}
	if _, err := listener.Accept(); err == nil {
		t.Fatal("listener still accepts after tunnel expiration")
	}
	if err := api.Stop("one"); err != nil {
		t.Fatalf("Stop expired tunnel: %v", err)
	}
	if infos := api.List(); len(infos) != 0 {
		t.Fatalf("List returned %d tunnels after removal, want 0", len(infos))
	}
}
