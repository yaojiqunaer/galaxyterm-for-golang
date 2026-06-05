package terminal

import (
	"testing"

	"galaxyterm/internal/session"
)

func TestRegisterBuiltInProviders(t *testing.T) {
	manager := session.NewManager(nil)
	RegisterBuiltInProviders(manager)

	providers := manager.ListProviders()
	byType := make(map[string]session.Provider, len(providers))
	for _, provider := range providers {
		byType[provider.Type] = provider
	}

	local, ok := byType["local"]
	if !ok {
		t.Fatal("local provider was not registered")
	}
	if local.NameKey != "provider.local.name" {
		t.Fatalf("local NameKey = %q, want provider.local.name", local.NameKey)
	}
	if local.NewDriver == nil {
		t.Fatal("local provider has nil NewDriver")
	}

	ssh, ok := byType["ssh"]
	if !ok {
		t.Fatal("ssh provider was not registered")
	}
	if ssh.NameKey != "provider.ssh.name" {
		t.Fatalf("ssh NameKey = %q, want provider.ssh.name", ssh.NameKey)
	}
	if ssh.NewDriver == nil {
		t.Fatal("ssh provider has nil NewDriver")
	}
}
