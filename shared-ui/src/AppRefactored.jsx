import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import { AppProvider, useAppContext } from './contexts/AppContext';
import Logo from './components/Logo';
import SettingsFlyout from './components/SettingsFlyout';
import LanguageSwitcher from './components/LanguageSwitcher';
import MacroBoard from './components/MacroBoard';
import Terminal from './components/Terminal';
import ConnectionManager from './components/ConnectionManager';
import InputHandler from './components/InputHandler';

// Main App content component (uses context)
const AppContent = () => {
  const { t } = useTranslation();
  
  const {
    settingsOpen,
    setSettingsOpen,
    macros,
    communicationAdapter,
    lastInputTimeRef
  } = useAppContext();

  // Execute a macro command directly (from MacroBoard click)
  const executeMacroCommand = useCallback((command) => {
    if (!command) return;
    if (communicationAdapter && communicationAdapter.isConnected()) {
      const payload = command.replace(/[\r\n]+$/g, '') + '\r\n';
      communicationAdapter.sendInput(payload);
      // Update last input time to avoid heartbeat firing immediately
      lastInputTimeRef.current = Date.now();
    }
  }, [communicationAdapter, lastInputTimeRef]);

  return (
    <div className="app">
      {/* Top-right Controls */}
      <div className="top-controls">
        <LanguageSwitcher />
        <button 
          className="top-settings-button"
          onClick={() => setSettingsOpen(true)}
          title={t('settings.title')}
        >
          ⚙️
        </button>
      </div>

      {/* Computer Case */}
      <div className="computer-case">
        {/* Decorative Vent */}
        <div className="vent"></div>
        
        {/* Monitor */}
        <div className="monitor">
          <Terminal />
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          <div className="menu-bar">
            <div className="app-logo-section">
              <Logo size={24} className="app-logo" />
              <span className="app-title">{t('app.title')}</span>
            </div>
            
            <ConnectionManager />
          </div>

          <InputHandler />
        </div>
      </div>

      {/* Macro Board (sticky notes) */}
      <MacroBoard macros={macros} onExecute={executeMacroCommand} />

      {/* Settings Flyout */}
      {settingsOpen && (
        <SettingsFlyout
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
};

/**
 * Main App component that works with different communication backends
 * @param {Object} props
 * @param {Object} props.communicationAdapter - Adapter for handling connections (WebSocket for web, IPC for Electron)
 */
function App({ communicationAdapter }) {
  return (
    <AppProvider communicationAdapter={communicationAdapter}>
      <AppContent />
    </AppProvider>
  );
}

export default App;