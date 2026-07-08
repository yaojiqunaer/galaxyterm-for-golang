package terminal

import "testing"

func TestLocalWorkingDirectoryUsesWorkingDirectory(t *testing.T) {
	got := localWorkingDirectory(map[string]interface{}{
		"workingDirectory": "  /tmp/galaxyterm  ",
	})
	if got != "/tmp/galaxyterm" {
		t.Fatalf("localWorkingDirectory = %q, want /tmp/galaxyterm", got)
	}
}

func TestLocalWorkingDirectoryFallsBackToCwd(t *testing.T) {
	got := localWorkingDirectory(map[string]interface{}{
		"cwd": "/var/tmp",
	})
	if got != "/var/tmp" {
		t.Fatalf("localWorkingDirectory = %q, want /var/tmp", got)
	}
}
