import React from 'react';
import { Form, Input, InputNumber, Select, Switch } from 'antd';
import { t } from '../i18n.js';

function fieldLabel(field) {
  return field.labelKey ? t(field.labelKey, field.label || field.key) : field.label || field.key;
}

function fieldPlaceholder(field) {
  if (field.placeholderKey) return t(field.placeholderKey, field.placeholder || '');
  return field.placeholder || '';
}

function fieldControl(field) {
  const placeholder = fieldPlaceholder(field);
  if (field.type === 'boolean') return <Switch />;
  if (field.type === 'number') {
    return <InputNumber min={field.min} max={field.max} placeholder={placeholder} style={{ width: '100%' }} />;
  }
  if (field.type === 'password') return <Input.Password autoComplete="new-password" placeholder={placeholder} />;
  if (field.type === 'select') {
    return (
      <Select
        options={(field.options || []).map((option) => ({
          value: option.value,
          label: option.labelKey ? t(option.labelKey, option.label || option.value) : option.label || option.value,
        }))}
        placeholder={placeholder}
      />
    );
  }
  if (field.type === 'textarea') return <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder={placeholder} />;
  return <Input placeholder={placeholder} />;
}

function ProviderField({ field, section }) {
  const booleanField = field.type === 'boolean';
  return (
    <Form.Item
      label={fieldLabel(field)}
      name={[section, field.key]}
      rules={field.required ? [{ required: true, message: t('validation.required') }] : []}
      valuePropName={booleanField ? 'checked' : 'value'}
    >
      {fieldControl(field)}
    </Form.Item>
  );
}

export default function FileProviderFormFields({ hideAuthFields = false, provider }) {
  return (
    <>
      {(provider?.configFields || []).map((field) => (
        <ProviderField field={field} key={`config-${field.key}`} section="config" />
      ))}
      {!hideAuthFields && (provider?.authFields || []).map((field) => (
        <ProviderField field={field} key={`auth-${field.key}`} section="auth" />
      ))}
    </>
  );
}
