package session

import (
	"errors"
	"testing"
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

func TestAPIRefreshProvidersReturnsRefresherError(t *testing.T) {
	want := errors.New("provider conflict")
	api := NewAPI(NewManager(nil), func() error { return want })

	if err := api.RefreshProviders(); !errors.Is(err, want) {
		t.Fatalf("RefreshProviders error = %v, want %v", err, want)
	}
}
