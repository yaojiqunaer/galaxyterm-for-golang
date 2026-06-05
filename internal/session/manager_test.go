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
}

func (d *fakeDriver) Start(ctx context.Context, emit Emitter) error {
	return nil
}

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
