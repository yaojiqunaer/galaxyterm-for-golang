package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/widget"
)

// main函数是程序的入口点
func main() {
	// 创建一个新的应用实例
	helloApp := app.New()
	// 创建一个标题为"Hello World"的新窗口
	helloWindow := helloApp.NewWindow("Hello World")
	// 调整窗口大小为300x200像素
	helloWindow.Resize(fyne.NewSize(300, 200))
	// 设置窗口内容为一个显示"Hello World"文本的标签
	helloWindow.SetContent(widget.NewLabel("Hello World"))
	// 显示窗口并运行应用
	helloWindow.ShowAndRun() // helloApp.Run()
}
