package desktop

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const maxSSHConfigSize = 1 << 20

var ErrDesktopUnavailable = errors.New("desktop file dialog is unavailable")

type TextFileSelection struct {
	Canceled bool   `json:"canceled"`
	FileName string `json:"fileName,omitempty"`
	Content  string `json:"content,omitempty"`
}

type desktopDialogs interface {
	OpenSSHConfig(context.Context) (string, error)
}

type wailsDesktopDialogs struct{}

func (wailsDesktopDialogs) OpenSSHConfig(ctx context.Context) (string, error) {
	return runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		DefaultDirectory: defaultSSHDirectory(),
		DefaultFilename:  "config",
		ShowHiddenFiles:  true,
		ResolvesAliases:  true,
	})
}

func (api *API) SelectSSHConfig() (TextFileSelection, error) {
	if api.contextProvider == nil || api.dialogs == nil {
		return TextFileSelection{}, ErrDesktopUnavailable
	}
	ctx := api.contextProvider()
	if ctx == nil {
		return TextFileSelection{}, ErrDesktopUnavailable
	}
	selectedPath, err := api.dialogs.OpenSSHConfig(ctx)
	if err != nil {
		return TextFileSelection{}, fmt.Errorf("select SSH config: %w", err)
	}
	if selectedPath == "" {
		return TextFileSelection{Canceled: true}, nil
	}
	file, err := os.Open(selectedPath)
	if err != nil {
		return TextFileSelection{}, fmt.Errorf("open SSH config: %w", err)
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return TextFileSelection{}, fmt.Errorf("inspect SSH config: %w", err)
	}
	if !info.Mode().IsRegular() {
		return TextFileSelection{}, fmt.Errorf("SSH config is not a regular file")
	}
	if info.Size() > maxSSHConfigSize {
		return TextFileSelection{}, fmt.Errorf("SSH config exceeds %d bytes", maxSSHConfigSize)
	}
	content, err := io.ReadAll(io.LimitReader(file, maxSSHConfigSize+1))
	if err != nil {
		return TextFileSelection{}, fmt.Errorf("read SSH config: %w", err)
	}
	if len(content) > maxSSHConfigSize {
		return TextFileSelection{}, fmt.Errorf("SSH config exceeds %d bytes", maxSSHConfigSize)
	}
	return TextFileSelection{
		FileName: filepath.Base(selectedPath),
		Content:  string(content),
	}, nil
}

func defaultSSHDirectory() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return ""
	}
	directory := filepath.Join(home, ".ssh")
	info, err := os.Stat(directory)
	if err != nil || !info.IsDir() {
		return ""
	}
	return directory
}
