import React, { useState } from 'react';
import './SettingsFlyout.css';

const SettingsFlyout = ({ 
  isOpen, 
  onClose, 
  activeTab,
  setActiveTab,
  heartbeatEnabled,
  setHeartbeatEnabled,
  heartbeatInterval,
  setHeartbeatInterval,
  macros,
  addMacro,
  editMacro,
  deleteMacro,
  triggers,
  addTrigger,
  editTrigger,
  deleteTrigger,
  toggleTrigger
}) => {
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
            <h2 className="flyout-title">⚙️ TERMINAL SETTINGS</h2>
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
            General
          </button>
          <button 
            className={`tab-button ${activeTab === 'macros' ? 'active' : ''}`}
            onClick={() => setActiveTab('macros')}
          >
            <span className="tab-icon">⚡</span>
            Macros ({macros.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'triggers' ? 'active' : ''}`}
            onClick={() => setActiveTab('triggers')}
          >
            <span className="tab-icon">🎯</span>
            Triggers ({triggers.filter(t => t.enabled).length}/{triggers.length})
          </button>
        </div>
        
        {/* Content */}
        <div className="flyout-content">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3 className="section-title">Connection & Behavior</h3>
              
              <div className="setting-group">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={heartbeatEnabled}
                    onChange={e => setHeartbeatEnabled(e.target.checked)}
                    className="setting-checkbox"
                  />
                  <span className="label-text">
                    <strong>Auto-Heartbeat</strong>
                    <small>Prevent connection timeout when idle</small>
                  </span>
                </label>
              </div>

              {heartbeatEnabled && (
                <div className="setting-group">
                  <label className="setting-label">
                    <span className="label-text">
                      <strong>Heartbeat Interval: {heartbeatInterval}s</strong>
                      <small>Send keepalive after this many seconds of inactivity</small>
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
                <h4>💡 Pro Tips</h4>
                <ul>
                  <li>Use <kbd>F1-F12</kbd> keys for function key macros</li>
                  <li>Triggers can auto-respond to server messages</li>
                  <li>Up/Down arrows browse command history</li>
                  <li>Heartbeat prevents idle disconnection</li>
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
        </div>
      </div>
    </>
  );
};

// Macro Manager Component
function MacroManager({ macros, onAdd, onEdit, onDelete }) {
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
        <h3>Macro Management</h3>
        <div className="help-text">
          Create aliases and function key shortcuts for quick command execution.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="macro-form">
        <div className="form-row">
          <input
            type="text"
            placeholder="Macro name"
            value={newMacro.name}
            onChange={e => setNewMacro(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
          />
          <select
            value={newMacro.type}
            onChange={e => setNewMacro(prev => ({ ...prev, type: e.target.value, trigger: '' }))}
            className="form-select"
          >
            <option value="alias">Text Alias</option>
            <option value="function">Function Key</option>
          </select>
        </div>

        <div className="form-row">
          {newMacro.type === 'alias' ? (
            <input
              type="text"
              placeholder="Trigger text (e.g., 'heal')"
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
              <option value="">Select Function Key</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={`F${i + 1}`}>F{i + 1}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="Command to execute"
            value={newMacro.command}
            onChange={e => setNewMacro(prev => ({ ...prev, command: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
        </div>

        <div className="form-buttons">
          <button type="submit" className="retro-button">
            {editingId !== null ? 'Update' : 'Add'} Macro
          </button>
          {editingId !== null && (
            <button type="button" onClick={cancelEdit} className="retro-button">
              Cancel
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
                Edit
              </button>
              <button onClick={() => onDelete(macro.id)} className="retro-button small danger">
                Delete
              </button>
            </div>
          </div>
        ))}
        {macros.length === 0 && (
          <div className="empty-state">No macros configured. Add your first macro above!</div>
        )}
      </div>
    </div>
  );
}

// Trigger Manager Component
function TriggerManager({ triggers, onAdd, onEdit, onDelete, onToggle }) {
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
        <h3>Trigger Management</h3>
        <div className="help-text">
          Automatically execute commands when specific text patterns are received from the server.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="trigger-form">
        <div className="form-row">
          <input
            type="text"
            placeholder="Trigger name"
            value={newTrigger.name}
            onChange={e => setNewTrigger(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
          />
          <select
            value={newTrigger.type}
            onChange={e => setNewTrigger(prev => ({ ...prev, type: e.target.value }))}
            className="form-select"
          >
            <option value="contains">Contains Text</option>
            <option value="exact">Exact Match</option>
            <option value="regex">Regular Expression</option>
          </select>
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder={`Pattern to match (${newTrigger.type})`}
            value={newTrigger.pattern}
            onChange={e => setNewTrigger(prev => ({ ...prev, pattern: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
          <input
            type="text"
            placeholder="Command to execute"
            value={newTrigger.command}
            onChange={e => setNewTrigger(prev => ({ ...prev, command: e.target.value }))}
            className="form-input"
            style={{ flex: 2 }}
          />
        </div>

        <div className="form-row">
          <label className="delay-label">
            Delay: {newTrigger.delay}ms
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
            {editingId !== null ? 'Update' : 'Add'} Trigger
          </button>
          {editingId !== null && (
            <button type="button" onClick={cancelEdit} className="retro-button">
              Cancel
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
                Edit
              </button>
              <button onClick={() => onDelete(trigger.id)} className="retro-button small danger">
                Delete
              </button>
            </div>
          </div>
        ))}
        {triggers.length === 0 && (
          <div className="empty-state">No triggers configured. Add your first trigger above!</div>
        )}
      </div>
    </div>
  );
}

export default SettingsFlyout;
