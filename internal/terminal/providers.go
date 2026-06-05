package terminal

import "galaxyterm/internal/session"

func RegisterBuiltInProviders(manager *session.Manager) {
	manager.RegisterProvider(NewLocalProvider())
	manager.RegisterProvider(NewSSHProvider())
}
