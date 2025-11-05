const fs = require('fs');
const path = require('path');

// Helper to check if a file might be UTF-16
function checkFileEncoding(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    
    // Check for UTF-16 LE BOM
    if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
      return { 
        path: filePath, 
        encoding: 'UTF-16 LE',
        preview: buf.toString('utf16le').slice(0, 100)
      };
    }
    
    // Check for UTF-16 BE BOM
    if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
      return { 
        path: filePath,
        encoding: 'UTF-16 BE',
        preview: buf.toString('utf16be').slice(0, 100)
      };
    }

    // Check for sequences of NUL bytes (common in UTF-16)
    let hasNulBytes = false;
    for (let i = 0; i < Math.min(buf.length, 100); i++) {
      if (buf[i] === 0x00 && buf[i + 1] !== 0x00) {
        hasNulBytes = true;
        break;
      }
    }

    if (hasNulBytes) {
      // Try both UTF-16LE and UTF-16BE
      const utf16le = buf.toString('utf16le').slice(0, 100);
      const utf16be = buf.toString('utf16be').slice(0, 100);
      
      return {
        path: filePath,
        encoding: 'Possible UTF-16',
        preview: `LE: ${utf16le}\nBE: ${utf16be}`
      };
    }

    return null;
  } catch (e) {
    console.error(`Error checking ${filePath}:`, e);
    return null;
  }
}

// Check specific extensions
const checkExtensions = ['.json', '.ts', '.tsx', '.js', '.jsx'];

function walkDir(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        results.push(...walkDir(fullPath));
      }
    } else if (checkExtensions.includes(path.extname(file))) {
      const result = checkFileEncoding(fullPath);
      if (result) {
        results.push(result);
      }
    }
  });
  
  return results;
}

// Run the check
console.log('Checking for problematic file encodings...');
const results = walkDir('.');

if (results.length > 0) {
  console.log('\nFound potentially problematic files:');
  results.forEach(result => {
    console.log(`\n📁 ${result.path}`);
    console.log(`Encoding: ${result.encoding}`);
    console.log('Preview:');
    console.log(result.preview);
    console.log('-'.repeat(80));
  });
} else {
  console.log('No problematic encodings found! 🎉');
}