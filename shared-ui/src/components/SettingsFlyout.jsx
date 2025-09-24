import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './SettingsFlyout.css';

const SettingsFlyout = ({ 
  isOpen, 
  onClose, 
  activeTab,
  setActiveTab,
  // General
  heartbeatEnabled,
  setHeartbeatEnabled,
  heartbeatInterval,
  setHeartbeatInterval,
  // Macros
  macros,
  addMacro,
  editMacro,
  deleteMacro,
  // Triggers
  triggers,
  addTrigger,
  editTrigger,
  deleteTrigger,
  toggleTrigger,
  // Logs
  logs = [],
  onClearLogs,
  onSaveLogs
}) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="settings-backdrop" onClick={onClose}></div>
      
      {/* Flyout Panel */}
      <div className="settings-flyout">
        {/* Header */}
        <div className="flyout-header">
          <div className="header-content">
            <h2 className="flyout-title">⚙️ {t('settings.title')}</h2>
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flyout-tabs">
          <button 
            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <span className="tab-icon">🔧</span>
            {t('settings.general')}
          </button>
          <button 
            className={`tab-button ${activeTab === 'macros' ? 'active' : ''}`}
            onClick={() => setActiveTab('macros')}
          >
            <span className="tab-icon">⚡</span>
            {t('settings.macros')} ({macros.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'triggers' ? 'active' : ''}`}
            onClick={() => setActiveTab('triggers')}
          >
            <span className="tab-icon">🎯</span>
            {t('settings.triggers')} ({triggers.filter(t => t.enabled).length}/{triggers.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <span className="tab-icon">📜</span>
            {t('settings.logs')}
          </button>
        </div>
        
        {/* Content */}
        <div className="flyout-content">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3 className="section-title">{t('settings.connectionBehavior')}</h3>
              
              <div className="setting-group">
                <label className="setting-label horizontal">
                  <input
                    type="checkbox"
                    checked={heartbeatEnabled}
                    onChange={e => setHeartbeatEnabled(e.target.checked)}
                    className="setting-checkbox"
                  />
                  <span className="label-text">
                    <strong>{t('settings.autoHeartbeat')}</strong>
                    <small>{t('settings.preventTimeout')}</small>
                  </span>
                </label>
              </div>

              {heartbeatEnabled && (
                <div className="setting-group">
                  <label className="setting-label">
                    <span className="label-text">
                      <strong>{t('settings.heartbeatInterval')}: {heartbeatInterval}s</strong>
                      <small>{t('settings.heartbeatIntervalDesc')}</small>
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="10"
                      value={heartbeatInterval}
                      onChange={e => setHeartbeatInterval(parseInt(e.target.value))}
                      className="setting-slider"
                    />
                  </label>
                </div>
              )}

              <div className="info-panel">
                <h4>{t('settings.proTips')}</h4>
                <ul>
                  <li>{t('settings.tip1')}</li>
                  <li>{t('settings.tip2')}</li>
                  <li>{t('settings.tip3')}</li>
                  <li>{t('settings.tip4')}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Macros Tab */}
          {activeTab === 'macros' && (
            <MacroManager 
              macros={macros}
              onAdd={addMacro}
              onEdit={editMacro}
              onDelete={deleteMacro}
            />
          )}

          {/* Triggers Tab */}
          {activeTab === 'triggers' && (
            <TriggerManager 
              triggers={triggers}
              onAdd={addTrigger}
              onEdit={editTrigger}
              onDelete={deleteTrigger}
              onToggle={toggleTrigger}
            />
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="settings-section">
              <h3 className="section-title">{t('logs.title')}</h3>
              <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
                <button className="retro-button" onClick={onClearLogs}>{t('logs.clear')}</button>
                <button className="retro-button" onClick={onSaveLogs}>{t('logs.save')}</button>
              </div>
              <div style={{maxHeight:'300px', overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:'4px', background:'#f8fafc'}}>
                {logs.length === 0 && (
                  <div style={{padding:'12px', fontStyle:'italic', color:'#64748b'}}>{t('logs.empty')}</div>
                )}
                {logs.slice().reverse().map((e,i) => (
                  <div key={i} style={{padding:'8px 12px', borderBottom:'1px solid #e2e8f0', fontFamily:'Courier New, monospace', fontSize:'12px'}}>
                    <strong>[{e.ts}]</strong> {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Macro Manager Component
function MacroManager({ macros, onAdd, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [newMacro, setNewMacro] = useState({ name: '', type: 'alias', trigger: '', command: '' });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMacro.name || !newMacro.trigger || !newMacro.command) return;
    
    if (editingId !== null) {
      onEdit(editingId, newMacro);
      setEditingId(null);
    } else {
      onAdd(newMacro);
    }
    setNewMacro({ name: '', type: 'alias', trigger: '', command: '' });
  };

  const startEdit = (macro) => {
    setNewMacro({ name: macro.name, type: macro.type, trigger: macro.trigger, command: macro.command });
    setEditingId(macro.id);
  };

  const cancelEdit = () => {
    setNewMacro({ name: '', type: 'alias', trigger: '', command: '' });
    setEditingId(null);
  };

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h3>{t('macros.title')}</h3>
        <div className="help-text">
          {t('macros.description')}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="macro-form">
        <div className="form-row">
          <input
            type="text"
            placeholder={t('macros.desc')}
            value={newMacro.name}
            onChange={e => setNewMacro(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
          />
          <select
            value={newMacro.type}
            onChange={e => setNewMacro(prev => ({ ...prev, type: e.target.value, trigger: '' }))}
            className="form-select"
          >
            <option value="alias">{t('macros.textAlias')}</option>
            <option value="function">{t('macros.functionKey')}</option>
          </select>
        </div>

        <div className="form-row">
          {newMacro.type === 'alias' ? (
            <input
              type="text"
              placeholder={t('macros.keyPlaceholder')}
              value={newMacro.trigger}
              onChange={e => setNewMacro(prev => ({ ...prev, trigger: e.target.value }))}
              className="form-input"
            />
          ) : (
            <select
              value={newMacro.trigger}
              onChange={e => setNewMacro(prev => ({ ...prev, trigger: e.target.value }))}
              className="form-select"
            >
              <option value="">{t('macros.key')} 선택</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={`F${i + 1}`}>F{i + 1}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder={t('macros.commandPlaceholder')}
            value={newMacro.command}
            onChange={e => setNewMacro(prev => ({ ...prev, command: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
        </div>

        <div className="form-buttons">
          <button type="submit" className="retro-button">
            {editingId !== null ? t('macros.edit') : t('macros.add')}
          </button>
          {editingId !== null && (
            <button type="button" onClick={cancelEdit} className="retro-button">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="macro-list">
        {macros.map(macro => (
          <div key={macro.id} className="macro-item">
            <div className="macro-info">
              <strong>{macro.name}</strong>
              <span className="macro-type">({macro.type})</span>
              <div className="macro-detail">
                {macro.type === 'alias' ? `"${macro.trigger}"` : macro.trigger} → "{macro.command}"
              </div>
            </div>
            <div className="macro-actions">
              <button onClick={() => startEdit(macro)} className="retro-button small">
                {t('common.edit')}
              </button>
              <button onClick={() => onDelete(macro.id)} className="retro-button small danger">
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
        {macros.length === 0 && (
          <div className="empty-state">{t('macros.noMacros')}</div>
        )}
      </div>
    </div>
  );
}

// Trigger Manager Component
function TriggerManager({ triggers, onAdd, onEdit, onDelete, onToggle }) {
  const { t } = useTranslation();
  const [newTrigger, setNewTrigger] = useState({ 
    name: '', 
    type: 'contains', 
    pattern: '', 
    command: '', 
    delay: 0 
  });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTrigger.name || !newTrigger.pattern || !newTrigger.command) return;
    
    if (editingId !== null) {
      onEdit(editingId, newTrigger);
      setEditingId(null);
    } else {
      onAdd(newTrigger);
    }
    setNewTrigger({ name: '', type: 'contains', pattern: '', command: '', delay: 0 });
  };

  const startEdit = (trigger) => {
    setNewTrigger({ 
      name: trigger.name, 
      type: trigger.type, 
      pattern: trigger.pattern, 
      command: trigger.command, 
      delay: trigger.delay || 0 
    });
    setEditingId(trigger.id);
  };

  const cancelEdit = () => {
    setNewTrigger({ name: '', type: 'contains', pattern: '', command: '', delay: 0 });
    setEditingId(null);
  };

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h3>{t('triggers.title')}</h3>
        <div className="help-text">
          {t('triggers.description')}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="trigger-form">
        <div className="form-row">
          <input
            type="text"
            placeholder={t('triggers.desc')}
            value={newTrigger.name}
            onChange={e => setNewTrigger(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
          />
          <select
            value={newTrigger.type}
            onChange={e => setNewTrigger(prev => ({ ...prev, type: e.target.value }))}
            className="form-select"
          >
            <option value="contains">{t('triggers.containsText')}</option>
            <option value="exact">{t('triggers.exactMatch')}</option>
            <option value="regex">{t('triggers.regularExpression')}</option>
          </select>
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder={t('triggers.patternPlaceholder')}
            value={newTrigger.pattern}
            onChange={e => setNewTrigger(prev => ({ ...prev, pattern: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
          <input
            type="text"
            placeholder={t('triggers.commandPlaceholder')}
            value={newTrigger.command}
            onChange={e => setNewTrigger(prev => ({ ...prev, command: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
        </div>

        <div className="form-row">
          <label className="delay-label">
            {t('triggers.delay')}: {newTrigger.delay}ms
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={newTrigger.delay}
              onChange={e => setNewTrigger(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
              className="setting-slider"
            />
          </label>
        </div>

        <div className="form-buttons">
          <button type="submit" className="retro-button">
            {editingId !== null ? t('triggers.edit') : t('triggers.add')}
          </button>
          {editingId !== null && (
            <button type="button" onClick={cancelEdit} className="retro-button">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="trigger-list">
        {triggers.map(trigger => (
          <div key={trigger.id} className={`trigger-item ${trigger.enabled ? 'enabled' : 'disabled'}`}>
            <div className="trigger-info">
              <div className="trigger-header">
                <strong>{trigger.name}</strong>
                <span className="trigger-type">({trigger.type})</span>
                <button 
                  onClick={() => onToggle(trigger.id)}
                  className={`toggle-btn ${trigger.enabled ? 'on' : 'off'}`}
                >
                  {trigger.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="trigger-detail">
                Pattern: "{trigger.pattern}" → Command: "{trigger.command}"
                {trigger.delay > 0 && <span className="delay-info"> (Delay: {trigger.delay}ms)</span>}
              </div>
            </div>
            <div className="trigger-actions">
              <button onClick={() => startEdit(trigger)} className="retro-button small">
                {t('common.edit')}
              </button>
              <button onClick={() => onDelete(trigger.id)} className="retro-button small danger">
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
        {triggers.length === 0 && (
          <div className="empty-state">{t('triggers.noTriggers')}</div>
        )}
      </div>
    </div>
  );
}

export default SettingsFlyout;
