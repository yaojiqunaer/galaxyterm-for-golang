import React, { useEffect, useRef, useState } from 'react';
import { Button, Form, Input, InputNumber, Layout, Modal, Select, Tabs, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import TerminalPane from './components/TerminalPane.jsx';
import * as SessionAPI from '../wailsjs/go/session/API.js';
import { t } from './i18n.js';

const fallbackProviders = [
  { type: 'local', nameKey: 'provider.local.name', name: 'Local Terminal' },
  { type: 'ssh', nameKey: 'provider.ssh.name', name: 'SSH' },
];

function providerLabel(provider) {
  return t(provider.nameKey, provider.name || provider.type);
}

function App() {
  const [providers, setProviders] = useState(fallbackProviders);
  const [sessions, setSessions] = useState([]);
  const [activeKey, setActiveKey] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newType, setNewType] = useState('local');
  const [form] = Form.useForm();
  const terminalRefs = useRef({});

  useEffect(() => {
    SessionAPI.ListProviders()
      .then((loadedProviders) => {
        if (Array.isArray(loadedProviders) && loadedProviders.length > 0) {
          setProviders(loadedProviders);
          setNewType(loadedProviders[0].type);
        }
      })
      .catch(() => {
        setProviders(fallbackProviders);
      });
  }, []);

  useEffect(() => {
    if (activeKey && terminalRefs.current[activeKey]?.fit) {
      setTimeout(() => terminalRefs.current[activeKey]?.fit(), 0);
    }
  }, [activeKey]);

  const openModal = () => {
    const firstType = providers[0]?.type || 'local';
    setNewType(firstType);
    form.setFieldsValue({
      displayName: '',
      host: '',
      port: 22,
      username: '',
      password: '',
      shell: '',
    });
    setModalOpen(true);
  };

  const createSession = async () => {
    const values = await form.validateFields();
    const provider = providers.find((item) => item.type === newType) || fallbackProviders[0];
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    const label = values.displayName || providerLabel(provider);
    const request = buildRequest(newType, label, values);

    setSessions((current) => [...current, { id, label, request }]);
    setActiveKey(id);
    setModalOpen(false);
    message.success(t('terminal.status.connecting'));
  };

  const removeSession = (targetKey) => {
    setSessions((current) => {
      const next = current.filter((item) => item.id !== targetKey);
      if (activeKey === targetKey) {
        setActiveKey(next[0]?.id || '');
      }
      return next;
    });
  };

  const items = sessions.map((session) => ({
    key: session.id,
    label: session.label,
    children: (
      <div style={{ width: '100%', height: '100%', minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TerminalPane
          ref={(el) => {
            terminalRefs.current[session.id] = el;
          }}
          request={session.request}
        />
      </div>
    ),
    closable: true,
  }));

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
          onChange={setActiveKey}
          onEdit={(targetKey, action) => {
            if (action === 'add') openModal();
            if (action === 'remove') removeSession(targetKey);
          }}
          items={items}
          tabBarExtraContent={<Button icon={<PlusOutlined />} onClick={openModal}>{t('action.newTerminal')}</Button>}
        />
      </Layout.Content>
      <Modal
        title={t('action.newTerminal')}
        open={modalOpen}
        onOk={createSession}
        onCancel={() => setModalOpen(false)}
        okText={t('action.create')}
        cancelText={t('action.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item label={t('field.type')}>
            <Select
              value={newType}
              onChange={setNewType}
              options={providers.map((provider) => ({
                value: provider.type,
                label: providerLabel(provider),
              }))}
            />
          </Form.Item>
          <Form.Item name="displayName" label={t('field.name')}>
            <Input placeholder={t('placeholder.sessionName')} />
          </Form.Item>
          {newType === 'local' && (
            <Form.Item name="shell" label={t('field.shell')}>
              <Input placeholder={t('placeholder.shell')} />
            </Form.Item>
          )}
          {newType === 'ssh' && (
            <>
              <Form.Item name="host" label={t('field.host')} rules={[{ required: true, message: t('field.host') }]}>
                <Input placeholder={t('placeholder.host')} />
              </Form.Item>
              <Form.Item name="port" label={t('field.port')} initialValue={22}>
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="username" label={t('field.username')} rules={[{ required: true, message: t('field.username') }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label={t('field.password')}>
                <Input.Password />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </Layout>
  );
}

function buildRequest(type, displayName, values) {
  if (type === 'ssh') {
    return {
      providerType: type,
      displayName,
      config: {
        host: values.host,
        port: values.port || 22,
      },
      auth: {
        username: values.username,
        password: values.password || '',
      },
    };
  }

  return {
    providerType: type,
    displayName,
    config: {
      shell: values.shell || '',
    },
    auth: {},
  };
}

export default App;
