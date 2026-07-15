package desktop

import "testing"

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
