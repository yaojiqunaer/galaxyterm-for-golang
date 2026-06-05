package session

type API struct {
	manager *Manager
}

func NewAPI(manager *Manager) *API {
	return &API{manager: manager}
}

func (api *API) CreateSession(req CreateSessionRequest) (string, error) {
	return api.manager.CreateSession(req)
}

func (api *API) Send(sessionID string, data string) error {
	return api.manager.Send(sessionID, data)
}

func (api *API) Resize(sessionID string, cols uint16, rows uint16) error {
	return api.manager.Resize(sessionID, cols, rows)
}

func (api *API) Close(sessionID string) error {
	return api.manager.Close(sessionID)
}

func (api *API) ListProviders() []Provider {
	return api.manager.ListProviders()
}

func (api *API) ListSessions() []SessionInfo {
	return api.manager.ListSessions()
}
