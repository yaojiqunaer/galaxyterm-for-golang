package files

import (
	"fmt"
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
