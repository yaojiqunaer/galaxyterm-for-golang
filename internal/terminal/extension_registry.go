package terminal

import (
	"fmt"
	"strings"

	"galaxyterm/internal/extensions"
	"galaxyterm/internal/session"
)

const extensionProviderCategory = "extension"

type ExtensionProviderResolver interface {
	ListInstalled() []extensions.Manifest
	ResolveTerminalProvider(providerType string) (extensions.TerminalProviderRuntime, error)
}

func SyncExtensionProviders(manager *session.Manager, resolver ExtensionProviderResolver) error {
	if manager == nil || resolver == nil {
		return fmt.Errorf("terminal extension registry is unavailable")
	}
	seen := make(map[string]string)
	providers := make([]session.Provider, 0)
	for _, manifest := range resolver.ListInstalled() {
		if manifest.Runtime.Protocol != extensions.RuntimeProtocolStdioJSONV1 || strings.TrimSpace(manifest.Runtime.Entrypoint) == "" {
			continue
		}
		for _, contribution := range manifest.Providers {
			providerType := strings.TrimSpace(contribution.Type)
			if owner, exists := seen[providerType]; exists {
				return fmt.Errorf("terminal provider %s is contributed by both %s and %s", providerType, owner, manifest.ID)
			}
			seen[providerType] = manifest.ID
			providerTypeForFactory := providerType
			providers = append(providers, session.Provider{
				Type:         providerType,
				NameKey:      contribution.NameKey,
				Name:         manifest.Name,
				Description:  contribution.Description,
				Category:     extensionProviderCategory,
				Capabilities: append([]string(nil), contribution.Capabilities...),
				ConfigFields: extensionProviderFields(contribution.ConfigFields),
				AuthFields:   extensionProviderFields(contribution.AuthFields),
				NewDriver: func(request session.CreateSessionRequest) (session.Driver, error) {
					runtimeInfo, err := resolver.ResolveTerminalProvider(providerTypeForFactory)
					if err != nil {
						return nil, err
					}
					return newExtensionDriver(runtimeInfo, request), nil
				},
			})
		}
	}
	return manager.ReplaceProvidersByCategory(extensionProviderCategory, providers)
}

func extensionProviderFields(fields []extensions.FileProviderFieldManifest) []session.ProviderField {
	result := make([]session.ProviderField, 0, len(fields))
	for _, field := range fields {
		options := make([]session.ProviderFieldOption, 0, len(field.Options))
		for _, option := range field.Options {
			options = append(options, session.ProviderFieldOption{
				Value: option.Value, LabelKey: option.LabelKey, Label: option.Label,
			})
		}
		result = append(result, session.ProviderField{
			Key: field.Key, LabelKey: field.LabelKey, Label: field.Label,
			PlaceholderKey: field.PlaceholderKey, Placeholder: field.Placeholder,
			Type: field.Type, Required: field.Required, Default: field.Default,
			Min: field.Min, Max: field.Max, Options: options,
		})
	}
	return result
}
