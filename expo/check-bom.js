const fs = require('fs');

const files = ['app.config.ts', 'babel.config.js', 'metro.config.js', 'tsconfig.json', 'package.json', '.env'];

files.forEach(f => {
  try {
    const b = fs.readFileSync(f);
    const hasBOM = (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) || 
                   (b[0] === 0xFF && b[1] === 0xFE) || 
                   (b[0] === 0xFE && b[1] === 0xFF);
    
    if (hasBOM) {
      console.log('⚠️  BOM found:', f);
    } else {
      console.log('✅ OK:', f);
    }
  } catch (e) {
    console.log('❌ Error reading', f, ':', e.message);
  }
});
