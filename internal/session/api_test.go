package session

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestAPIRefreshProvidersUsesConfiguredRefresher(t *testing.T) {
	called := 0
	api := NewAPI(NewManager(nil), func() error {
		called++
		return nil
	})

	if err := api.RefreshProviders(); err != nil {
		t.Fatalf("RefreshProviders returned error: %v", err)
	}
	if called != 1 {
		t.Fatalf("refresher called %d times, want 1", called)
	}
}

func TestAPITestProviderAppliesTimeout(t *testing.T) {
	driver := &contextDriver{}
	manager := NewManager(nil)
	manager.RegisterProvider(Provider{
		Type:      "redis",
		NewDriver: func(CreateSessionRequest) (Driver, error) { return driver, nil },
	})
	api := NewAPI(manager)
	api.providerProbeTimeout = time.Millisecond

	err := api.TestProvider(CreateSessionRequest{ProviderType: "redis"})
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("TestProvider error = %v, want context deadline", err)
	}
	if !driver.closed {
		t.Fatal("driver was not closed after probe timeout")
	}
}

func TestAPIRefreshProvidersReturnsRefresherError(t *testing.T) {
	want := errors.New("provider conflict")
	api := NewAPI(NewManager(nil), func() error { return want })

	if err := api.RefreshProviders(); !errors.Is(err, want) {
		t.Fatalf("RefreshProviders error = %v, want %v", err, want)
	}
}
