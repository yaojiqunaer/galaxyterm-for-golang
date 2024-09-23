package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/widget"
)

func main() {
	// 创建一个新的应用实例
	mainApp := app.New()

	// 创建主窗口并设置其内容
	masterWindow := mainApp.NewWindow("Master Window")
	masterWindow.SetContent(widget.NewLabel("This is the master window"))
	// 设置为主窗口
	masterWindow.SetMaster()
	// 显示主窗口
	masterWindow.Show()

	// 创建从窗口并设置其内容
	slaveWindow := mainApp.NewWindow("Slave Window")
	slaveWindow.SetContent(widget.NewLabel("This is the slave window"))
	// 调整从窗口大小
	slaveWindow.Resize(fyne.NewSize(100, 100))
	// 在从窗口中添加一个按钮，点击按钮时打开新窗口
	slaveWindow.SetContent(widget.NewButton("Open New Window", func() {
		// 创建并配置新窗口
		subWindow := mainApp.NewWindow("Open New Window")
		subWindow.SetContent(widget.NewLabel("Open New Window"))
		subWindow.Resize(fyne.NewSize(200, 200))
		// 显示新窗口
		subWindow.Show()
	}))
	// 显示从窗口
	slaveWindow.Show()

	// 运行应用
	mainApp.Run()
}
