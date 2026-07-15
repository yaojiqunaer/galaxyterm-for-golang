package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPrepareManifestForWindowsPreservesExtensionContributions(t *testing.T) {
	content := []byte(`{
  "id":"galaxyterm-extension-sftp",
  "name":"SFTP",
  "version":"0.1.0",
  "apiVersion":"v1",
  "runtime":{"protocol":"stdio-json-v1","entrypoint":"bin/extension"},
  "fileProviders":[{"type":"sftp","protocol":"sftp","capabilities":["list"]}],
  "locales":["zh-CN","en-US"]
}`)
	manifest, rewritten, err := prepareManifest(content, "windows")
	if err != nil {
		t.Fatalf("prepareManifest returned error: %v", err)
	}
	if manifest.Runtime.Entrypoint != "bin/extension.exe" {
		t.Fatalf("entrypoint = %q, want .exe suffix", manifest.Runtime.Entrypoint)
	}
	var decoded map[string]any
	if err := json.Unmarshal(rewritten, &decoded); err != nil {
		t.Fatalf("decode rewritten manifest: %v", err)
	}
	if len(decoded["fileProviders"].([]any)) != 1 || len(decoded["locales"].([]any)) != 2 {
		t.Fatalf("rewritten manifest lost contributions: %#v", decoded)
	}
}

func TestPrepareManifestRejectsInvalidExtensionContract(t *testing.T) {
	content := []byte(`{
  "id":"galaxyterm-extension-ftp",
  "name":"FTP",
  "version":"0.1.0",
  "apiVersion":"v1",
  "runtime":{"protocol":"stdio-json-v1","entrypoint":"bin/extension"},
  "fileProviders":[{"type":"ftp","protocol":"ftp","capabilities":["unknown"]}]
}`)
	if _, _, err := prepareManifest(content, "linux"); err == nil {
		t.Fatal("prepareManifest accepted an invalid provider capability")
	}
}

func TestBuildChecksumsIsStableAndCoversPaths(t *testing.T) {
	files := []packageFile{
		{Name: "z.txt", Data: []byte("z")},
		{Name: "a.txt", Data: []byte("a")},
	}
	lines := strings.Split(strings.TrimSpace(string(buildChecksums(files))), "\n")
	if len(lines) != 2 || !strings.HasSuffix(lines[0], "  a.txt") || !strings.HasSuffix(lines[1], "  z.txt") {
		t.Fatalf("checksum lines = %#v, want sorted paths", lines)
	}
}

func TestWriteArchiveIsDeterministicAndPreservesExecutableMode(t *testing.T) {
	files := []packageFile{
		{Name: "manifest.json", Mode: 0o644, Data: []byte("{}")},
		{Name: "bin/extension", Mode: 0o755, Data: []byte("binary")},
	}
	first := filepath.Join(t.TempDir(), "first.gtx")
	second := filepath.Join(t.TempDir(), "second.gtx")
	if err := writeArchive(first, append([]packageFile(nil), files...)); err != nil {
		t.Fatalf("write first archive: %v", err)
	}
	if err := writeArchive(second, append([]packageFile(nil), files...)); err != nil {
		t.Fatalf("write second archive: %v", err)
	}
	firstContent, _ := os.ReadFile(first)
	secondContent, _ := os.ReadFile(second)
	if !bytes.Equal(firstContent, secondContent) {
		t.Fatal("archives differ for identical inputs")
	}
	reader, err := zip.OpenReader(first)
	if err != nil {
		t.Fatalf("open archive: %v", err)
	}
	defer reader.Close()
	for _, file := range reader.File {
		if file.Name == "bin/extension" && file.Mode().Perm() != 0o755 {
			t.Fatalf("entrypoint mode = %o, want 755", file.Mode().Perm())
		}
	}
}

func TestSafeSegmentRejectsPathTraversal(t *testing.T) {
	for _, value := range []string{"", ".", "..", "../sftp", "official/sftp", `official\sftp`} {
		if safeSegment(value) {
			t.Fatalf("safeSegment(%q) = true", value)
		}
	}
	if !safeSegment("sftp") || !safeSegment("darwin") || !safeSegment("arm64") {
		t.Fatal("safeSegment rejected a valid package segment")
	}
}
