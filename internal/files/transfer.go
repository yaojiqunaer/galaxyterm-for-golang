package files

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var (
	ErrDesktopUnavailable = errors.New("desktop file dialog is unavailable")
	ErrInvalidLocalFile   = errors.New("selected local file is invalid")
)

type TransferProgress struct {
	TransferID string `json:"transferId"`
	Phase      string `json:"phase"`
	Bytes      int64  `json:"bytes"`
	Total      int64  `json:"total,omitempty"`
}

type FileTransferResult struct {
	Canceled   bool   `json:"canceled"`
	FileName   string `json:"fileName,omitempty"`
	RemotePath string `json:"remotePath,omitempty"`
	Bytes      int64  `json:"bytes,omitempty"`
}

type fileDialogs interface {
	OpenFile(context.Context) (string, error)
	SaveFile(context.Context, string) (string, error)
}

type wailsFileDialogs struct{}

func (wailsFileDialogs) OpenFile(ctx context.Context) (string, error) {
	return runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
		CanCreateDirectories: false,
		ResolvesAliases:      true,
	})
}

func (wailsFileDialogs) SaveFile(ctx context.Context, fileName string) (string, error) {
	return runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
		DefaultFilename:      safeLocalFileName(fileName),
		CanCreateDirectories: true,
	})
}

func (api *API) Upload(request FileOperationRequest) (FileTransferResult, error) {
	return api.UploadWithID(request, "")
}

func (api *API) UploadWithID(request FileOperationRequest, transferID string) (FileTransferResult, error) {
	ctx, err := api.desktopContext()
	if err != nil {
		return FileTransferResult{}, err
	}
	sourcePath, err := api.dialogs.OpenFile(ctx)
	if err != nil {
		return FileTransferResult{}, fmt.Errorf("select upload file: %w", err)
	}
	if sourcePath == "" {
		return FileTransferResult{Canceled: true}, nil
	}

	stagedPath, size, cleanup, err := stageUploadFile(sourcePath)
	if err != nil {
		return FileTransferResult{}, err
	}
	defer cleanup()

	fileName := filepath.Base(sourcePath)
	request.Path = joinRemotePath(request.Path, fileName)
	request.localPath = stagedPath
	transferCtx, transferID, done, err := api.beginTransfer(ctx, transferID)
	if err != nil {
		return FileTransferResult{}, err
	}
	defer done()
	if err := api.invokeWithContext(transferCtx, "upload", request, nil, api.transferTimeout, api.progressHandler(transferID)); err != nil {
		return FileTransferResult{}, err
	}
	return FileTransferResult{
		FileName:   fileName,
		RemotePath: request.Path,
		Bytes:      size,
	}, nil
}

func (api *API) Download(request FileOperationRequest, suggestedName string) (FileTransferResult, error) {
	return api.DownloadWithID(request, suggestedName, "")
}

func (api *API) DownloadWithID(request FileOperationRequest, suggestedName, transferID string) (FileTransferResult, error) {
	if _, err := normalizeFileOperation("download", request); err != nil {
		return FileTransferResult{}, err
	}
	ctx, err := api.desktopContext()
	if err != nil {
		return FileTransferResult{}, err
	}
	fileName := safeLocalFileName(suggestedName)
	if fileName == "download" {
		fileName = safeLocalFileName(path.Base(request.Path))
	}
	destinationPath, err := api.dialogs.SaveFile(ctx, fileName)
	if err != nil {
		return FileTransferResult{}, fmt.Errorf("select download destination: %w", err)
	}
	if destinationPath == "" {
		return FileTransferResult{Canceled: true}, nil
	}

	stagedPath, cleanup, err := newTransferStagingFile()
	if err != nil {
		return FileTransferResult{}, err
	}
	defer cleanup()

	request.localPath = stagedPath
	transferCtx, transferID, done, err := api.beginTransfer(ctx, transferID)
	if err != nil {
		return FileTransferResult{}, err
	}
	defer done()
	if err := api.invokeWithContext(transferCtx, "download", request, nil, api.transferTimeout, api.progressHandler(transferID)); err != nil {
		return FileTransferResult{}, err
	}
	size, err := commitDownloadedFile(stagedPath, destinationPath)
	if err != nil {
		return FileTransferResult{}, err
	}
	return FileTransferResult{
		FileName:   filepath.Base(destinationPath),
		RemotePath: request.Path,
		Bytes:      size,
	}, nil
}

func (api *API) beginTransfer(parent context.Context, transferID string) (context.Context, string, func(), error) {
	transferID = strings.TrimSpace(transferID)
	if transferID == "" {
		transferID = uuid.NewString()
	}
	ctx, cancel := context.WithCancel(parent)
	api.transferMu.Lock()
	if _, exists := api.transfers[transferID]; exists {
		api.transferMu.Unlock()
		cancel()
		return nil, transferID, nil, ErrTransferAlreadyActive
	}
	api.transfers[transferID] = cancel
	api.transferMu.Unlock()
	done := func() {
		api.transferMu.Lock()
		delete(api.transfers, transferID)
		api.transferMu.Unlock()
		cancel()
	}
	return ctx, transferID, done, nil
}

func (api *API) CancelTransfer(transferID string) bool {
	api.transferMu.Lock()
	cancel := api.transfers[strings.TrimSpace(transferID)]
	api.transferMu.Unlock()
	if cancel == nil {
		return false
	}
	cancel()
	return true
}

func (api *API) progressHandler(transferID string) func(sidecarProgress) {
	if api.progressEmitter == nil {
		return nil
	}
	return func(progress sidecarProgress) {
		api.progressEmitter(TransferProgress{
			TransferID: transferID,
			Phase:      "transferring",
			Bytes:      progress.Bytes,
			Total:      progress.Total,
		})
	}
}

func (api *API) desktopContext() (context.Context, error) {
	if api.dialogs == nil || api.contextProvider == nil {
		return nil, ErrDesktopUnavailable
	}
	ctx := api.contextProvider()
	if ctx == nil {
		return nil, ErrDesktopUnavailable
	}
	return ctx, nil
}

func stageUploadFile(sourcePath string) (string, int64, func(), error) {
	source, err := os.Open(sourcePath)
	if err != nil {
		return "", 0, nil, fmt.Errorf("open selected file: %w", err)
	}
	defer source.Close()
	info, err := source.Stat()
	if err != nil {
		return "", 0, nil, fmt.Errorf("inspect selected file: %w", err)
	}
	if !info.Mode().IsRegular() {
		return "", 0, nil, ErrInvalidLocalFile
	}

	stagedPath, cleanup, err := newTransferStagingFile()
	if err != nil {
		return "", 0, nil, err
	}
	destination, err := os.OpenFile(stagedPath, os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		cleanup()
		return "", 0, nil, fmt.Errorf("open staged upload: %w", err)
	}
	written, copyErr := io.Copy(destination, source)
	closeErr := destination.Close()
	if copyErr != nil {
		cleanup()
		return "", 0, nil, fmt.Errorf("stage selected file: %w", copyErr)
	}
	if closeErr != nil {
		cleanup()
		return "", 0, nil, fmt.Errorf("close staged upload: %w", closeErr)
	}
	return stagedPath, written, cleanup, nil
}

func newTransferStagingFile() (string, func(), error) {
	directory, err := os.MkdirTemp("", "galaxyterm-transfer-*")
	if err != nil {
		return "", nil, fmt.Errorf("create transfer directory: %w", err)
	}
	cleanup := func() { _ = os.RemoveAll(directory) }
	if err := os.Chmod(directory, 0o700); err != nil {
		cleanup()
		return "", nil, fmt.Errorf("secure transfer directory: %w", err)
	}
	file, err := os.OpenFile(filepath.Join(directory, "payload"), os.O_CREATE|os.O_EXCL|os.O_RDWR, 0o600)
	if err != nil {
		cleanup()
		return "", nil, fmt.Errorf("create staged transfer file: %w", err)
	}
	path := file.Name()
	if err := file.Close(); err != nil {
		cleanup()
		return "", nil, fmt.Errorf("close staged transfer file: %w", err)
	}
	return path, cleanup, nil
}

func commitDownloadedFile(stagedPath, destinationPath string) (int64, error) {
	info, err := os.Lstat(stagedPath)
	if err != nil {
		return 0, fmt.Errorf("inspect downloaded file: %w", err)
	}
	if !info.Mode().IsRegular() {
		return 0, ErrInvalidLocalFile
	}
	source, err := os.Open(stagedPath)
	if err != nil {
		return 0, fmt.Errorf("open downloaded file: %w", err)
	}
	defer source.Close()

	directory := filepath.Dir(destinationPath)
	temporary, err := os.CreateTemp(directory, ".galaxyterm-download-*")
	if err != nil {
		return 0, fmt.Errorf("create download destination: %w", err)
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if err := temporary.Chmod(0o600); err != nil {
		_ = temporary.Close()
		return 0, fmt.Errorf("secure download destination: %w", err)
	}
	written, copyErr := io.Copy(temporary, source)
	syncErr := temporary.Sync()
	closeErr := temporary.Close()
	if copyErr != nil {
		return 0, fmt.Errorf("write downloaded file: %w", copyErr)
	}
	if syncErr != nil {
		return 0, fmt.Errorf("sync downloaded file: %w", syncErr)
	}
	if closeErr != nil {
		return 0, fmt.Errorf("close downloaded file: %w", closeErr)
	}
	if err := replaceDownloadedFile(temporaryPath, destinationPath); err != nil {
		return 0, fmt.Errorf("commit downloaded file: %w", err)
	}
	return written, nil
}

func replaceDownloadedFile(sourcePath, destinationPath string) error {
	firstErr := os.Rename(sourcePath, destinationPath)
	if firstErr == nil {
		return nil
	}
	info, statErr := os.Lstat(destinationPath)
	if statErr != nil || !info.Mode().IsRegular() {
		return firstErr
	}

	backup, err := os.CreateTemp(filepath.Dir(destinationPath), ".galaxyterm-replaced-*")
	if err != nil {
		return errors.Join(firstErr, err)
	}
	backupPath := backup.Name()
	if err := backup.Close(); err != nil {
		_ = os.Remove(backupPath)
		return errors.Join(firstErr, err)
	}
	if err := os.Remove(backupPath); err != nil {
		return errors.Join(firstErr, err)
	}
	if err := os.Rename(destinationPath, backupPath); err != nil {
		return errors.Join(firstErr, err)
	}
	if err := os.Rename(sourcePath, destinationPath); err != nil {
		rollbackErr := os.Rename(backupPath, destinationPath)
		return errors.Join(firstErr, err, rollbackErr)
	}
	_ = os.Remove(backupPath)
	return nil
}

func joinRemotePath(directory, name string) string {
	directory = strings.TrimSpace(directory)
	if directory == "" {
		directory = "."
	}
	return path.Join(directory, name)
}

func safeLocalFileName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || value == "." || value == ".." {
		return "download"
	}
	value = strings.ReplaceAll(value, "\\", "/")
	value = path.Base(value)
	if value == "." || value == "/" || value == "" {
		return "download"
	}
	return value
}
