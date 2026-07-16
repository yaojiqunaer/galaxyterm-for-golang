import React from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import {syncDesktopPlatform} from './desktopBridge.js'
import "normalize.css"
import "../style.scss"

syncDesktopPlatform(document.documentElement);

const container = document.getElementById('root')

const root = createRoot(container)

root.render(
    <AppErrorBoundary>
        <App/>
    </AppErrorBoundary>
)
