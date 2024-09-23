package main

type Screen interface {
	GetScreenSize() (int, int)
}

type WindowsScreen struct {
}

func (w *WindowsScreen) GetScreenSize() {

}

type MacScreen struct {
}

func (m *MacScreen) GetScreenSize() {

}
