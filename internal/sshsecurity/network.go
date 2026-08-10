package sshsecurity

import (
	"context"
	"fmt"
	"time"
)

const (
	defaultConnectTimeoutSeconds = 10
	defaultKeepAliveMaxFailures  = 3
)

type NetworkConfig struct {
	ConnectTimeout       time.Duration
	KeepAliveInterval    time.Duration
	KeepAliveMaxFailures int
}

type RequestSender interface {
	SendRequest(name string, wantReply bool, payload []byte) (bool, []byte, error)
}

type keepAliveTimeoutError struct {
	timeout time.Duration
}

func (err *keepAliveTimeoutError) Error() string {
	return fmt.Sprintf("ssh keepalive request timed out after %s", err.timeout)
}

func NormalizeNetworkConfig(connectTimeoutSeconds int, keepAliveIntervalSeconds int, keepAliveMaxFailures int) (NetworkConfig, error) {
	if connectTimeoutSeconds == 0 {
		connectTimeoutSeconds = defaultConnectTimeoutSeconds
	}
	if keepAliveMaxFailures == 0 {
		keepAliveMaxFailures = defaultKeepAliveMaxFailures
	}
	if connectTimeoutSeconds < 1 || connectTimeoutSeconds > 120 {
		return NetworkConfig{}, fmt.Errorf("ssh connection timeout must be between 1 and 120 seconds")
	}
	if keepAliveIntervalSeconds != 0 && (keepAliveIntervalSeconds < 5 || keepAliveIntervalSeconds > 300) {
		return NetworkConfig{}, fmt.Errorf("ssh keepalive interval must be 0 or between 5 and 300 seconds")
	}
	if keepAliveMaxFailures < 1 || keepAliveMaxFailures > 10 {
		return NetworkConfig{}, fmt.Errorf("ssh keepalive failure limit must be between 1 and 10")
	}
	return NetworkConfig{
		ConnectTimeout:       time.Duration(connectTimeoutSeconds) * time.Second,
		KeepAliveInterval:    time.Duration(keepAliveIntervalSeconds) * time.Second,
		KeepAliveMaxFailures: keepAliveMaxFailures,
	}, nil
}

func RunKeepAlive(ctx context.Context, sender RequestSender, config NetworkConfig) error {
	if config.KeepAliveInterval <= 0 || sender == nil {
		return nil
	}
	failureLimit := config.KeepAliveMaxFailures
	if failureLimit <= 0 {
		failureLimit = defaultKeepAliveMaxFailures
	}
	ticker := time.NewTicker(config.KeepAliveInterval)
	defer ticker.Stop()

	consecutiveFailures := 0
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			err := sendKeepAliveRequest(ctx, sender, config.ConnectTimeout)
			if ctx.Err() != nil {
				return nil
			}
			if err == nil {
				consecutiveFailures = 0
				continue
			}
			if _, timedOut := err.(*keepAliveTimeoutError); timedOut {
				return err
			}
			consecutiveFailures++
			if consecutiveFailures >= failureLimit {
				return fmt.Errorf("ssh keepalive failed after %d consecutive failures: %w", consecutiveFailures, err)
			}
		}
	}
}

func sendKeepAliveRequest(ctx context.Context, sender RequestSender, timeout time.Duration) error {
	if timeout <= 0 {
		timeout = defaultConnectTimeoutSeconds * time.Second
	}
	result := make(chan error, 1)
	go func() {
		_, _, err := sender.SendRequest("keepalive@openssh.com", true, nil)
		result <- err
	}()
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-result:
		return err
	case <-timer.C:
		return &keepAliveTimeoutError{timeout: timeout}
	}
}
