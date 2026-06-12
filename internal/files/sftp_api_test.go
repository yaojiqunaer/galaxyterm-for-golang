package files

import "testing"

func TestValidateSFTPListRequestDefaultsPathAndPort(t *testing.T) {
	req := SFTPListRequest{
		Host:     "127.0.0.1",
		Username: "root",
		Password: "secret",
	}

	normalized, err := validateSFTPListRequest(req)
	if err != nil {
		t.Fatalf("validateSFTPListRequest returned error: %v", err)
	}

	if normalized.Port != 22 {
		t.Fatalf("Port = %d, want 22", normalized.Port)
	}
	if normalized.Path != "." {
		t.Fatalf("Path = %q, want .", normalized.Path)
	}
}

func TestValidateSFTPListRequestRequiresHostAndUsername(t *testing.T) {
	_, err := validateSFTPListRequest(SFTPListRequest{Username: "root"})
	if err == nil {
		t.Fatal("expected missing host error")
	}

	_, err = validateSFTPListRequest(SFTPListRequest{Host: "127.0.0.1"})
	if err == nil {
		t.Fatal("expected missing username error")
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

func TestValidateSFTPWriteRequestRequiresPath(t *testing.T) {
	req := SFTPWriteRequest{
		Host:     "127.0.0.1",
		Username: "root",
		Content:  "hello",
	}

	if _, err := validateSFTPWriteRequest(req); err == nil {
		t.Fatal("expected missing path error")
	}
}

func TestValidateSFTPWriteRequestPreservesContentAndDefaultsPort(t *testing.T) {
	req := SFTPWriteRequest{
		Host:     "127.0.0.1",
		Username: "root",
		Path:     "/tmp/hello.txt",
		Content:  "hello",
	}

	normalized, err := validateSFTPWriteRequest(req)
	if err != nil {
		t.Fatalf("validateSFTPWriteRequest returned error: %v", err)
	}
	if normalized.Port != 22 {
		t.Fatalf("Port = %d, want 22", normalized.Port)
	}
	if normalized.Content != "hello" {
		t.Fatalf("Content = %q, want hello", normalized.Content)
	}
}

func TestSFTPAuthMethodsSupportPassword(t *testing.T) {
	req := SFTPListRequest{Password: "secret"}
	methods, err := sftpAuthMethods(req)
	if err != nil {
		t.Fatalf("sftpAuthMethods returned error: %v", err)
	}
	if len(methods) != 1 {
		t.Fatalf("len(methods) = %d, want 1", len(methods))
	}
}

func TestSFTPAuthMethodsRequirePrivateKeyContent(t *testing.T) {
	req := SFTPListRequest{AuthType: "privateKey"}
	if _, err := sftpAuthMethods(req); err == nil {
		t.Fatal("expected private key validation error")
	}
}
