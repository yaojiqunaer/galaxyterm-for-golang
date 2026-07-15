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
		Runtime: RuntimeManifest{
			Protocol:   "stdio-json-v1",
			Entrypoint: "bin/extension",
		},
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

func TestValidateManifestRejectsUnsafeFileProviderRuntime(t *testing.T) {
	base := Manifest{
		ID:         "galaxyterm-extension-files",
		Name:       "Files",
		Version:    "0.1.0",
		APIVersion: "v1",
		FileProviders: []FileProviderManifest{{
			Type: "sftp", Protocol: "sftp", Capabilities: []string{"list"},
		}},
	}
	cases := []Manifest{
		base,
		withRuntime(base, RuntimeManifest{Protocol: "http", Entrypoint: "bin/extension"}),
		withRuntime(base, RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "../extension"}),
		withRuntime(base, RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "/tmp/extension"}),
	}

	for _, manifest := range cases {
		if err := ValidateManifest(manifest); err == nil {
			t.Fatalf("ValidateManifest(%#v) returned nil error", manifest)
		}
	}
}

func TestValidateManifestRejectsUnknownOrDuplicateFileProviderContributions(t *testing.T) {
	base := Manifest{
		ID:         "galaxyterm-extension-files",
		Name:       "Files",
		Version:    "0.1.0",
		APIVersion: "v1",
		Runtime:    RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "bin/extension"},
	}
	cases := []Manifest{
		withFileProviders(base, []FileProviderManifest{{Type: "sftp", Protocol: "sftp", Capabilities: []string{"teleport"}}}),
		withFileProviders(base, []FileProviderManifest{
			{Type: "sftp", Protocol: "sftp", Capabilities: []string{"list"}},
			{Type: "sftp", Protocol: "sftp-alt", Capabilities: []string{"read"}},
		}),
	}

	for _, manifest := range cases {
		if err := ValidateManifest(manifest); err == nil {
			t.Fatalf("ValidateManifest(%#v) returned nil error", manifest)
		}
	}
}

func TestValidateManifestRejectsInvalidFileProvider(t *testing.T) {
	base := Manifest{
		ID:         "galaxyterm-extension-files",
		Name:       "Files",
		Version:    "0.1.0",
		APIVersion: "v1",
		Runtime:    RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "bin/extension"},
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

func withRuntime(manifest Manifest, runtime RuntimeManifest) Manifest {
	manifest.Runtime = runtime
	return manifest
}

func withFileProviders(manifest Manifest, providers []FileProviderManifest) Manifest {
	manifest.FileProviders = providers
	return manifest
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
