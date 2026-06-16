package credentials

import (
	"errors"
	"fmt"

	"galaxyterm/internal/session"
)

const serviceName = "GalaxyTerm"

type API struct {
	store Store
}

type Store interface {
	Delete(service string, user string) error
	Get(service string, user string) (string, error)
	Set(service string, user string, secret string) error
}

type SaveSSHCredentialRequest struct {
	ID           string `json:"id"`
	Password     string `json:"password"`
	PrivateKey   string `json:"privateKey"`
	Passphrase   string `json:"passphrase"`
	JumpPassword string `json:"jumpPassword"`
}

type SSHCredentialRef struct {
	ID              string `json:"id"`
	HasPassword     bool   `json:"hasPassword"`
	HasPrivateKey   bool   `json:"hasPrivateKey"`
	HasPassphrase   bool   `json:"hasPassphrase"`
	HasJumpPassword bool   `json:"hasJumpPassword"`
}

func NewAPI() *API {
	return NewAPIWithStore(keyringStore{})
}

func NewAPIWithStore(store Store) *API {
	return &API{store: store}
}

func (api *API) SaveSSHCredential(req SaveSSHCredentialRequest) (SSHCredentialRef, error) {
	if req.ID == "" {
		return SSHCredentialRef{}, errors.New("credential id is required")
	}
	ref := SSHCredentialRef{ID: req.ID}
	if err := api.setOrDelete(secretKey(req.ID, "password"), req.Password); err != nil {
		return ref, err
	}
	ref.HasPassword = req.Password != ""
	if err := api.setOrDelete(secretKey(req.ID, "privateKey"), req.PrivateKey); err != nil {
		return ref, err
	}
	ref.HasPrivateKey = req.PrivateKey != ""
	if err := api.setOrDelete(secretKey(req.ID, "passphrase"), req.Passphrase); err != nil {
		return ref, err
	}
	ref.HasPassphrase = req.Passphrase != ""
	if err := api.setOrDelete(secretKey(req.ID, "jumpPassword"), req.JumpPassword); err != nil {
		return ref, err
	}
	ref.HasJumpPassword = req.JumpPassword != ""
	return ref, nil
}

func (api *API) DeleteSSHCredential(id string) error {
	if id == "" {
		return nil
	}
	var result error
	for _, field := range []string{"password", "privateKey", "passphrase", "jumpPassword"} {
		if err := api.store.Delete(serviceName, secretKey(id, field)); err != nil && !errors.Is(err, ErrNotFound) {
			result = errors.Join(result, err)
		}
	}
	return result
}

func (api *API) ResolveSSHRequest(req session.CreateSessionRequest) (session.CreateSessionRequest, error) {
	if req.ProviderType != "ssh" {
		return req, nil
	}
	ref, ok := credentialRef(req.Auth["credentialRef"])
	if !ok || ref.ID == "" {
		return req, nil
	}
	auth := copyMap(req.Auth)
	if ref.HasPassword {
		if value, err := api.store.Get(serviceName, secretKey(ref.ID, "password")); err == nil {
			auth["password"] = value
		} else if !errors.Is(err, ErrNotFound) {
			return req, err
		}
	}
	if ref.HasPrivateKey {
		if value, err := api.store.Get(serviceName, secretKey(ref.ID, "privateKey")); err == nil {
			auth["privateKey"] = value
		} else if !errors.Is(err, ErrNotFound) {
			return req, err
		}
	}
	if ref.HasPassphrase {
		if value, err := api.store.Get(serviceName, secretKey(ref.ID, "passphrase")); err == nil {
			auth["passphrase"] = value
		} else if !errors.Is(err, ErrNotFound) {
			return req, err
		}
	}
	if ref.HasJumpPassword {
		if value, err := api.store.Get(serviceName, secretKey(ref.ID, "jumpPassword")); err == nil {
			auth["jumpPassword"] = value
		} else if !errors.Is(err, ErrNotFound) {
			return req, err
		}
	}
	req.Auth = auth
	return req, nil
}

func (api *API) setOrDelete(key string, value string) error {
	if value == "" {
		if err := api.store.Delete(serviceName, key); err != nil && !errors.Is(err, ErrNotFound) {
			return err
		}
		return nil
	}
	return api.store.Set(serviceName, key, value)
}

func credentialRef(value interface{}) (SSHCredentialRef, bool) {
	switch typed := value.(type) {
	case SSHCredentialRef:
		return typed, true
	case map[string]interface{}:
		return SSHCredentialRef{
			ID:              stringFromMap(typed, "id"),
			HasPassword:     boolFromMap(typed, "hasPassword"),
			HasPrivateKey:   boolFromMap(typed, "hasPrivateKey"),
			HasPassphrase:   boolFromMap(typed, "hasPassphrase"),
			HasJumpPassword: boolFromMap(typed, "hasJumpPassword"),
		}, true
	default:
		return SSHCredentialRef{}, false
	}
}

func copyMap(source map[string]interface{}) map[string]interface{} {
	target := make(map[string]interface{}, len(source))
	for key, value := range source {
		target[key] = value
	}
	return target
}

func secretKey(id string, field string) string {
	return fmt.Sprintf("ssh:%s:%s", id, field)
}

func stringFromMap(values map[string]interface{}, key string) string {
	if value, ok := values[key].(string); ok {
		return value
	}
	return ""
}

func boolFromMap(values map[string]interface{}, key string) bool {
	if value, ok := values[key].(bool); ok {
		return value
	}
	return false
}
