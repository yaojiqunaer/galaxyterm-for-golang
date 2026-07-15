package extensions

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestResolveCatalogURL(t *testing.T) {
	tests := map[string]string{
		"https://github.com/example/galaxyterm-extensions":          "https://github.com/example/galaxyterm-extensions/releases/latest/download/galaxyterm-index.json",
		"https://github.com/example/galaxyterm-extensions/releases": "https://github.com/example/galaxyterm-extensions/releases/latest/download/galaxyterm-index.json",
		"https://cdn.example.com/galaxyterm-index.json":             "https://cdn.example.com/galaxyterm-index.json",
	}
	for source, want := range tests {
		got, err := resolveCatalogURL(source)
		if err != nil {
			t.Fatalf("resolveCatalogURL(%q) returned error: %v", source, err)
		}
		if got != want {
			t.Fatalf("resolveCatalogURL(%q) = %q, want %q", source, got, want)
		}
	}
}

func TestResolveCatalogURLRejectsInsecureSource(t *testing.T) {
	if _, err := resolveCatalogURL("http://example.com/galaxyterm-index.json"); err == nil {
		t.Fatal("resolveCatalogURL accepted an insecure source")
	}
}

func TestFetchCatalogSelectsCurrentPlatformAsset(t *testing.T) {
	manifest := testOnlineManifest("galaxyterm-extension-sftp", "0.2.0")
	var server *httptest.Server
	server = httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/galaxyterm-index.json" {
			http.NotFound(writer, request)
			return
		}
		_ = json.NewEncoder(writer).Encode(Catalog{
			APIVersion: "v1",
			Extensions: []CatalogExtension{{
				Manifest: manifest,
				Assets: []CatalogAsset{
					{OS: "unsupported", Arch: runtime.GOARCH, URL: "/wrong.gtx", SHA256: repeatedDigest("1")},
					{OS: runtime.GOOS, Arch: runtime.GOARCH, URL: "/sftp.gtx", SHA256: repeatedDigest("2")},
				},
			}},
		})
	}))
	defer server.Close()

	api := NewAPIWithStoreAndClient(filepath.Join(t.TempDir(), "installed.json"), server.Client())
	items, err := api.FetchCatalog(server.URL + "/galaxyterm-index.json")
	if err != nil {
		t.Fatalf("FetchCatalog returned error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("catalog items = %#v, want one current-platform item", items)
	}
	if items[0].Manifest.ID != manifest.ID || items[0].Asset.URL != server.URL+"/sftp.gtx" {
		t.Fatalf("catalog item = %#v", items[0])
	}
	if items[0].SourceURL != server.URL+"/galaxyterm-index.json" {
		t.Fatalf("sourceURL = %q", items[0].SourceURL)
	}
}

func TestFetchCatalogRejectsAssetWithoutChecksum(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(writer).Encode(Catalog{
			APIVersion: "v1",
			Extensions: []CatalogExtension{{
				Manifest: testOnlineManifest("galaxyterm-extension-sftp", "0.2.0"),
				Assets:   []CatalogAsset{{OS: runtime.GOOS, Arch: runtime.GOARCH, URL: "/sftp.gtx"}},
			}},
		})
	}))
	defer server.Close()

	api := NewAPIWithStoreAndClient(filepath.Join(t.TempDir(), "installed.json"), server.Client())
	if _, err := api.FetchCatalog(server.URL); err == nil {
		t.Fatal("FetchCatalog accepted an asset without SHA-256")
	}
}

func TestFetchCatalogUsesPlatformAssetManifestOverride(t *testing.T) {
	shared := testOnlineManifest("galaxyterm-extension-sftp", "0.2.0")
	shared.Runtime = RuntimeManifest{Protocol: "stdio-json-v1", Entrypoint: "bin/extension"}
	override := shared
	override.Runtime.Entrypoint = "bin/extension.exe"
	server := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(writer).Encode(Catalog{
			APIVersion: "v1",
			Extensions: []CatalogExtension{{
				Manifest: shared,
				Assets: []CatalogAsset{{
					OS: runtime.GOOS, Arch: runtime.GOARCH, URL: "/sftp.gtx",
					SHA256: repeatedDigest("2"), Manifest: &override,
				}},
			}},
		})
	}))
	defer server.Close()

	api := NewAPIWithStoreAndClient(filepath.Join(t.TempDir(), "installed.json"), server.Client())
	items, err := api.FetchCatalog(server.URL)
	if err != nil {
		t.Fatalf("FetchCatalog returned error: %v", err)
	}
	if len(items) != 1 || items[0].Manifest.Runtime.Entrypoint != "bin/extension.exe" {
		t.Fatalf("catalog items = %#v", items)
	}
}

func TestInstallOnlineVerifiesAndInstallsPackage(t *testing.T) {
	manifest := testOnlineManifest("galaxyterm-extension-sftp", "0.2.0")
	packagePath := writeGTXPackage(t, manifest)
	content, err := os.ReadFile(packagePath)
	if err != nil {
		t.Fatalf("read package: %v", err)
	}
	digest := sha256.Sum256(content)

	server := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/sftp.gtx" {
			http.NotFound(writer, request)
			return
		}
		_, _ = writer.Write(content)
	}))
	defer server.Close()

	storePath := filepath.Join(t.TempDir(), "extensions", "installed.json")
	api := NewAPIWithStoreAndClient(storePath, server.Client())
	installed, err := api.InstallOnline(OnlineInstallRequest{
		URL:      server.URL + "/sftp.gtx",
		SHA256:   hex.EncodeToString(digest[:]),
		Manifest: &manifest,
	})
	if err != nil {
		t.Fatalf("InstallOnline returned error: %v", err)
	}
	if installed.ID != manifest.ID || len(api.ListInstalled()) != 1 {
		t.Fatalf("installed = %#v, list = %#v", installed, api.ListInstalled())
	}
}

func TestInstallOnlineRejectsCatalogManifestMismatch(t *testing.T) {
	manifest := testOnlineManifest("galaxyterm-extension-sftp", "0.2.0")
	content, err := os.ReadFile(writeGTXPackage(t, manifest))
	if err != nil {
		t.Fatalf("read package: %v", err)
	}
	digest := sha256.Sum256(content)
	server := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_, _ = writer.Write(content)
	}))
	defer server.Close()

	catalogManifest := manifest
	catalogManifest.Providers = []ProviderManifest{{Type: "redis", Category: "extension"}}
	api := NewAPIWithStoreAndClient(filepath.Join(t.TempDir(), "installed.json"), server.Client())
	if _, err := api.InstallOnline(OnlineInstallRequest{
		URL:      server.URL,
		SHA256:   hex.EncodeToString(digest[:]),
		Manifest: &catalogManifest,
	}); err == nil {
		t.Fatal("InstallOnline accepted a package that differs from the catalog manifest")
	}
	if len(api.ListInstalled()) != 0 {
		t.Fatalf("installed = %#v, want empty", api.ListInstalled())
	}
}

func TestInstallOnlineRejectsChecksumMismatch(t *testing.T) {
	manifest := testOnlineManifest("galaxyterm-extension-sftp", "0.2.0")
	content, err := os.ReadFile(writeGTXPackage(t, manifest))
	if err != nil {
		t.Fatalf("read package: %v", err)
	}
	server := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_, _ = writer.Write(content)
	}))
	defer server.Close()

	api := NewAPIWithStoreAndClient(filepath.Join(t.TempDir(), "installed.json"), server.Client())
	if _, err := api.InstallOnline(OnlineInstallRequest{
		URL:    server.URL,
		SHA256: repeatedDigest("0"),
	}); err == nil {
		t.Fatal("InstallOnline accepted a checksum mismatch")
	}
	if len(api.ListInstalled()) != 0 {
		t.Fatalf("installed = %#v, want empty", api.ListInstalled())
	}
}

func testOnlineManifest(id, version string) Manifest {
	return Manifest{
		ID:         id,
		Name:       "SFTP",
		Version:    version,
		APIVersion: "v1",
		Providers:  []ProviderManifest{{Type: "sftp", Category: "extension"}},
	}
}

func repeatedDigest(character string) string {
	result := ""
	for range sha256.Size * 2 {
		result += character
	}
	return result
}
