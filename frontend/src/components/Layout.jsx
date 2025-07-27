import React, { useState } from "react";
import { Layout, Menu, Button, Drawer, Card, Switch } from "antd";
import { SettingOutlined, WindowsOutlined, AppleOutlined } from "@ant-design/icons";
import "@xterm/xterm/css/xterm.css"
import { Terminal } from '@xterm/xterm';
import GalaxyTerminal from "./Terminal";
import 'antd/dist/reset.css';

const { Header, Content, Footer, Sider } = Layout;

const TerminalUI = () => {
  const [isMac, setIsMac] = useState(true); // Mac 和 Windows 风格切换
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // 配置管理抽屉状态
  const [terminal, setTerminal] = useState(null);

  // 初始化终端
  const initializeTerminal = () => {
    const term = new Terminal();
    term.open(document.getElementById("terminal-container"));
    term.write("Welcome to the Terminal!\r\n"); // 初始显示
    setTerminal(term);
  };

  // 切换系统风格
  const toggleSystem = (checked) => {
    setIsMac(checked);
  };

  // 打开配置管理
  const showDrawer = () => {
    setIsDrawerOpen(true);
  };

  // 关闭配置管理
  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  // 渲染终端样式
  const renderTerminalStyle = () => {
    return (
      <Card
        title={isMac ? "Mac Terminal" : "Windows Terminal"}
        style={{
          borderRadius: isMac ? "12px" : "0px",
          backgroundColor: isMac ? "#333" : "#000",
          color: "#fff",
          minHeight: "400px",
        }}
      >
        <div id="terminal-container" style={{ height: "100%" }}>
            <GalaxyTerminal />
        </div>
      </Card>
    );
  };

  React.useEffect(() => {
    initializeTerminal();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={200} className="site-layout-background">
        <Menu mode="inline" defaultSelectedKeys={["1"]} style={{ height: "100%", borderRight: 0 }}>
          <Menu.Item key="1" icon={isMac ? <AppleOutlined /> : <WindowsOutlined />}>
            {isMac ? "Mac Mode" : "Windows Mode"}
          </Menu.Item>
          <Menu.Item key="2" icon={<SettingOutlined />} onClick={showDrawer}>
            配置管理
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout style={{ padding: "0 24px 24px" }}>
        <Header style={{ padding: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Switch
            checkedChildren={<AppleOutlined />}
            unCheckedChildren={<WindowsOutlined />}
            checked={isMac}
            onChange={toggleSystem}
          />
          <Button icon={<SettingOutlined />} onClick={showDrawer}>
            配置管理
          </Button>
        </Header>
        <Content style={{ padding: 24, margin: 0 }}>
          {renderTerminalStyle()}
        </Content>
      </Layout>
      <Drawer
        title="配置管理"
        placement="right"
        onClose={closeDrawer}
        visible={isDrawerOpen}
        width={300}
      >
        <p>配置选项...</p>
      </Drawer>
    </Layout>
  );
};

export default function MainLayout({ children }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ color: '#fff', padding: 16, fontWeight: 'bold', fontSize: 18 }}>GalaxyTerm</div>
        {/* 这里可以放菜单 */}
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: 0 }} />
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{ padding: 24, minHeight: 360, background: '#fff' }}>{children}</div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>GalaxyTerm ©2024</Footer>
      </Layout>
    </Layout>
  );
}
