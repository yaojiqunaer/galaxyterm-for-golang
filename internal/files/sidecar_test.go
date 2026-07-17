package files

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"galaxyterm/internal/extensions"
)

type stubFileDialogs struct {
	openPath string
	savePath string
}

func (dialogs stubFileDialogs) OpenFile(context.Context) (string, error) {
	return dialogs.openPath, nil
}

func (dialogs stubFileDialogs) SaveFile(context.Context, string) (string, error) {
	return dialogs.savePath, nil
}

func TestSidecarListUsesVersionedRequestAndReturnsEntries(t *testing.T) {
	executable := writeSidecarScript(t, `
read request
case "$request" in
  *'"apiVersion":"v1"'*'"providerType":"sftp"'*'"operation":"list"'*) ;;
  *) exit 12 ;;
esac
request_id=$(printf '%s' "$request" | sed -E 's/.*"requestId":"([^"]+)".*/\1/')
printf '{"requestId":"%s","result":{"entries":[{"name":"logs","path":"/logs","isDir":true,"size":0}]}}\n' "$request_id"
`)
	api := newTestAPI(executable, []string{"list"})

	entries, err := api.List(FileOperationRequest{
		ProviderType: "sftp",
		Config:       map[string]any{"host": "example.com"},
		Path:         "/",
	})
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(entries) != 1 || entries[0].Name != "logs" || !entries[0].IsDir {
		t.Fatalf("entries = %#v, want logs directory", entries)
	}
}

func TestSidecarReadReturnsContentAndStructuredErrors(t *testing.T) {
	success := writeSidecarScript(t, `
read request
request_id=$(printf '%s' "$request" | sed -E 's/.*"requestId":"([^"]+)".*/\1/')
printf '{"requestId":"%s","result":{"content":"hello"}}\n' "$request_id"
`)
	content, err := newTestAPI(success, []string{"read"}).ReadFile(FileOperationRequest{
		ProviderType: "sftp", Path: "/hello.txt",
	})
	if err != nil || content != "hello" {
		t.Fatalf("ReadFile = %q, %v; want hello, nil", content, err)
	}

	failure := writeSidecarScript(t, `
read request
request_id=$(printf '%s' "$request" | sed -E 's/.*"requestId":"([^"]+)".*/\1/')
printf '{"requestId":"%s","error":{"code":"permission_denied","message":"denied"}}\n' "$request_id"
`)
	_, err = newTestAPI(failure, []string{"read"}).ReadFile(FileOperationRequest{
		ProviderType: "sftp", Path: "/secret",
	})
	var providerError *ProviderError
	if !errors.As(err, &providerError) || providerError.Code != "permission_denied" {
		t.Fatalf("ReadFile error = %#v, want permission_denied ProviderError", err)
	}
}

func TestSidecarRejectsMalformedOrMismatchedResponses(t *testing.T) {
	malformed := writeSidecarScript(t, `read request; printf 'not-json\n'`)
	if _, err := newTestAPI(malformed, []string{"list"}).List(FileOperationRequest{ProviderType: "sftp"}); err == nil {
		t.Fatal("List returned nil error for malformed response")
	}

	mismatch := writeSidecarScript(t, `read request; printf '{"requestId":"wrong","result":{"entries":[]}}\n'`)
	if _, err := newTestAPI(mismatch, []string{"list"}).List(FileOperationRequest{ProviderType: "sftp"}); !errors.Is(err, ErrMismatchedResponse) {
		t.Fatalf("List error = %v, want ErrMismatchedResponse", err)
	}
}

func TestSidecarHonorsOperationTimeout(t *testing.T) {
	executable := writeSidecarScript(t, `read request; exec sleep 2`)
	api := newTestAPI(executable, []string{"list"})
	api.timeout = 30 * time.Millisecond

	started := time.Now()
	_, err := api.List(FileOperationRequest{ProviderType: "sftp"})
	if !errors.Is(err, ErrProviderTimeout) {
		t.Fatalf("List error = %v, want ErrProviderTimeout", err)
	}
	if time.Since(started) > time.Second {
		t.Fatalf("timeout took %s, want under one second", time.Since(started))
	}
}

func TestSidecarDoesNotInheritArbitraryCoreSecrets(t *testing.T) {
	t.Setenv("GALAXYTERM_TEST_SECRET", "must-not-leak")
	executable := writeSidecarScript(t, `
read request
request_id=$(printf '%s' "$request" | sed -E 's/.*"requestId":"([^"]+)".*/\1/')
if [ -n "${GALAXYTERM_TEST_SECRET:-}" ]; then exit 13; fi
printf '{"requestId":"%s","result":{"entries":[]}}\n' "$request_id"
`)
	if _, err := newTestAPI(executable, []string{"list"}).List(FileOperationRequest{ProviderType: "sftp"}); err != nil {
		t.Fatalf("List returned error: %v", err)
	}
}

func TestUploadStreamsStagedBinaryFileAndCleansItUp(t *testing.T) {
	sourcePath := filepath.Join(t.TempDir(), "payload.bin")
	source := []byte{0x00, 0x01, 0x7f, 0x80, 0xff, '\n'}
	if err := os.WriteFile(sourcePath, source, 0o600); err != nil {
		t.Fatalf("write upload source: %v", err)
	}
	capturePath := filepath.Join(t.TempDir(), "captured.bin")
	markerPath := filepath.Join(t.TempDir(), "staged-path.txt")
	executable := writeSidecarScript(t, `
read request
case "$request" in
  *'"operation":"upload"'*'"path":"/incoming/payload.bin"'*'"localPath":"'*) ;;
  *) exit 14 ;;
esac
case "$request" in *'"content"'*) exit 15 ;; esac
request_id=$(printf '%s' "$request" | sed -E 's/.*"requestId":"([^"]+)".*/\1/')
local_path=$(printf '%s' "$request" | sed -E 's/.*"localPath":"([^"]+)".*/\1/')
printf '%s' "$local_path" > `+shellQuote(markerPath)+`
cp "$local_path" `+shellQuote(capturePath)+`
printf '{"requestId":"%s","result":{}}\n' "$request_id"
`)
	api := newTestAPI(executable, []string{"upload"})
	api.dialogs = stubFileDialogs{openPath: sourcePath}
	api.contextProvider = func() context.Context { return context.Background() }

	result, err := api.Upload(FileOperationRequest{ProviderType: "sftp", Path: "/incoming"})
	if err != nil {
		t.Fatalf("Upload returned error: %v", err)
	}
	if result.Canceled || result.RemotePath != "/incoming/payload.bin" || result.Bytes != int64(len(source)) {
		t.Fatalf("Upload result = %#v", result)
	}
	captured, err := os.ReadFile(capturePath)
	if err != nil || string(captured) != string(source) {
		t.Fatalf("captured upload = %v, %v", captured, err)
	}
	stagedPath, err := os.ReadFile(markerPath)
	if err != nil {
		t.Fatalf("read staged path marker: %v", err)
	}
	if _, err := os.Stat(string(stagedPath)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("staged upload file still exists: %v", err)
	}
}

func TestDownloadStreamsBinaryToSelectedPathAndCleansStaging(t *testing.T) {
	destinationPath := filepath.Join(t.TempDir(), "download.bin")
	if err := os.WriteFile(destinationPath, []byte("old content"), 0o600); err != nil {
		t.Fatalf("write existing destination: %v", err)
	}
	markerPath := filepath.Join(t.TempDir(), "staged-path.txt")
	executable := writeSidecarScript(t, `
read request
case "$request" in
  *'"operation":"download"'*'"path":"/exports/download.bin"'*'"localPath":"'*) ;;
  *) exit 16 ;;
esac
request_id=$(printf '%s' "$request" | sed -E 's/.*"requestId":"([^"]+)".*/\1/')
local_path=$(printf '%s' "$request" | sed -E 's/.*"localPath":"([^"]+)".*/\1/')
printf '%s' "$local_path" > `+shellQuote(markerPath)+`
printf 'binary\000payload\377' > "$local_path"
printf '{"requestId":"%s","result":{}}\n' "$request_id"
`)
	api := newTestAPI(executable, []string{"download"})
	api.dialogs = stubFileDialogs{savePath: destinationPath}
	api.contextProvider = func() context.Context { return context.Background() }

	result, err := api.Download(FileOperationRequest{
		ProviderType: "sftp",
		Path:         "/exports/download.bin",
	}, "download.bin")
	if err != nil {
		t.Fatalf("Download returned error: %v", err)
	}
	content, err := os.ReadFile(destinationPath)
	if err != nil || len(content) == 0 {
		t.Fatalf("downloaded content = %v, %v", content, err)
	}
	if result.Canceled || result.FileName != "download.bin" || result.Bytes != int64(len(content)) {
		t.Fatalf("Download result = %#v", result)
	}
	stagedPath, err := os.ReadFile(markerPath)
	if err != nil {
		t.Fatalf("read staged path marker: %v", err)
	}
	if _, err := os.Stat(string(stagedPath)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("staged download file still exists: %v", err)
	}
}

func TestCanceledTransferDoesNotInvokeProvider(t *testing.T) {
	api := newTestAPI(filepath.Join(t.TempDir(), "must-not-run"), []string{"download", "upload"})
	api.dialogs = stubFileDialogs{}
	api.contextProvider = func() context.Context { return context.Background() }

	upload, err := api.Upload(FileOperationRequest{ProviderType: "sftp", Path: "/incoming"})
	if err != nil || !upload.Canceled {
		t.Fatalf("canceled Upload = %#v, %v", upload, err)
	}
	download, err := api.Download(FileOperationRequest{ProviderType: "sftp", Path: "/file"}, "file")
	if err != nil || !download.Canceled {
		t.Fatalf("canceled Download = %#v, %v", download, err)
	}
}

func newTestAPI(executable string, capabilities []string) *API {
	return NewAPI(stubProviderResolver{runtime: extensions.FileProviderRuntime{
		Executable: executable,
		Provider: extensions.FileProviderManifest{
			Type: "sftp", Protocol: "sftp", Capabilities: capabilities,
		},
	}})
}

func writeSidecarScript(t *testing.T, body string) string {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("shell sidecar fixture is not available on Windows")
	}
	path := filepath.Join(t.TempDir(), "sidecar.sh")
	content := "#!/bin/sh\nset -eu\n" + strings.TrimSpace(body) + "\n"
	if err := os.WriteFile(path, []byte(content), 0o700); err != nil {
		t.Fatalf("write sidecar fixture: %v", err)
	}
	return path
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'"
}
