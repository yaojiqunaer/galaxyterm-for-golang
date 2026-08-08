package sshsecurity

import (
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/knownhosts"
)

type Policy string

const (
	PolicyAcceptNew Policy = "accept-new"
	PolicyStrict    Policy = "strict"

	HostKeyUnknown = "unknown"
	HostKeyChanged = "changed"
)

type HostKeyError struct {
	Kind           string
	Hostname       string
	Fingerprint    string
	KnownHostsPath string
	Cause          error
}

func (e *HostKeyError) Error() string {
	return fmt.Sprintf(
		"ssh host key %s for %s (fingerprint %s); known hosts file: %s",
		e.Kind,
		e.Hostname,
		e.Fingerprint,
		e.KnownHostsPath,
	)
}

func (e *HostKeyError) Unwrap() error {
	return e.Cause
}

var knownHostsWriteMu sync.Mutex

func NormalizePolicy(value string) (Policy, error) {
	policy := Policy(strings.ToLower(strings.TrimSpace(value)))
	if policy == "" {
		return PolicyAcceptNew, nil
	}
	if policy != PolicyAcceptNew && policy != PolicyStrict {
		return "", fmt.Errorf("unsupported ssh host key policy %q", value)
	}
	return policy, nil
}

func DefaultKnownHostsPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve user config directory: %w", err)
	}
	return filepath.Join(configDir, "GalaxyTerm", "security", "known_hosts"), nil
}

func NewHostKeyCallback(policyValue Policy, knownHostsPath string) (ssh.HostKeyCallback, error) {
	policy, err := NormalizePolicy(string(policyValue))
	if err != nil {
		return nil, err
	}
	path := strings.TrimSpace(knownHostsPath)
	if path == "" {
		path, err = DefaultKnownHostsPath()
		if err != nil {
			return nil, err
		}
	} else {
		path, err = resolveKnownHostsPath(path)
		if err != nil {
			return nil, err
		}
	}
	if err := ensureKnownHostsFile(path); err != nil {
		return nil, err
	}
	verify, err := knownhosts.New(path)
	if err != nil {
		return nil, fmt.Errorf("read known hosts file %s: %w", path, err)
	}

	return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
		if err := verify(hostname, remote, key); err == nil {
			return nil
		} else if policy == PolicyStrict {
			return describeHostKeyError(err, hostname, key, path)
		}

		knownHostsWriteMu.Lock()
		defer knownHostsWriteMu.Unlock()

		freshVerify, err := knownhosts.New(path)
		if err != nil {
			return fmt.Errorf("refresh known hosts file %s: %w", path, err)
		}
		if err = freshVerify(hostname, remote, key); err == nil {
			return nil
		}
		var keyErr *knownhosts.KeyError
		if !errors.As(err, &keyErr) || len(keyErr.Want) > 0 {
			return describeHostKeyError(err, hostname, key, path)
		}
		line := knownhosts.Line([]string{knownhosts.Normalize(hostname)}, key) + "\n"
		file, openErr := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o600)
		if openErr != nil {
			return fmt.Errorf("open known hosts file %s: %w", path, openErr)
		}
		_, writeErr := file.WriteString(line)
		closeErr := file.Close()
		if writeErr != nil {
			return fmt.Errorf("update known hosts file %s: %w", path, writeErr)
		}
		if closeErr != nil {
			return fmt.Errorf("close known hosts file %s: %w", path, closeErr)
		}
		return nil
	}, nil
}

func resolveKnownHostsPath(path string) (string, error) {
	if path != "~" && !strings.HasPrefix(path, "~/") && !strings.HasPrefix(path, `~\`) {
		return path, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve user home directory: %w", err)
	}
	if path == "~" {
		return home, nil
	}
	return filepath.Join(home, path[2:]), nil
}

func ensureKnownHostsFile(path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return fmt.Errorf("create known hosts directory: %w", err)
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("create known hosts file %s: %w", path, err)
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("close known hosts file %s: %w", path, err)
	}
	return nil
}

func describeHostKeyError(err error, hostname string, key ssh.PublicKey, path string) error {
	var keyErr *knownhosts.KeyError
	if !errors.As(err, &keyErr) {
		return fmt.Errorf("verify ssh host key for %s: %w", hostname, err)
	}
	kind := HostKeyUnknown
	if len(keyErr.Want) > 0 {
		kind = HostKeyChanged
	}
	return &HostKeyError{
		Kind:           kind,
		Hostname:       hostname,
		Fingerprint:    ssh.FingerprintSHA256(key),
		KnownHostsPath: path,
		Cause:          err,
	}
}
