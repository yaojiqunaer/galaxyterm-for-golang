package main

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"galaxyterm/internal/extensions"
)

type packageFile struct {
	Name string
	Mode os.FileMode
	Data []byte
}

func main() {
	name := flag.String("name", "sftp", "official extension directory name")
	targetOS := flag.String("os", runtime.GOOS, "target operating system")
	targetArch := flag.String("arch", runtime.GOARCH, "target architecture")
	outputDir := flag.String("out", "dist/extensions", "package output directory")
	flag.Parse()
	if err := packageExtension(*name, *targetOS, *targetArch, *outputDir); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func packageExtension(name, targetOS, targetArch, outputDir string) error {
	if !safeSegment(name) || !safeSegment(targetOS) || !safeSegment(targetArch) {
		return errors.New("extension name, OS, and architecture must be safe path segments")
	}
	extensionDir := filepath.Join("extensions", "official", name)
	manifestPath := filepath.Join(extensionDir, "manifest.json")
	manifestBytes, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("read manifest: %w", err)
	}
	manifest, manifestBytes, err := prepareManifest(manifestBytes, targetOS)
	if err != nil {
		return err
	}
	if manifest.APIVersion != "v1" {
		return errors.New("manifest does not describe a supported extension runtime")
	}
	entrypoint := manifest.Runtime.Entrypoint
	stagingDir, err := os.MkdirTemp("", "galaxyterm-extension-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(stagingDir)
	binaryPath := filepath.Join(stagingDir, filepath.FromSlash(entrypoint))
	if err := os.MkdirAll(filepath.Dir(binaryPath), 0o755); err != nil {
		return err
	}
	command := exec.Command("go", "build", "-trimpath", "-ldflags=-s -w", "-o", binaryPath, "./"+filepath.ToSlash(extensionDir))
	command.Env = append(os.Environ(), "GOOS="+targetOS, "GOARCH="+targetArch, "CGO_ENABLED=0")
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	if err := command.Run(); err != nil {
		return fmt.Errorf("build extension: %w", err)
	}
	binary, err := os.ReadFile(binaryPath)
	if err != nil {
		return err
	}
	files := []packageFile{
		{Name: "manifest.json", Mode: 0o644, Data: manifestBytes},
		{Name: entrypoint, Mode: 0o755, Data: binary},
	}
	for _, candidate := range []struct {
		Source string
		Target string
	}{
		{filepath.Join(extensionDir, "README.md"), "docs/zh-CN/README.md"},
		{filepath.Join(extensionDir, "README_EN.md"), "docs/en-US/README.md"},
		{"LICENSE", "LICENSE"},
	} {
		content, readErr := os.ReadFile(candidate.Source)
		if readErr != nil {
			return fmt.Errorf("read %s: %w", candidate.Source, readErr)
		}
		files = append(files, packageFile{Name: candidate.Target, Mode: 0o644, Data: content})
	}
	checksums := buildChecksums(files)
	files = append(files, packageFile{Name: "checksums.txt", Mode: 0o644, Data: checksums})
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return err
	}
	outputPath := filepath.Join(outputDir, fmt.Sprintf("%s_%s_%s_%s.gtx", manifest.ID, manifest.Version, targetOS, targetArch))
	if err := writeArchive(outputPath, files); err != nil {
		return err
	}
	_, _ = fmt.Fprintln(os.Stdout, outputPath)
	return nil
}

func prepareManifest(content []byte, targetOS string) (extensions.Manifest, []byte, error) {
	var manifest extensions.Manifest
	if err := json.Unmarshal(content, &manifest); err != nil {
		return manifest, nil, fmt.Errorf("decode manifest: %w", err)
	}
	if targetOS != "windows" || strings.HasSuffix(manifest.Runtime.Entrypoint, ".exe") {
		if err := extensions.ValidateManifest(manifest); err != nil {
			return manifest, nil, fmt.Errorf("validate manifest: %w", err)
		}
		return manifest, content, nil
	}
	var document map[string]any
	if err := json.Unmarshal(content, &document); err != nil {
		return manifest, nil, fmt.Errorf("decode manifest document: %w", err)
	}
	runtimeDocument, ok := document["runtime"].(map[string]any)
	if !ok {
		return manifest, nil, errors.New("manifest runtime must be an object")
	}
	manifest.Runtime.Entrypoint += ".exe"
	runtimeDocument["entrypoint"] = manifest.Runtime.Entrypoint
	rewritten, err := json.MarshalIndent(document, "", "  ")
	if err != nil {
		return manifest, nil, fmt.Errorf("encode manifest: %w", err)
	}
	if err := extensions.ValidateManifest(manifest); err != nil {
		return manifest, nil, fmt.Errorf("validate manifest: %w", err)
	}
	return manifest, append(rewritten, '\n'), nil
}

func buildChecksums(files []packageFile) []byte {
	ordered := append([]packageFile(nil), files...)
	sort.Slice(ordered, func(left, right int) bool { return ordered[left].Name < ordered[right].Name })
	lines := make([]string, 0, len(ordered))
	for _, file := range ordered {
		digest := sha256.Sum256(file.Data)
		lines = append(lines, hex.EncodeToString(digest[:])+"  "+file.Name)
	}
	return []byte(strings.Join(lines, "\n") + "\n")
}

func writeArchive(outputPath string, files []packageFile) error {
	var content bytes.Buffer
	writer := zip.NewWriter(&content)
	sort.Slice(files, func(left, right int) bool { return files[left].Name < files[right].Name })
	fixedTime := time.Date(1980, 1, 1, 0, 0, 0, 0, time.UTC)
	for _, file := range files {
		if path.Clean(file.Name) != file.Name || strings.HasPrefix(file.Name, "/") {
			return fmt.Errorf("unsafe archive path: %s", file.Name)
		}
		header := &zip.FileHeader{Name: file.Name, Method: zip.Deflate}
		header.SetMode(file.Mode)
		header.SetModTime(fixedTime)
		entry, err := writer.CreateHeader(header)
		if err != nil {
			return err
		}
		if _, err := io.Copy(entry, bytes.NewReader(file.Data)); err != nil {
			return err
		}
	}
	if err := writer.Close(); err != nil {
		return err
	}
	return os.WriteFile(outputPath, content.Bytes(), 0o644)
}

func safeSegment(value string) bool {
	return value != "" && value != "." && value != ".." && !strings.ContainsAny(value, `/\`)
}
