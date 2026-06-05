package tunnel

import "testing"

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
