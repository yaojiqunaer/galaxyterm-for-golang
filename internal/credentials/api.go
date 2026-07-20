package credentials

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"

	"galaxyterm/internal/session"
)

const serviceName = "GalaxyTerm"

var credentialIdentifierPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$`)
var credentialFieldPattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._-]{0,63}$`)

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

type SaveProviderCredentialRequest struct {
	ID             string                 `json:"id"`
	ProviderType   string                 `json:"providerType"`
	PreviousFields []string               `json:"previousFields,omitempty"`
	Values         map[string]interface{} `json:"values"`
}

type ResolveProviderCredentialRequest struct {
	Auth map[string]interface{} `json:"auth"`
}

type ProviderCredentialRef struct {
	ID           string   `json:"id"`
	ProviderType string   `json:"providerType"`
	Fields       []string `json:"fields"`
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
	if ref.HasPassword && !hasExplicitCredentialValue(auth, "password") {
		if value, err := api.store.Get(serviceName, secretKey(ref.ID, "password")); err == nil {
			auth["password"] = value
		} else if !errors.Is(err, ErrNotFound) {
			return req, err
		}
	}
	if ref.HasPrivateKey && !hasExplicitCredentialValue(auth, "privateKey") {
		if value, err := api.store.Get(serviceName, secretKey(ref.ID, "privateKey")); err == nil {
			auth["privateKey"] = value
		} else if !errors.Is(err, ErrNotFound) {
			return req, err
		}
	}
	if ref.HasPassphrase && !hasExplicitCredentialValue(auth, "passphrase") {
		if value, err := api.store.Get(serviceName, secretKey(ref.ID, "passphrase")); err == nil {
			auth["passphrase"] = value
		} else if !errors.Is(err, ErrNotFound) {
			return req, err
		}
	}
	if ref.HasJumpPassword && !hasExplicitCredentialValue(auth, "jumpPassword") {
		if value, err := api.store.Get(serviceName, secretKey(ref.ID, "jumpPassword")); err == nil {
			auth["jumpPassword"] = value
		} else if !errors.Is(err, ErrNotFound) {
			return req, err
		}
	}
	req.Auth = auth
	return req, nil
}

func (api *API) SaveProviderCredential(req SaveProviderCredentialRequest) (ProviderCredentialRef, error) {
	if !credentialIdentifierPattern.MatchString(req.ID) {
		return ProviderCredentialRef{}, errors.New("invalid credential id")
	}
	if !credentialIdentifierPattern.MatchString(req.ProviderType) {
		return ProviderCredentialRef{}, errors.New("invalid credential provider type")
	}
	encodedValues := make(map[string]string, len(req.Values))
	for field, value := range req.Values {
		if !credentialFieldPattern.MatchString(field) {
			return ProviderCredentialRef{}, fmt.Errorf("invalid credential field: %s", field)
		}
		encoded, keep, err := encodeProviderCredentialValue(value)
		if err != nil {
			return ProviderCredentialRef{}, fmt.Errorf("invalid credential field %s: %w", field, err)
		}
		if keep {
			encodedValues[field] = encoded
		}
	}
	ref := ProviderCredentialRef{ID: req.ID, ProviderType: req.ProviderType, Fields: []string{}}
	for field, encoded := range encodedValues {
		if err := api.store.Set(serviceName, providerSecretKey(req.ProviderType, req.ID, field), encoded); err != nil {
			return ProviderCredentialRef{}, err
		}
		ref.Fields = append(ref.Fields, field)
	}
	sort.Strings(ref.Fields)
	activeFields := make(map[string]struct{}, len(ref.Fields))
	for _, field := range ref.Fields {
		activeFields[field] = struct{}{}
	}
	for _, field := range req.PreviousFields {
		if !credentialFieldPattern.MatchString(field) {
			continue
		}
		if _, keep := activeFields[field]; keep {
			continue
		}
		if err := api.store.Delete(serviceName, providerSecretKey(req.ProviderType, req.ID, field)); err != nil && !errors.Is(err, ErrNotFound) {
			return ProviderCredentialRef{}, err
		}
	}
	return ref, nil
}

func (api *API) ResolveProviderCredential(req ResolveProviderCredentialRequest) (map[string]interface{}, error) {
	auth := copyMap(req.Auth)
	delete(auth, "credentialRef")
	ref, ok := providerCredentialRef(req.Auth["credentialRef"])
	if !ok || ref.ID == "" || ref.ProviderType == "" {
		return auth, nil
	}
	if err := validateProviderCredentialRef(ref); err != nil {
		return nil, err
	}
	for _, field := range ref.Fields {
		if hasExplicitCredentialValue(auth, field) {
			continue
		}
		value, err := api.store.Get(serviceName, providerSecretKey(ref.ProviderType, ref.ID, field))
		if errors.Is(err, ErrNotFound) {
			continue
		}
		if err != nil {
			return nil, err
		}
		var decoded interface{}
		if err := json.Unmarshal([]byte(value), &decoded); err != nil {
			return nil, fmt.Errorf("decode credential field %s: %w", field, err)
		}
		auth[field] = decoded
	}
	return auth, nil
}

func hasExplicitCredentialValue(values map[string]interface{}, key string) bool {
	value, exists := values[key]
	if !exists || value == nil {
		return false
	}
	if text, ok := value.(string); ok {
		return text != ""
	}
	return true
}

func (api *API) DeleteProviderCredential(ref ProviderCredentialRef) error {
	if ref.ID == "" || ref.ProviderType == "" {
		return nil
	}
	if err := validateProviderCredentialRef(ref); err != nil {
		return err
	}
	var result error
	for _, field := range ref.Fields {
		if err := api.store.Delete(serviceName, providerSecretKey(ref.ProviderType, ref.ID, field)); err != nil && !errors.Is(err, ErrNotFound) {
			result = errors.Join(result, err)
		}
	}
	return result
}

func validateProviderCredentialRef(ref ProviderCredentialRef) error {
	if !credentialIdentifierPattern.MatchString(ref.ID) {
		return errors.New("invalid credential id")
	}
	if !credentialIdentifierPattern.MatchString(ref.ProviderType) {
		return errors.New("invalid credential provider type")
	}
	if len(ref.Fields) > 128 {
		return errors.New("too many credential fields")
	}
	for _, field := range ref.Fields {
		if !credentialFieldPattern.MatchString(field) {
			return fmt.Errorf("invalid credential field: %s", field)
		}
	}
	return nil
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

func providerSecretKey(providerType string, id string, field string) string {
	return fmt.Sprintf("provider:%s:%s:%s", providerType, id, field)
}

func providerCredentialRef(value interface{}) (ProviderCredentialRef, bool) {
	switch typed := value.(type) {
	case ProviderCredentialRef:
		return typed, true
	case map[string]interface{}:
		fields, _ := typed["fields"].([]string)
		if rawFields, ok := typed["fields"].([]interface{}); ok {
			fields = make([]string, 0, len(rawFields))
			for _, field := range rawFields {
				if text, ok := field.(string); ok {
					fields = append(fields, text)
				}
			}
		}
		return ProviderCredentialRef{
			ID:           stringFromMap(typed, "id"),
			ProviderType: stringFromMap(typed, "providerType"),
			Fields:       fields,
		}, true
	default:
		return ProviderCredentialRef{}, false
	}
}

func encodeProviderCredentialValue(value interface{}) (string, bool, error) {
	if value == nil || value == "" {
		return "", false, nil
	}
	switch value.(type) {
	case string, bool, float32, float64,
		int, int8, int16, int32, int64,
		uint, uint8, uint16, uint32, uint64:
		encoded, err := json.Marshal(value)
		return string(encoded), true, err
	default:
		return "", false, errors.New("only scalar values are supported")
	}
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
