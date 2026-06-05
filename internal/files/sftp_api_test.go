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
