package main

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"galaxyterm/internal/extensions"
)

func TestBuildCatalogReadsPackagesAndProducesStableAssets(t *testing.T) {
	directory := t.TempDir()
	manifest := indexTestManifest("galaxyterm-extension-sftp", "0.2.0")
	linuxPath := writeIndexTestPackage(t, directory, manifest, "linux", "amd64")
	darwinPath := writeIndexTestPackage(t, directory, manifest, "darwin", "arm64")

	catalog, err := buildCatalog(directory, "")
	if err != nil {
		t.Fatalf("buildCatalog returned error: %v", err)
	}
	if catalog.APIVersion != "v1" || len(catalog.Extensions) != 1 {
		t.Fatalf("catalog = %#v", catalog)
	}
	item := catalog.Extensions[0]
	if item.Manifest.ID != manifest.ID || len(item.Assets) != 2 {
		t.Fatalf("catalog item = %#v", item)
	}
	if item.Assets[0].OS != "darwin" || item.Assets[1].OS != "linux" {
		t.Fatalf("assets are not stably sorted: %#v", item.Assets)
	}
	wantDigest := fileDigest(t, darwinPath)
	if item.Assets[0].SHA256 != wantDigest || item.Assets[0].URL != filepath.Base(darwinPath) {
		t.Fatalf("darwin asset = %#v, want digest %s", item.Assets[0], wantDigest)
	}
	if item.Assets[1].SHA256 != fileDigest(t, linuxPath) {
		t.Fatalf("linux asset = %#v", item.Assets[1])
	}
}

func TestBuildCatalogUsesHTTPSBaseURL(t *testing.T) {
	directory := t.TempDir()
	manifest := indexTestManifest("galaxyterm-extension-sftp", "0.2.0")
	writeIndexTestPackage(t, directory, manifest, "linux", "amd64")

	catalog, err := buildCatalog(directory, "https://github.com/example/extensions/releases/download/v0.2.0/")
	if err != nil {
		t.Fatalf("buildCatalog returned error: %v", err)
	}
	want := "https://github.com/example/extensions/releases/download/v0.2.0/galaxyterm-extension-sftp_0.2.0_linux_amd64.gtx"
	if got := catalog.Extensions[0].Assets[0].URL; got != want {
		t.Fatalf("asset URL = %q, want %q", got, want)
	}
}

func TestBuildCatalogRejectsInconsistentManifests(t *testing.T) {
	directory := t.TempDir()
	manifest := indexTestManifest("galaxyterm-extension-sftp", "0.2.0")
	writeIndexTestPackage(t, directory, manifest, "linux", "amd64")
	manifest.Description = "different package metadata"
	writeIndexTestPackage(t, directory, manifest, "darwin", "arm64")

	if _, err := buildCatalog(directory, ""); err == nil {
		t.Fatal("buildCatalog accepted inconsistent platform manifests")
	}
}

func TestBuildCatalogRejectsMultipleVersions(t *testing.T) {
	directory := t.TempDir()
	writeIndexTestPackage(t, directory, indexTestManifest("galaxyterm-extension-sftp", "0.1.0"), "linux", "amd64")
	writeIndexTestPackage(t, directory, indexTestManifest("galaxyterm-extension-sftp", "0.2.0"), "darwin", "arm64")

	if _, err := buildCatalog(directory, ""); err == nil {
		t.Fatal("buildCatalog accepted multiple versions of one extension")
	}
}

func TestBuildCatalogAllowsWindowsEntrypointOverride(t *testing.T) {
	directory := t.TempDir()
	manifest := indexTestManifest("galaxyterm-extension-sftp", "0.2.0")
	manifest.Runtime = extensions.RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "bin/extension"}
	writeIndexTestPackage(t, directory, manifest, "darwin", "arm64")
	windowsManifest := manifest
	windowsManifest.Runtime.Entrypoint = "bin/extension.exe"
	writeIndexTestPackage(t, directory, windowsManifest, "windows", "amd64")

	catalog, err := buildCatalog(directory, "")
	if err != nil {
		t.Fatalf("buildCatalog returned error: %v", err)
	}
	assets := catalog.Extensions[0].Assets
	if len(assets) != 2 || assets[0].Manifest != nil || assets[1].Manifest == nil {
		t.Fatalf("assets = %#v, want only Windows manifest override", assets)
	}
	if got := assets[1].Manifest.Runtime.Entrypoint; got != "bin/extension.exe" {
		t.Fatalf("Windows entrypoint = %q", got)
	}
}

func TestParsePackagePlatformRejectsUnexpectedName(t *testing.T) {
	manifest := indexTestManifest("galaxyterm-extension-sftp", "0.2.0")
	if _, _, err := parsePackagePlatform("sftp.gtx", manifest); err == nil {
		t.Fatal("parsePackagePlatform accepted a package without platform suffixes")
	}
	if operatingSystem, architecture, err := parsePackagePlatform(
		"galaxyterm-extension-sftp_0.2.0_windows_amd64.gtx",
		manifest,
	); err != nil || operatingSystem != "windows" || architecture != "amd64" {
		t.Fatalf("platform = %q/%q, error %v", operatingSystem, architecture, err)
	}
}

func indexTestManifest(id, version string) extensions.Manifest {
	return extensions.Manifest{
		ID:          id,
		Name:        "SFTP",
		Version:     version,
		APIVersion:  "v1",
		Description: "SFTP file provider",
		Providers:   []extensions.ProviderManifest{{Type: "sftp", Category: "extension"}},
	}
}

func writeIndexTestPackage(t *testing.T, directory string, manifest extensions.Manifest, operatingSystem, architecture string) string {
	t.Helper()
	name := manifest.ID + "_" + manifest.Version + "_" + operatingSystem + "_" + architecture + ".gtx"
	packagePath := filepath.Join(directory, name)
	file, err := os.Create(packagePath)
	if err != nil {
		t.Fatalf("create package: %v", err)
	}
	writer := zip.NewWriter(file)
	entry, err := writer.Create("manifest.json")
	if err != nil {
		t.Fatalf("create manifest entry: %v", err)
	}
	if err := json.NewEncoder(entry).Encode(manifest); err != nil {
		t.Fatalf("encode manifest: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close archive: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("close package: %v", err)
	}
	return packagePath
}

func fileDigest(t *testing.T, path string) string {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read package: %v", err)
	}
	digest := sha256.Sum256(content)
	return hex.EncodeToString(digest[:])
}
