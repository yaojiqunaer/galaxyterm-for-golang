package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"

	"galaxyterm/internal/extensions"
)

var supportedOperatingSystems = map[string]struct{}{
	"all": {}, "darwin": {}, "freebsd": {}, "linux": {}, "windows": {},
}

var supportedArchitectures = map[string]struct{}{
	"386": {}, "all": {}, "amd64": {}, "arm": {}, "arm64": {}, "riscv64": {},
}

type catalogGroup struct {
	manifest  extensions.Manifest
	baseOS    string
	assets    []extensions.CatalogAsset
	platforms map[string]struct{}
}

func main() {
	packageDirectory := flag.String("packages", "dist/extensions", "directory containing .gtx packages")
	outputPath := flag.String("output", "dist/extensions/galaxyterm-index.json", "catalog output path")
	baseURL := flag.String("base-url", "", "optional HTTPS base URL for package assets")
	flag.Parse()

	catalog, err := buildCatalog(*packageDirectory, *baseURL)
	if err == nil {
		err = writeCatalog(*outputPath, catalog)
	}
	if err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	_, _ = fmt.Fprintln(os.Stdout, *outputPath)
}

func buildCatalog(packageDirectory, baseURL string) (extensions.Catalog, error) {
	entries, err := os.ReadDir(packageDirectory)
	if err != nil {
		return extensions.Catalog{}, fmt.Errorf("read extension packages: %w", err)
	}
	groups := make(map[string]*catalogGroup)
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".gtx") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return extensions.Catalog{}, fmt.Errorf("inspect extension package %s: %w", entry.Name(), err)
		}
		if !info.Mode().IsRegular() {
			return extensions.Catalog{}, fmt.Errorf("extension package is not a regular file: %s", entry.Name())
		}
		packagePath := filepath.Join(packageDirectory, entry.Name())
		manifest, err := extensions.ReadPackageManifest(packagePath)
		if err != nil {
			return extensions.Catalog{}, fmt.Errorf("read extension package %s: %w", entry.Name(), err)
		}
		if err := extensions.ValidateManifest(manifest); err != nil {
			return extensions.Catalog{}, fmt.Errorf("validate extension package %s: %w", entry.Name(), err)
		}
		operatingSystem, architecture, err := parsePackagePlatform(entry.Name(), manifest)
		if err != nil {
			return extensions.Catalog{}, err
		}
		group := groups[manifest.ID]
		if group == nil {
			group = &catalogGroup{manifest: manifest, baseOS: operatingSystem, platforms: make(map[string]struct{})}
			groups[manifest.ID] = group
		} else {
			if group.manifest.Version != manifest.Version {
				return extensions.Catalog{}, fmt.Errorf("multiple versions found for extension %s", manifest.ID)
			}
			if !platformManifestsCompatible(group.manifest, group.baseOS, manifest, operatingSystem) {
				return extensions.Catalog{}, fmt.Errorf("platform packages have inconsistent manifests for extension %s", manifest.ID)
			}
		}
		platform := operatingSystem + "/" + architecture
		if _, exists := group.platforms[platform]; exists {
			return extensions.Catalog{}, fmt.Errorf("duplicate platform package for extension %s: %s", manifest.ID, platform)
		}
		group.platforms[platform] = struct{}{}
		digest, err := digestFile(packagePath)
		if err != nil {
			return extensions.Catalog{}, fmt.Errorf("hash extension package %s: %w", entry.Name(), err)
		}
		assetURL, err := resolvePackageURL(baseURL, entry.Name())
		if err != nil {
			return extensions.Catalog{}, err
		}
		asset := extensions.CatalogAsset{
			OS: operatingSystem, Arch: architecture, URL: assetURL, SHA256: digest,
		}
		if !reflect.DeepEqual(group.manifest, manifest) {
			asset.Manifest = &manifest
		}
		group.assets = append(group.assets, asset)
	}
	if len(groups) == 0 {
		return extensions.Catalog{}, errors.New("no .gtx packages found")
	}

	ids := make([]string, 0, len(groups))
	for id := range groups {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	catalog := extensions.Catalog{APIVersion: "v1", Extensions: make([]extensions.CatalogExtension, 0, len(ids))}
	for _, id := range ids {
		group := groups[id]
		sort.Slice(group.assets, func(left, right int) bool {
			if group.assets[left].OS == group.assets[right].OS {
				return group.assets[left].Arch < group.assets[right].Arch
			}
			return group.assets[left].OS < group.assets[right].OS
		})
		catalog.Extensions = append(catalog.Extensions, extensions.CatalogExtension{
			Manifest: group.manifest,
			Assets:   group.assets,
		})
	}
	return catalog, nil
}

func platformManifestsCompatible(left extensions.Manifest, leftOS string, right extensions.Manifest, rightOS string) bool {
	if reflect.DeepEqual(left, right) {
		return true
	}
	if leftOS == "windows" {
		left.Runtime.Entrypoint = strings.TrimSuffix(left.Runtime.Entrypoint, ".exe")
	}
	if rightOS == "windows" {
		right.Runtime.Entrypoint = strings.TrimSuffix(right.Runtime.Entrypoint, ".exe")
	}
	return reflect.DeepEqual(left, right)
}

func parsePackagePlatform(fileName string, manifest extensions.Manifest) (string, string, error) {
	prefix := manifest.ID + "_" + manifest.Version + "_"
	if !strings.HasPrefix(fileName, prefix) || !strings.HasSuffix(strings.ToLower(fileName), ".gtx") {
		return "", "", fmt.Errorf("package name must match %s<os>_<arch>.gtx: %s", prefix, fileName)
	}
	platform := fileName[len(prefix) : len(fileName)-len(".gtx")]
	parts := strings.Split(platform, "_")
	if len(parts) != 2 {
		return "", "", fmt.Errorf("package name has an invalid platform suffix: %s", fileName)
	}
	operatingSystem := strings.ToLower(parts[0])
	architecture := strings.ToLower(parts[1])
	if _, supported := supportedOperatingSystems[operatingSystem]; !supported {
		return "", "", fmt.Errorf("unsupported package operating system: %s", operatingSystem)
	}
	if _, supported := supportedArchitectures[architecture]; !supported {
		return "", "", fmt.Errorf("unsupported package architecture: %s", architecture)
	}
	return operatingSystem, architecture, nil
}

func resolvePackageURL(baseURL, fileName string) (string, error) {
	if strings.TrimSpace(baseURL) == "" {
		return fileName, nil
	}
	parsed, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil || !strings.EqualFold(parsed.Scheme, "https") || parsed.Host == "" || parsed.User != nil {
		return "", errors.New("extension asset base URL must use HTTPS without embedded credentials")
	}
	if !strings.HasSuffix(parsed.Path, "/") {
		parsed.Path += "/"
	}
	reference := &url.URL{Path: fileName}
	return parsed.ResolveReference(reference).String(), nil
}

func digestFile(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func writeCatalog(outputPath string, catalog extensions.Catalog) error {
	content, err := json.MarshalIndent(catalog, "", "  ")
	if err != nil {
		return fmt.Errorf("encode extension catalog: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		return err
	}
	temporary, err := os.CreateTemp(filepath.Dir(outputPath), ".catalog-*.json")
	if err != nil {
		return err
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if _, err := temporary.Write(append(content, '\n')); err != nil {
		_ = temporary.Close()
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	if err := os.Chmod(temporaryPath, 0o644); err != nil {
		return err
	}
	if err := os.Rename(temporaryPath, outputPath); err != nil {
		return err
	}
	return nil
}
