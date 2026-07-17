package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"galaxyterm/internal/extensions"
)

func TestManifestMatchesCoreFileProviderContract(t *testing.T) {
	content, err := os.ReadFile("manifest.json")
	if err != nil {
		t.Fatalf("read manifest: %v", err)
	}
	var manifest extensions.Manifest
	if err := json.Unmarshal(content, &manifest); err != nil {
		t.Fatalf("decode manifest: %v", err)
	}
	if err := extensions.ValidateManifest(manifest); err != nil {
		t.Fatalf("validate manifest: %v", err)
	}
	if len(manifest.FileProviders) != 1 || len(manifest.FileProviders[0].ConfigFields) == 0 || len(manifest.FileProviders[0].AuthFields) == 0 {
		t.Fatalf("manifest does not contribute file provider fields: %#v", manifest.FileProviders)
	}
}

func TestTransferProgressRequiresHostFeatureNegotiation(t *testing.T) {
	if supportsFeature(nil, "transfer-progress-v1") {
		t.Fatal("legacy host unexpectedly enables progress frames")
	}
	if !supportsFeature([]string{"transfer-progress-v1"}, "transfer-progress-v1") {
		t.Fatal("compatible host did not enable progress frames")
	}
}

func TestNormalizeRequestDefaultsPortPathAndHostKeyPolicy(t *testing.T) {
	request, err := normalizeRequest(protocolRequest{
		APIVersion:   "v1",
		RequestID:    "request-1",
		ProviderType: "sftp",
		Operation:    "list",
		Config:       map[string]any{"host": " example.com "},
		Auth:         map[string]any{"username": " deploy ", "authType": "password", "password": "secret"},
	})
	if err != nil {
		t.Fatalf("normalizeRequest returned error: %v", err)
	}
	if request.Host != "example.com" || request.Port != 22 || request.Path != "." {
		t.Fatalf("normalized target = %#v", request)
	}
	if request.HostKeyPolicy != "accept-new" {
		t.Fatalf("HostKeyPolicy = %q, want accept-new", request.HostKeyPolicy)
	}
}

func TestNormalizeRequestRequiresCompatibleEnvelopeAndCredentials(t *testing.T) {
	base := protocolRequest{
		APIVersion: "v1", RequestID: "request-1", ProviderType: "sftp", Operation: "list",
		Config: map[string]any{"host": "example.com"},
		Auth:   map[string]any{"username": "deploy", "authType": "password", "password": "secret"},
	}
	cases := []protocolRequest{
		withProtocolField(base, "apiVersion", "v2"),
		withProtocolField(base, "providerType", "ftp"),
		withProtocolField(base, "requestId", ""),
		withConfig(base, map[string]any{}),
		withAuth(base, map[string]any{"authType": "password", "password": "secret"}),
		withAuth(base, map[string]any{"username": "deploy", "authType": "privateKey"}),
	}

	for _, request := range cases {
		if _, err := normalizeRequest(request); err == nil {
			t.Fatalf("normalizeRequest(%#v) returned nil error", request)
		}
	}
}

func TestNormalizeRequestAcceptsPrivateKeyAndValidatesMutationPaths(t *testing.T) {
	base := protocolRequest{
		APIVersion: "v1", RequestID: "request-1", ProviderType: "sftp", Operation: "write",
		Config: map[string]any{"host": "example.com", "port": float64(2202)},
		Auth: map[string]any{
			"username": "deploy", "authType": "privateKey", "privateKey": "key", "passphrase": "phrase",
		},
		Path: "/tmp/file.txt",
	}
	normalized, err := normalizeRequest(base)
	if err != nil {
		t.Fatalf("normalizeRequest returned error: %v", err)
	}
	if normalized.Port != 2202 || normalized.AuthType != "privateKey" || normalized.PrivateKey != "key" {
		t.Fatalf("normalized request = %#v", normalized)
	}

	base.Operation = "rename"
	if _, err := normalizeRequest(base); err == nil {
		t.Fatal("rename without destinationPath returned nil error")
	}
	base.Operation = "delete"
	base.Path = ""
	if _, err := normalizeRequest(base); err == nil {
		t.Fatal("delete without path returned nil error")
	}
}

func TestNormalizeRequestRequiresAbsoluteLocalPathForTransfers(t *testing.T) {
	base := protocolRequest{
		APIVersion: "v1", RequestID: "request-1", ProviderType: "sftp", Operation: "upload",
		Config: map[string]any{"host": "example.com"},
		Auth:   map[string]any{"username": "deploy", "authType": "password", "password": "secret"},
		Path:   "/incoming/payload.bin",
	}
	if _, err := normalizeRequest(base); err == nil {
		t.Fatal("upload without localPath returned nil error")
	}
	base.LocalPath = "relative.bin"
	if _, err := normalizeRequest(base); err == nil {
		t.Fatal("upload with relative localPath returned nil error")
	}
	base.LocalPath = filepath.Join(t.TempDir(), "payload.bin")
	normalized, err := normalizeRequest(base)
	if err != nil || normalized.LocalPath != base.LocalPath {
		t.Fatalf("normalized transfer = %#v, %v", normalized, err)
	}
}

func TestFileTransferOperationsStreamBinaryContent(t *testing.T) {
	sourcePath := filepath.Join(t.TempDir(), "source.bin")
	payload := []byte{0x00, 0x01, 0x80, 0xff}
	if err := os.WriteFile(sourcePath, payload, 0o600); err != nil {
		t.Fatalf("write source: %v", err)
	}
	var uploaded bytes.Buffer
	var createdPath string
	var renamedFrom string
	var renamedTo string
	ops := transferOperations{
		mkdirAll: func(string) error { return nil },
		createRemote: func(name string) (io.WriteCloser, error) {
			createdPath = name
			return nopWriteCloser{Writer: &uploaded}, nil
		},
		renameRemote: func(source, destination string) error {
			renamedFrom = source
			renamedTo = destination
			return nil
		},
		removeRemote: func(string) error { return nil },
	}
	var uploadProgress []int64
	if err := uploadLocalFile(ops, "/remote/source.bin", sourcePath, func(bytes, total int64) {
		if total != int64(len(payload)) {
			t.Fatalf("upload total = %d", total)
		}
		uploadProgress = append(uploadProgress, bytes)
	}); err != nil {
		t.Fatalf("uploadLocalFile returned error: %v", err)
	}
	if path.Dir(createdPath) != "/remote" || !strings.Contains(path.Base(createdPath), "galaxyterm-upload") {
		t.Fatalf("temporary upload path = %q", createdPath)
	}
	if renamedFrom != createdPath || renamedTo != "/remote/source.bin" || !bytes.Equal(uploaded.Bytes(), payload) {
		t.Fatalf("uploaded path/content = %q -> %q, %v", renamedFrom, renamedTo, uploaded.Bytes())
	}

	destinationPath := filepath.Join(t.TempDir(), "destination.bin")
	ops = transferOperations{
		openRemote: func(name string) (io.ReadCloser, error) {
			if name != "/remote/source.bin" {
				t.Fatalf("remote open path = %q", name)
			}
			return io.NopCloser(bytes.NewReader(payload)), nil
		},
		statRemote: func(string) (fs.FileInfo, error) {
			return fakeFileInfo{size: int64(len(payload))}, nil
		},
	}
	var downloadProgress []int64
	if err := downloadLocalFile(ops, "/remote/source.bin", destinationPath, func(bytes, total int64) {
		if total != int64(len(payload)) {
			t.Fatalf("download total = %d", total)
		}
		downloadProgress = append(downloadProgress, bytes)
	}); err != nil {
		t.Fatalf("downloadLocalFile returned error: %v", err)
	}
	downloaded, err := os.ReadFile(destinationPath)
	if err != nil || !bytes.Equal(downloaded, payload) {
		t.Fatalf("downloaded content = %v, %v", downloaded, err)
	}
	if len(uploadProgress) == 0 || uploadProgress[len(uploadProgress)-1] != int64(len(payload)) {
		t.Fatalf("upload progress = %v", uploadProgress)
	}
	if len(downloadProgress) == 0 || downloadProgress[len(downloadProgress)-1] != int64(len(payload)) {
		t.Fatalf("download progress = %v", downloadProgress)
	}
}

func TestUploadRemovesRemoteStagingFileWhenStreamingFails(t *testing.T) {
	sourcePath := filepath.Join(t.TempDir(), "source.bin")
	if err := os.WriteFile(sourcePath, []byte("payload"), 0o600); err != nil {
		t.Fatalf("write source: %v", err)
	}
	var stagedPath string
	var removedPath string
	ops := transferOperations{
		mkdirAll: func(string) error { return nil },
		createRemote: func(name string) (io.WriteCloser, error) {
			stagedPath = name
			return failingWriteCloser{}, nil
		},
		renameRemote: func(string, string) error {
			t.Fatal("rename called after failed upload")
			return nil
		},
		removeRemote: func(name string) error {
			removedPath = name
			return nil
		},
	}
	if err := uploadLocalFile(ops, "/remote/source.bin", sourcePath, nil); err == nil {
		t.Fatal("uploadLocalFile returned nil error for failed stream")
	}
	if stagedPath == "" || removedPath != stagedPath {
		t.Fatalf("staged/removed paths = %q, %q", stagedPath, removedPath)
	}
}

type nopWriteCloser struct {
	io.Writer
}

func (nopWriteCloser) Close() error { return nil }

type failingWriteCloser struct{}

func (failingWriteCloser) Write([]byte) (int, error) { return 0, errors.New("write failed") }
func (failingWriteCloser) Close() error              { return nil }

type fakeFileInfo struct{ size int64 }

func (info fakeFileInfo) Name() string       { return "payload" }
func (info fakeFileInfo) Size() int64        { return info.size }
func (info fakeFileInfo) Mode() fs.FileMode  { return 0o600 }
func (info fakeFileInfo) ModTime() time.Time { return time.Time{} }
func (info fakeFileInfo) IsDir() bool        { return false }
func (info fakeFileInfo) Sys() any           { return nil }

func TestHandleRequestReturnsStructuredValidationAndOperationErrors(t *testing.T) {
	response := handleRequest(protocolRequest{RequestID: "request-1"})
	if response.RequestID != "request-1" || response.Error == nil || response.Error.Code != "invalid_request" {
		t.Fatalf("response = %#v, want invalid_request", response)
	}

	response = handleRequest(protocolRequest{
		APIVersion: "v1", RequestID: "request-2", ProviderType: "sftp", Operation: "teleport",
		Config: map[string]any{"host": "example.com"},
		Auth:   map[string]any{"username": "deploy", "authType": "password", "password": "secret"},
	})
	if response.Error == nil || response.Error.Code != "unsupported_operation" {
		t.Fatalf("response = %#v, want unsupported_operation", response)
	}
}

func TestProviderErrorCodeMapsFilesystemErrors(t *testing.T) {
	if got := providerErrorCode(fs.ErrNotExist); got != "not_found" {
		t.Fatalf("providerErrorCode(not exist) = %q", got)
	}
	if got := providerErrorCode(fs.ErrPermission); got != "permission_denied" {
		t.Fatalf("providerErrorCode(permission) = %q", got)
	}
	if got := providerErrorCode(errors.New("network failed")); got != "operation_failed" {
		t.Fatalf("providerErrorCode(generic) = %q", got)
	}
}

func withProtocolField(request protocolRequest, field, value string) protocolRequest {
	switch field {
	case "apiVersion":
		request.APIVersion = value
	case "providerType":
		request.ProviderType = value
	case "requestId":
		request.RequestID = value
	}
	return request
}

func withConfig(request protocolRequest, config map[string]any) protocolRequest {
	request.Config = config
	return request
}

func withAuth(request protocolRequest, auth map[string]any) protocolRequest {
	request.Auth = auth
	return request
}
