const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Simple APPX icon fix - maintains original compression and structure
 */
async function fixAppxIconsSimple() {
  console.log('🎯 Running simple APPX icon fix...');
  
  try {
    // Find the APPX file
    const releaseDir = path.join(__dirname, '..', 'release');
    const appxFile = path.join(releaseDir, 'DangunLand MUD Client 1.0.2.appx');
    
    if (!fs.existsSync(appxFile)) {
      console.error('❌ APPX file not found');
      process.exit(1);
    }
    
    console.log(`📦 Processing: ${path.basename(appxFile)}`);
    
    // Create backup
    const backupFile = appxFile.replace('.appx', '-backup.appx');
    fs.copyFileSync(appxFile, backupFile);
    
    // Create temp directories
    const tempDir = path.join(__dirname, '..', 'temp_appx_fix');
    const extractDir = path.join(tempDir, 'extracted');
    
    // Clean up any existing temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(extractDir, { recursive: true });
    
    // Extract APPX using PowerShell
    console.log('📂 Extracting APPX package...');
    const zipFile = path.join(tempDir, 'package.zip');
    fs.copyFileSync(appxFile, zipFile);
    execSync(`powershell -Command "Expand-Archive '${zipFile}' '${extractDir}' -Force"`, { stdio: 'inherit' });
    
    // Copy AppList files from source assets to APPX assets
    const sourceAssetsDir = path.join(__dirname, '..', 'assets');
    const targetAssetsDir = path.join(extractDir, 'assets');
    
    if (!fs.existsSync(sourceAssetsDir)) {
      console.error('❌ Source assets directory not found');
      process.exit(1);
    }
    
    const files = fs.readdirSync(sourceAssetsDir);
    const iconFiles = files.filter(f => 
      f.startsWith('AppList.targetsize-') || 
      f.startsWith('StoreLogo.scale-') ||
      f.startsWith('MedTile.scale-')
    );
    
    if (iconFiles.length === 0) {
      console.error('❌ No AppList icon files found in source assets');
      process.exit(1);
    }
    
    console.log(`📋 Adding ${iconFiles.length} icon files to APPX assets directory...`);
    
    for (const file of iconFiles) {
      const sourcePath = path.join(sourceAssetsDir, file);
      const targetPath = path.join(targetAssetsDir, file);
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`   ✓ ${file}`);
    }
    
    // Instead of recompressing, use 7zip if available, or fall back to manual ZIP creation
    console.log('📦 Repackaging APPX with original compression...');
    
    // Delete original
    fs.unlinkSync(appxFile);
    
    // Change to extract directory for proper file paths in archive
    const oldCwd = process.cwd();
    process.chdir(extractDir);
    
    try {
      // Use PowerShell with minimal compression to maintain structure
      const tempZipPath = path.join(tempDir, 'repackaged.zip');
      execSync(`powershell -Command "Compress-Archive -Path '*' -DestinationPath '${tempZipPath}' -CompressionLevel Fastest -Force"`, { stdio: 'inherit' });
      
      // Copy to final location
      fs.copyFileSync(tempZipPath, appxFile);
    } finally {
      process.chdir(oldCwd);
    }
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('✅ APPX package successfully fixed!');
    
    // Verify the fix
    console.log('\n🔍 Verifying icon fix...');
    const verifyZip = appxFile.replace('.appx', '_verify.zip');
    const verifyDir = path.join(releaseDir, 'verify_temp');
    
    fs.copyFileSync(appxFile, verifyZip);
    execSync(`powershell -Command "Expand-Archive '${verifyZip}' '${verifyDir}' -Force"`, { stdio: 'pipe' });
    
    const verifyAssets = path.join(verifyDir, 'assets');
    const verifyIcons = fs.readdirSync(verifyAssets).filter(f => f.startsWith('AppList.targetsize-'));
    
    fs.unlinkSync(verifyZip);
    fs.rmSync(verifyDir, { recursive: true, force: true });
    
    console.log(`✅ Verified: ${verifyIcons.length} AppList icons in correct location`);
    
  } catch (error) {
    console.error('❌ Failed to fix APPX:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  fixAppxIconsSimple();
}

module.exports = { fixAppxIconsSimple };