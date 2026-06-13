package terminal

import (
	"context"
	"time"

	"galaxyterm/internal/session"

	"golang.org/x/crypto/ssh"
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
	config := &ssh.ClientConfig{
		User:            driver.username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         8 * time.Second,
	}
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
