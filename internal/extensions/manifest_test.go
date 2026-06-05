package extensions

import "testing"

func TestValidateManifestAcceptsValidManifest(t *testing.T) {
	manifest := Manifest{
		ID:         "galaxyterm-extension-mysql",
		Name:       "MySQL",
		Version:    "0.1.0",
		APIVersion: "v1",
		Providers:  []ProviderManifest{{Type: "mysql", NameKey: "extension.mysql"}},
	}

	if err := ValidateManifest(manifest); err != nil {
		t.Fatalf("ValidateManifest returned error: %v", err)
	}
}

func TestValidateManifestRejectsMissingRequiredFields(t *testing.T) {
	cases := []Manifest{
		{},
		{ID: "id", Name: "name", Version: "0.1.0", APIVersion: "v1"},
		{ID: "id", Name: "name", Version: "0.1.0", Providers: []ProviderManifest{{Type: "mysql"}}},
	}

	for _, manifest := range cases {
		if err := ValidateManifest(manifest); err == nil {
			t.Fatalf("ValidateManifest(%#v) returned nil error", manifest)
		}
	}
}
