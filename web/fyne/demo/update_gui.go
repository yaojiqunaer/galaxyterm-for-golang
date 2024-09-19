package main

import (
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/widget"
	"time"
)

// main函数是程序的入口点
func main() {
	// 创建一个新的GUI应用程序实例
	gui := app.New()
	// 创建一个名为"Update GUI"的新窗口
	window := gui.NewWindow("Update GUI")
	// 创建一个初始为空的标签 widget
	label := widget.NewLabel("")
	// 将标签 widget 设置为窗口的内容
	window.SetContent(label)
	updateTimeLoop(label)
	// 显示窗口并进入事件处理循环
	window.ShowAndRun()
}

// updateTime 用于更新标签上的时间。
// 参数 label 是指向 widget.Label 类型的指针，表示需要更新时间的标签对象。
// 该函数通过启动一个新的 Go 协程来异步更新标签上的时间，以避免阻塞当前程序的运行。
func updateTimeLoop(label *widget.Label) {
	// 启动一个新的 Go 协程
	go func() {
		// 更新标签上的文本为当前时间的 DateTime 格式
		for {
			label.SetText(time.Now().Format(time.DateTime))
			time.Sleep(time.Second)
		}
	}()
}
