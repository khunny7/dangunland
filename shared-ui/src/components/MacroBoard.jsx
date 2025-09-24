import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * MacroBoard - displays enabled macros as clickable sticky notes on the right side.
 * Props:
 *  - macros: array of { id, name, type, trigger, command, enabled }
 *  - onExecute: function(commandString)
 */
export default function MacroBoard({ macros, onExecute }) {
  const { t } = useTranslation();
  const visible = (macros || []).filter(m => m.enabled);
  if (!visible.length) return null;

  return (
    <div className="macro-board" role="navigation" aria-label={t('macroBoard.title')}>
      <div className="macro-board-header">{t('macroBoard.title').toUpperCase()}</div>
      <div className="macro-board-list">
        {visible.map(m => (
          <button
            key={m.id}
            className="macro-sticky"
            onClick={() => onExecute(m.command)}
            title={`${m.name}\n${m.command}`}
            type="button"
          >
            <span className="macro-name">{m.name}</span>
            <span className="macro-trigger">{m.trigger}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
