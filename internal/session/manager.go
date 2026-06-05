package session

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Manager struct {
	mu        sync.RWMutex
	providers map[string]Provider
	sessions  map[string]*managedSession
	emit      Emitter
}

type managedSession struct {
	info   SessionInfo
	driver Driver
}

func NewManager(emit Emitter) *Manager {
	if emit == nil {
		emit = func(event Event) {}
	}
	return &Manager{
		providers: make(map[string]Provider),
		sessions:  make(map[string]*managedSession),
		emit:      emit,
	}
}

func (m *Manager) RegisterProvider(provider Provider) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.providers[provider.Type] = provider
}

func (m *Manager) ListProviders() []Provider {
	m.mu.RLock()
	defer m.mu.RUnlock()

	providers := make([]Provider, 0, len(m.providers))
	for _, provider := range m.providers {
		providers = append(providers, provider)
	}
	sort.Slice(providers, func(i, j int) bool {
		return providers[i].Type < providers[j].Type
	})
	return providers
}

func (m *Manager) ListSessions() []SessionInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sessions := make([]SessionInfo, 0, len(m.sessions))
	for _, current := range m.sessions {
		sessions = append(sessions, current.info)
	}
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].CreatedAt.Before(sessions[j].CreatedAt)
	})
	return sessions
}

func (m *Manager) Create(ctx context.Context, req CreateSessionRequest) (string, error) {
	m.mu.RLock()
	provider, ok := m.providers[req.ProviderType]
	m.mu.RUnlock()
	if !ok {
		return "", unknownProviderError(req.ProviderType)
	}

	driver, err := provider.NewDriver(req)
	if err != nil {
		return "", err
	}

	id := uuid.NewString()
	current := &managedSession{
		info: SessionInfo{
			ID:           id,
			ProviderType: req.ProviderType,
			DisplayName:  req.DisplayName,
			Status:       StatusStarting,
			CreatedAt:    time.Now(),
		},
		driver: driver,
	}

	m.mu.Lock()
	m.sessions[id] = current
	m.mu.Unlock()

	emit := func(event Event) {
		event.SessionID = id
		m.emit(event)
	}
	if err := driver.Start(ctx, emit); err != nil {
		m.mu.Lock()
		delete(m.sessions, id)
		m.mu.Unlock()
		return "", err
	}

	m.mu.Lock()
	if stored, ok := m.sessions[id]; ok {
		stored.info.Status = StatusRunning
	}
	m.mu.Unlock()

	return id, nil
}

func (m *Manager) CreateSession(req CreateSessionRequest) (string, error) {
	return m.Create(context.Background(), req)
}

func (m *Manager) Send(sessionID string, data string) error {
	current, err := m.getSession(sessionID)
	if err != nil {
		return err
	}
	return current.driver.Send(data)
}

func (m *Manager) Resize(sessionID string, cols uint16, rows uint16) error {
	current, err := m.getSession(sessionID)
	if err != nil {
		return err
	}
	return current.driver.Resize(cols, rows)
}

func (m *Manager) Close(sessionID string) error {
	m.mu.Lock()
	current, ok := m.sessions[sessionID]
	if !ok {
		m.mu.Unlock()
		return nil
	}
	delete(m.sessions, sessionID)
	m.mu.Unlock()

	return current.driver.Close()
}

func (m *Manager) getSession(sessionID string) (*managedSession, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	current, ok := m.sessions[sessionID]
	if !ok {
		return nil, unknownSessionError(sessionID)
	}
	return current, nil
}
