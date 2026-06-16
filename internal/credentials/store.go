package credentials

import (
	"errors"
	"sync"

	"github.com/zalando/go-keyring"
)

var ErrNotFound = errors.New("credential not found")

type keyringStore struct{}

func (keyringStore) Set(service string, user string, secret string) error {
	return keyring.Set(service, user, secret)
}

func (keyringStore) Get(service string, user string) (string, error) {
	secret, err := keyring.Get(service, user)
	if errors.Is(err, keyring.ErrNotFound) {
		return "", ErrNotFound
	}
	return secret, err
}

func (keyringStore) Delete(service string, user string) error {
	err := keyring.Delete(service, user)
	if errors.Is(err, keyring.ErrNotFound) {
		return ErrNotFound
	}
	return err
}

type memoryStore struct {
	mu      sync.Mutex
	secrets map[string]string
}

func newMemoryStore() *memoryStore {
	return &memoryStore{secrets: map[string]string{}}
}

func (s *memoryStore) Set(service string, user string, secret string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.secrets[service+":"+user] = secret
	return nil
}

func (s *memoryStore) Get(service string, user string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	secret, ok := s.secrets[service+":"+user]
	if !ok {
		return "", ErrNotFound
	}
	return secret, nil
}

func (s *memoryStore) Delete(service string, user string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := service + ":" + user
	if _, ok := s.secrets[key]; !ok {
		return ErrNotFound
	}
	delete(s.secrets, key)
	return nil
}
