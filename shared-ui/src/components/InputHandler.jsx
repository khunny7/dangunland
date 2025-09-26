import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../contexts/AppContext';

const InputHandler = () => {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  
  const {
    inputValue,
    setInputValue,
    macros,
    communicationAdapter,
    historyRef,
    historyIndexRef,
    lastInputTimeRef
  } = useAppContext();

  // Focus input after mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  // Macro expansion helper
  const expandMacros = useCallback((input) => {
    const trimmedInput = input.trim();
    
    // Check for text alias macros
    for (const macro of macros) {
      if (macro.type === 'alias' && macro.trigger === trimmedInput) {
        // Execute all commands for this macro inline
        if (communicationAdapter && communicationAdapter.isConnected()) {
          const commands = (macro.commands || macro.command || '').split('\n').filter(cmd => cmd.trim());
          commands.forEach((command, index) => {
            const trimmedCommand = command.trim();
            if (trimmedCommand) {
              setTimeout(() => {
                const payload = trimmedCommand.replace(/[\r\n]+$/g, '') + '\r\n';
                communicationAdapter.sendInput(payload);
                console.log(`Macro command executed: ${trimmedCommand}`);
              }, index * 100);
            }
          });
        }
        return ''; // Return empty string to prevent sending the original input
      }
    }
    return input; // Return original input if no macro matches
  }, [macros, communicationAdapter]);

  const sendLine = useCallback(() => {
    const raw = inputValue;
    // Remove any trailing CR/LF so we don't send double newlines
    let line = raw.replace(/[\r\n]+$/g, '').trimEnd();
    
    // Update last input time when user sends a command
    lastInputTimeRef.current = Date.now();
    
    // Expand macros before sending
    line = expandMacros(line);
    
    // Always send something, even if empty (just newline)
    // Use CRLF to satisfy Telnet/MUD servers expecting carriage return + line feed
    const dataToSend = line + '\r\n';
    
    // Push original input to history (not expanded), only if non-empty and different from last
    if (raw.trim()) {
      const hist = historyRef.current;
      if (hist.length === 0 || hist[hist.length - 1] !== raw.trim()) {
        hist.push(raw.trim());
        if (hist.length > 200) hist.splice(0, hist.length - 200);
      }
    }
    historyIndexRef.current = -1;
    
    if (communicationAdapter && communicationAdapter.isConnected()) {
      communicationAdapter.sendInput(dataToSend);
      setInputValue('');
    }
    // refocus input
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [inputValue, expandMacros, communicationAdapter, historyRef, historyIndexRef, lastInputTimeRef, setInputValue]);

  // Function key macro handler
  const handleFunctionKey = useCallback((e) => {
    // Check for function key macros (F1-F12)
    if (e.key.startsWith('F') && /^F([1-9]|1[0-2])$/.test(e.key)) {
      const functionKey = e.key;
      const macro = macros.find(m => m.type === 'function' && m.trigger === functionKey);
      if (macro && communicationAdapter && communicationAdapter.isConnected()) {
        e.preventDefault();
        
        // Execute macro commands inline to avoid circular dependency
        const commands = (macro.commands || macro.command || '').split('\n').filter(cmd => cmd.trim());
        commands.forEach((command, index) => {
          const trimmedCommand = command.trim();
          if (trimmedCommand) {
            setTimeout(() => {
              const payload = trimmedCommand.replace(/[\r\n]+$/g, '') + '\r\n';
              communicationAdapter.sendInput(payload);
              console.log(`Macro command executed: ${trimmedCommand}`);
            }, index * 100);
          }
        });
        
        console.log(`Function key macro fired: ${functionKey}`);
        return true;
      }
    }
    return false;
  }, [macros, communicationAdapter]);

  // Global key handler for function keys
  useEffect(() => {
    const globalKeyHandler = (e) => {
      handleFunctionKey(e);
    };

    document.addEventListener('keydown', globalKeyHandler);
    return () => document.removeEventListener('keydown', globalKeyHandler);
  }, [handleFunctionKey]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { 
      sendLine(); 
      e.preventDefault(); 
    }
    else if (e.key === 'ArrowUp') {
      const hist = historyRef.current;
      if (hist.length) {
        if (historyIndexRef.current === -1) historyIndexRef.current = hist.length - 1; 
        else if (historyIndexRef.current > 0) historyIndexRef.current--;
        setInputValue(hist[historyIndexRef.current]);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowDown') {
      const hist = historyRef.current;
      if (hist.length) {
        if (historyIndexRef.current >= 0) historyIndexRef.current++;
        if (historyIndexRef.current >= hist.length) { 
          historyIndexRef.current = -1; 
          setInputValue(''); 
        } else { 
          setInputValue(hist[historyIndexRef.current]); 
        }
        e.preventDefault();
      }
    } else {
      // Reset history index when user types normally
      historyIndexRef.current = -1;
    }
  };

  return (
    <input
      ref={inputRef}
      className="input-bar"
      value={inputValue}
      onChange={e => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={t('terminal.placeholder')}
      spellCheck={false}
      autoComplete="off"
    />
  );
};

export default InputHandler;