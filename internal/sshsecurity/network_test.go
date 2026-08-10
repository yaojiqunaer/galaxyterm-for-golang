package sshsecurity

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestNormalizeNetworkConfigDefaultsAndBounds(t *testing.T) {
	config, err := NormalizeNetworkConfig(0, 0, 0)
	if err != nil {
		t.Fatalf("NormalizeNetworkConfig returned error: %v", err)
	}
	if config.ConnectTimeout != 10*time.Second || config.KeepAliveInterval != 0 || config.KeepAliveMaxFailures != 3 {
		t.Fatalf("unexpected defaults: %+v", config)
	}

	config, err = NormalizeNetworkConfig(45, 20, 5)
	if err != nil {
		t.Fatalf("NormalizeNetworkConfig returned error: %v", err)
	}
	if config.ConnectTimeout != 45*time.Second || config.KeepAliveInterval != 20*time.Second || config.KeepAliveMaxFailures != 5 {
		t.Fatalf("unexpected explicit config: %+v", config)
	}

	for _, values := range [][3]int{{121, 0, 3}, {10, 3, 3}, {10, 20, 11}} {
		if _, err := NormalizeNetworkConfig(values[0], values[1], values[2]); err == nil {
			t.Fatalf("NormalizeNetworkConfig(%v) returned nil error", values)
		}
	}
}

func TestRunKeepAliveStopsAfterConsecutiveFailures(t *testing.T) {
	sender := &testKeepAliveSender{errors: []error{errors.New("one"), nil, errors.New("two"), errors.New("three")}}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	err := RunKeepAlive(ctx, sender, NetworkConfig{
		KeepAliveInterval:    time.Millisecond,
		KeepAliveMaxFailures: 2,
	})
	if err == nil || !strings.Contains(err.Error(), "2 consecutive failures") {
		t.Fatalf("RunKeepAlive error = %v, want failure threshold", err)
	}
	if sender.Calls() != 4 {
		t.Fatalf("keepalive calls = %d, want 4", sender.Calls())
	}
}

func TestRunKeepAliveReturnsOnCancellation(t *testing.T) {
	sender := &testKeepAliveSender{}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := RunKeepAlive(ctx, sender, NetworkConfig{
		KeepAliveInterval:    time.Millisecond,
		KeepAliveMaxFailures: 1,
	}); err != nil {
		t.Fatalf("RunKeepAlive returned cancellation error: %v", err)
	}
}

func TestRunKeepAliveTimesOutBlockedRequests(t *testing.T) {
	release := make(chan struct{})
	sender := blockingKeepAliveSender{release: release}
	defer close(release)
	started := time.Now()
	err := RunKeepAlive(context.Background(), sender, NetworkConfig{
		ConnectTimeout:       5 * time.Millisecond,
		KeepAliveInterval:    time.Millisecond,
		KeepAliveMaxFailures: 1,
	})
	if err == nil || !strings.Contains(err.Error(), "timed out") {
		t.Fatalf("RunKeepAlive error = %v, want timeout", err)
	}
	if elapsed := time.Since(started); elapsed > 100*time.Millisecond {
		t.Fatalf("RunKeepAlive took %s, want a bounded request timeout", elapsed)
	}
}

type testKeepAliveSender struct {
	mu     sync.Mutex
	errors []error
	calls  int
}

func (sender *testKeepAliveSender) SendRequest(string, bool, []byte) (bool, []byte, error) {
	sender.mu.Lock()
	defer sender.mu.Unlock()
	index := sender.calls
	sender.calls++
	if index < len(sender.errors) {
		return false, nil, sender.errors[index]
	}
	return true, nil, nil
}

func (sender *testKeepAliveSender) Calls() int {
	sender.mu.Lock()
	defer sender.mu.Unlock()
	return sender.calls
}

type blockingKeepAliveSender struct {
	release <-chan struct{}
}

func (sender blockingKeepAliveSender) SendRequest(string, bool, []byte) (bool, []byte, error) {
	<-sender.release
	return true, nil, nil
}
