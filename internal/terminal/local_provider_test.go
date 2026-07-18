package terminal

import "testing"

func TestLocalWorkingDirectoryUsesWorkingDirectory(t *testing.T) {
	got := localWorkingDirectory(map[string]interface{}{
		"workingDirectory": "  /tmp/galaxyterm  ",
	}, "/Users/tester")
	if got != "/tmp/galaxyterm" {
		t.Fatalf("localWorkingDirectory = %q, want /tmp/galaxyterm", got)
	}
}

func TestLocalWorkingDirectoryFallsBackToCwd(t *testing.T) {
	got := localWorkingDirectory(map[string]interface{}{
		"cwd": "/var/tmp",
	}, "/Users/tester")
	if got != "/var/tmp" {
		t.Fatalf("localWorkingDirectory = %q, want /var/tmp", got)
	}
}

func TestLocalWorkingDirectoryDefaultsToHome(t *testing.T) {
	got := localWorkingDirectory(map[string]interface{}{}, "/Users/tester")
	if got != "/Users/tester" {
		t.Fatalf("localWorkingDirectory = %q, want /Users/tester", got)
	}
}

func TestLocalWorkingDirectoryExpandsHomeAlias(t *testing.T) {
	for name, config := range map[string]map[string]interface{}{
		"home":       {"workingDirectory": "~"},
		"home child": {"workingDirectory": "~/Projects/galaxyterm"},
	} {
		t.Run(name, func(t *testing.T) {
			got := localWorkingDirectory(config, "/Users/tester")
			want := "/Users/tester"
			if name == "home child" {
				want = "/Users/tester/Projects/galaxyterm"
			}
			if got != want {
				t.Fatalf("localWorkingDirectory = %q, want %q", got, want)
			}
		})
	}
}
