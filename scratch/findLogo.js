const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'public') {
        searchDir(fullPath, pattern);
      }
    } else if (file.endsWith('.js') || file.endsWith('.ejs')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (pattern.test(content)) {
        console.log(`Match in file: ${fullPath}`);
      }
    }
  }
}

searchDir('D:\\Development\\SARAPLAYGAME\\Saraplaybackend', /logo/i);
