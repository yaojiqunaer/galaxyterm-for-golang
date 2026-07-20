package session

import (
	"context"
	"errors"
	"fmt"
	"time"
)

var (
	ErrUnknownProvider = errors.New("unknown provider")
	ErrUnknownSession  = errors.New("unknown session")
)

type Status string

const (
	StatusStarting Status = "starting"
	StatusRunning  Status = "running"
	StatusClosed   Status = "closed"
)

type Resize struct {
	Cols uint16
	Rows uint16
}

type Event struct {
	SessionID string
	Type      EventType
	Data      string
	Error     *AppError
}

type EventType string

const (
	EventData   EventType = "data"
	EventError  EventType = "error"
	EventExit   EventType = "exit"
	EventStatus EventType = "status"
)

type Emitter func(event Event)

type Driver interface {
	Start(ctx context.Context, emit Emitter) error
	Send(data string) error
	Resize(cols uint16, rows uint16) error
	Close() error
}

type DriverFactory func(req CreateSessionRequest) (Driver, error)

type Provider struct {
	Type         string          `json:"type"`
	NameKey      string          `json:"nameKey"`
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	Category     string          `json:"category"`
	Capabilities []string        `json:"capabilities"`
	ConfigFields []ProviderField `json:"configFields,omitempty"`
	AuthFields   []ProviderField `json:"authFields,omitempty"`
	NewDriver    DriverFactory   `json:"-"`
}

type ProviderField struct {
	Key            string                `json:"key"`
	LabelKey       string                `json:"labelKey,omitempty"`
	Label          string                `json:"label,omitempty"`
	PlaceholderKey string                `json:"placeholderKey,omitempty"`
	Placeholder    string                `json:"placeholder,omitempty"`
	Type           string                `json:"type"`
	Required       bool                  `json:"required,omitempty"`
	Default        any                   `json:"default,omitempty"`
	Min            *float64              `json:"min,omitempty"`
	Max            *float64              `json:"max,omitempty"`
	Options        []ProviderFieldOption `json:"options,omitempty"`
}

type ProviderFieldOption struct {
	Value    string `json:"value"`
	LabelKey string `json:"labelKey,omitempty"`
	Label    string `json:"label,omitempty"`
}

type CreateSessionRequest struct {
	ProviderType string                 `json:"providerType"`
	DisplayName  string                 `json:"displayName"`
	Config       map[string]interface{} `json:"config"`
	Auth         map[string]interface{} `json:"auth"`
}

type SessionInfo struct {
	ID           string    `json:"id"`
	ProviderType string    `json:"providerType"`
	DisplayName  string    `json:"displayName"`
	Status       Status    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
}

type AppError struct {
	Code           string                 `json:"code"`
	MessageKey     string                 `json:"messageKey"`
	DefaultMessage string                 `json:"defaultMessage"`
	Details        map[string]interface{} `json:"details,omitempty"`
	Cause          error                  `json:"-"`
}

func (e *AppError) Error() string {
	if e == nil {
		return ""
	}
	if e.DefaultMessage != "" {
		return e.DefaultMessage
	}
	return e.Code
}

func (e *AppError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

func newAppError(code string, sentinel error, messageKey string, defaultMessage string, details map[string]interface{}) *AppError {
	return &AppError{
		Code:           code,
		MessageKey:     messageKey,
		DefaultMessage: defaultMessage,
		Details:        details,
		Cause:          sentinel,
	}
}

func unknownProviderError(providerType string) *AppError {
	return newAppError(
		"UNKNOWN_PROVIDER",
		ErrUnknownProvider,
		"error.provider.unknown",
		fmt.Sprintf("unknown provider: %s", providerType),
		map[string]interface{}{"providerType": providerType},
	)
}

func unknownSessionError(sessionID string) *AppError {
	return newAppError(
		"UNKNOWN_SESSION",
		ErrUnknownSession,
		"error.session.unknown",
		fmt.Sprintf("unknown session: %s", sessionID),
		map[string]interface{}{"sessionId": sessionID},
	)
}
