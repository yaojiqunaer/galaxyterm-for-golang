package desktop

import (
	"context"
	"strings"
)

type API struct {
	contextProvider func() context.Context
	dialogs         desktopDialogs
}

func NewAPI() *API {
	return &API{}
}

func NewDesktopAPI(contextProvider func() context.Context) *API {
	return &API{
		contextProvider: contextProvider,
		dialogs:         wailsDesktopDialogs{},
	}
}

func (api *API) SetWindowTheme(theme string) {
	setWindowTheme(normalizeWindowTheme(theme))
}

func normalizeWindowTheme(theme string) string {
	switch strings.ToLower(strings.TrimSpace(theme)) {
	case "dark":
		return "dark"
	case "light":
		return "light"
	default:
		return "system"
	}
}
