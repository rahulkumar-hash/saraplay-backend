const fs = require('fs');
const lines = fs.readFileSync('public/assets/forms/validate.js', 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('bidTable') || line.includes('bidHistory') || line.includes('starline-bid-history')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
