package extensions

import (
	"fmt"
	"math"
	"path"
	"regexp"
	"strings"
)

const RuntimeProtocolStdioJSONV1 = "stdio-json-v1"

var extensionIdentifierPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._+-]*$`)
var extensionFieldKeyPattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._-]*$`)

var fileProviderCapabilities = map[string]struct{}{
	"delete": {},
	"list":   {},
	"mkdir":  {},
	"read":   {},
	"rename": {},
	"stat":   {},
	"write":  {},
}

var fileProviderFieldTypes = map[string]struct{}{
	"boolean":  {},
	"number":   {},
	"password": {},
	"select":   {},
	"string":   {},
	"textarea": {},
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
	Type         string                      `json:"type"`
	Protocol     string                      `json:"protocol"`
	NameKey      string                      `json:"nameKey"`
	Description  string                      `json:"description"`
	Capabilities []string                    `json:"capabilities"`
	AuthMethods  []string                    `json:"authMethods"`
	ConfigFields []FileProviderFieldManifest `json:"configFields,omitempty"`
	AuthFields   []FileProviderFieldManifest `json:"authFields,omitempty"`
}

type FileProviderFieldManifest struct {
	Key            string                            `json:"key"`
	LabelKey       string                            `json:"labelKey,omitempty"`
	Label          string                            `json:"label,omitempty"`
	PlaceholderKey string                            `json:"placeholderKey,omitempty"`
	Placeholder    string                            `json:"placeholder,omitempty"`
	Type           string                            `json:"type"`
	Required       bool                              `json:"required,omitempty"`
	Default        any                               `json:"default,omitempty"`
	Min            *float64                          `json:"min,omitempty"`
	Max            *float64                          `json:"max,omitempty"`
	Options        []FileProviderFieldOptionManifest `json:"options,omitempty"`
}

type FileProviderFieldOptionManifest struct {
	Value    string `json:"value"`
	LabelKey string `json:"labelKey,omitempty"`
	Label    string `json:"label,omitempty"`
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
		if err := validateFileProviderFields(provider.ConfigFields, false); err != nil {
			return fmt.Errorf("invalid file provider %s config fields: %w", provider.Type, err)
		}
		if err := validateFileProviderFields(provider.AuthFields, true); err != nil {
			return fmt.Errorf("invalid file provider %s auth fields: %w", provider.Type, err)
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

func validateFileProviderFields(fields []FileProviderFieldManifest, authFields bool) error {
	keys := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		if !extensionFieldKeyPattern.MatchString(field.Key) {
			return fmt.Errorf("invalid field key: %s", field.Key)
		}
		if _, exists := keys[field.Key]; exists {
			return fmt.Errorf("duplicate field key: %s", field.Key)
		}
		keys[field.Key] = struct{}{}
		if _, known := fileProviderFieldTypes[field.Type]; !known {
			return fmt.Errorf("unknown field type: %s", field.Type)
		}
		if field.Type == "password" && !authFields {
			return fmt.Errorf("password field must be declared in authFields")
		}
		if authFields && field.Default != nil && (field.Type == "password" || field.Type == "string" || field.Type == "textarea") {
			return fmt.Errorf("auth field cannot declare a text default value: %s", field.Key)
		}
		if (field.Min != nil || field.Max != nil) && field.Type != "number" {
			return fmt.Errorf("only number fields can declare min or max: %s", field.Key)
		}
		if field.Min != nil && field.Max != nil && *field.Min > *field.Max {
			return fmt.Errorf("field min exceeds max: %s", field.Key)
		}
		if err := validateFileProviderFieldDefault(field); err != nil {
			return err
		}
		if field.Type == "select" {
			if len(field.Options) == 0 {
				return fmt.Errorf("select field has no options: %s", field.Key)
			}
			values := make(map[string]struct{}, len(field.Options))
			for _, option := range field.Options {
				if strings.TrimSpace(option.Value) == "" {
					return fmt.Errorf("select field has an empty option value: %s", field.Key)
				}
				if _, exists := values[option.Value]; exists {
					return fmt.Errorf("select field has duplicate option: %s", field.Key)
				}
				values[option.Value] = struct{}{}
			}
			if value, ok := field.Default.(string); ok && field.Default != nil {
				if _, exists := values[value]; !exists {
					return fmt.Errorf("select field default is not an option: %s", field.Key)
				}
			}
		}
	}
	return nil
}

func validateFileProviderFieldDefault(field FileProviderFieldManifest) error {
	if field.Default == nil {
		return nil
	}
	switch field.Type {
	case "string", "textarea", "password", "select":
		if _, ok := field.Default.(string); !ok {
			return fmt.Errorf("field default must be a string: %s", field.Key)
		}
	case "boolean":
		if _, ok := field.Default.(bool); !ok {
			return fmt.Errorf("field default must be a boolean: %s", field.Key)
		}
	case "number":
		value, ok := numericValue(field.Default)
		if !ok || math.IsNaN(value) || math.IsInf(value, 0) {
			return fmt.Errorf("field default must be a finite number: %s", field.Key)
		}
		if field.Min != nil && value < *field.Min {
			return fmt.Errorf("field default is below min: %s", field.Key)
		}
		if field.Max != nil && value > *field.Max {
			return fmt.Errorf("field default exceeds max: %s", field.Key)
		}
	}
	return nil
}

func numericValue(value any) (float64, bool) {
	switch number := value.(type) {
	case float64:
		return number, true
	case float32:
		return float64(number), true
	case int:
		return float64(number), true
	case int8:
		return float64(number), true
	case int16:
		return float64(number), true
	case int32:
		return float64(number), true
	case int64:
		return float64(number), true
	case uint:
		return float64(number), true
	case uint8:
		return float64(number), true
	case uint16:
		return float64(number), true
	case uint32:
		return float64(number), true
	case uint64:
		return float64(number), true
	default:
		return 0, false
	}
}

func isSafePackagePath(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" || strings.Contains(value, `\`) || strings.HasPrefix(value, "/") {
		return false
	}
	cleaned := path.Clean(value)
	return cleaned != "." && cleaned != ".." && !strings.HasPrefix(cleaned, "../") && cleaned == value
}
