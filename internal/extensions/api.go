package extensions

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
	api.installed = append(api.installed, manifest)
	return nil
}
