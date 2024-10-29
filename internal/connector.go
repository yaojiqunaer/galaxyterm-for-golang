package internal

// Connector is the interface that wraps the basic methods for a connector
type Connector interface {

	// Connect to the remote server
	Connect() error

	// Disconnect from the remote server
	Disconnect() error

	// Send text to the remote server
	Send(text string) error

	// Resize the terminal
	// cols: number of columns, example: 80
	// rows: number of rows, example: 24
	Resize(cols uint16, rows uint16) error
}

type TerminalOptions struct {
	Args        []string
	LightTheme  *Theme
	DarkTheme   *Theme
	CustomTheme *Theme
}

type Auth struct {
	UserName string
	// TODO: encryption
	Password string
	AuthType AuthType
}

type AuthType string

type PtyType string

const (
	PWD AuthType = "PASSWORD"

	XTERM_256_COLOR PtyType = "xterm-256color"
	XTERM           PtyType = "xterm"
	XTERM_COLOR     PtyType = "xterm-color"
	VT100           PtyType = "vt100"
	VT200           PtyType = "vt200"
)
