package main

import (
	"context"
	"embed"
	"fmt"
	"galaxyterm/internal"
	"galaxyterm/internal/extensions"
	"galaxyterm/internal/files"
	"galaxyterm/internal/session"
	"galaxyterm/internal/terminal"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	var appCtx context.Context
	sessionManager := session.NewManager(func(event session.Event) {
		if appCtx == nil {
			return
		}
		runtime.EventsEmit(appCtx, fmt.Sprintf("terminal:%s:%s", event.Type, event.SessionID), event)
	})
	terminal.RegisterBuiltInProviders(sessionManager)

	// Create application with options
	var err = wails.Run(&options.App{
		Title: "Wails Terminal",
		//Width:            1024,
		//Height:           768,
		//DisableResize:    false,
		//WindowStartState: options.Normal,
		// 无边框
		Frameless: false,
		MinWidth:  512,
		MinHeight: 384,
		//StartHidden: false,
		//HideWindowOnClose: false,
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 1},
		//AlwaysOnTop:      false,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		//Menu:   newMenu,
		OnStartup: func(ctx context.Context) {
			appCtx = ctx
		},
		OnDomReady: func(ctx context.Context) {

		},
		OnShutdown: func(ctx context.Context) {
			for _, info := range sessionManager.ListSessions() {
				_ = sessionManager.Close(info.ID)
			}
		},
		//OnBeforeClose:   beforeClose,
		//CSSDragProperty: "--wails-draggable",
		Bind: []interface{}{
			session.NewAPI(sessionManager),
			files.NewAPI(),
			extensions.NewAPI(),
			&internal.Theme{},
		},
		Windows: nil,
		Mac: &mac.Options{
			TitleBar:   mac.TitleBarHiddenInset(),
			Appearance: mac.NSAppearanceNameAccessibilityHighContrastVibrantLight,
			//WindowIsTranslucent: true,
			//Preferences: &mac.Preferences{
			//	TabFocusesLinks:        mac.Enabled,
			//	TextInteractionEnabled: mac.Disabled,
			//	FullscreenEnabled:      mac.Enabled,
			//},
			About: &mac.AboutInfo{
				Title:   "GalaxyTerm 0.0.1",
				Message: "Galaxy Term for handsome users.\nCopyright © 2024",
				Icon:    icon,
			},
		},
		Linux: nil,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

func beforeClose(ctx context.Context) (prevent bool) {
	dialog, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         "Quit?",
		Message:       "Are you sure you want to quit?",
		Buttons:       []string{"Yes", "No"},
		DefaultButton: "Yes",
		CancelButton:  "No",
		Icon:          icon,
	})
	if err != nil {
		return false
	}
	return dialog != "Yes"
}
