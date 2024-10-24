package main

import (
	"embed"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"os"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp(TerminalOptions{
		args: []string{os.Getenv("SHELL"), "-li"},
	})

	// Create application with options
	var err = wails.Run(&options.App{
		Title:  "Wails Terminal",
		Width:  750,
		Height: 475,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
			&Theme{},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
