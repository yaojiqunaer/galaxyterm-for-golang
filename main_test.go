package main

import "testing"

func TestMacOptionsUseIntegratedNativeTitleBar(t *testing.T) {
	options := newMacOptions()
	if options.TitleBar == nil {
		t.Fatal("macOS title bar options must be configured")
	}
	if !options.TitleBar.TitlebarAppearsTransparent || !options.TitleBar.FullSizeContent {
		t.Fatalf("macOS title bar is not integrated: %#v", options.TitleBar)
	}
	if !options.TitleBar.UseToolbar || !options.TitleBar.HideToolbarSeparator {
		t.Fatalf("macOS traffic lights must use the inset native layout: %#v", options.TitleBar)
	}
}
