package main

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/knownhosts"
)

const maxTextFileSize = 12 << 20

var supportedOperations = map[string]struct{}{
	"delete": {},
	"list":   {},
	"mkdir":  {},
	"read":   {},
	"rename": {},
	"stat":   {},
	"write":  {},
}

func handleRequest(request protocolRequest) protocolResponse {
	response := protocolResponse{RequestID: request.RequestID}
	normalized, err := normalizeRequest(request)
	if err != nil {
		response.Error = structuredError(err)
		return response
	}
	result, err := executeOperation(normalized)
	if err != nil {
		response.Error = structuredError(err)
		return response
	}
	response.Result = result
	return response
}

func normalizeRequest(request protocolRequest) (normalizedRequest, error) {
	if strings.TrimSpace(request.APIVersion) == "" {
		return normalizedRequest{}, &requestError{code: "invalid_request", message: "missing required field: apiVersion"}
	}
	if request.APIVersion != providerAPIVersion {
		return normalizedRequest{}, &requestError{code: "incompatible_api", message: "unsupported apiVersion"}
	}
	if request.ProviderType != providerType {
		return normalizedRequest{}, &requestError{code: "invalid_provider", message: "unsupported providerType"}
	}
	if strings.TrimSpace(request.RequestID) == "" {
		return normalizedRequest{}, &requestError{code: "invalid_request", message: "missing required field: requestId"}
	}
	if _, supported := supportedOperations[request.Operation]; !supported {
		return normalizedRequest{}, &requestError{code: "unsupported_operation", message: "unsupported operation"}
	}
	host, err := requiredString(request.Config, "host")
	if err != nil {
		return normalizedRequest{}, err
	}
	username, err := requiredString(request.Auth, "username")
	if err != nil {
		return normalizedRequest{}, err
	}
	authType := stringValue(request.Auth, "authType")
	if authType == "" {
		authType = "password"
	}
	if authType != "password" && authType != "privateKey" {
		return normalizedRequest{}, &requestError{code: "invalid_request", message: "unsupported authentication type"}
	}
	privateKey := secretValue(request.Auth, "privateKey")
	if authType == "privateKey" && strings.TrimSpace(privateKey) == "" {
		return normalizedRequest{}, &requestError{code: "invalid_request", message: "missing required field: privateKey"}
	}
	port := intValue(request.Config, "port")
	if port == 0 {
		port = 22
	}
	if port < 1 || port > 65535 {
		return normalizedRequest{}, &requestError{code: "invalid_request", message: "port is outside the valid range"}
	}
	operationPath := strings.TrimSpace(request.Path)
	if request.Operation == "list" && operationPath == "" {
		operationPath = "."
	}
	if request.Operation != "list" && operationPath == "" {
		return normalizedRequest{}, &requestError{code: "invalid_request", message: "missing required field: path"}
	}
	destinationPath := strings.TrimSpace(request.DestinationPath)
	if request.Operation == "rename" && destinationPath == "" {
		return normalizedRequest{}, &requestError{code: "invalid_request", message: "missing required field: destinationPath"}
	}
	hostKeyPolicy := stringValue(request.Config, "hostKeyPolicy")
	if hostKeyPolicy == "" {
		hostKeyPolicy = "accept-new"
	}
	if hostKeyPolicy != "accept-new" && hostKeyPolicy != "strict" {
		return normalizedRequest{}, &requestError{code: "invalid_request", message: "unsupported host key policy"}
	}
	return normalizedRequest{
		RequestID:       request.RequestID,
		Operation:       request.Operation,
		Host:            host,
		Port:            port,
		HostKeyPolicy:   hostKeyPolicy,
		KnownHostsPath:  stringValue(request.Config, "knownHostsPath"),
		Username:        username,
		AuthType:        authType,
		Password:        secretValue(request.Auth, "password"),
		PrivateKey:      privateKey,
		Passphrase:      secretValue(request.Auth, "passphrase"),
		Path:            operationPath,
		DestinationPath: destinationPath,
		Content:         request.Content,
	}, nil
}

func executeOperation(request normalizedRequest) (any, error) {
	sshClient, sftpClient, err := dial(request)
	if err != nil {
		return nil, err
	}
	defer sshClient.Close()
	defer sftpClient.Close()

	switch request.Operation {
	case "list":
		infos, err := sftpClient.ReadDir(request.Path)
		if err != nil {
			return nil, err
		}
		entries := make([]fileEntry, 0, len(infos))
		for _, info := range infos {
			entries = append(entries, newFileEntry(request.Path, info))
		}
		return map[string]any{"entries": entries}, nil
	case "stat":
		info, err := sftpClient.Stat(request.Path)
		if err != nil {
			return nil, err
		}
		return map[string]any{"entry": newFileEntry(path.Dir(request.Path), info)}, nil
	case "read":
		return readTextFile(sftpClient, request.Path)
	case "write":
		return map[string]any{}, writeTextFile(sftpClient, request.Path, request.Content)
	case "mkdir":
		return map[string]any{}, sftpClient.MkdirAll(request.Path)
	case "rename":
		return map[string]any{}, sftpClient.Rename(request.Path, request.DestinationPath)
	case "delete":
		return map[string]any{}, deletePath(sftpClient, request.Path)
	default:
		return nil, &requestError{code: "unsupported_operation", message: "unsupported operation"}
	}
}

func dial(request normalizedRequest) (*ssh.Client, *sftp.Client, error) {
	authMethods, err := sshAuthMethods(request)
	if err != nil {
		return nil, nil, err
	}
	hostKeyCallback, err := hostKeyCallback(request)
	if err != nil {
		return nil, nil, err
	}
	sshClient, err := ssh.Dial("tcp", fmt.Sprintf("%s:%d", request.Host, request.Port), &ssh.ClientConfig{
		User:            request.Username,
		Auth:            authMethods,
		HostKeyCallback: hostKeyCallback,
		Timeout:         30 * time.Second,
	})
	if err != nil {
		return nil, nil, err
	}
	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		_ = sshClient.Close()
		return nil, nil, err
	}
	return sshClient, sftpClient, nil
}

func sshAuthMethods(request normalizedRequest) ([]ssh.AuthMethod, error) {
	if request.AuthType == "password" {
		return []ssh.AuthMethod{ssh.Password(request.Password)}, nil
	}
	var signer ssh.Signer
	var err error
	if request.Passphrase != "" {
		signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(request.PrivateKey), []byte(request.Passphrase))
	} else {
		signer, err = ssh.ParsePrivateKey([]byte(request.PrivateKey))
	}
	if err != nil {
		return nil, &requestError{code: "invalid_credentials", message: "private key could not be parsed"}
	}
	return []ssh.AuthMethod{ssh.PublicKeys(signer)}, nil
}

func hostKeyCallback(request normalizedRequest) (ssh.HostKeyCallback, error) {
	knownHostsPath := request.KnownHostsPath
	if knownHostsPath == "" {
		configDir, err := os.UserConfigDir()
		if err != nil {
			return nil, err
		}
		knownHostsPath = filepath.Join(configDir, "GalaxyTerm", "security", "known_hosts")
	}
	if err := os.MkdirAll(filepath.Dir(knownHostsPath), 0o700); err != nil {
		return nil, err
	}
	file, err := os.OpenFile(knownHostsPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return nil, err
	}
	if err := file.Close(); err != nil {
		return nil, err
	}
	verify, err := knownhosts.New(knownHostsPath)
	if err != nil {
		return nil, err
	}
	return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
		err := verify(hostname, remote, key)
		if err == nil || request.HostKeyPolicy == "strict" {
			return err
		}
		var keyError *knownhosts.KeyError
		if !errors.As(err, &keyError) || len(keyError.Want) > 0 {
			return err
		}
		line := knownhosts.Line([]string{knownhosts.Normalize(hostname)}, key) + "\n"
		handle, openErr := os.OpenFile(knownHostsPath, os.O_APPEND|os.O_WRONLY, 0o600)
		if openErr != nil {
			return openErr
		}
		_, writeErr := handle.WriteString(line)
		closeErr := handle.Close()
		if writeErr != nil {
			return writeErr
		}
		return closeErr
	}, nil
}

func newFileEntry(parent string, info fs.FileInfo) fileEntry {
	return fileEntry{
		Name:    info.Name(),
		Path:    path.Join(parent, info.Name()),
		Size:    info.Size(),
		Mode:    info.Mode().String(),
		IsDir:   info.IsDir(),
		ModTime: info.ModTime().UTC().Format(time.RFC3339),
	}
}

func readTextFile(client *sftp.Client, name string) (any, error) {
	file, err := client.Open(name)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	content, err := io.ReadAll(io.LimitReader(file, maxTextFileSize+1))
	if err != nil {
		return nil, err
	}
	if len(content) > maxTextFileSize {
		return nil, &requestError{code: "file_too_large", message: "file exceeds the text transfer limit"}
	}
	return map[string]any{"content": string(content)}, nil
}

func writeTextFile(client *sftp.Client, name, content string) error {
	if len(content) > maxTextFileSize {
		return &requestError{code: "file_too_large", message: "content exceeds the text transfer limit"}
	}
	parent := path.Dir(name)
	if parent != "." && parent != "/" {
		if err := client.MkdirAll(parent); err != nil {
			return err
		}
	}
	file, err := client.Create(name)
	if err != nil {
		return err
	}
	_, writeErr := file.Write([]byte(content))
	closeErr := file.Close()
	if writeErr != nil {
		return writeErr
	}
	return closeErr
}

func deletePath(client *sftp.Client, name string) error {
	info, err := client.Stat(name)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return client.RemoveDirectory(name)
	}
	return client.Remove(name)
}

func structuredError(err error) *providerError {
	var invalid *requestError
	if errors.As(err, &invalid) {
		return &providerError{Code: invalid.code, Message: invalid.message}
	}
	return &providerError{Code: providerErrorCode(err), Message: err.Error()}
}

func providerErrorCode(err error) string {
	if errors.Is(err, fs.ErrNotExist) {
		return "not_found"
	}
	if errors.Is(err, fs.ErrPermission) {
		return "permission_denied"
	}
	return "operation_failed"
}
