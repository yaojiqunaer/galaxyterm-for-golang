package extensions

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"time"
)

const (
	catalogAPIVersion = "v1"
	catalogFileName   = "galaxyterm-index.json"
	maxCatalogItems   = 256
	maxCatalogSize    = 2 << 20
	remoteTimeout     = 20 * time.Second
)

type Catalog struct {
	APIVersion string             `json:"apiVersion"`
	Extensions []CatalogExtension `json:"extensions"`
}

type CatalogExtension struct {
	Manifest Manifest       `json:"manifest"`
	Assets   []CatalogAsset `json:"assets"`
}

type CatalogAsset struct {
	OS     string `json:"os"`
	Arch   string `json:"arch"`
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
}

type CatalogItem struct {
	Manifest  Manifest     `json:"manifest"`
	Asset     CatalogAsset `json:"asset"`
	SourceURL string       `json:"sourceUrl"`
}

type OnlineInstallRequest struct {
	URL         string    `json:"url"`
	SHA256      string    `json:"sha256"`
	ExtensionID string    `json:"extensionId,omitempty"`
	Version     string    `json:"version,omitempty"`
	Manifest    *Manifest `json:"manifest,omitempty"`
}

func secureHTTPClient(client *http.Client) *http.Client {
	if client == nil {
		client = http.DefaultClient
	}
	copy := *client
	if copy.Timeout == 0 {
		copy.Timeout = remoteTimeout
	}
	if copy.CheckRedirect == nil {
		copy.CheckRedirect = func(request *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			return validateRemoteURL(request.URL)
		}
	}
	return &copy
}

func resolveCatalogURL(source string) (string, error) {
	parsed, err := parseRemoteURL(source)
	if err != nil {
		return "", fmt.Errorf("invalid extension source: %w", err)
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	if !strings.EqualFold(parsed.Hostname(), "github.com") || strings.HasSuffix(parsed.Path, ".json") {
		return parsed.String(), nil
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", fmt.Errorf("GitHub source must include owner and repository")
	}
	parsed.Path = fmt.Sprintf("/%s/%s/releases/latest/download/%s", parts[0], parts[1], catalogFileName)
	return parsed.String(), nil
}

func (api *API) FetchCatalog(source string) ([]CatalogItem, error) {
	catalogURL, err := resolveCatalogURL(source)
	if err != nil {
		return nil, err
	}
	content, err := api.readRemote(catalogURL, maxCatalogSize, "application/json")
	if err != nil {
		return nil, fmt.Errorf("fetch extension catalog: %w", err)
	}
	var catalog Catalog
	if err := json.Unmarshal(content, &catalog); err != nil {
		return nil, fmt.Errorf("decode extension catalog: %w", err)
	}
	if catalog.APIVersion != catalogAPIVersion {
		return nil, fmt.Errorf("unsupported extension catalog apiVersion: %s", catalog.APIVersion)
	}
	if len(catalog.Extensions) > maxCatalogItems {
		return nil, fmt.Errorf("extension catalog contains too many items")
	}

	items := make([]CatalogItem, 0, len(catalog.Extensions))
	seen := make(map[string]struct{}, len(catalog.Extensions))
	for _, extension := range catalog.Extensions {
		if err := ValidateManifest(extension.Manifest); err != nil {
			return nil, fmt.Errorf("invalid catalog extension %q: %w", extension.Manifest.ID, err)
		}
		if _, exists := seen[extension.Manifest.ID]; exists {
			return nil, fmt.Errorf("duplicate catalog extension: %s", extension.Manifest.ID)
		}
		seen[extension.Manifest.ID] = struct{}{}
		asset, ok := selectCatalogAsset(extension.Assets, runtime.GOOS, runtime.GOARCH)
		if !ok {
			continue
		}
		resolved, err := resolveAssetURL(catalogURL, asset.URL)
		if err != nil {
			return nil, fmt.Errorf("invalid catalog asset for %s: %w", extension.Manifest.ID, err)
		}
		asset.URL = resolved
		asset.SHA256 = strings.ToLower(strings.TrimSpace(asset.SHA256))
		if err := validateSHA256(asset.SHA256); err != nil {
			return nil, fmt.Errorf("invalid catalog asset for %s: %w", extension.Manifest.ID, err)
		}
		items = append(items, CatalogItem{
			Manifest:  extension.Manifest,
			Asset:     asset,
			SourceURL: catalogURL,
		})
	}
	return items, nil
}

func (api *API) InstallOnline(request OnlineInstallRequest) (Manifest, error) {
	packageURL, err := parseRemoteURL(request.URL)
	if err != nil {
		return Manifest{}, fmt.Errorf("invalid extension package URL: %w", err)
	}
	expectedDigest := strings.ToLower(strings.TrimSpace(request.SHA256))
	if err := validateSHA256(expectedDigest); err != nil {
		return Manifest{}, err
	}
	if api.storePath == "" {
		return Manifest{}, fmt.Errorf("extension store is unavailable")
	}
	if err := os.MkdirAll(filepath.Dir(api.storePath), 0o755); err != nil {
		return Manifest{}, err
	}
	temporary, err := os.CreateTemp(filepath.Dir(api.storePath), ".download-*.gtx")
	if err != nil {
		return Manifest{}, err
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)

	response, err := api.get(packageURL.String(), "application/octet-stream")
	if err != nil {
		_ = temporary.Close()
		return Manifest{}, fmt.Errorf("download extension package: %w", err)
	}
	defer response.Body.Close()
	if response.ContentLength > maxExtensionSize {
		_ = temporary.Close()
		return Manifest{}, fmt.Errorf("extension package is too large")
	}
	hash := sha256.New()
	written, copyErr := io.Copy(io.MultiWriter(temporary, hash), io.LimitReader(response.Body, maxExtensionSize+1))
	closeErr := temporary.Close()
	if copyErr != nil {
		return Manifest{}, fmt.Errorf("download extension package: %w", copyErr)
	}
	if closeErr != nil {
		return Manifest{}, closeErr
	}
	if written > maxExtensionSize {
		return Manifest{}, fmt.Errorf("extension package is too large")
	}
	actualDigest := hex.EncodeToString(hash.Sum(nil))
	if !hmac.Equal([]byte(actualDigest), []byte(expectedDigest)) {
		return Manifest{}, fmt.Errorf("extension package checksum mismatch")
	}

	manifest, err := ReadPackageManifest(temporaryPath)
	if err != nil {
		return Manifest{}, err
	}
	if request.ExtensionID != "" && manifest.ID != request.ExtensionID {
		return Manifest{}, fmt.Errorf("extension package id mismatch: %s", manifest.ID)
	}
	if request.Version != "" && manifest.Version != request.Version {
		return Manifest{}, fmt.Errorf("extension package version mismatch: %s", manifest.Version)
	}
	if request.Manifest != nil {
		if err := ValidateManifest(*request.Manifest); err != nil {
			return Manifest{}, fmt.Errorf("invalid catalog manifest: %w", err)
		}
		if !reflect.DeepEqual(manifest, *request.Manifest) {
			return Manifest{}, fmt.Errorf("extension package manifest does not match catalog")
		}
	}
	return api.InstallOffline(temporaryPath)
}

func (api *API) readRemote(remoteURL string, limit int64, accept string) ([]byte, error) {
	response, err := api.get(remoteURL, accept)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.ContentLength > limit {
		return nil, fmt.Errorf("remote response is too large")
	}
	content, err := io.ReadAll(io.LimitReader(response.Body, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(content)) > limit {
		return nil, fmt.Errorf("remote response is too large")
	}
	return content, nil
}

func (api *API) get(remoteURL, accept string) (*http.Response, error) {
	parsed, err := parseRemoteURL(remoteURL)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequest(http.MethodGet, parsed.String(), nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", accept)
	request.Header.Set("User-Agent", "GalaxyTerm/0.0.1")
	response, err := api.client.Do(request)
	if err != nil {
		return nil, err
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		response.Body.Close()
		return nil, fmt.Errorf("remote server returned %s", response.Status)
	}
	return response, nil
}

func parseRemoteURL(value string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(value))
	if err != nil {
		return nil, err
	}
	if err := validateRemoteURL(parsed); err != nil {
		return nil, err
	}
	return parsed, nil
}

func validateRemoteURL(parsed *url.URL) error {
	if parsed == nil || !strings.EqualFold(parsed.Scheme, "https") || parsed.Host == "" {
		return fmt.Errorf("remote URL must use HTTPS")
	}
	if parsed.User != nil {
		return fmt.Errorf("remote URL must not contain credentials")
	}
	return nil
}

func resolveAssetURL(catalogURL, assetURL string) (string, error) {
	base, err := parseRemoteURL(catalogURL)
	if err != nil {
		return "", err
	}
	reference, err := url.Parse(strings.TrimSpace(assetURL))
	if err != nil {
		return "", err
	}
	resolved := base.ResolveReference(reference)
	if err := validateRemoteURL(resolved); err != nil {
		return "", err
	}
	if !strings.HasSuffix(strings.ToLower(resolved.Path), ".gtx") {
		return "", fmt.Errorf("extension package must use the .gtx suffix")
	}
	return resolved.String(), nil
}

func selectCatalogAsset(assets []CatalogAsset, operatingSystem, architecture string) (CatalogAsset, bool) {
	bestScore := -1
	var best CatalogAsset
	for _, asset := range assets {
		osScore, osMatches := platformPartScore(asset.OS, operatingSystem)
		archScore, archMatches := platformPartScore(asset.Arch, architecture)
		if !osMatches || !archMatches {
			continue
		}
		score := osScore*2 + archScore
		if score > bestScore {
			bestScore = score
			best = asset
		}
	}
	return best, bestScore >= 0
}

func platformPartScore(value, current string) (int, bool) {
	value = strings.ToLower(strings.TrimSpace(value))
	switch value {
	case "", "all", "any", "*":
		return 0, true
	case strings.ToLower(current):
		return 1, true
	default:
		return 0, false
	}
}

func validateSHA256(value string) error {
	if len(value) != sha256.Size*2 {
		return fmt.Errorf("extension package SHA-256 is required")
	}
	if _, err := hex.DecodeString(value); err != nil {
		return fmt.Errorf("invalid extension package SHA-256")
	}
	return nil
}
