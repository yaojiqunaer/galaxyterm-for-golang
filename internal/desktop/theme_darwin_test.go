//go:build darwin && cgo

package desktop

import (
	"os"
	"strings"
	"testing"
)

func TestDarwinThemeBridgeGuardsDarkAppearanceAvailability(t *testing.T) {
	content, err := os.ReadFile("theme_darwin.go")
	if err != nil {
		t.Fatalf("read theme bridge: %v", err)
	}
	source := string(content)
	guard := "if (@available(macOS 10.14, *))"
	guardIndex := strings.Index(source, guard)
	darkAppearanceIndex := strings.Index(source, "NSAppearanceNameDarkAqua")
	fallbackIndex := strings.Index(source, "[window setAppearance:nil];")
	if guardIndex < 0 || darkAppearanceIndex < guardIndex || fallbackIndex < darkAppearanceIndex {
		t.Fatalf("dark appearance must be guarded with a pre-10.14 fallback")
	}
}
