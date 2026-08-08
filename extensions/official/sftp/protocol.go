package main

import "strings"

const (
	providerAPIVersion = "v1"
	providerType       = "sftp"
)

type protocolRequest struct {
	APIVersion      string         `json:"apiVersion"`
	RequestID       string         `json:"requestId"`
	ProviderType    string         `json:"providerType"`
	Operation       string         `json:"operation"`
	Config          map[string]any `json:"config,omitempty"`
	Auth            map[string]any `json:"auth,omitempty"`
	Path            string         `json:"path,omitempty"`
	DestinationPath string         `json:"destinationPath,omitempty"`
	Content         string         `json:"content,omitempty"`
	LocalPath       string         `json:"localPath,omitempty"`
	Features        []string       `json:"features,omitempty"`
}

type protocolResponse struct {
	RequestID string         `json:"requestId"`
	Result    any            `json:"result,omitempty"`
	Error     *providerError `json:"error,omitempty"`
}

type protocolProgressFrame struct {
	Type      string           `json:"type"`
	RequestID string           `json:"requestId"`
	Progress  transferProgress `json:"progress"`
}

type transferProgress struct {
	Bytes int64 `json:"bytes"`
	Total int64 `json:"total,omitempty"`
}

type providerError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable,omitempty"`
}

type normalizedRequest struct {
	RequestID       string
	Operation       string
	Host            string
	Port            int
	HostKeyPolicy   string
	KnownHostsPath  string
	AgentSocketPath string
	Username        string
	AuthType        string
	Password        string
	PrivateKey      string
	Passphrase      string
	Path            string
	DestinationPath string
	Content         string
	LocalPath       string
}

type fileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	Mode    string `json:"mode"`
	IsDir   bool   `json:"isDir"`
	ModTime string `json:"modTime"`
}

type requestError struct {
	code    string
	message string
}

func (err *requestError) Error() string {
	return err.message
}

func requiredString(values map[string]any, key string) (string, error) {
	value := stringValue(values, key)
	if value == "" {
		return "", &requestError{code: "invalid_request", message: "missing required field: " + key}
	}
	return value, nil
}

func stringValue(values map[string]any, key string) string {
	value, _ := values[key].(string)
	return strings.TrimSpace(value)
}

func secretValue(values map[string]any, key string) string {
	value, _ := values[key].(string)
	return value
}

func intValue(values map[string]any, key string) int {
	switch value := values[key].(type) {
	case float64:
		return int(value)
	case float32:
		return int(value)
	case int:
		return value
	case int64:
		return int(value)
	case uint64:
		return int(value)
	default:
		return 0
	}
}
