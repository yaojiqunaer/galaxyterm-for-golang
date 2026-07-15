package files

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"galaxyterm/internal/extensions"
)

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
