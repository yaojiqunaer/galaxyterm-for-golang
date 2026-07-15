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

func TestValidateManifestAcceptsFileTransferOnlyExtension(t *testing.T) {
	manifest := Manifest{
		ID:         "galaxyterm-extension-s3",
		Name:       "S3",
		Version:    "0.1.0",
		APIVersion: "v1",
		FileProviders: []FileProviderManifest{{
			Type:         "s3",
			Protocol:     "s3",
			NameKey:      "extension.s3.name",
			Capabilities: []string{"list", "read", "write", "delete"},
		}},
	}

	if err := ValidateManifest(manifest); err != nil {
		t.Fatalf("ValidateManifest returned error for file transfer extension: %v", err)
	}
}

func TestValidateManifestRejectsInvalidFileProvider(t *testing.T) {
	base := Manifest{
		ID:         "galaxyterm-extension-files",
		Name:       "Files",
		Version:    "0.1.0",
		APIVersion: "v1",
	}
	cases := []Manifest{
		{ID: base.ID, Name: base.Name, Version: base.Version, APIVersion: base.APIVersion, FileProviders: []FileProviderManifest{{Protocol: "ftp"}}},
		{ID: base.ID, Name: base.Name, Version: base.Version, APIVersion: base.APIVersion, FileProviders: []FileProviderManifest{{Type: "ftp"}}},
	}

	for _, manifest := range cases {
		if err := ValidateManifest(manifest); err == nil {
			t.Fatalf("ValidateManifest(%#v) returned nil error", manifest)
		}
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
