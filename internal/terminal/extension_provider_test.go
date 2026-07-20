package terminal

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"sync"
	"testing"
	"time"

	"galaxyterm/internal/extensions"
	"galaxyterm/internal/session"
)

func TestExtensionDriverRoutesInteractiveProtocol(t *testing.T) {
	driver := newExtensionDriver(extensions.TerminalProviderRuntime{
		Executable: os.Args[0],
		Provider:   extensions.ProviderManifest{Type: "redis"},
	}, session.CreateSessionRequest{
		ProviderType: "redis",
		Config:       map[string]any{"host": "127.0.0.1"},
		Auth:         map[string]any{"password": "secret"},
	})
	driver.commandFactory = extensionHelperCommand

	var mu sync.Mutex
	var events []session.Event
	if err := driver.Start(context.Background(), func(event session.Event) {
		mu.Lock()
		events = append(events, event)
		mu.Unlock()
	}); err != nil {
		t.Fatalf("Start returned error: %v", err)
	}
	if err := driver.Send("PING\r"); err != nil {
		t.Fatalf("Send returned error: %v", err)
	}
	if err := driver.Resize(120, 40); err != nil {
		t.Fatalf("Resize returned error: %v", err)
	}
	if err := driver.Close(); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}
	if err := driver.Close(); err != nil {
		t.Fatalf("second Close returned error: %v", err)
	}

	mu.Lock()
	defer mu.Unlock()
	if !hasExtensionEvent(events, session.EventData, "ready\r\n") {
		t.Fatalf("events = %#v, want ready data", events)
	}
	if !hasExtensionEvent(events, session.EventData, "echo:PING\r") {
		t.Fatalf("events = %#v, want echoed input", events)
	}
	if !hasExtensionEvent(events, session.EventStatus, "120x40") {
		t.Fatalf("events = %#v, want resize status", events)
	}
}

func TestExtensionDriverMapsProviderErrors(t *testing.T) {
	driver := newExtensionDriver(extensions.TerminalProviderRuntime{
		Executable: os.Args[0], Provider: extensions.ProviderManifest{Type: "redis"},
	}, session.CreateSessionRequest{ProviderType: "redis"})
	driver.commandFactory = extensionHelperCommand

	events := make(chan session.Event, 4)
	if err := driver.Start(context.Background(), func(event session.Event) { events <- event }); err != nil {
		t.Fatalf("Start returned error: %v", err)
	}
	if err := driver.Send("ERROR"); err != nil {
		t.Fatalf("Send returned error: %v", err)
	}
	defer driver.Close()

	deadline := time.After(2 * time.Second)
	for {
		select {
		case event := <-events:
			if event.Type == session.EventError && event.Error != nil && event.Error.Code == "PROVIDER_REJECTED" {
				return
			}
		case <-deadline:
			t.Fatal("timed out waiting for provider error event")
		}
	}
}

func TestExtensionDriverReturnsCreateErrorAndStopsProcess(t *testing.T) {
	driver := newExtensionDriver(extensions.TerminalProviderRuntime{
		Executable: os.Args[0], Provider: extensions.ProviderManifest{Type: "redis"},
	}, session.CreateSessionRequest{ProviderType: "redis", Config: map[string]any{"reject": true}})
	driver.commandFactory = extensionHelperCommand

	err := driver.Start(context.Background(), func(session.Event) {})
	var appError *session.AppError
	if !errors.As(err, &appError) || appError.Code != "INVALID_CONFIG" {
		t.Fatalf("Start error = %v, want INVALID_CONFIG AppError", err)
	}
}

func TestExtensionDriverEmitsExitWhenProviderStops(t *testing.T) {
	driver := newExtensionDriver(extensions.TerminalProviderRuntime{
		Executable: os.Args[0], Provider: extensions.ProviderManifest{Type: "redis"},
	}, session.CreateSessionRequest{ProviderType: "redis"})
	driver.commandFactory = extensionHelperCommand
	events := make(chan session.Event, 8)
	if err := driver.Start(context.Background(), func(event session.Event) { events <- event }); err != nil {
		t.Fatalf("Start returned error: %v", err)
	}
	if err := driver.Send("EXIT"); err != nil {
		t.Fatalf("Send returned error: %v", err)
	}

	deadline := time.After(2 * time.Second)
	for {
		select {
		case event := <-events:
			if event.Type == session.EventExit {
				return
			}
		case <-deadline:
			t.Fatal("timed out waiting for provider exit event")
		}
	}
}

func hasExtensionEvent(events []session.Event, eventType session.EventType, data string) bool {
	for _, event := range events {
		if event.Type == eventType && event.Data == data {
			return true
		}
	}
	return false
}

func extensionHelperCommand(ctx context.Context, executable string) *exec.Cmd {
	command := exec.CommandContext(ctx, executable, "-test.run=TestExtensionSidecarHelper", "--")
	command.Env = append(safeTerminalSidecarEnvironment(), "GO_WANT_TERMINAL_SIDECAR=1")
	return command
}

func TestExtensionSidecarHelper(t *testing.T) {
	if os.Getenv("GO_WANT_TERMINAL_SIDECAR") != "1" {
		return
	}
	encoder := json.NewEncoder(os.Stdout)
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		var request terminalSidecarRequest
		if err := json.Unmarshal(scanner.Bytes(), &request); err != nil {
			os.Exit(2)
		}
		if request.Operation == "create" && request.Config["reject"] == true {
			_ = encoder.Encode(terminalSidecarFrame{Type: "response", RequestID: request.RequestID, Error: &terminalSidecarError{
				Code: "INVALID_CONFIG", DefaultMessage: "invalid provider config",
			}})
			return
		}
		_ = encoder.Encode(terminalSidecarFrame{Type: "response", RequestID: request.RequestID})
		switch request.Operation {
		case "create":
			_ = encoder.Encode(terminalSidecarFrame{Type: "event", Event: "data", Data: "ready\r\n"})
		case "send":
			if request.Data == "EXIT" {
				return
			} else if request.Data == "ERROR" {
				_ = encoder.Encode(terminalSidecarFrame{Type: "event", Event: "error", Error: &terminalSidecarError{
					Code: "PROVIDER_REJECTED", DefaultMessage: "provider rejected input",
				}})
			} else {
				_ = encoder.Encode(terminalSidecarFrame{Type: "event", Event: "data", Data: "echo:" + request.Data})
			}
		case "resize":
			_ = encoder.Encode(terminalSidecarFrame{Type: "event", Event: "status", Data: "120x40"})
		case "close":
			return
		}
	}
}
