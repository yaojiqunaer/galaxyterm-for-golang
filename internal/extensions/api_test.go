package extensions

import (
	"archive/zip"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestRegisterInstalledValidatesAndListsManifest(t *testing.T) {
	api := NewAPIWithStore(filepath.Join(t.TempDir(), "installed.json"))
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

func TestInstallOfflinePackageReadsManifest(t *testing.T) {
	api := NewAPIWithStore(filepath.Join(t.TempDir(), "installed.json"))
	manifest := Manifest{
		ID:          "galaxyterm-extension-kubernetes",
		Name:        "Kubernetes",
		Version:     "0.1.0",
		APIVersion:  "v1",
		Description: "Kubernetes pod terminal provider",
		Providers:   []ProviderManifest{{Type: "kubernetes", NameKey: "extension.kubernetes", Category: "extension"}},
	}
	packagePath := writeGTXPackage(t, manifest)

	installed, err := api.InstallOffline(packagePath)
	if err != nil {
		t.Fatalf("InstallOffline returned error: %v", err)
	}
	if installed.ID != manifest.ID {
		t.Fatalf("installed.ID = %q, want %q", installed.ID, manifest.ID)
	}

	items := api.ListInstalled()
	if len(items) != 1 || items[0].Providers[0].Type != "kubernetes" {
		t.Fatalf("installed items = %#v, want kubernetes provider", items)
	}
}

func TestInstallOfflinePackageRejectsMissingManifest(t *testing.T) {
	api := NewAPIWithStore(filepath.Join(t.TempDir(), "installed.json"))
	packagePath := filepath.Join(t.TempDir(), "broken.gtx")
	file, err := os.Create(packagePath)
	if err != nil {
		t.Fatalf("create package: %v", err)
	}
	writer := zip.NewWriter(file)
	if err := writer.Close(); err != nil {
		t.Fatalf("close zip: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close package: %v", err)
	}

	if _, err := api.InstallOffline(packagePath); err == nil {
		t.Fatal("InstallOffline returned nil error, want missing manifest error")
	}
}

func TestInstalledExtensionsPersistAcrossAPIInstances(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "installed.json")
	manifest := Manifest{
		ID:         "galaxyterm-extension-mysql",
		Name:       "MySQL",
		Version:    "0.1.0",
		APIVersion: "v1",
		Providers:  []ProviderManifest{{Type: "mysql"}},
	}

	api := NewAPIWithStore(storePath)
	if err := api.RegisterInstalled(manifest); err != nil {
		t.Fatalf("RegisterInstalled returned error: %v", err)
	}

	reloaded := NewAPIWithStore(storePath)
	installed := reloaded.ListInstalled()
	if len(installed) != 1 || installed[0].ID != manifest.ID {
		t.Fatalf("installed = %#v, want persisted mysql manifest", installed)
	}
}

func TestUninstallRemovesInstalledExtension(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "installed.json")
	api := NewAPIWithStore(storePath)
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

	if err := api.Uninstall(manifest.ID); err != nil {
		t.Fatalf("Uninstall returned error: %v", err)
	}

	reloaded := NewAPIWithStore(storePath)
	if got := reloaded.ListInstalled(); len(got) != 0 {
		t.Fatalf("installed = %#v, want empty after uninstall", got)
	}
}

func writeGTXPackage(t *testing.T, manifest Manifest) string {
	t.Helper()
	packagePath := filepath.Join(t.TempDir(), manifest.ID+".gtx")
	file, err := os.Create(packagePath)
	if err != nil {
		t.Fatalf("create package: %v", err)
	}
	writer := zip.NewWriter(file)
	manifestFile, err := writer.Create("manifest.json")
	if err != nil {
		t.Fatalf("create manifest: %v", err)
	}
	if err := json.NewEncoder(manifestFile).Encode(manifest); err != nil {
		t.Fatalf("encode manifest: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close zip: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close package: %v", err)
	}
	return packagePath
}
