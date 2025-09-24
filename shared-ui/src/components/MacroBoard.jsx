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

  const executeMacro = (macro) => {
    if (!onExecute) return;
    
    // Handle multiple commands
    const commands = (macro.commands || macro.command || '').split('\n').filter(cmd => cmd.trim());
    
    commands.forEach((command, index) => {
      const trimmedCommand = command.trim();
      if (trimmedCommand) {
        // Add small delay between commands to avoid overwhelming the server
        setTimeout(() => {
          onExecute(trimmedCommand);
        }, index * 100); // 100ms delay between each command
      }
    });
  };

  const getCommandCount = (macro) => {
    const commands = (macro.commands || macro.command || '').split('\n').filter(cmd => cmd.trim());
    return commands.length;
  };

  return (
    <div className="macro-board" role="navigation" aria-label={t('macroBoard.title')}>
      <div className="macro-board-header">{t('macroBoard.title').toUpperCase()}</div>
      <div className="macro-board-list">
        {visible.map(m => {
          const commandCount = getCommandCount(m);
          return (
            <button
              key={m.id}
              className="macro-sticky"
              onClick={() => executeMacro(m)}
              title={`${m.name}\n${m.commands || m.command || ''}`}
              type="button"
            >
              <span className="macro-name">{m.name}</span>
              <span className="macro-trigger">{m.trigger}</span>
              {commandCount > 1 && (
                <span className="macro-info">
                  {commandCount} {t('macroBoard.commands')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
