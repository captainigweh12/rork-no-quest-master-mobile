const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    // Check for UTF-16 LE BOM
    if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
      console.log('UTF-16 LE file found:', filePath);
      return true;
    }
    // Check for UTF-16 BE BOM
    if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
      console.log('UTF-16 BE file found:', filePath);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error checking file:', filePath, e);
    return false;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDir(fullPath);
      }
    } else if (file.endsWith('.json') || file.endsWith('.tsx') || file.endsWith('.ts')) {
      checkFile(fullPath);
    }
  });
}

walkDir('.');
