import React from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import { redactSensitive } from '../auditLog.js';
import { t } from '../i18n.js';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('GalaxyTerm render failed', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const detail = redactSensitive(error instanceof Error ? error.message : String(error || ''));
    return (
      <main className="app-error-boundary" role="alert">
        <section className="app-error-panel">
          <div className="app-error-content">
            <span className="app-error-symbol" aria-hidden="true">!</span>
            <h1>{t('error.app.title')}</h1>
            <p>{t('error.app.description')}</p>
            <button
              className="app-error-reload"
              onClick={() => globalThis.location?.reload?.()}
              type="button"
            >
              <ReloadOutlined />
              <span>{t('action.reloadApplication')}</span>
            </button>
          </div>
          {detail && (
            <details className="app-error-details">
              <summary>{t('error.app.details')}</summary>
              <pre>{detail}</pre>
            </details>
          )}
        </section>
      </main>
    );
  }
}
