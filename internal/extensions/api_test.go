package extensions

import "testing"

func TestRegisterInstalledValidatesAndListsManifest(t *testing.T) {
	api := NewAPI()
	manifest := Manifest{
		ID:         "galaxyterm-extension-redis",
		Name:       "Redis",
		Version:    "0.1.0",
		APIVersion: "v1",
		Providers:  []ProviderManifest{{Type: "redis"}},
	}

	if err := api.RegisterInstalled(manifest); err != nil {
		t.Fatalf("RegisterInstalled returned error: %v", err)
	}

	installed := api.ListInstalled()
	if len(installed) != 1 || installed[0].ID != manifest.ID {
		t.Fatalf("installed = %#v, want one redis manifest", installed)
	}
}
