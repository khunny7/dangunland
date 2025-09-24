#!/usr/bin/env node
/**
 * Windows Store Preparation Script
 * Verifies all required assets and configurations are ready for Windows Store submission
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_ASSETS = [
  'StoreLogo.png',
  'Square44x44Logo.png', 
  'Square150x150Logo.png',
  'Wide310x150Logo.png',
  'LargeTile.png',
  'SmallTile.png',
  'SplashScreen.png',
  'icon.ico',
  'Package.appxmanifest'
];

const ASSET_SIZES = {
  'StoreLogo.png': [50, 50],
  'Square44x44Logo.png': [44, 44],
  'Square150x150Logo.png': [150, 150],
  'Wide310x150Logo.png': [310, 150],
  'LargeTile.png': [310, 310],
  'SmallTile.png': [71, 71],
  'SplashScreen.png': [620, 300]
};

function checkAssets() {
  console.log('🔍 Checking Windows Store assets...\n');
  
  const assetsDir = path.join(__dirname, '..', 'assets');
  let allPresent = true;
  
  for (const asset of REQUIRED_ASSETS) {
    const assetPath = path.join(assetsDir, asset);
    const exists = fs.existsSync(assetPath);
    
    console.log(`${exists ? '✅' : '❌'} ${asset}`);
    
    if (!exists) {
      allPresent = false;
    } else if (asset.endsWith('.png')) {
      // Check file size for images
      const stats = fs.statSync(assetPath);
      console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
    }
  }
  
  return allPresent;
}

function checkPackageJson() {
  console.log('\n🔍 Checking package.json configuration...\n');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredFields = {
    'build.appId': packageJson.build?.appId,
    'build.productName': packageJson.build?.productName,
    'build.appx.applicationId': packageJson.build?.appx?.applicationId,
    'build.appx.publisher': packageJson.build?.appx?.publisher,
    'build.win.icon': packageJson.build?.win?.icon
  };
  
  let allPresent = true;
  
  for (const [field, value] of Object.entries(requiredFields)) {
    const exists = value !== undefined;
    console.log(`${exists ? '✅' : '❌'} ${field}: ${value || 'MISSING'}`);
    if (!exists) allPresent = false;
  }
  
  return allPresent;
}

function checkManifest() {
  console.log('\n🔍 Checking Package.appxmanifest...\n');
  
  const manifestPath = path.join(__dirname, '..', 'assets', 'Package.appxmanifest');
  
  if (!fs.existsSync(manifestPath)) {
    console.log('❌ Package.appxmanifest not found');
    return false;
  }
  
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  
  const checks = {
    'Identity Name': manifest.includes('khunny7.DangunLandMUDClient'),
    'Publisher': manifest.includes('CN=khunny7'),
    'DisplayName': manifest.includes('DangunLand MUD Client'),
    'Description': manifest.includes('Description'),
    'Assets referenced': REQUIRED_ASSETS.filter(a => a.endsWith('.png')).every(a => manifest.includes(a))
  };
  
  let allPresent = true;
  
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`${passed ? '✅' : '❌'} ${check}`);
    if (!passed) allPresent = false;
  }
  
  return allPresent;
}

function main() {
  console.log('🚀 Windows Store Readiness Check\n');
  console.log('=====================================\n');
  
  const assetsReady = checkAssets();
  const packageReady = checkPackageJson();
  const manifestReady = checkManifest();
  
  console.log('\n📋 SUMMARY');
  console.log('=====================================');
  console.log(`Assets: ${assetsReady ? '✅ Ready' : '❌ Issues found'}`);
  console.log(`Package Config: ${packageReady ? '✅ Ready' : '❌ Issues found'}`);
  console.log(`Manifest: ${manifestReady ? '✅ Ready' : '❌ Issues found'}`);
  
  const allReady = assetsReady && packageReady && manifestReady;
  
  console.log(`\n🎯 Overall Status: ${allReady ? '✅ READY FOR WINDOWS STORE' : '❌ NEEDS ATTENTION'}`);
  
  if (allReady) {
    console.log('\n🎉 Your app is ready for Windows Store submission!');
    console.log('Next steps:');
    console.log('1. Run: npm run dist:win-store');
    console.log('2. Test the generated .appx package');
    console.log('3. Follow the submission guide in WINDOWS_STORE.md');
  } else {
    console.log('\n⚠️  Please fix the issues above before proceeding.');
  }
  
  process.exit(allReady ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { checkAssets, checkPackageJson, checkManifest };