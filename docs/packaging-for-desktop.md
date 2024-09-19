## 桌面应用打包

安装fyne

`go install fyne.io/fyne/v2/cmd/fyne@latest`

打包参数

`fyne package --help`

```shell
NAME:
   fyne package - Packages an application for distribution.

USAGE:
   fyne package [command options] [arguments...]

DESCRIPTION:
   You may specify the -executable to package, otherwise -sourceDir will be built.

OPTIONS:
   --target value, --os value         The mobile platform to target (android, android/arm, android/arm64, android/amd64, android/386, ios, iossimulator, wasm, js, web).
   --executable value, --exe value    The path to the executable, default is the current dir main binary
   --name value                       The name of the application, default is the executable file name
   --tags value                       A comma-separated list of build tags.
   --appVersion value                 Version number in the form x, x.y or x.y.z semantic version
   --appBuild value                   Build number, should be greater than 0 and incremented for each build (default: 0)
   --sourceDir value, --src value     The directory to package, if executable is not set.
   --icon value                       The name of the application icon file.
   --use-raw-icon                     Skip any OS-specific icon pre-processing (default: false)
   --appID value, --id value          For Android, darwin, iOS and Windows targets an appID in the form of a reversed domain name is required, for ios this must match a valid provisioning profile
   --certificate value, --cert value  iOS/macOS/Windows: name of the certificate to sign the build
   --profile value                    iOS/macOS: name of the provisioning profile for this build (default: "XCWildcard")
   --release                          Enable installation in release mode (disable debug etc). (default: false)
   --metadata value                   Specify custom metadata key value pair that you do not want to store in your FyneApp.toml (key=value)
   --help, -h                         show help (default: false)
```

打包示例
`cd web/fyne/demo/package`