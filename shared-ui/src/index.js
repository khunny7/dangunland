// Main App component
export { default as App } from './App.jsx';

// Communication adapters
export { WebSocketCommunicationAdapter } from './adapters/WebSocketAdapter.js';
export { ElectronIPCAdapter } from './adapters/ElectronIPCAdapter.js';

// Components
export { default as Logo } from './components/Logo.jsx';
export { default as SettingsFlyout } from './components/SettingsFlyout.jsx';
export { default as LanguageSwitcher } from './components/LanguageSwitcher.jsx';

// i18n setup
export { default as i18n } from './i18n/index.js';

// Styles
import './App.css';
import './index.css';