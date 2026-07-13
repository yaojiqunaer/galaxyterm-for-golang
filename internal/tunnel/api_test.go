package tunnel

import (
	"net"
	"testing"
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
}

func TestValidateStartRequestRequiresCoreFields(t *testing.T) {
	_, err := validateStartRequest(StartRequest{})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestTunnelAuthMethodsSupportPassword(t *testing.T) {
	methods, err := tunnelAuthMethods(StartRequest{SSHPassword: "secret"})
	if err != nil {
		t.Fatalf("tunnelAuthMethods returned error: %v", err)
	}
	if len(methods) != 1 {
		t.Fatalf("len(methods) = %d, want 1", len(methods))
	}
}

func TestTunnelAuthMethodsRequirePrivateKeyContent(t *testing.T) {
	_, err := tunnelAuthMethods(StartRequest{SSHAuthType: "privateKey"})
	if err == nil {
		t.Fatal("expected private key validation error")
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
