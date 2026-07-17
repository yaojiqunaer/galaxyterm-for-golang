package desktop

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"
)

type stubDesktopDialogs struct {
	path string
}

func (dialogs stubDesktopDialogs) OpenSSHConfig(context.Context) (string, error) {
	return dialogs.path, nil
}

func TestNormalizeWindowTheme(t *testing.T) {
	cases := map[string]string{
		"dark":    "dark",
		" light ": "light",
		"system":  "system",
		"unknown": "system",
		"":        "system",
	}
	for input, expected := range cases {
		if actual := normalizeWindowTheme(input); actual != expected {
			t.Fatalf("normalizeWindowTheme(%q) = %q, want %q", input, actual, expected)
		}
	}
}

func TestSelectSSHConfigReadsSelectedFileAndHandlesCancel(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), "config")
	content := "Host dev\n  HostName dev.example.com\n"
	if err := os.WriteFile(configPath, []byte(content), 0o600); err != nil {
		t.Fatalf("write SSH config: %v", err)
	}
	api := NewAPI()
	api.contextProvider = func() context.Context { return context.Background() }
	api.dialogs = stubDesktopDialogs{path: configPath}
	selection, err := api.SelectSSHConfig()
	if err != nil {
		t.Fatalf("SelectSSHConfig returned error: %v", err)
	}
	if selection.Canceled || selection.FileName != "config" || selection.Content != content {
		t.Fatalf("selection = %#v", selection)
	}

	api.dialogs = stubDesktopDialogs{}
	selection, err = api.SelectSSHConfig()
	if err != nil || !selection.Canceled {
		t.Fatalf("canceled selection = %#v, %v", selection, err)
	}
}

func TestSelectSSHConfigRejectsOversizedFiles(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), "config")
	if err := os.WriteFile(configPath, bytes.Repeat([]byte("x"), maxSSHConfigSize+1), 0o600); err != nil {
		t.Fatalf("write oversized SSH config: %v", err)
	}
	api := NewAPI()
	api.contextProvider = func() context.Context { return context.Background() }
	api.dialogs = stubDesktopDialogs{path: configPath}
	if _, err := api.SelectSSHConfig(); err == nil {
		t.Fatal("SelectSSHConfig accepted oversized file")
	}
}
