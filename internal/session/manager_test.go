package session

import (
	"context"
	"errors"
	"testing"
)

type fakeDriver struct {
	sent       []string
	resizes    []Resize
	closed     bool
	closeCount int
	startCount int
	startErr   error
}

func (d *fakeDriver) Start(ctx context.Context, emit Emitter) error {
	d.startCount++
	return d.startErr
}

type contextDriver struct {
	closed bool
}

func (driver *contextDriver) Start(ctx context.Context, emit Emitter) error {
	<-ctx.Done()
	return ctx.Err()
}

func (driver *contextDriver) Send(string) error           { return nil }
func (driver *contextDriver) Resize(uint16, uint16) error { return nil }
func (driver *contextDriver) Close() error                { driver.closed = true; return nil }

func (d *fakeDriver) Send(data string) error {
	d.sent = append(d.sent, data)
	return nil
}

func (d *fakeDriver) Resize(cols uint16, rows uint16) error {
	d.resizes = append(d.resizes, Resize{Cols: cols, Rows: rows})
	return nil
}

func (d *fakeDriver) Close() error {
	d.closed = true
	d.closeCount++
	return nil
}

func TestManagerRoutesOperationsToCreatedSession(t *testing.T) {
	driver := &fakeDriver{}
	manager := NewManager(nil)
	manager.RegisterProvider(Provider{
		Type:        "fake",
		NameKey:     "provider.fake.name",
		Description: "Fake provider",
		NewDriver: func(req CreateSessionRequest) (Driver, error) {
			return driver, nil
		},
	})

	id, err := manager.Create(context.Background(), CreateSessionRequest{ProviderType: "fake", DisplayName: "Fake"})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := manager.Send(id, "hello"); err != nil {
		t.Fatalf("Send returned error: %v", err)
	}
	if err := manager.Resize(id, 120, 40); err != nil {
		t.Fatalf("Resize returned error: %v", err)
	}
	if err := manager.Close(id); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}

	if got := driver.sent; len(got) != 1 || got[0] != "hello" {
		t.Fatalf("sent = %#v, want one hello", got)
	}
	if got := driver.resizes; len(got) != 1 || got[0].Cols != 120 || got[0].Rows != 40 {
		t.Fatalf("resizes = %#v, want 120x40", got)
	}
	if !driver.closed {
		t.Fatal("driver was not closed")
	}
}

func TestManagerReturnsStructuredErrors(t *testing.T) {
	manager := NewManager(nil)

	_, err := manager.Create(context.Background(), CreateSessionRequest{ProviderType: "missing"})
	if !errors.Is(err, ErrUnknownProvider) {
		t.Fatalf("Create error = %v, want ErrUnknownProvider", err)
	}

	if err := manager.Send("missing-session", "hello"); !errors.Is(err, ErrUnknownSession) {
		t.Fatalf("Send error = %v, want ErrUnknownSession", err)
	}
}

func TestManagerCloseIsIdempotent(t *testing.T) {
	driver := &fakeDriver{}
	manager := NewManager(nil)
	manager.RegisterProvider(Provider{
		Type: "fake",
		NewDriver: func(req CreateSessionRequest) (Driver, error) {
			return driver, nil
		},
	})

	id, err := manager.Create(context.Background(), CreateSessionRequest{ProviderType: "fake"})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := manager.Close(id); err != nil {
		t.Fatalf("first Close returned error: %v", err)
	}
	if err := manager.Close(id); err != nil {
		t.Fatalf("second Close returned error: %v", err)
	}

	if driver.closeCount != 1 {
		t.Fatalf("closeCount = %d, want 1", driver.closeCount)
	}
}

func TestManagerProbesProviderWithoutCreatingSession(t *testing.T) {
	driver := &fakeDriver{}
	emitted := 0
	manager := NewManager(func(Event) { emitted++ })
	manager.RegisterProvider(Provider{
		Type:      "redis",
		NewDriver: func(CreateSessionRequest) (Driver, error) { return driver, nil },
	})

	if err := manager.ProbeProvider(context.Background(), CreateSessionRequest{ProviderType: "redis"}); err != nil {
		t.Fatalf("ProbeProvider returned error: %v", err)
	}
	if driver.startCount != 1 || driver.closeCount != 1 {
		t.Fatalf("driver start/close = %d/%d, want 1/1", driver.startCount, driver.closeCount)
	}
	if sessions := manager.ListSessions(); len(sessions) != 0 {
		t.Fatalf("sessions = %#v, want no probe session", sessions)
	}
	if emitted != 0 {
		t.Fatalf("emitted = %d, want no user-visible events", emitted)
	}
}

func TestManagerProbeClosesDriverAfterStartError(t *testing.T) {
	want := errors.New("connection refused")
	driver := &fakeDriver{startErr: want}
	manager := NewManager(nil)
	manager.RegisterProvider(Provider{
		Type:      "redis",
		NewDriver: func(CreateSessionRequest) (Driver, error) { return driver, nil },
	})

	if err := manager.ProbeProvider(context.Background(), CreateSessionRequest{ProviderType: "redis"}); !errors.Is(err, want) {
		t.Fatalf("ProbeProvider error = %v, want %v", err, want)
	}
	if driver.closeCount != 1 {
		t.Fatalf("closeCount = %d, want 1", driver.closeCount)
	}
}

func TestManagerProbeHonorsContext(t *testing.T) {
	driver := &contextDriver{}
	manager := NewManager(nil)
	manager.RegisterProvider(Provider{
		Type:      "redis",
		NewDriver: func(CreateSessionRequest) (Driver, error) { return driver, nil },
	})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if err := manager.ProbeProvider(ctx, CreateSessionRequest{ProviderType: "redis"}); !errors.Is(err, context.Canceled) {
		t.Fatalf("ProbeProvider error = %v, want context.Canceled", err)
	}
	if !driver.closed {
		t.Fatal("driver was not closed after context cancellation")
	}
}

func TestManagerReplacesProvidersByCategoryWithoutTouchingActiveSessions(t *testing.T) {
	driver := &fakeDriver{}
	manager := NewManager(nil)
	manager.RegisterProvider(Provider{Type: "ssh", Category: "builtin", NewDriver: func(CreateSessionRequest) (Driver, error) {
		return driver, nil
	}})
	manager.RegisterProvider(Provider{Type: "redis", Category: "extension", NewDriver: func(CreateSessionRequest) (Driver, error) {
		return driver, nil
	}})
	id, err := manager.Create(context.Background(), CreateSessionRequest{ProviderType: "redis"})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if err := manager.ReplaceProvidersByCategory("extension", []Provider{{
		Type: "kubernetes", Category: "extension", NewDriver: func(CreateSessionRequest) (Driver, error) { return &fakeDriver{}, nil },
	}}); err != nil {
		t.Fatalf("ReplaceProvidersByCategory returned error: %v", err)
	}
	providers := manager.ListProviders()
	if len(providers) != 2 || providers[0].Type != "kubernetes" || providers[1].Type != "ssh" {
		t.Fatalf("providers = %#v, want kubernetes and ssh", providers)
	}
	if err := manager.Send(id, "still-open"); err != nil {
		t.Fatalf("active session stopped after provider replacement: %v", err)
	}
}

func TestManagerRejectsProviderReplacementConflicts(t *testing.T) {
	manager := NewManager(nil)
	manager.RegisterProvider(Provider{Type: "ssh", Category: "builtin"})

	cases := [][]Provider{
		{{Type: "ssh", Category: "extension"}},
		{{Type: "redis", Category: "extension"}, {Type: "redis", Category: "extension"}},
		{{Type: "redis", Category: "builtin"}},
		{{Type: "", Category: "extension"}},
	}
	for _, providers := range cases {
		if err := manager.ReplaceProvidersByCategory("extension", providers); err == nil {
			t.Fatalf("ReplaceProvidersByCategory accepted %#v", providers)
		}
	}
}
