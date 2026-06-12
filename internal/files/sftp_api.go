package files

import (
	"fmt"
	"io"
	"path"
	"strings"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

type API struct{}

func NewAPI() *API {
	return &API{}
}

type SFTPListRequest struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Path     string `json:"path"`
}

type SFTPPathRequest struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Path     string `json:"path"`
}

type SFTPReadRequest = SFTPPathRequest

type SFTPWriteRequest struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Path     string `json:"path"`
	Content  string `json:"content"`
}

type SFTPMkdirRequest = SFTPPathRequest

type SFTPDeleteRequest = SFTPPathRequest

type FileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	Mode    string `json:"mode"`
	IsDir   bool   `json:"isDir"`
	ModTime string `json:"modTime"`
}

func (api *API) List(req SFTPListRequest) ([]FileEntry, error) {
	normalized, err := validateSFTPListRequest(req)
	if err != nil {
		return nil, err
	}

	client, err := dialSFTP(normalized)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	infos, err := client.ReadDir(normalized.Path)
	if err != nil {
		return nil, err
	}

	entries := make([]FileEntry, 0, len(infos))
	for _, info := range infos {
		entries = append(entries, FileEntry{
			Name:    info.Name(),
			Path:    path.Join(normalized.Path, info.Name()),
			Size:    info.Size(),
			Mode:    info.Mode().String(),
			IsDir:   info.IsDir(),
			ModTime: info.ModTime().Format("2006-01-02 15:04:05"),
		})
	}
	return entries, nil
}

func (api *API) Mkdir(req SFTPMkdirRequest) error {
	normalized, err := validateSFTPPathRequest(SFTPPathRequest(req))
	if err != nil {
		return err
	}
	client, err := dialSFTP(SFTPListRequest(normalized))
	if err != nil {
		return err
	}
	defer client.Close()
	return client.MkdirAll(normalized.Path)
}

func (api *API) Delete(req SFTPDeleteRequest) error {
	normalized, err := validateSFTPPathRequest(SFTPPathRequest(req))
	if err != nil {
		return err
	}
	client, err := dialSFTP(SFTPListRequest(normalized))
	if err != nil {
		return err
	}
	defer client.Close()

	info, err := client.Stat(normalized.Path)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return client.RemoveDirectory(normalized.Path)
	}
	return client.Remove(normalized.Path)
}

func (api *API) ReadFile(req SFTPReadRequest) (string, error) {
	normalized, err := validateSFTPPathRequest(SFTPPathRequest(req))
	if err != nil {
		return "", err
	}
	client, err := dialSFTP(SFTPListRequest(normalized))
	if err != nil {
		return "", err
	}
	defer client.Close()

	file, err := client.Open(normalized.Path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func (api *API) WriteFile(req SFTPWriteRequest) error {
	normalized, err := validateSFTPWriteRequest(req)
	if err != nil {
		return err
	}
	client, err := dialSFTP(SFTPListRequest{
		Host:     normalized.Host,
		Port:     normalized.Port,
		Username: normalized.Username,
		Password: normalized.Password,
		Path:     normalized.Path,
	})
	if err != nil {
		return err
	}
	defer client.Close()

	parent := path.Dir(normalized.Path)
	if parent != "." && parent != "/" {
		if err := client.MkdirAll(parent); err != nil {
			return err
		}
	}
	file, err := client.Create(normalized.Path)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.Write([]byte(normalized.Content))
	return err
}

func validateSFTPListRequest(req SFTPListRequest) (SFTPListRequest, error) {
	req.Host = strings.TrimSpace(req.Host)
	req.Username = strings.TrimSpace(req.Username)
	req.Path = strings.TrimSpace(req.Path)

	if req.Host == "" {
		return req, fmt.Errorf("missing required field: host")
	}
	if req.Username == "" {
		return req, fmt.Errorf("missing required field: username")
	}
	if req.Port == 0 {
		req.Port = 22
	}
	if req.Path == "" {
		req.Path = "."
	}
	return req, nil
}

func validateSFTPPathRequest(req SFTPPathRequest) (SFTPPathRequest, error) {
	listReq, err := validateSFTPListRequest(SFTPListRequest(req))
	if err != nil {
		return req, err
	}
	if strings.TrimSpace(listReq.Path) == "" || listReq.Path == "." {
		return req, fmt.Errorf("missing required field: path")
	}
	return SFTPPathRequest(listReq), nil
}

func validateSFTPWriteRequest(req SFTPWriteRequest) (SFTPWriteRequest, error) {
	listReq, err := validateSFTPListRequest(SFTPListRequest{
		Host:     req.Host,
		Port:     req.Port,
		Username: req.Username,
		Password: req.Password,
		Path:     req.Path,
	})
	if err != nil {
		return req, err
	}
	if strings.TrimSpace(listReq.Path) == "" || listReq.Path == "." {
		return req, fmt.Errorf("missing required field: path")
	}
	req.Host = listReq.Host
	req.Port = listReq.Port
	req.Username = listReq.Username
	req.Password = listReq.Password
	req.Path = listReq.Path
	return req, nil
}

func ParentPath(current string) string {
	current = strings.TrimSpace(current)
	if current == "" || current == "." {
		return "."
	}
	cleaned := path.Clean(current)
	if cleaned == "/" {
		return "/"
	}
	parent := path.Dir(cleaned)
	if parent == "." && strings.HasPrefix(cleaned, "/") {
		return "/"
	}
	return parent
}

func dialSFTP(req SFTPListRequest) (*sftp.Client, error) {
	config := &ssh.ClientConfig{
		User: req.Username,
		Auth: []ssh.AuthMethod{
			ssh.Password(req.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	client, err := ssh.Dial("tcp", fmt.Sprintf("%s:%d", req.Host, req.Port), config)
	if err != nil {
		return nil, err
	}

	sftpClient, err := sftp.NewClient(client)
	if err != nil {
		_ = client.Close()
		return nil, err
	}
	return sftpClient, nil
}
