package main

import (
	"context"
	"embed"
	"fmt"
	"galaxyterm/internal"
	"galaxyterm/internal/credentials"
	"galaxyterm/internal/desktop"
	"galaxyterm/internal/extensions"
	"galaxyterm/internal/files"
	"galaxyterm/internal/session"
	"galaxyterm/internal/terminal"
	"galaxyterm/internal/tunnel"
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

func newMacOptions() *mac.Options {
	return &mac.Options{
		TitleBar:   mac.TitleBarHiddenInset(),
		Appearance: mac.DefaultAppearance,
		About: &mac.AboutInfo{
			Title:   "GalaxyTerm 0.0.1",
			Message: "Galaxy Term for handsome users.\nCopyright © 2024",
			Icon:    icon,
		},
	}
}

func main() {
	var appCtx context.Context
	sessionManager := session.NewManager(func(event session.Event) {
		if appCtx == nil {
			return
		}
		runtime.EventsEmit(appCtx, fmt.Sprintf("terminal:%s:%s", event.Type, event.SessionID), event)
	})
	terminal.RegisterBuiltInProviders(sessionManager)
	tunnelAPI := tunnel.NewAPI()
	extensionAPI := extensions.NewDesktopAPI(func() context.Context { return appCtx })
	if err := terminal.SyncExtensionProviders(sessionManager, extensionAPI); err != nil {
		println("Unable to load terminal extensions:", err.Error())
	}
	sessionAPI := session.NewAPI(sessionManager, func() error {
		return terminal.SyncExtensionProviders(sessionManager, extensionAPI)
	})
	fileAPI := files.NewDesktopAPI(extensionAPI, func() context.Context { return appCtx })

	// Create application with options
	var err = wails.Run(&options.App{
		Title:  "GalaxyTerm",
		Width:  1280,
		Height: 800,
		//DisableResize:    false,
		//WindowStartState: options.Normal,
		// 无边框
		Frameless: false,
		MinWidth:  720,
		MinHeight: 480,
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
			_ = tunnelAPI.StopAll()
		},
		//OnBeforeClose:   beforeClose,
		//CSSDragProperty: "--wails-draggable",
		Bind: []interface{}{
			sessionAPI,
			desktop.NewDesktopAPI(func() context.Context { return appCtx }),
			fileAPI,
			extensionAPI,
			credentials.NewAPI(),
			terminal.NewAPI(),
			tunnelAPI,
			&internal.Theme{},
		},
		Windows: nil,
		Mac:     newMacOptions(),
		Linux:   nil,
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
