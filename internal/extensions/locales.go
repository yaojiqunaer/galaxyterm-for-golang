package extensions

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

const (
	maxExtensionLocaleSize     = 256 << 10
	maxExtensionLocaleMessages = 512
	maxExtensionMessageLength  = 4096
)

var extensionMessageKeyPattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9._+-]{0,159}$`)

func (api *API) LoadLocaleMessages(locale string) (map[string]string, error) {
	if !extensionLocalePattern.MatchString(locale) {
		return nil, fmt.Errorf("invalid extension locale: %s", locale)
	}
	api.mu.RLock()
	defer api.mu.RUnlock()

	result := make(map[string]string)
	for _, manifest := range api.installed {
		declaredLocale, found := manifestLocale(manifest, locale)
		if !found {
			continue
		}
		packageDir := api.packageDir(manifest)
		if packageDir == "" {
			continue
		}
		messages, found, err := readManifestLocaleFile(packageDir, manifest, declaredLocale)
		if err != nil {
			return nil, fmt.Errorf("load locale for %s: %w", manifest.ID, err)
		}
		if !found {
			continue
		}
		for key, value := range messages {
			if _, exists := result[key]; exists {
				return nil, fmt.Errorf("duplicate extension locale message: %s", key)
			}
			result[key] = value
		}
	}
	return result, nil
}

func validateExtractedLocaleFiles(packageDir string, manifest Manifest) error {
	for _, locale := range manifest.Locales {
		if _, _, err := readManifestLocaleFile(packageDir, manifest, locale); err != nil {
			return fmt.Errorf("invalid locale %s: %w", locale, err)
		}
	}
	return nil
}

func readManifestLocaleFile(packageDir string, manifest Manifest, locale string) (map[string]string, bool, error) {
	localePath := filepath.Join(packageDir, "locales", locale+".json")
	info, err := os.Stat(localePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, false, nil
		}
		return nil, false, err
	}
	if !info.Mode().IsRegular() {
		return nil, false, fmt.Errorf("locale is not a regular file")
	}
	if info.Size() > maxExtensionLocaleSize {
		return nil, false, fmt.Errorf("locale exceeds %d bytes", maxExtensionLocaleSize)
	}
	content, err := os.ReadFile(localePath)
	if err != nil {
		return nil, false, err
	}
	messages, err := decodeLocaleMessages(content, manifest)
	if err != nil {
		return nil, false, err
	}
	return messages, true, nil
}

func decodeLocaleMessages(content []byte, manifest Manifest) (map[string]string, error) {
	decoder := json.NewDecoder(bytes.NewReader(content))
	token, err := decoder.Token()
	if err != nil || token != json.Delim('{') {
		return nil, fmt.Errorf("locale must be a JSON object")
	}
	messages := make(map[string]string)
	for decoder.More() {
		keyToken, err := decoder.Token()
		if err != nil {
			return nil, fmt.Errorf("decode locale key: %w", err)
		}
		key, ok := keyToken.(string)
		if !ok {
			return nil, fmt.Errorf("locale message key must be a string")
		}
		if _, exists := messages[key]; exists {
			return nil, fmt.Errorf("duplicate locale message: %s", key)
		}
		if len(messages) >= maxExtensionLocaleMessages {
			return nil, fmt.Errorf("locale contains too many messages")
		}
		if !extensionMessageKeyPattern.MatchString(key) || !manifestAllowsLocaleKey(manifest, key) {
			return nil, fmt.Errorf("locale message is outside the extension namespace: %s", key)
		}
		var value string
		if err := decoder.Decode(&value); err != nil {
			return nil, fmt.Errorf("locale message must be a string: %s", key)
		}
		if len(value) > maxExtensionMessageLength {
			return nil, fmt.Errorf("locale message is too long: %s", key)
		}
		messages[key] = value
	}
	if token, err := decoder.Token(); err != nil || token != json.Delim('}') {
		return nil, fmt.Errorf("locale must end with a JSON object")
	}
	if token, err := decoder.Token(); err != io.EOF || token != nil {
		return nil, fmt.Errorf("locale contains trailing content")
	}
	return messages, nil
}

func manifestAllowsLocaleKey(manifest Manifest, key string) bool {
	for _, provider := range manifest.Providers {
		if providerLocaleKey(provider.Type, key) {
			return true
		}
	}
	for _, provider := range manifest.FileProviders {
		if providerLocaleKey(provider.Type, key) {
			return true
		}
	}
	return false
}

func providerLocaleKey(providerType string, key string) bool {
	prefix := "extension." + providerType
	return key == prefix || strings.HasPrefix(key, prefix+".")
}

func manifestLocale(manifest Manifest, locale string) (string, bool) {
	for _, declared := range manifest.Locales {
		if strings.EqualFold(declared, locale) {
			return declared, true
		}
	}
	return "", false
}
