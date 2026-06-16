package credentials

import (
	"testing"

	"galaxyterm/internal/session"
)

func TestSaveResolveAndDeleteSSHCredential(t *testing.T) {
	store := newMemoryStore()
	api := NewAPIWithStore(store)

	ref, err := api.SaveSSHCredential(SaveSSHCredentialRequest{
		ID:           "profile-1",
		Password:     "secret",
		Passphrase:   "key-passphrase",
		JumpPassword: "jump-secret",
	})
	if err != nil {
		t.Fatalf("SaveSSHCredential returned error: %v", err)
	}
	if ref.ID != "profile-1" || !ref.HasPassword || !ref.HasPassphrase || !ref.HasJumpPassword {
		t.Fatalf("unexpected ref: %+v", ref)
	}

	resolved, err := api.ResolveSSHRequest(session.CreateSessionRequest{
		ProviderType: "ssh",
		Config:       map[string]interface{}{"host": "10.0.0.1"},
		Auth: map[string]interface{}{
			"username":      "root",
			"credentialRef": ref,
		},
	})
	if err != nil {
		t.Fatalf("ResolveSSHRequest returned error: %v", err)
	}
	if resolved.Auth["password"] != "secret" {
		t.Fatalf("password not resolved: %+v", resolved.Auth)
	}
	if resolved.Auth["passphrase"] != "key-passphrase" {
		t.Fatalf("passphrase not resolved: %+v", resolved.Auth)
	}
	if resolved.Auth["jumpPassword"] != "jump-secret" {
		t.Fatalf("jump password not resolved: %+v", resolved.Auth)
	}

	if err := api.DeleteSSHCredential(ref.ID); err != nil {
		t.Fatalf("DeleteSSHCredential returned error: %v", err)
	}
	resolved, err = api.ResolveSSHRequest(session.CreateSessionRequest{
		ProviderType: "ssh",
		Auth:         map[string]interface{}{"credentialRef": ref},
	})
	if err != nil {
		t.Fatalf("ResolveSSHRequest after delete returned error: %v", err)
	}
	if _, ok := resolved.Auth["password"]; ok {
		t.Fatalf("deleted password should not be resolved: %+v", resolved.Auth)
	}
}
