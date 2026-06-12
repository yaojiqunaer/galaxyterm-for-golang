package extensions

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"path/filepath"
)

type API struct {
	installed []Manifest
}

func NewAPI() *API {
	return &API{installed: []Manifest{}}
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
	return nil
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
	return manifest, nil
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
