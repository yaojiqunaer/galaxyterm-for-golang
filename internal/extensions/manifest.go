package extensions

import (
	"fmt"
	"path"
	"regexp"
	"strings"
)

const RuntimeProtocolStdioJSONV1 = "stdio-json-v1"

var extensionIdentifierPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._+-]*$`)

var fileProviderCapabilities = map[string]struct{}{
	"delete": {},
	"list":   {},
	"mkdir":  {},
	"read":   {},
	"rename": {},
	"stat":   {},
	"write":  {},
}

type Manifest struct {
	ID            string                 `json:"id"`
	Name          string                 `json:"name"`
	Version       string                 `json:"version"`
	APIVersion    string                 `json:"apiVersion"`
	Description   string                 `json:"description"`
	Runtime       RuntimeManifest        `json:"runtime,omitempty"`
	Providers     []ProviderManifest     `json:"providers,omitempty"`
	FileProviders []FileProviderManifest `json:"fileProviders,omitempty"`
	Locales       []string               `json:"locales,omitempty"`
}

type RuntimeManifest struct {
	Protocol   string `json:"protocol"`
	Entrypoint string `json:"entrypoint"`
}

type ProviderManifest struct {
	Type         string   `json:"type"`
	NameKey      string   `json:"nameKey"`
	Description  string   `json:"description"`
	Category     string   `json:"category"`
	Capabilities []string `json:"capabilities"`
}

// FileProviderManifest contributes a protocol adapter to the shared remote file workspace.
// The executable stays in the extension package; the core only consumes this metadata.
type FileProviderManifest struct {
	Type         string   `json:"type"`
	Protocol     string   `json:"protocol"`
	NameKey      string   `json:"nameKey"`
	Description  string   `json:"description"`
	Capabilities []string `json:"capabilities"`
	AuthMethods  []string `json:"authMethods"`
}

func ValidateManifest(manifest Manifest) error {
	if strings.TrimSpace(manifest.ID) == "" {
		return fmt.Errorf("missing extension id")
	}
	if strings.TrimSpace(manifest.Name) == "" {
		return fmt.Errorf("missing extension name")
	}
	if strings.TrimSpace(manifest.Version) == "" {
		return fmt.Errorf("missing extension version")
	}
	if strings.TrimSpace(manifest.APIVersion) == "" {
		return fmt.Errorf("missing extension apiVersion")
	}
	if !extensionIdentifierPattern.MatchString(manifest.ID) {
		return fmt.Errorf("invalid extension id")
	}
	if !extensionIdentifierPattern.MatchString(manifest.Version) {
		return fmt.Errorf("invalid extension version")
	}
	if len(manifest.Providers) == 0 && len(manifest.FileProviders) == 0 {
		return fmt.Errorf("missing extension contributions")
	}
	for _, provider := range manifest.Providers {
		if strings.TrimSpace(provider.Type) == "" {
			return fmt.Errorf("missing provider type")
		}
	}
	fileProviderTypes := make(map[string]struct{}, len(manifest.FileProviders))
	for _, provider := range manifest.FileProviders {
		if strings.TrimSpace(provider.Type) == "" {
			return fmt.Errorf("missing file provider type")
		}
		if strings.TrimSpace(provider.Protocol) == "" {
			return fmt.Errorf("missing file provider protocol")
		}
		if _, exists := fileProviderTypes[provider.Type]; exists {
			return fmt.Errorf("duplicate file provider type: %s", provider.Type)
		}
		fileProviderTypes[provider.Type] = struct{}{}
		for _, capability := range provider.Capabilities {
			if _, known := fileProviderCapabilities[capability]; !known {
				return fmt.Errorf("unknown file provider capability: %s", capability)
			}
		}
	}
	if len(manifest.FileProviders) > 0 {
		if manifest.Runtime.Protocol != RuntimeProtocolStdioJSONV1 {
			return fmt.Errorf("unsupported extension runtime protocol: %s", manifest.Runtime.Protocol)
		}
		if !isSafePackagePath(manifest.Runtime.Entrypoint) {
			return fmt.Errorf("invalid extension runtime entrypoint")
		}
	}
	return nil
}

func isSafePackagePath(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" || strings.Contains(value, `\`) || strings.HasPrefix(value, "/") {
		return false
	}
	cleaned := path.Clean(value)
	return cleaned != "." && cleaned != ".." && !strings.HasPrefix(cleaned, "../") && cleaned == value
}
