const fs = require('fs');
const path = require('path');

/**
 * Remove unused locale files from Electron build
 * Keeps only English and Korean locales
 */
exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'win32') {
    return;
  }

  const localesDir = path.join(appOutDir, 'locales');
  
  if (!fs.existsSync(localesDir)) {
    console.log('Locales directory not found, skipping locale optimization');
    return;
  }

  // Keep only these locales
  const keepLocales = ['en-US.pak', 'ko-KR.pak'];
  
  console.log('🗂️  Optimizing locale files...');
  
  try {
    const files = fs.readdirSync(localesDir);
    let removedCount = 0;
    let savedMB = 0;
    
    files.forEach(file => {
      if (file.endsWith('.pak') && !keepLocales.includes(file)) {
        const filePath = path.join(localesDir, file);
        try {
          const stats = fs.statSync(filePath);
          savedMB += stats.size / (1024 * 1024);
          fs.unlinkSync(filePath);
          removedCount++;
        } catch (err) {
          console.warn(`Failed to remove locale file ${file}:`, err.message);
        }
      }
    });
    
    console.log(`✅ Removed ${removedCount} unused locale files, saved ~${savedMB.toFixed(1)}MB`);
  } catch (err) {
    console.warn('Failed to optimize locales:', err.message);
  }
};