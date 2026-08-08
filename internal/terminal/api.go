package terminal

import (
	"context"
	"time"

	"galaxyterm/internal/session"
)

type API struct{}

func NewAPI() *API {
	return &API{}
}

func (api *API) TestSSHConnection(req session.CreateSessionRequest) error {
	driver, err := newSSHDriver(req)
	if err != nil {
		return err
	}
	authMethods, err := driver.authMethods()
	if err != nil {
		return err
	}
	config, err := driver.clientConfig(authMethods)
	if err != nil {
		return err
	}
	config.Timeout = 8 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result := make(chan error, 1)
	go func() {
		client, err := driver.dial(config)
		if err != nil {
			result <- err
			return
		}
		result <- client.Close()
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-result:
		return err
	}
}
