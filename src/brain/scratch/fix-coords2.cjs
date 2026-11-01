// Fix the remaining 60px margin in shape click handler
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, '../../components/MapViewer.tsx');

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Replace remaining 60 → 40 in shape click handler
const old2 = `        const fitScale = Math.min((dimensions.width - 60) / canvasBounds.width, (dimensions.height - 60) / canvasBounds.height);`;
const new2 = `        const fitScale = Math.min((dimensions.width - 40) / canvasBounds.width, (dimensions.height - 40) / canvasBounds.height);`;

if (!content.includes(old2)) {
  console.error('Cannot find shape click handler transform!');
  process.exit(1);
}

content = content.replace(old2, new2);
fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'));
console.log('SUCCESS: Fixed remaining 60->40 in shape click handler');

