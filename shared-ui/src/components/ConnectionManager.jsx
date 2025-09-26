import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../contexts/AppContext';

const ConnectionManager = () => {
  const { t } = useTranslation();
  
  const {
    status,
    setStatus,
    selectedServer,
    setSelectedServer,
    activeServer,
    setActiveServer,
    servers,
    communicationAdapter,
    pushEvent,
    startHeartbeat,
    stopHeartbeat
  } = useAppContext();

  // Setup communication adapter status handling
  useEffect(() => {
    if (!communicationAdapter) return;

    communicationAdapter.onStatusChange = (newStatus, port) => {
      setStatus(newStatus);
      if (newStatus === 'connected' && port && selectedServer) {
        setActiveServer(selectedServer);
        pushEvent(`Connected to ${selectedServer.name} (${selectedServer.host}:${selectedServer.port})`);
        startHeartbeat();
      } else if (newStatus === 'disconnected') {
        setActiveServer(null);
        pushEvent('Disconnected');
        stopHeartbeat();
      } else if (newStatus === 'connecting' && selectedServer) {
        pushEvent(`Connecting to ${selectedServer.name} (${selectedServer.host}:${selectedServer.port})...`);
        setActiveServer(null);
      }
    };

    return () => {
      if (communicationAdapter.onStatusChange) {
        communicationAdapter.onStatusChange = null;
      }
    };
  }, [communicationAdapter, selectedServer, setStatus, setActiveServer, pushEvent, startHeartbeat, stopHeartbeat]);

  const toggleConnection = useCallback(() => {
    if (!communicationAdapter || !selectedServer) return;

    if (communicationAdapter.isConnected()) {
      communicationAdapter.disconnect();
    } else {
      // Pass the port for backward compatibility, but we could extend this to pass full server info
      communicationAdapter.connect(selectedServer.port.toString());
    }
  }, [communicationAdapter, selectedServer]);

  // Status text helper
  const getStatusText = (status) => {
    if (status === 'connected' && activeServer) {
      return `${t('app.connected')} (${activeServer.name})`;
    }
    if (status === 'connecting' && selectedServer) {
      return `${t('app.connecting')} (${selectedServer.name})...`;
    }
    return t(`app.${status}`) || status;
  };

  return (
    <div className="connection-manager">
      <div className="status-section">
        <span className={`status-light ${activeServer ? 'connected' : ''}`}></span>
        <span className="status-text">{getStatusText(status)}</span>
      </div>
      
      {status !== 'connected' && (
        <select 
          className="retro-select" 
          value={selectedServer?.id || ''} 
          onChange={e => {
            const serverId = parseInt(e.target.value);
            const server = servers.find(s => s.id === serverId);
            setSelectedServer(server || null);
          }}
        >
          {servers.length === 0 && <option value="">{t('servers.noServers')}</option>}
          {servers.map(server => (
            <option key={server.id} value={server.id}>
              {server.name}
            </option>
          ))}
        </select>
      )}

      <button 
        className={`retro-button ${status === 'connected' ? 'disconnect' : 'connect'}`} 
        onClick={toggleConnection}
        disabled={!selectedServer}
        title={!selectedServer ? t('servers.selectServer') : ''}
      >
        {status === 'connected' ? '🔌 ' + t('app.disconnect') : '🔌 ' + t('app.connect')}
      </button>
    </div>
  );
};

export default ConnectionManager;