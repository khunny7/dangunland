import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'xterm';
import { useAppContext } from '../contexts/AppContext';

const TerminalComponent = () => {
  const { t } = useTranslation();
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  
  const {
    selectedTheme,
    terminalThemes,
    macros,
    triggers,
    communicationAdapter,
    lastInputTimeRef,
    pushEvent
  } = useAppContext();

  // Enhanced ANSI color utilities
  const ansiColorUtils = {
    // Convert RGB to ANSI truecolor escape sequence
    rgb: (r, g, b, bg = false) => `\x1b[${bg ? '48' : '38'};2;${r};${g};${b}m`,
    
    // Convert to 256-color palette
    color256: (colorIndex, bg = false) => `\x1b[${bg ? '48' : '38'};5;${colorIndex}m`,
    
    // Reset all formatting
    reset: () => '\x1b[0m',
    
    // Text styles
    bold: () => '\x1b[1m',
    dim: () => '\x1b[2m', 
    italic: () => '\x1b[3m',
    underline: () => '\x1b[4m',
    blink: () => '\x1b[5m',
    reverse: () => '\x1b[7m',
    strikethrough: () => '\x1b[9m',
    
    // Strip ANSI codes from text for processing
    stripAnsi: (text) => text.replace(/\x1b\[[0-9;]*m/g, ''),
    
    // Check if text contains ANSI codes
    hasAnsi: (text) => /\x1b\[[0-9;]*m/.test(text)
  };

  // Enhanced terminal initialization with full ANSI color demonstration
  const initializeTerminalContent = useCallback((term) => {
    try {
      // Retro terminal startup message with enhanced colors
      term.write('\x1b[38;5;46m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m\r\n');
      term.write(`\x1b[38;5;46m║      \x1b[1;38;5;51m${t('terminal.title').padStart(36).padEnd(59)}\x1b[38;5;46m║\x1b[0m\r\n`);
      term.write(`\x1b[38;5;46m║      \x1b[38;5;226m${t('terminal.systemReady').padStart(36).padEnd(52)}\x1b[38;5;46m║\x1b[0m\r\n`);
      
      // Enhanced ANSI color system info
      term.write(`\x1b[38;5;46m║      \x1b[38;5;141mANSI Colors: \x1b[1;38;5;82m✓ 256-color \x1b[1;38;5;196m✓ Truecolor\x1b[38;5;46m        ║\x1b[0m\r\n`);
      term.write('\x1b[38;5;46m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m\r\n');
      term.write('\r\n');
      
      // Color palette demonstration (256-color palette preview)
      term.write('\x1b[1;38;5;220mColor Palette Demo:\x1b[0m\r\n');
      
      // 8-bit color demo (256 colors)
      const colors256 = [];
      for (let i = 16; i < 32; i++) {
        colors256.push(`\x1b[48;5;${i}m  \x1b[0m`);
      }
      term.write(`\x1b[38;5;245m256-color: \x1b[0m${colors256.join('')}\r\n`);
      
      // Truecolor demo (RGB)
      const rgbDemo = [];
      for (let r = 0; r < 6; r++) {
        const red = Math.floor((r * 255) / 5);
        const green = Math.floor((r * 128) / 5);
        const blue = Math.floor((255 - r * 42) / 1);
        rgbDemo.push(`\x1b[48;2;${red};${green};${blue}m  \x1b[0m`);
      }
      term.write(`\x1b[38;5;245mTruecolor: \x1b[0m${rgbDemo.join('')}\r\n`);
      
      term.write('\r\n');
      term.write(`\x1b[1;38;5;226m${t('terminal.selectAndConnect')}\x1b[0m\r\n`);
    } catch (error) {
      console.warn('Error writing to terminal:', error);
    }
  }, [t]);

  // Terminal output helper
  const writeToTerminal = useCallback((text) => {
    if (xtermRef.current && text) {
      try {
        xtermRef.current.write(text);
        if (typeof xtermRef.current.refresh === 'function') {
          xtermRef.current.refresh(0, xtermRef.current.rows - 1);
        }
      } catch (error) {
        console.error('Error writing to terminal:', error);
      }
    }
  }, []);

  // Execute trigger commands (supports multiple commands)
  const executeTrigger = useCallback((trigger) => {
    if (!communicationAdapter || !communicationAdapter.isConnected()) return;
    
    const commands = (trigger.commands || trigger.command || '').split('\n').filter(cmd => cmd.trim());
    
    commands.forEach((command, index) => {
      const trimmedCommand = command.trim();
      if (trimmedCommand) {
        // Add delay between commands (base delay + index delay)
        const totalDelay = (trigger.delay || 0) + (index * 150);
        setTimeout(() => {
          const payload = trimmedCommand.replace(/[\r\n]+$/g, '') + '\r\n';
          communicationAdapter.sendInput(payload);
          console.log(`Trigger fired: "${trigger.pattern}" -> "${trimmedCommand}"`);
        }, totalDelay);
      }
    });
  }, [communicationAdapter]);

  // Trigger processing
  const processTriggers = useCallback((text) => {
    for (const trigger of triggers) {
      if (!trigger.enabled) continue;

      let matches = false;
      if (trigger.type === 'contains') {
        matches = text.toLowerCase().includes(trigger.pattern.toLowerCase());
      } else if (trigger.type === 'regex') {
        try {
          const regex = new RegExp(trigger.pattern, 'i');
          matches = regex.test(text);
        } catch (e) {
          console.warn('Invalid regex pattern:', trigger.pattern);
        }
      }

      if (matches) {
        executeTrigger(trigger);
      }
    }
  }, [triggers, executeTrigger]);

  // Macro expansion helper with ANSI color test command
  const expandMacros = useCallback((input) => {
    const trimmedInput = input.trim();
    
    // Special command: test ANSI colors
    if (trimmedInput === '/colortest') {
      if (xtermRef.current) {
        // Demonstrate enhanced ANSI color support
        const term = xtermRef.current;
        term.write('\r\n');
        term.write('\x1b[1;38;5;226m=== Enhanced ANSI Color Test ===\x1b[0m\r\n');
        
        // 16 basic colors
        term.write('\x1b[38;5;245mBasic Colors: \x1b[0m');
        for (let i = 0; i < 8; i++) {
          term.write(`\x1b[48;5;${i}m  \x1b[0m`);
        }
        term.write(' ');
        for (let i = 8; i < 16; i++) {
          term.write(`\x1b[48;5;${i}m  \x1b[0m`);
        }
        term.write('\r\n');
        
        // 216 color cube sample
        term.write('\x1b[38;5;245m216-Color Sample:\x1b[0m\r\n');
        for (let r = 0; r < 3; r++) {
          for (let g = 0; g < 6; g++) {
            for (let b = 0; b < 6; b++) {
              const colorIndex = 16 + (36 * (r * 2)) + (6 * g) + b;
              term.write(`\x1b[48;5;${colorIndex}m \x1b[0m`);
            }
            term.write(' ');
          }
          term.write('\r\n');
        }
        
        // Grayscale
        term.write('\x1b[38;5;245mGrayscale: \x1b[0m');
        for (let i = 232; i < 256; i++) {
          term.write(`\x1b[48;5;${i}m \x1b[0m`);
        }
        term.write('\r\n');
        
        // Truecolor demonstration
        term.write('\x1b[38;5;245mTruecolor RGB: \x1b[0m');
        for (let i = 0; i < 16; i++) {
          const r = Math.floor((i / 16) * 255);
          const g = Math.floor((Math.sin(i * 0.5) + 1) * 127.5);
          const b = 255 - r;
          term.write(`\x1b[48;2;${r};${g};${b}m  \x1b[0m`);
        }
        term.write('\r\n');
        
        // Text formatting examples
        term.write('\x1b[38;5;245mText Styles: \x1b[0m');
        term.write('\x1b[1mBold\x1b[0m ');
        term.write('\x1b[2mDim\x1b[0m ');
        term.write('\x1b[3mItalic\x1b[0m ');
        term.write('\x1b[4mUnderline\x1b[0m ');
        term.write('\x1b[7mReverse\x1b[0m ');
        term.write('\x1b[9mStrikethrough\x1b[0m\r\n');
        
        term.write('\x1b[1;38;5;82m✓ ANSI Color Test Complete - Type /colortest to run again\x1b[0m\r\n\r\n');
      }
      return ''; // Don't send the command to server
    }
    
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

  // Clear terminal function
  const clearTerminal = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('\x1b[32m> Terminal cleared\x1b[0m\r\n');
    }
  }, []);

  // Initialize terminal when component mounts or theme changes
  useEffect(() => {
    if (!termRef.current) return;
    
    // Get the selected theme configuration
    const currentTheme = terminalThemes[selectedTheme] || terminalThemes.classic;
    
    const term = new Terminal({
      convertEol: true,
      fontFamily: 'Courier New, monospace',
      fontSize: 14,
      cols: 80,
      rows: 24,
      theme: currentTheme.colors,
      disableStdin: true, // prevent direct typing in terminal; use input bar only
      // Enhanced ANSI color support
      allowProposedApi: true, // Enable proposed API features
      allowTransparency: true, // Allow transparent backgrounds
      // Terminal capabilities for full ANSI support
      windowsMode: false, // Ensure Unix-style line endings for better ANSI compatibility
      macOptionIsMeta: false, // Better key handling
      // Color support configuration
      drawBoldTextInBrightColors: true, // Traditional terminal behavior
      fontWeight: 'normal',
      fontWeightBold: 'bold'
    });
    
    try {
      // Ensure the container has proper dimensions before opening
      const container = termRef.current;
      if (!container) {
        console.warn('Terminal container not found');
        return;
      }
      
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        // Wait for the container to be properly sized
        setTimeout(() => {
          if (container.offsetWidth > 0 && container.offsetHeight > 0) {
            term.open(container);
            xtermRef.current = term;
            console.log('Terminal initialized (delayed)');
            initializeTerminalContent(term);
          } else {
            console.warn('Terminal container still has no dimensions after delay');
          }
        }, 100);
      } else {
        term.open(container);
        xtermRef.current = term;
        console.log('Terminal initialized (immediate)');
        initializeTerminalContent(term);
      }
      
    } catch (error) {
      console.warn('Terminal initialization error:', error);
    }
    
    return () => {
      try {
        if (xtermRef.current) {
          xtermRef.current.dispose();
          xtermRef.current = null;
        }
      } catch (error) {
        console.warn('Terminal disposal error:', error);
      }
    };
  }, [initializeTerminalContent, selectedTheme, terminalThemes]);

  // Setup communication adapter message handling
  useEffect(() => {
    if (!communicationAdapter) return;

    communicationAdapter.onMessage = (data) => {
      if (typeof data === 'string') {
        writeToTerminal(data);
        processTriggers(data);
      } else if (data && typeof data === 'object') {
        if (data.type === 'log') {
          pushEvent(data.message);
        } else if (data.data) {
          writeToTerminal(data.data);
          processTriggers(data.data);
        }
      }
    };

    return () => {
      if (communicationAdapter.onMessage) {
        communicationAdapter.onMessage = null;
      }
    };
  }, [communicationAdapter, writeToTerminal, processTriggers, pushEvent]);

  // Expose functions that parent components might need
  const terminalAPI = {
    writeToTerminal,
    clearTerminal,
    expandMacros,
    getTerminalRef: () => xtermRef.current
  };

  return (
    <div className="terminal" ref={termRef} />
  );
};

export default TerminalComponent;