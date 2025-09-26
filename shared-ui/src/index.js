// Main App component
export { default as App } from './AppRefactored.jsx';

// Context Provider
export { AppProvider, useAppContext } from './contexts/AppContext.jsx';

// Communication adapters
export { WebSocketCommunicationAdapter } from './adapters/WebSocketAdapter.js';
export { ElectronIPCAdapter } from './adapters/ElectronIPCAdapter.js';

// Components
export { default as Logo } from './components/Logo.jsx';
export { default as SettingsFlyout } from './components/SettingsFlyout.jsx';
export { default as LanguageSwitcher } from './components/LanguageSwitcher.jsx';
export { default as Terminal } from './components/Terminal.jsx';
export { default as ConnectionManager } from './components/ConnectionManager.jsx';
export { default as InputHandler } from './components/InputHandler.jsx';

// i18n setup
export { default as i18n } from './i18n/index.js';

// Styles
import './App.css';
import './index.css';