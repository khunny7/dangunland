#!/usr/bin/env node
/**
 * Configuration Validation Script
 * Validates that all Windows Store configuration files are consistent and correct
 */

const fs = require('fs');
const path = require('path');

function validateConfiguration() {
  console.log('🔍 Validating Windows Store Configuration\n');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  const manifestPath = path.join(__dirname, '..', 'assets', 'Package.appxmanifest');
  
  // Read files
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  
  let allValid = true;
  
  // Check package.json configuration
  console.log('📦 Package.json Configuration:');
  const requiredPackageFields = {
    'appId': packageJson.build?.appId,
    'productName': packageJson.build?.productName,
    'appx.applicationId': packageJson.build?.appx?.applicationId,
    'appx.identityName': packageJson.build?.appx?.identityName,
    'appx.publisher': packageJson.build?.appx?.publisher,
    'win.icon': packageJson.build?.win?.icon
  };
  
  for (const [field, value] of Object.entries(requiredPackageFields)) {
    const valid = value !== undefined;
    console.log(`  ${valid ? '✅' : '❌'} ${field}: ${value || 'MISSING'}`);
    if (!valid) allValid = false;
  }
  
  // Check manifest configuration
  console.log('\n📄 Manifest Configuration:');
  const manifestChecks = {
    'Identity Name matches package.json': 
      manifest.includes(packageJson.build?.appx?.identityName || ''),
    'Publisher matches package.json': 
      manifest.includes(packageJson.build?.appx?.publisher || ''),
    'DisplayName present': 
      manifest.includes('DisplayName'),
    'Description present': 
      manifest.includes('Description'),
    'All assets referenced': 
      ['StoreLogo.png', 'Square44x44Logo.png', 'Square150x150Logo.png', 
       'Wide310x150Logo.png', 'LargeTile.png', 'SmallTile.png', 'SplashScreen.png']
      .every(asset => manifest.includes(asset))
  };
  
  for (const [check, valid] of Object.entries(manifestChecks)) {
    console.log(`  ${valid ? '✅' : '❌'} ${check}`);
    if (!valid) allValid = false;
  }
  
  // Check consistency between files
  console.log('\n🔗 Cross-file Consistency:');
  const consistencyChecks = {
    'Identity Name consistency': 
      packageJson.build?.appx?.identityName === packageJson.build?.appx?.applicationId,
    'Publisher format correct': 
      (packageJson.build?.appx?.publisher || '').startsWith('CN=')
  };
  
  for (const [check, valid] of Object.entries(consistencyChecks)) {
    console.log(`  ${valid ? '✅' : '❌'} ${check}`);
    if (!valid) allValid = false;
  }
  
  console.log('\n📋 VALIDATION SUMMARY');
  console.log('=====================================');
  console.log(`Configuration Status: ${allValid ? '✅ VALID' : '❌ ISSUES FOUND'}`);
  
  if (allValid) {
    console.log('\n🎉 All configurations are valid and consistent!');
    console.log('Ready for Windows Store package building.');
  } else {
    console.log('\n⚠️  Please fix the configuration issues above.');
  }
  
  return allValid;
}

if (require.main === module) {
  const isValid = validateConfiguration();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateConfiguration };