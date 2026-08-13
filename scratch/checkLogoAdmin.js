const fs = require('fs');
const lines = fs.readFileSync('controllers/AdminController.js', 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('logo') || line.toLowerCase().includes('upload')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
