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
