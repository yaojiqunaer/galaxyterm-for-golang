package extensions

import (
	"fmt"
	"strings"
)

type Manifest struct {
	ID          string             `json:"id"`
	Name        string             `json:"name"`
	Version     string             `json:"version"`
	APIVersion  string             `json:"apiVersion"`
	Description string             `json:"description"`
	Providers   []ProviderManifest `json:"providers"`
	Locales     []string           `json:"locales"`
}

type ProviderManifest struct {
	Type         string   `json:"type"`
	NameKey      string   `json:"nameKey"`
	Description  string   `json:"description"`
	Category     string   `json:"category"`
	Capabilities []string `json:"capabilities"`
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
	if len(manifest.Providers) == 0 {
		return fmt.Errorf("missing extension providers")
	}
	for _, provider := range manifest.Providers {
		if strings.TrimSpace(provider.Type) == "" {
			return fmt.Errorf("missing provider type")
		}
	}
	return nil
}
