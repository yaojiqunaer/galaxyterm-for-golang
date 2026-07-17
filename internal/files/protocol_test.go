package files

import (
	"errors"
	"path/filepath"
	"testing"

	"galaxyterm/internal/extensions"
)

type stubProviderResolver struct {
	runtime extensions.FileProviderRuntime
	err     error
}

func (resolver stubProviderResolver) ResolveFileProvider(string) (extensions.FileProviderRuntime, error) {
	return resolver.runtime, resolver.err
}

func TestAPIRejectsUnsupportedProviderCapabilityBeforeExecution(t *testing.T) {
	api := NewAPI(stubProviderResolver{runtime: extensions.FileProviderRuntime{
		Executable: filepath.Join(t.TempDir(), "must-not-run"),
		Provider: extensions.FileProviderManifest{
			Type: "s3", Capabilities: []string{"list"},
		},
	}})

	err := api.Delete(FileOperationRequest{ProviderType: "s3", Path: "bucket/key"})
	if !errors.Is(err, ErrUnsupportedCapability) {
		t.Fatalf("Delete error = %v, want ErrUnsupportedCapability", err)
	}
}

func TestTransferOperationsRequireExplicitCapabilities(t *testing.T) {
	api := NewAPI(stubProviderResolver{runtime: extensions.FileProviderRuntime{
		Executable: filepath.Join(t.TempDir(), "must-not-run"),
		Provider: extensions.FileProviderManifest{
			Type: "sftp", Capabilities: []string{"read", "write"},
		},
	}})
	for _, operation := range []string{"upload", "download"} {
		err := api.invoke(operation, FileOperationRequest{
			ProviderType: "sftp",
			Path:         "/payload.bin",
		}, nil)
		if !errors.Is(err, ErrUnsupportedCapability) {
			t.Fatalf("%s error = %v, want ErrUnsupportedCapability", operation, err)
		}
	}
}

func TestAPIRequiresInstalledProviderAndProviderType(t *testing.T) {
	api := NewAPI(stubProviderResolver{err: errors.New("missing")})
	if _, err := api.List(FileOperationRequest{}); !errors.Is(err, ErrProviderTypeRequired) {
		t.Fatalf("List without provider error = %v, want ErrProviderTypeRequired", err)
	}
	if _, err := api.List(FileOperationRequest{ProviderType: "ftp"}); err == nil {
		t.Fatal("List returned nil error for unresolved provider")
	}
}

func TestNormalizeFileOperationDefaultsListPathAndRequiresMutationPath(t *testing.T) {
	request, err := normalizeFileOperation("list", FileOperationRequest{ProviderType: "sftp"})
	if err != nil {
		t.Fatalf("normalize list: %v", err)
	}
	if request.Path != "." {
		t.Fatalf("list path = %q, want .", request.Path)
	}
	if _, err := normalizeFileOperation("delete", FileOperationRequest{ProviderType: "sftp"}); err == nil {
		t.Fatal("normalize delete returned nil error without path")
	}
	if _, err := normalizeFileOperation("rename", FileOperationRequest{ProviderType: "sftp", Path: "/a"}); err == nil {
		t.Fatal("normalize rename returned nil error without destinationPath")
	}
}

func TestParentPath(t *testing.T) {
	cases := map[string]string{
		"/var/log": "/var",
		"/var":     "/",
		"/":        "/",
		".":        ".",
	}

	for input, want := range cases {
		if got := ParentPath(input); got != want {
			t.Fatalf("ParentPath(%q) = %q, want %q", input, got, want)
		}
	}
}
