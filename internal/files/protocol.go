package files

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"galaxyterm/internal/extensions"
)

const defaultProviderTimeout = 45 * time.Second

const defaultTransferTimeout = 30 * time.Minute

var (
	ErrMismatchedResponse    = errors.New("file provider response id does not match request")
	ErrProviderTimeout       = errors.New("file provider operation timed out")
	ErrProviderTypeRequired  = errors.New("file provider type is required")
	ErrUnsupportedCapability = errors.New("file provider capability is not supported")
)

type ProviderResolver interface {
	ResolveFileProvider(providerType string) (extensions.FileProviderRuntime, error)
}

type API struct {
	resolver        ProviderResolver
	timeout         time.Duration
	transferTimeout time.Duration
	contextProvider func() context.Context
	dialogs         fileDialogs
}

func NewAPI(resolvers ...ProviderResolver) *API {
	var resolver ProviderResolver
	if len(resolvers) > 0 {
		resolver = resolvers[0]
	}
	return &API{
		resolver:        resolver,
		timeout:         defaultProviderTimeout,
		transferTimeout: defaultTransferTimeout,
	}
}

func NewDesktopAPI(resolver ProviderResolver, contextProvider func() context.Context) *API {
	api := NewAPI(resolver)
	api.contextProvider = contextProvider
	api.dialogs = wailsFileDialogs{}
	return api
}

type FileOperationRequest struct {
	ProviderType    string         `json:"providerType"`
	Config          map[string]any `json:"config,omitempty"`
	Auth            map[string]any `json:"auth,omitempty"`
	Path            string         `json:"path,omitempty"`
	DestinationPath string         `json:"destinationPath,omitempty"`
	Content         string         `json:"content,omitempty"`
	localPath       string
}

type FileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	Mode    string `json:"mode"`
	IsDir   bool   `json:"isDir"`
	ModTime string `json:"modTime"`
}

type ProviderError struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Retryable bool           `json:"retryable,omitempty"`
	Details   map[string]any `json:"details,omitempty"`
}

func (err *ProviderError) Error() string {
	if err == nil {
		return ""
	}
	if err.Message != "" {
		return err.Message
	}
	return err.Code
}

func (api *API) List(request FileOperationRequest) ([]FileEntry, error) {
	var result struct {
		Entries []FileEntry `json:"entries"`
	}
	if err := api.invoke("list", request, &result); err != nil {
		return nil, err
	}
	if result.Entries == nil {
		return []FileEntry{}, nil
	}
	return result.Entries, nil
}

func (api *API) ReadFile(request FileOperationRequest) (string, error) {
	var result struct {
		Content string `json:"content"`
	}
	if err := api.invoke("read", request, &result); err != nil {
		return "", err
	}
	return result.Content, nil
}

func (api *API) WriteFile(request FileOperationRequest) error {
	return api.invoke("write", request, nil)
}

func (api *API) Mkdir(request FileOperationRequest) error {
	return api.invoke("mkdir", request, nil)
}

func (api *API) Rename(request FileOperationRequest) error {
	return api.invoke("rename", request, nil)
}

func (api *API) Delete(request FileOperationRequest) error {
	return api.invoke("delete", request, nil)
}

func (api *API) invoke(operation string, request FileOperationRequest, result any) error {
	return api.invokeWithTimeout(operation, request, result, api.timeout)
}

func (api *API) invokeWithTimeout(operation string, request FileOperationRequest, result any, timeout time.Duration) error {
	normalized, err := normalizeFileOperation(operation, request)
	if err != nil {
		return err
	}
	if api.resolver == nil {
		return fmt.Errorf("resolve file provider %q: extension registry unavailable", normalized.ProviderType)
	}
	runtimeInfo, err := api.resolver.ResolveFileProvider(normalized.ProviderType)
	if err != nil {
		return fmt.Errorf("resolve file provider %q: %w", normalized.ProviderType, err)
	}
	if !hasCapability(runtimeInfo.Provider.Capabilities, operation) {
		return fmt.Errorf("%w: %s", ErrUnsupportedCapability, operation)
	}
	return runSidecar(runtimeInfo, operation, normalized, result, timeout)
}

func normalizeFileOperation(operation string, request FileOperationRequest) (FileOperationRequest, error) {
	request.ProviderType = strings.TrimSpace(request.ProviderType)
	request.Path = strings.TrimSpace(request.Path)
	request.DestinationPath = strings.TrimSpace(request.DestinationPath)
	if request.ProviderType == "" {
		return request, ErrProviderTypeRequired
	}
	if operation == "list" && request.Path == "" {
		request.Path = "."
	}
	if operation != "list" && request.Path == "" {
		return request, fmt.Errorf("missing required field: path")
	}
	if operation == "rename" && request.DestinationPath == "" {
		return request, fmt.Errorf("missing required field: destinationPath")
	}
	return request, nil
}

func hasCapability(capabilities []string, operation string) bool {
	for _, capability := range capabilities {
		if capability == operation {
			return true
		}
	}
	return false
}

func ParentPath(current string) string {
	current = strings.TrimSpace(current)
	if current == "" || current == "." {
		return "."
	}
	cleaned := path.Clean(current)
	if cleaned == "/" {
		return "/"
	}
	parent := path.Dir(cleaned)
	if parent == "." && strings.HasPrefix(cleaned, "/") {
		return "/"
	}
	return parent
}
