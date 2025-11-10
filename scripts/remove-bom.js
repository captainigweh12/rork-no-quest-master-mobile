const fs = require('fs');
const path = require('path');

const files = [
  'check-encoding.js',
  'providers/TrpcProvider.tsx'
];

console.log('🔧 Removing UTF-8 BOM from files...\n');

for (const file of files) {
  const filePath = path.join(__dirname, '..', file);
  
  try {
    const content = fs.readFileSync(filePath);
    
    // Check if file starts with UTF-8 BOM (EF BB BF)
    if (content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
      console.log(`✓ Removing BOM from: ${file}`);
      // Remove the first 3 bytes (BOM) and write back
      fs.writeFileSync(filePath, content.slice(3));
    } else {
      console.log(`  No BOM found in: ${file}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
}

console.log('\n✅ BOM removal complete!');
