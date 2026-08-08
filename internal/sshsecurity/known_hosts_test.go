package sshsecurity

import (
	"crypto/ed25519"
	"crypto/rand"
	"errors"
	"net"
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/crypto/ssh"
)

func TestAcceptNewPersistsAndStrictlyVerifiesHostKey(t *testing.T) {
	path := filepath.Join(t.TempDir(), "known_hosts")
	key := testPublicKey(t)
	callback, err := NewHostKeyCallback(PolicyAcceptNew, path)
	if err != nil {
		t.Fatalf("NewHostKeyCallback returned error: %v", err)
	}
	if err := callback("example.com:22", testRemoteAddr(), key); err != nil {
		t.Fatalf("accept-new callback returned error: %v", err)
	}

	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read known_hosts: %v", err)
	}
	if len(content) == 0 {
		t.Fatal("known_hosts remained empty after accepting a new host")
	}

	strict, err := NewHostKeyCallback(PolicyStrict, path)
	if err != nil {
		t.Fatalf("strict callback: %v", err)
	}
	if err := strict("example.com:22", testRemoteAddr(), key); err != nil {
		t.Fatalf("strict callback rejected saved host key: %v", err)
	}
}

func TestHostKeyCallbackRejectsChangedKey(t *testing.T) {
	path := filepath.Join(t.TempDir(), "known_hosts")
	callback, err := NewHostKeyCallback(PolicyAcceptNew, path)
	if err != nil {
		t.Fatalf("NewHostKeyCallback returned error: %v", err)
	}
	if err := callback("example.com:22", testRemoteAddr(), testPublicKey(t)); err != nil {
		t.Fatalf("save first key: %v", err)
	}

	err = callback("example.com:22", testRemoteAddr(), testPublicKey(t))
	var hostKeyErr *HostKeyError
	if !errors.As(err, &hostKeyErr) {
		t.Fatalf("changed key error = %v, want HostKeyError", err)
	}
	if hostKeyErr.Kind != HostKeyChanged {
		t.Fatalf("HostKeyError.Kind = %q, want %q", hostKeyErr.Kind, HostKeyChanged)
	}
}

func TestStrictPolicyRejectsUnknownHost(t *testing.T) {
	callback, err := NewHostKeyCallback(PolicyStrict, filepath.Join(t.TempDir(), "known_hosts"))
	if err != nil {
		t.Fatalf("NewHostKeyCallback returned error: %v", err)
	}
	err = callback("unknown.example.com:22", testRemoteAddr(), testPublicKey(t))
	var hostKeyErr *HostKeyError
	if !errors.As(err, &hostKeyErr) || hostKeyErr.Kind != HostKeyUnknown {
		t.Fatalf("strict unknown error = %v, want HostKeyUnknown", err)
	}
}

func TestNormalizePolicyDefaultsAndRejectsUnsupportedValues(t *testing.T) {
	policy, err := NormalizePolicy("")
	if err != nil || policy != PolicyAcceptNew {
		t.Fatalf("NormalizePolicy empty = %q, %v; want %q", policy, err, PolicyAcceptNew)
	}
	if _, err := NormalizePolicy("insecure"); err == nil {
		t.Fatal("NormalizePolicy accepted insecure policy")
	}
}

func TestResolveKnownHostsPathExpandsHomeDirectory(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)

	path, err := resolveKnownHostsPath("~/.ssh/known_hosts")
	if err != nil {
		t.Fatalf("resolveKnownHostsPath returned error: %v", err)
	}
	want := filepath.Join(home, ".ssh", "known_hosts")
	if path != want {
		t.Fatalf("resolveKnownHostsPath = %q, want %q", path, want)
	}
}

func testPublicKey(t *testing.T) ssh.PublicKey {
	t.Helper()
	public, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	key, err := ssh.NewPublicKey(public)
	if err != nil {
		t.Fatalf("ssh public key: %v", err)
	}
	return key
}

func testRemoteAddr() net.Addr {
	return &net.TCPAddr{IP: net.ParseIP("192.0.2.10"), Port: 22}
}
