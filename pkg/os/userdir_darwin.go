//go:build darwin

// Package os provides functions to get user directories

// Package os refer: https://github.com/vrischmann/userdir
package os

import (
	"os"
	"path/filepath"
)

// GetDataHome returns the user data directory.
func GetDataHome() string {
	return filepath.Join(getUserHome(), "Library")
}

// GetConfigHome returns the user config directory.
func GetConfigHome() string {
	//return filepath.Join(getUserHome(), "Library", "Preferences")
	return filepath.Join(getUserHome(), "Library", "Application Support")
}

func getUserHome() string {
	return os.Getenv("HOME")
}
