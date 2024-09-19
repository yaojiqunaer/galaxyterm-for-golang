go install fyne.io/fyne/v2/cmd/fyne@latest

# 打包桌面应用
fyne package -os darwin # for mac os
fyne package -os linux # for linux
fyne package -os windows # for windows

# 打包准备上传应用商店
fyne release -appID io.github.yaojiqunaer.galaxyterm -appVersion 0.0.1 -appBuild 1 -category productivity -profile GalaxyTerm
fyne release -os android -appID io.github.yaojiqunaer.galaxyterm -appVersion 0.0.1 -appBuild 1 -category productivity -profile GalaxyTerm