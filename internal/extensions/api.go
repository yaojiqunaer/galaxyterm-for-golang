package extensions

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const (
	maxExtensionFiles = 512
	maxExtensionSize  = 256 << 20
)

type FileProviderRuntime struct {
	ExtensionID      string               `json:"extensionId"`
	ExtensionVersion string               `json:"extensionVersion"`
	Executable       string               `json:"executable"`
	Provider         FileProviderManifest `json:"provider"`
}

type API struct {
	installed []Manifest
	storePath string
}

func NewAPI() *API {
	return NewAPIWithStore(defaultStorePath())
}

func NewAPIWithStore(storePath string) *API {
	api := &API{installed: []Manifest{}, storePath: storePath}
	_ = api.load()
	return api
}

func (api *API) ListInstalled() []Manifest {
	return append([]Manifest(nil), api.installed...)
}

func (api *API) Validate(manifest Manifest) error {
	return ValidateManifest(manifest)
}

func (api *API) RegisterInstalled(manifest Manifest) error {
	if err := ValidateManifest(manifest); err != nil {
		return err
	}
	api.upsertInstalled(manifest)
	return api.save()
}

func (api *API) InstallOffline(packagePath string) (Manifest, error) {
	manifest, err := ReadPackageManifest(packagePath)
	if err != nil {
		return Manifest{}, err
	}
	if err := ValidateManifest(manifest); err != nil {
		return Manifest{}, err
	}
	if err := api.extractPackage(packagePath, manifest); err != nil {
		return Manifest{}, err
	}
	api.upsertInstalled(manifest)
	return manifest, api.save()
}

func (api *API) Uninstall(extensionID string) error {
	var removed []Manifest
	next := api.installed[:0]
	for _, item := range api.installed {
		if item.ID != extensionID {
			next = append(next, item)
		} else {
			removed = append(removed, item)
		}
	}
	api.installed = next
	for _, item := range removed {
		_ = os.RemoveAll(api.packageDir(item))
	}
	return api.save()
}

func (api *API) ResolveFileProvider(providerType string) (FileProviderRuntime, error) {
	providerType = strings.TrimSpace(providerType)
	for index := len(api.installed) - 1; index >= 0; index-- {
		manifest := api.installed[index]
		for _, provider := range manifest.FileProviders {
			if provider.Type != providerType {
				continue
			}
			executable := filepath.Join(api.packageDir(manifest), filepath.FromSlash(manifest.Runtime.Entrypoint))
			info, err := os.Stat(executable)
			if err != nil {
				return FileProviderRuntime{}, fmt.Errorf("file provider runtime unavailable: %w", err)
			}
			if !info.Mode().IsRegular() {
				return FileProviderRuntime{}, fmt.Errorf("file provider runtime is not a regular file")
			}
			return FileProviderRuntime{
				ExtensionID:      manifest.ID,
				ExtensionVersion: manifest.Version,
				Executable:       executable,
				Provider:         provider,
			}, nil
		}
	}
	return FileProviderRuntime{}, fmt.Errorf("file provider not installed: %s", providerType)
}

func (api *API) upsertInstalled(manifest Manifest) {
	for index, item := range api.installed {
		if item.ID == manifest.ID {
			api.installed[index] = manifest
			return
		}
	}
	api.installed = append(api.installed, manifest)
}

func (api *API) load() error {
	if api.storePath == "" {
		return nil
	}
	content, err := os.ReadFile(api.storePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var manifests []Manifest
	if err := json.Unmarshal(content, &manifests); err != nil {
		return err
	}
	for _, manifest := range manifests {
		if err := ValidateManifest(manifest); err == nil {
			api.upsertInstalled(manifest)
		}
	}
	return nil
}

func (api *API) save() error {
	if api.storePath == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(api.storePath), 0o755); err != nil {
		return err
	}
	content, err := json.MarshalIndent(api.installed, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(api.storePath, content, 0o600)
}

func defaultStorePath() string {
	configDir, err := os.UserConfigDir()
	if err != nil || configDir == "" {
		return ""
	}
	return filepath.Join(configDir, "GalaxyTerm", "extensions", "installed.json")
}

func (api *API) packageDir(manifest Manifest) string {
	if api.storePath == "" {
		return ""
	}
	return filepath.Join(filepath.Dir(api.storePath), "packages", manifest.ID, manifest.Version)
}

func (api *API) extractPackage(packagePath string, manifest Manifest) error {
	targetDir := api.packageDir(manifest)
	if targetDir == "" {
		return fmt.Errorf("extension store is unavailable")
	}
	root := filepath.Dir(filepath.Dir(targetDir))
	if err := os.MkdirAll(root, 0o755); err != nil {
		return err
	}
	tempDir, err := os.MkdirTemp(root, ".install-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tempDir)

	reader, err := zip.OpenReader(packagePath)
	if err != nil {
		return err
	}
	defer reader.Close()
	if len(reader.File) > maxExtensionFiles {
		return fmt.Errorf("extension package contains too many files")
	}
	var extractedSize uint64
	for _, file := range reader.File {
		if !isSafePackagePath(strings.TrimSuffix(file.Name, "/")) {
			return fmt.Errorf("unsafe extension package path: %s", file.Name)
		}
		if file.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("extension package contains symbolic link: %s", file.Name)
		}
		extractedSize += file.UncompressedSize64
		if extractedSize > maxExtensionSize {
			return fmt.Errorf("extension package is too large")
		}
		destination := filepath.Join(tempDir, filepath.FromSlash(file.Name))
		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(destination, 0o755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
			return err
		}
		if err := extractRegularFile(file, destination); err != nil {
			return err
		}
	}
	if manifest.Runtime.Entrypoint != "" {
		entrypoint := filepath.Join(tempDir, filepath.FromSlash(manifest.Runtime.Entrypoint))
		info, err := os.Stat(entrypoint)
		if err != nil || !info.Mode().IsRegular() {
			return fmt.Errorf("missing extension runtime entrypoint")
		}
		if err := os.Chmod(entrypoint, 0o755); err != nil {
			return err
		}
	}
	if err := os.MkdirAll(filepath.Dir(targetDir), 0o755); err != nil {
		return err
	}
	if err := os.RemoveAll(targetDir); err != nil {
		return err
	}
	return os.Rename(tempDir, targetDir)
}

func extractRegularFile(file *zip.File, destination string) error {
	reader, err := file.Open()
	if err != nil {
		return err
	}
	defer reader.Close()
	handle, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(handle, io.LimitReader(reader, maxExtensionSize+1))
	closeErr := handle.Close()
	if copyErr != nil {
		return copyErr
	}
	return closeErr
}

func ReadPackageManifest(packagePath string) (Manifest, error) {
	if filepath.Ext(packagePath) != ".gtx" {
		return Manifest{}, fmt.Errorf("extension package must use .gtx suffix")
	}
	reader, err := zip.OpenReader(packagePath)
	if err != nil {
		return Manifest{}, err
	}
	defer reader.Close()

	for _, file := range reader.File {
		if file.Name != "manifest.json" {
			continue
		}
		handle, err := file.Open()
		if err != nil {
			return Manifest{}, err
		}
		defer handle.Close()
		var manifest Manifest
		if err := json.NewDecoder(handle).Decode(&manifest); err != nil {
			return Manifest{}, err
		}
		return manifest, nil
	}
	return Manifest{}, fmt.Errorf("missing manifest.json")
}
