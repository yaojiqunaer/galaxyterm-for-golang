package extensions

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

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
	api.upsertInstalled(manifest)
	return manifest, api.save()
}

func (api *API) Uninstall(extensionID string) error {
	next := api.installed[:0]
	for _, item := range api.installed {
		if item.ID != extensionID {
			next = append(next, item)
		}
	}
	api.installed = next
	return api.save()
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
