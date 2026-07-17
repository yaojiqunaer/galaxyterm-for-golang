# GalaxyTerm SFTP 扩展

官方 SFTP 文件 Provider。扩展通过 GalaxyTerm 的 `stdio-json-v1` 文件协议运行，SFTP 和 SSH 依赖不会链接进 GalaxyTerm 核心程序。

## 能力

- 目录浏览、文件状态、文本读取和写入
- 通过宿主私有临时文件流式上传、下载二进制和大文件
- 与支持 `transfer-progress-v1` 的宿主协商真实字节进度；旧版宿主仍收到单个兼容响应
- 运行中的传输可由 GalaxyTerm 取消，宿主临时文件始终清理
- 上传先写入远程同目录临时文件，完整成功后再重命名提交，避免中断留下半文件
- 创建目录、重命名、删除文件或空目录
- 密码和私钥认证
- 复用 GalaxyTerm 中已保存的 SSH 连接和系统凭据引用
- 默认使用 TOFU 主机密钥校验：首次连接记录密钥，后续密钥变化时拒绝连接

## 构建

在仓库根目录执行：

```shell
./scripts/package-extension.sh sftp
```

生成的 `.gtx` 位于 `dist/extensions/`，可在 GalaxyTerm 的“扩展”页面离线安装。
