package main

import (
	"fyne.io/fyne/v2/test"
	"fyne.io/fyne/v2/widget"
	"github.com/stretchr/testify/assert"
	"testing"
)

// Test_CreateVBox 测试 CreateVBox 函数的功能。
// 它通过模拟用户输入并断言标签是否符合预期来验证函数的正确性。
func Test_CreateVBox(t *testing.T) {
	// 定义测试用例数组，每个用例包含名称、期望的标签、输入和期望的输出。
	tests := []struct {
		name      string
		wantLabel *widget.Label
		input     string
	}{
		{"1", widget.NewLabel("Unit Test"), "YourName"},
		{"2", widget.NewLabel("Unit Test"), "XXX"},
	}
	// 遍历测试用例数组，对每个用例执行测试。
	for _, tt := range tests {
		// 使用内联的测试函数运行测试用例。
		t.Run(tt.name, func(t *testing.T) {
			// 调用待测函数 CreateVBox，获取返回的标签和输入框。
			gotLabel, gotEntry := CreateVBox()
			// 模拟用户输入。
			test.Type(gotEntry, tt.input)
			// 验证标签的文本是否与预期相符。
			assert.Equal(t, gotLabel.Text, "Hello: "+gotEntry.Text)
		})
	}
}
