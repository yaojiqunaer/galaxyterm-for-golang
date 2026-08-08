package credentials

import (
	"errors"
	"reflect"
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

func TestResolveSSHRequestKeepsExplicitOneTimeSecret(t *testing.T) {
	store := newMemoryStore()
	api := NewAPIWithStore(store)
	ref, err := api.SaveSSHCredential(SaveSSHCredentialRequest{ID: "profile-1", Password: "stored"})
	if err != nil {
		t.Fatalf("SaveSSHCredential returned error: %v", err)
	}

	resolved, err := api.ResolveSSHRequest(session.CreateSessionRequest{
		ProviderType: "ssh",
		Auth: map[string]interface{}{
			"credentialRef": ref,
			"password":      "one-time",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSSHRequest returned error: %v", err)
	}
	if resolved.Auth["password"] != "one-time" {
		t.Fatalf("password = %v, want explicit one-time value", resolved.Auth["password"])
	}
}

func TestSaveSSHCredentialMigratesToAgentAndPreservesJumpPassword(t *testing.T) {
	store := newMemoryStore()
	api := NewAPIWithStore(store)
	_, err := api.SaveSSHCredential(SaveSSHCredentialRequest{
		ID:           "profile-1",
		Password:     "target-secret",
		PrivateKey:   "target-key",
		Passphrase:   "target-passphrase",
		JumpPassword: "jump-secret",
	})
	if err != nil {
		t.Fatalf("seed SSH credential: %v", err)
	}

	ref, err := api.SaveSSHCredential(SaveSSHCredentialRequest{
		ID:               "profile-1",
		AuthType:         "agent",
		PreserveExisting: true,
	})
	if err != nil {
		t.Fatalf("migrate SSH credential to agent: %v", err)
	}
	if ref.HasPassword || ref.HasPrivateKey || ref.HasPassphrase || !ref.HasJumpPassword {
		t.Fatalf("unexpected migrated ref: %+v", ref)
	}
	for _, field := range []string{"password", "privateKey", "passphrase"} {
		if _, getErr := store.Get(serviceName, secretKey(ref.ID, field)); !errors.Is(getErr, ErrNotFound) {
			t.Fatalf("inactive target credential %s must be deleted, got %v", field, getErr)
		}
	}
	if value, getErr := store.Get(serviceName, secretKey(ref.ID, "jumpPassword")); getErr != nil || value != "jump-secret" {
		t.Fatalf("jump password = %q, %v; want preserved value", value, getErr)
	}
}

func TestSaveSSHCredentialPreservesActivePasswordDuringJumpPasswordUpdate(t *testing.T) {
	store := newMemoryStore()
	api := NewAPIWithStore(store)
	_, err := api.SaveSSHCredential(SaveSSHCredentialRequest{
		ID:       "profile-1",
		Password: "target-secret",
	})
	if err != nil {
		t.Fatalf("seed SSH credential: %v", err)
	}

	ref, err := api.SaveSSHCredential(SaveSSHCredentialRequest{
		ID:               "profile-1",
		AuthType:         "password",
		JumpPassword:     "new-jump-secret",
		PreserveExisting: true,
	})
	if err != nil {
		t.Fatalf("update jump password: %v", err)
	}
	if !ref.HasPassword || !ref.HasJumpPassword {
		t.Fatalf("unexpected updated ref: %+v", ref)
	}
	if value, getErr := store.Get(serviceName, secretKey(ref.ID, "password")); getErr != nil || value != "target-secret" {
		t.Fatalf("target password = %q, %v; want preserved value", value, getErr)
	}
}

func TestSaveResolveAndDeleteProviderCredential(t *testing.T) {
	store := newMemoryStore()
	api := NewAPIWithStore(store)

	ref, err := api.SaveProviderCredential(SaveProviderCredentialRequest{
		ID:           "s3-production",
		ProviderType: "s3",
		Values: map[string]interface{}{
			"accessKey": "AKIAEXAMPLE",
			"secretKey": "secret",
			"pathStyle": true,
		},
	})
	if err != nil {
		t.Fatalf("SaveProviderCredential returned error: %v", err)
	}
	if ref.ID != "s3-production" || ref.ProviderType != "s3" {
		t.Fatalf("unexpected ref: %+v", ref)
	}
	if !reflect.DeepEqual(ref.Fields, []string{"accessKey", "pathStyle", "secretKey"}) {
		t.Fatalf("unexpected credential fields: %+v", ref.Fields)
	}

	resolved, err := api.ResolveProviderCredential(ResolveProviderCredentialRequest{
		Auth: map[string]interface{}{"credentialRef": ref},
	})
	if err != nil {
		t.Fatalf("ResolveProviderCredential returned error: %v", err)
	}
	if resolved["accessKey"] != "AKIAEXAMPLE" || resolved["secretKey"] != "secret" || resolved["pathStyle"] != true {
		t.Fatalf("credential values not resolved: %+v", resolved)
	}
	if _, ok := resolved["credentialRef"]; ok {
		t.Fatalf("credential reference must not be sent to a provider: %+v", resolved)
	}
	updatedRef, err := api.SaveProviderCredential(SaveProviderCredentialRequest{
		ID:             ref.ID,
		ProviderType:   ref.ProviderType,
		PreviousFields: ref.Fields,
		Values:         map[string]interface{}{"accessKey": "UPDATED"},
	})
	if err != nil {
		t.Fatalf("updating provider credential returned error: %v", err)
	}
	if !reflect.DeepEqual(updatedRef.Fields, []string{"accessKey"}) {
		t.Fatalf("unexpected updated fields: %+v", updatedRef.Fields)
	}
	if _, err := store.Get(serviceName, providerSecretKey(ref.ProviderType, ref.ID, "secretKey")); !errors.Is(err, ErrNotFound) {
		t.Fatalf("removed credential field must be deleted, got: %v", err)
	}
	ref = updatedRef

	if err := api.DeleteProviderCredential(ref); err != nil {
		t.Fatalf("DeleteProviderCredential returned error: %v", err)
	}
	resolved, err = api.ResolveProviderCredential(ResolveProviderCredentialRequest{
		Auth: map[string]interface{}{"credentialRef": ref},
	})
	if err != nil {
		t.Fatalf("ResolveProviderCredential after delete returned error: %v", err)
	}
	if len(resolved) != 0 {
		t.Fatalf("deleted values should not be resolved: %+v", resolved)
	}
}

func TestResolveProviderCredentialKeepsExplicitOneTimeValue(t *testing.T) {
	store := newMemoryStore()
	api := NewAPIWithStore(store)
	ref, err := api.SaveProviderCredential(SaveProviderCredentialRequest{
		ID: "redis-production", ProviderType: "redis", Values: map[string]interface{}{"password": "stored"},
	})
	if err != nil {
		t.Fatalf("SaveProviderCredential returned error: %v", err)
	}

	resolved, err := api.ResolveProviderCredential(ResolveProviderCredentialRequest{Auth: map[string]interface{}{
		"credentialRef": ref,
		"password":      "one-time",
	}})
	if err != nil {
		t.Fatalf("ResolveProviderCredential returned error: %v", err)
	}
	if resolved["password"] != "one-time" {
		t.Fatalf("password = %v, want explicit one-time value", resolved["password"])
	}
}

func TestSaveProviderCredentialRejectsUnsafeIdentity(t *testing.T) {
	api := NewAPIWithStore(newMemoryStore())
	_, err := api.SaveProviderCredential(SaveProviderCredentialRequest{
		ID:           "profile-1",
		ProviderType: "../../s3",
		Values:       map[string]interface{}{"secretKey": "secret"},
	})
	if err == nil {
		t.Fatal("expected unsafe provider type to be rejected")
	}
	_, err = api.ResolveProviderCredential(ResolveProviderCredentialRequest{
		Auth: map[string]interface{}{
			"credentialRef": map[string]interface{}{
				"id":           "profile-1",
				"providerType": "s3:another-profile",
				"fields":       []interface{}{"secretKey"},
			},
		},
	})
	if err == nil {
		t.Fatal("expected unsafe stored credential reference to be rejected")
	}
}
