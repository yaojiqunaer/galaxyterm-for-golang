package extensions

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"testing"
)

type stubPackageDialogs struct {
	path string
}

func (dialogs stubPackageDialogs) OpenPackage(context.Context) (string, error) {
	return dialogs.path, nil
}

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

func TestRegistrySupportsConcurrentReadsAndWrites(t *testing.T) {
	api := NewAPIWithStore("")
	manifest := Manifest{
		ID:         "galaxyterm-extension-redis",
		Name:       "Redis",
		Version:    "0.1.0",
		APIVersion: "v1",
		Providers:  []ProviderManifest{{Type: "redis"}},
	}
	var wait sync.WaitGroup
	wait.Add(2)
	go func() {
		defer wait.Done()
		for range 100 {
			if err := api.RegisterInstalled(manifest); err != nil {
				t.Errorf("RegisterInstalled returned error: %v", err)
			}
		}
	}()
	go func() {
		defer wait.Done()
		for range 100 {
			_ = api.ListInstalled()
		}
	}()
	wait.Wait()
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

func TestInstallOfflineFromDialogInstallsSelectedPackageAndHandlesCancel(t *testing.T) {
	manifest := Manifest{
		ID:         "galaxyterm-extension-sftp",
		Name:       "SFTP",
		Version:    "0.2.0",
		APIVersion: "v1",
		Providers:  []ProviderManifest{{Type: "sftp"}},
	}
	api := NewAPIWithStore(filepath.Join(t.TempDir(), "installed.json"))
	api.contextProvider = func() context.Context { return context.Background() }
	api.packageDialogs = stubPackageDialogs{path: writeGTXPackage(t, manifest)}

	result, err := api.InstallOfflineFromDialog()
	if err != nil {
		t.Fatalf("InstallOfflineFromDialog returned error: %v", err)
	}
	if result.Canceled || result.Manifest.ID != manifest.ID || len(api.ListInstalled()) != 1 {
		t.Fatalf("install result = %#v, installed = %#v", result, api.ListInstalled())
	}

	canceled := NewAPIWithStore(filepath.Join(t.TempDir(), "installed.json"))
	canceled.contextProvider = func() context.Context { return context.Background() }
	canceled.packageDialogs = stubPackageDialogs{}
	result, err = canceled.InstallOfflineFromDialog()
	if err != nil || !result.Canceled || len(canceled.ListInstalled()) != 0 {
		t.Fatalf("canceled install = %#v, %v", result, err)
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

func TestInstallOfflineRejectsChecksumMismatch(t *testing.T) {
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
	packagePath := writeGTXPackageArchive(t, manifest, map[string]string{"bin/extension": "tampered"}, true)

	if _, err := api.InstallOffline(packagePath); err == nil {
		t.Fatal("InstallOffline returned nil error for checksum mismatch")
	}
}

func TestHashZipFileHonorsLimit(t *testing.T) {
	var archive bytes.Buffer
	writer := zip.NewWriter(&archive)
	entry, err := writer.Create("payload")
	if err != nil {
		t.Fatalf("create payload: %v", err)
	}
	if _, err := entry.Write([]byte("12345")); err != nil {
		t.Fatalf("write payload: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close archive: %v", err)
	}
	reader, err := zip.NewReader(bytes.NewReader(archive.Bytes()), int64(archive.Len()))
	if err != nil {
		t.Fatalf("open archive: %v", err)
	}
	if _, err := hashZipFile(reader.File[0], 4); err == nil {
		t.Fatal("hashZipFile accepted a file larger than its limit")
	}
	if digest, err := hashZipFile(reader.File[0], 5); err != nil || digest == "" {
		t.Fatalf("hashZipFile within limit = %q, %v", digest, err)
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

func TestReadPackageManifestRejectsOversizedManifest(t *testing.T) {
	packagePath := filepath.Join(t.TempDir(), "oversized.gtx")
	file, err := os.Create(packagePath)
	if err != nil {
		t.Fatalf("create package: %v", err)
	}
	writer := zip.NewWriter(file)
	entry, err := writer.Create("manifest.json")
	if err != nil {
		t.Fatalf("create manifest: %v", err)
	}
	if _, err := entry.Write(bytes.Repeat([]byte(" "), maxManifestSize+1)); err != nil {
		t.Fatalf("write manifest: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close archive: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close package: %v", err)
	}
	if _, err := ReadPackageManifest(packagePath); err == nil {
		t.Fatal("ReadPackageManifest accepted an oversized manifest")
	}
}

func TestReadPackageManifestRejectsDuplicateManifest(t *testing.T) {
	packagePath := filepath.Join(t.TempDir(), "duplicate.gtx")
	file, err := os.Create(packagePath)
	if err != nil {
		t.Fatalf("create package: %v", err)
	}
	writer := zip.NewWriter(file)
	for range 2 {
		entry, err := writer.Create("manifest.json")
		if err != nil {
			t.Fatalf("create manifest: %v", err)
		}
		if _, err := entry.Write([]byte(`{"id":"duplicate"}`)); err != nil {
			t.Fatalf("write manifest: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close archive: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close package: %v", err)
	}
	if _, err := ReadPackageManifest(packagePath); err == nil {
		t.Fatal("ReadPackageManifest accepted duplicate manifest.json entries")
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
	return writeGTXPackageArchive(t, manifest, files, false)
}

func writeGTXPackageArchive(t *testing.T, manifest Manifest, files map[string]string, corruptChecksum bool) string {
	t.Helper()
	packagePath := filepath.Join(t.TempDir(), manifest.ID+".gtx")
	file, err := os.Create(packagePath)
	if err != nil {
		t.Fatalf("create package: %v", err)
	}
	writer := zip.NewWriter(file)
	var manifestContent bytes.Buffer
	if err := json.NewEncoder(&manifestContent).Encode(manifest); err != nil {
		t.Fatalf("encode manifest: %v", err)
	}
	manifestFile, err := writer.Create("manifest.json")
	if err != nil {
		t.Fatalf("create manifest: %v", err)
	}
	if _, err := manifestFile.Write(manifestContent.Bytes()); err != nil {
		t.Fatalf("write manifest: %v", err)
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
	if manifest.Runtime.Entrypoint != "" {
		checksums := map[string][]byte{"manifest.json": manifestContent.Bytes()}
		for name, content := range files {
			checksums[name] = []byte(content)
		}
		names := make([]string, 0, len(checksums))
		for name := range checksums {
			names = append(names, name)
		}
		sort.Strings(names)
		lines := make([]string, 0, len(names))
		for _, name := range names {
			digest := sha256.Sum256(checksums[name])
			encoded := fmt.Sprintf("%x", digest)
			if corruptChecksum && name == manifest.Runtime.Entrypoint {
				encoded = strings.Repeat("0", sha256.Size*2)
			}
			lines = append(lines, encoded+"  "+name)
		}
		entry, err := writer.Create("checksums.txt")
		if err != nil {
			t.Fatalf("create checksums: %v", err)
		}
		if _, err := entry.Write([]byte(strings.Join(lines, "\n") + "\n")); err != nil {
			t.Fatalf("write checksums: %v", err)
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
