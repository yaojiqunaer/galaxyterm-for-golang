package extensions

import (
	"context"
	"errors"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var ErrDesktopUnavailable = errors.New("desktop extension dialog is unavailable")

type OfflineInstallResult struct {
	Canceled bool     `json:"canceled"`
	Manifest Manifest `json:"manifest,omitempty"`
}

type packageDialogs interface {
	OpenPackage(context.Context) (string, error)
}

type wailsPackageDialogs struct{}

func (wailsPackageDialogs) OpenPackage(ctx context.Context) (string, error) {
	return runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		Filters: []runtime.FileFilter{{
			DisplayName: "GalaxyTerm Extensions (*.gtx)",
			Pattern:     "*.gtx",
		}},
		ResolvesAliases: true,
	})
}

func NewDesktopAPI(contextProvider func() context.Context) *API {
	api := NewAPI()
	api.contextProvider = contextProvider
	api.packageDialogs = wailsPackageDialogs{}
	return api
}

func (api *API) InstallOfflineFromDialog() (OfflineInstallResult, error) {
	if api.contextProvider == nil || api.packageDialogs == nil {
		return OfflineInstallResult{}, ErrDesktopUnavailable
	}
	ctx := api.contextProvider()
	if ctx == nil {
		return OfflineInstallResult{}, ErrDesktopUnavailable
	}
	packagePath, err := api.packageDialogs.OpenPackage(ctx)
	if err != nil {
		return OfflineInstallResult{}, fmt.Errorf("select extension package: %w", err)
	}
	if packagePath == "" {
		return OfflineInstallResult{Canceled: true}, nil
	}
	manifest, err := api.InstallOffline(packagePath)
	if err != nil {
		return OfflineInstallResult{}, err
	}
	return OfflineInstallResult{Manifest: manifest}, nil
}
