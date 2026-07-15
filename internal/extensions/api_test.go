package extensions

import (
	"archive/zip"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
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

func TestInstallOfflineExtractsAndResolvesFileProviderRuntime(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "extensions", "installed.json")
	api := NewAPIWithStore(storePath)
	manifest := Manifest{
		ID:         "galaxyterm-extension-sftp",
		Name:       "SFTP",
		Version:    "0.1.0",
		APIVersion: "v1",
		Runtime:    RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "bin/extension"},
		FileProviders: []FileProviderManifest{{
			Type: "sftp", Protocol: "sftp", Capabilities: []string{"list", "read"},
		}},
	}
	packagePath := writeGTXPackageWithFiles(t, manifest, map[string]string{"bin/extension": "#!/bin/sh\n"})

	if _, err := api.InstallOffline(packagePath); err != nil {
		t.Fatalf("InstallOffline returned error: %v", err)
	}
	runtimeInfo, err := api.ResolveFileProvider("sftp")
	if err != nil {
		t.Fatalf("ResolveFileProvider returned error: %v", err)
	}
	if runtimeInfo.Provider.Type != "sftp" {
		t.Fatalf("provider = %#v, want sftp", runtimeInfo.Provider)
	}
	content, err := os.ReadFile(runtimeInfo.Executable)
	if err != nil {
		t.Fatalf("read extracted executable: %v", err)
	}
	if string(content) != "#!/bin/sh\n" {
		t.Fatalf("executable content = %q", content)
	}
	if runtime.GOOS != "windows" {
		info, err := os.Stat(runtimeInfo.Executable)
		if err != nil {
			t.Fatalf("stat executable: %v", err)
		}
		if info.Mode()&0o100 == 0 {
			t.Fatalf("executable mode = %v, want owner execute bit", info.Mode())
		}
	}
}

func TestInstallOfflineRejectsArchivePathTraversal(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "extensions", "installed.json")
	api := NewAPIWithStore(storePath)
	manifest := Manifest{
		ID:         "galaxyterm-extension-sftp",
		Name:       "SFTP",
		Version:    "0.1.0",
		APIVersion: "v1",
		Runtime:    RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "bin/extension"},
		FileProviders: []FileProviderManifest{{
			Type: "sftp", Protocol: "sftp", Capabilities: []string{"list"},
		}},
	}
	packagePath := writeGTXPackageWithFiles(t, manifest, map[string]string{
		"bin/extension": "#!/bin/sh\n",
		"../escaped":    "bad",
	})

	if _, err := api.InstallOffline(packagePath); err == nil {
		t.Fatal("InstallOffline returned nil error for traversal entry")
	}
	if _, err := os.Stat(filepath.Join(filepath.Dir(storePath), "escaped")); !os.IsNotExist(err) {
		t.Fatalf("escaped file stat error = %v, want not exist", err)
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
	return writeGTXPackageWithFiles(t, manifest, nil)
}

func writeGTXPackageWithFiles(t *testing.T, manifest Manifest, files map[string]string) string {
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
	for name, content := range files {
		entry, err := writer.Create(name)
		if err != nil {
			t.Fatalf("create package file %q: %v", name, err)
		}
		if _, err := entry.Write([]byte(content)); err != nil {
			t.Fatalf("write package file %q: %v", name, err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close zip: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close package: %v", err)
	}
	return packagePath
}
