package terminal

import (
	"path/filepath"
	"testing"

	"galaxyterm/internal/extensions"
	"galaxyterm/internal/session"
)

type stubExtensionResolver struct {
	manifests []extensions.Manifest
	runtime   extensions.TerminalProviderRuntime
}

func (resolver stubExtensionResolver) ListInstalled() []extensions.Manifest {
	return resolver.manifests
}

func (resolver stubExtensionResolver) ResolveTerminalProvider(string) (extensions.TerminalProviderRuntime, error) {
	return resolver.runtime, nil
}

func TestSyncExtensionProvidersRegistersRunnableContributions(t *testing.T) {
	manager := session.NewManager(nil)
	RegisterBuiltInProviders(manager)
	manifest := extensions.Manifest{
		ID: "galaxyterm-extension-redis", Name: "Redis", Version: "0.1.0", APIVersion: "v1",
		Runtime: extensions.RuntimeManifest{Protocol: extensions.RuntimeProtocolStdioJSONV1, Entrypoint: "bin/extension"},
		Providers: []extensions.ProviderManifest{{
			Type: "redis", NameKey: "extension.redis.name", Capabilities: []string{"stream"},
			ConfigFields: []extensions.FileProviderFieldManifest{{Key: "host", Type: "string"}},
			AuthFields:   []extensions.FileProviderFieldManifest{{Key: "password", Type: "password"}},
		}},
	}
	resolver := stubExtensionResolver{
		manifests: []extensions.Manifest{manifest},
		runtime: extensions.TerminalProviderRuntime{
			Executable: filepath.Join(t.TempDir(), "extension"), Provider: manifest.Providers[0],
		},
	}

	if err := SyncExtensionProviders(manager, resolver); err != nil {
		t.Fatalf("SyncExtensionProviders returned error: %v", err)
	}
	providers := manager.ListProviders()
	if len(providers) != 3 || providers[1].Type != "redis" {
		t.Fatalf("providers = %#v, want local, redis and ssh", providers)
	}
	if len(providers[1].ConfigFields) != 1 || providers[1].ConfigFields[0].Key != "host" || len(providers[1].AuthFields) != 1 {
		t.Fatalf("provider fields = %#v / %#v, want manifest fields", providers[1].ConfigFields, providers[1].AuthFields)
	}
	if providers[1].ExtensionID != manifest.ID || providers[1].ExtensionVersion != manifest.Version {
		t.Fatalf("provider extension = %s@%s, want %s@%s", providers[1].ExtensionID, providers[1].ExtensionVersion, manifest.ID, manifest.Version)
	}
}

func TestSyncExtensionProvidersSkipsLegacyMetadataOnlyContributions(t *testing.T) {
	manager := session.NewManager(nil)
	RegisterBuiltInProviders(manager)
	resolver := stubExtensionResolver{manifests: []extensions.Manifest{{
		ID: "legacy", Name: "Legacy", Version: "0.1.0", APIVersion: "v1",
		Providers: []extensions.ProviderManifest{{Type: "redis"}},
	}}}

	if err := SyncExtensionProviders(manager, resolver); err != nil {
		t.Fatalf("SyncExtensionProviders returned error: %v", err)
	}
	if providers := manager.ListProviders(); len(providers) != 2 {
		t.Fatalf("providers = %#v, want built-ins only", providers)
	}
}

func TestSyncExtensionProvidersRejectsBuiltInConflicts(t *testing.T) {
	manager := session.NewManager(nil)
	RegisterBuiltInProviders(manager)
	resolver := stubExtensionResolver{manifests: []extensions.Manifest{{
		ID: "conflict", Name: "Conflict", Version: "0.1.0", APIVersion: "v1",
		Runtime:   extensions.RuntimeManifest{Protocol: extensions.RuntimeProtocolStdioJSONV1, Entrypoint: "bin/extension"},
		Providers: []extensions.ProviderManifest{{Type: "ssh"}},
	}}}

	if err := SyncExtensionProviders(manager, resolver); err == nil {
		t.Fatal("SyncExtensionProviders accepted a built-in provider conflict")
	}
}
