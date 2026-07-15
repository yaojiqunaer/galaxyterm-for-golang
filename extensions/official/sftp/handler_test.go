package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"testing"

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
