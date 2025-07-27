package main

import (
	"context"
	"embed"
	"galaxyterm/internal"
	"galaxyterm/internal/terminal"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"os"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	shell := os.Getenv("SHELL")
	// Create an instance of the app structure
	ptyTerm := terminal.NewPtyTerminal(internal.TerminalOptions{
		Args: []string{shell, "-c", "cd $HOME && alias ls='ls --color=auto' && alias grep='grep --color=auto' && exec " + shell + " -li"},
	})

	sshTerminal := terminal.NewSshTerminal(internal.TerminalOptions{
		Args: []string{},
	}, "127.0.0.1:22", internal.Auth{UserName: "test", Password: "123456"})

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
			ptyTerm.Startup(ctx)
			sshTerminal.Startup(ctx)
		},
		OnDomReady: func(ctx context.Context) {

		},
		OnShutdown: func(ctx context.Context) {
			//ptyTerm.Disconnect()
			//sshTerminal.Disconnect()
		},
		//OnBeforeClose:   beforeClose,
		//CSSDragProperty: "--wails-draggable",
		Bind: []interface{}{
			ptyTerm,
			sshTerminal,
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
