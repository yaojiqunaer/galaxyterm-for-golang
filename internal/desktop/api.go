package desktop

import "strings"

type API struct{}

func NewAPI() *API {
	return &API{}
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
