package terminal

import (
	"testing"

	"galaxyterm/internal/session"
)

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
