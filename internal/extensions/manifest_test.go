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

func TestValidateManifestAcceptsRunnableTerminalExtension(t *testing.T) {
	manifest := Manifest{
		ID:         "galaxyterm-extension-redis",
		Name:       "Redis",
		Version:    "0.1.0",
		APIVersion: "v1",
		Runtime: RuntimeManifest{
			Protocol:   RuntimeProtocolStdioJSONV1,
			Entrypoint: "bin/extension",
		},
		Providers: []ProviderManifest{{
			Type: "redis", NameKey: "extension.redis.name",
			ConfigFields: []FileProviderFieldManifest{{Key: "host", Type: "string", Required: true}},
			AuthFields:   []FileProviderFieldManifest{{Key: "password", Type: "password"}},
		}},
	}

	if err := ValidateManifest(manifest); err != nil {
		t.Fatalf("ValidateManifest returned error for terminal extension: %v", err)
	}
}

func TestValidateManifestRejectsInvalidTerminalProviderFields(t *testing.T) {
	base := Manifest{
		ID:         "galaxyterm-extension-redis",
		Name:       "Redis",
		Version:    "0.1.0",
		APIVersion: "v1",
		Runtime:    RuntimeManifest{Protocol: RuntimeProtocolStdioJSONV1, Entrypoint: "bin/extension"},
	}
	cases := []ProviderManifest{
		{Type: "redis", ConfigFields: []FileProviderFieldManifest{{Key: "password", Type: "password"}}},
		{Type: "redis", ConfigFields: []FileProviderFieldManifest{{Key: "host", Type: "string"}, {Key: "host", Type: "string"}}},
		{Type: "redis", AuthFields: []FileProviderFieldManifest{{Key: "password", Type: "password", Default: "secret"}}},
	}

	for _, provider := range cases {
		manifest := base
		manifest.Providers = []ProviderManifest{provider}
		if err := ValidateManifest(manifest); err == nil {
			t.Fatalf("ValidateManifest accepted invalid terminal provider fields: %#v", provider)
		}
	}
}

func TestValidateManifestRejectsInvalidTerminalRuntimeAndDuplicateProviders(t *testing.T) {
	base := Manifest{
		ID:         "galaxyterm-extension-database",
		Name:       "Database terminals",
		Version:    "0.1.0",
		APIVersion: "v1",
		Providers:  []ProviderManifest{{Type: "redis"}},
	}
	cases := []Manifest{
		withRuntime(base, RuntimeManifest{Protocol: "http", Entrypoint: "bin/extension"}),
		withRuntime(base, RuntimeManifest{Protocol: RuntimeProtocolStdioJSONV1, Entrypoint: "../extension"}),
		{
			ID: base.ID, Name: base.Name, Version: base.Version, APIVersion: base.APIVersion,
			Providers: []ProviderManifest{{Type: "redis"}, {Type: "redis"}},
		},
	}

	for _, manifest := range cases {
		if err := ValidateManifest(manifest); err == nil {
			t.Fatalf("ValidateManifest(%#v) returned nil error", manifest)
		}
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
			Capabilities: []string{"list", "read", "write", "upload", "download", "delete"},
			ConfigFields: []FileProviderFieldManifest{
				{Key: "endpoint", Type: "string", Label: "Endpoint", Required: true},
				{Key: "port", Type: "number", Label: "Port", Default: float64(443)},
			},
			AuthFields: []FileProviderFieldManifest{
				{Key: "accessKey", Type: "string", Label: "Access key", Required: true},
				{Key: "secretKey", Type: "password", Label: "Secret key", Required: true},
			},
		}},
	}

	if err := ValidateManifest(manifest); err != nil {
		t.Fatalf("ValidateManifest returned error for file transfer extension: %v", err)
	}
}

func TestValidateManifestRejectsInvalidFileProviderFields(t *testing.T) {
	base := Manifest{
		ID:         "galaxyterm-extension-files",
		Name:       "Files",
		Version:    "0.1.0",
		APIVersion: "v1",
		Runtime:    RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "bin/extension"},
	}
	cases := [][]FileProviderFieldManifest{
		{{Key: "endpoint", Type: "color"}},
		{{Key: "endpoint", Type: "string"}, {Key: "endpoint", Type: "string"}},
		{{Key: "protocol", Type: "select"}},
		{{Key: "protocol", Type: "select", Options: []FileProviderFieldOptionManifest{{Value: "ftp"}}, Default: "sftp"}},
		{{Key: "port", Type: "number", Default: "21"}},
		{{Key: "tls", Type: "boolean", Default: "yes"}},
		{{Key: "password", Type: "password", Default: "must-not-ship"}},
		{{Key: "accessKey", Type: "string", Default: "must-not-ship"}},
		{{Key: "../endpoint", Type: "string"}},
	}
	for _, fields := range cases {
		manifest := withFileProviders(base, []FileProviderManifest{{
			Type: "ftp", Protocol: "ftp", Capabilities: []string{"list"}, AuthFields: fields,
		}})
		if err := ValidateManifest(manifest); err == nil {
			t.Fatalf("ValidateManifest accepted invalid fields: %#v", fields)
		}
	}
}

func TestValidateManifestRejectsInvalidConfigFieldDefaults(t *testing.T) {
	base := Manifest{
		ID:         "galaxyterm-extension-files",
		Name:       "Files",
		Version:    "0.1.0",
		APIVersion: "v1",
		Runtime:    RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "bin/extension"},
	}
	min := float64(1)
	max := float64(10)
	cases := [][]FileProviderFieldManifest{
		{{Key: "endpoint", Type: "string", Default: true}},
		{{Key: "tls", Type: "boolean", Default: 1}},
		{{Key: "port", Type: "number", Default: float64(0), Min: &min}},
		{{Key: "port", Type: "number", Default: float64(11), Max: &max}},
		{{Key: "endpoint", Type: "string", Min: &min}},
	}
	for _, fields := range cases {
		manifest := withFileProviders(base, []FileProviderManifest{{
			Type: "ftp", Protocol: "ftp", Capabilities: []string{"list"}, ConfigFields: fields,
		}})
		if err := ValidateManifest(manifest); err == nil {
			t.Fatalf("ValidateManifest accepted invalid config fields: %#v", fields)
		}
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
