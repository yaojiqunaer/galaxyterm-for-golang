package main

import (
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// CreateVBox 创建一个标签和一个输入框，并关联它们。
// 输入框的变化会更新标签的文本。
// 返回的output是更新目标标签的引用，input是创建的输入框的引用。
func CreateVBox() (output *widget.Label, input *widget.Entry) {
	// 初始化标签，初始文本为"Unit Test"
	output = widget.NewLabel("Unit Test")
	// 初始化输入框
	input = widget.NewEntry()
	// 当输入框内容变化时，更新标签的文本
	// 这个操作建立了输入框和标签之间的关联
	input.OnChanged = func(change string) {
		output.SetText("Hello: " + change)
	}
	// 返回标签和输入框的引用
	return output, input
}

// main函数是程序的入口点
func main() {
	// 创建一个新的应用程序实例
	mainApp := app.New()
	// 创建一个名为"Unit Test"的新窗口
	window := mainApp.NewWindow("Unit Test")
	// 创建一个垂直布局的容器，包含一个标签和一个输入框
	output, input := CreateVBox()
	// 设置窗口的内容为垂直布局的容器
	window.SetContent(container.NewVBox(output, input))
	// 显示并运行窗口
	window.ShowAndRun()
}
