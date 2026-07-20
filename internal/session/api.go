package session

import (
	"context"
	"time"
)

const defaultProviderProbeTimeout = 20 * time.Second

type API struct {
	manager              *Manager
	refreshProviders     func() error
	providerProbeTimeout time.Duration
}

func NewAPI(manager *Manager, refreshers ...func() error) *API {
	api := &API{manager: manager, providerProbeTimeout: defaultProviderProbeTimeout}
	if len(refreshers) > 0 {
		api.refreshProviders = refreshers[0]
	}
	return api
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

func (api *API) RefreshProviders() error {
	if api.refreshProviders == nil {
		return nil
	}
	return api.refreshProviders()
}

func (api *API) TestProvider(req CreateSessionRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), api.providerProbeTimeout)
	defer cancel()
	return api.manager.ProbeProvider(ctx, req)
}
