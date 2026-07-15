package extensions

import (
	"fmt"
	"strings"
)

type Manifest struct {
	ID            string                 `json:"id"`
	Name          string                 `json:"name"`
	Version       string                 `json:"version"`
	APIVersion    string                 `json:"apiVersion"`
	Description   string                 `json:"description"`
	Providers     []ProviderManifest     `json:"providers,omitempty"`
	FileProviders []FileProviderManifest `json:"fileProviders,omitempty"`
	Locales       []string               `json:"locales,omitempty"`
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
	if len(manifest.Providers) == 0 && len(manifest.FileProviders) == 0 {
		return fmt.Errorf("missing extension contributions")
	}
	for _, provider := range manifest.Providers {
		if strings.TrimSpace(provider.Type) == "" {
			return fmt.Errorf("missing provider type")
		}
	}
	for _, provider := range manifest.FileProviders {
		if strings.TrimSpace(provider.Type) == "" {
			return fmt.Errorf("missing file provider type")
		}
		if strings.TrimSpace(provider.Protocol) == "" {
			return fmt.Errorf("missing file provider protocol")
		}
	}
	return nil
}
