import React, { useState, useRef, useEffect } from 'react';
import { Layout, Tabs, Button, Modal, Select, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SshTerminal from './components/SshTerm.jsx';
import Terminal from './components/Terminal.jsx';

const TERMINAL_TYPES = [
  { label: '本地终端', value: 'local', component: Terminal },
  { label: 'SSH终端', value: 'ssh', component: SshTerminal },
];

function App() {
  const [sessions, setSessions] = useState([
    { id: '1', type: 'ssh', label: 'SSH终端1', component: <SshTerminal /> },
    { id: '2', type: 'local', label: '本地终端1', component: <Terminal /> },
  ]);
  const [activeKey, setActiveKey] = useState(sessions[0].id);
  const [modalOpen, setModalOpen] = useState(false);
  const [newType, setNewType] = useState('local');
  const [newLabel, setNewLabel] = useState('');
  const terminalRefs = useRef({});

  useEffect(() => {
    // 初始化时fit当前终端
    if (terminalRefs.current[activeKey] && terminalRefs.current[activeKey].fit) {
      setTimeout(() => terminalRefs.current[activeKey].fit(), 0);
    }
  }, []);

  const handleTabChange = (key) => {
    setActiveKey(key);
    setTimeout(() => {
      if (terminalRefs.current[key] && terminalRefs.current[key].fit) {
        terminalRefs.current[key].fit();
      }
    }, 0);
  };

  const addSession = () => {
    setModalOpen(true);
    setNewType('local');
    setNewLabel('');
  };

  const handleOk = () => {
    const typeObj = TERMINAL_TYPES.find(t => t.value === newType);
    if (!typeObj) return;
    const id = Date.now().toString();
    const label = newLabel || `${typeObj.label}${sessions.filter(s => s.type === newType).length + 1}`;
    setSessions([...sessions, { id, type: newType, label, component: React.createElement(typeObj.component) }]);
    setActiveKey(id);
    setModalOpen(false);
    message.success('新终端已创建');
  };

  const handleCancel = () => setModalOpen(false);

  const removeSession = (targetKey) => {
    let newActiveKey = activeKey;
    let lastIndex = -1;
    sessions.forEach((s, i) => {
      if (s.id === targetKey) lastIndex = i - 1;
    });
    const newSessions = sessions.filter(s => s.id !== targetKey);
    if (newSessions.length && newActiveKey === targetKey) {
      newActiveKey = newSessions[lastIndex >= 0 ? lastIndex : 0].id;
    }
    setSessions(newSessions);
    setActiveKey(newActiveKey);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Layout.Content style={{ padding: 0, height: '100%', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          tabBarStyle={{ flex: '0 0 auto' }}
          tabContentStyle={{ flex: '1 1 0', height: '100%' }}
          type="editable-card"
          hideAdd
          activeKey={activeKey}
          onChange={handleTabChange}
          onEdit={(targetKey, action) => {
            if (action === 'add') addSession();
            else if (action === 'remove') removeSession(targetKey);
          }}
          items={sessions.map(s => ({
            key: s.id,
            label: s.label,
            children: <div style={{width: '100%', height: '100%', minHeight: 0, flex: 1, background: 'transparent', padding: 0, margin: 0, display: 'flex', flexDirection: 'column'}}>
              {React.cloneElement(s.component, {
                ref: el => { terminalRefs.current[s.id] = el; }
              })}
            </div>,
            closable: sessions.length > 1,
          }))}
          tabBarExtraContent={<Button icon={<PlusOutlined />} onClick={addSession}>新建终端</Button>}
        />
      </Layout.Content>
      <Modal
        title="新建终端"
        open={modalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <div style={{ marginBottom: 16 }}>
          <span>类型：</span>
          <Select
            value={newType}
            onChange={setNewType}
            options={TERMINAL_TYPES}
            style={{ width: 120 }}
          />
        </div>
        <div>
          <span>名称：</span>
          <Input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="可自定义标签名"
          />
        </div>
      </Modal>
    </Layout>
  );
}

export default App;
