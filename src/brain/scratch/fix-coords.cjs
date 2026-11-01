// Fix MapViewer coordinate transform mismatch: click and drag handlers use 60px margin, renderer uses 40px
// They need to match exactly
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, '../../components/MapViewer.tsx');

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Fix 1: handleCanvasClick coordinate transform (line ~760)
const oldClickTransform = `    const fitScale = Math.min((dimensions.width - 60) / canvasBounds.width, (dimensions.height - 60) / canvasBounds.height);
    const totalScale = fitScale * zoom;
    const offsetX = (dimensions.width - canvasBounds.width * totalScale) / 2;
    const offsetY = (dimensions.height - canvasBounds.height * totalScale) / 2;
    const canvasX = (clickX - pan.x - offsetX) / totalScale;
    const canvasY = (clickY - pan.y - offsetY) / totalScale;`;

const newClickTransform = `    const fitScale = Math.min((dimensions.width - 40) / canvasBounds.width, (dimensions.height - 40) / canvasBounds.height);
    const totalScale = fitScale * zoom;
    const offsetX = (dimensions.width - canvasBounds.width * totalScale) / 2;
    const offsetY = (dimensions.height - canvasBounds.height * totalScale) / 2;
    const canvasX = (clickX - pan.x - offsetX) / totalScale;
    const canvasY = (clickY - pan.y - offsetY) / totalScale;`;

if (!content.includes(oldClickTransform)) {
  console.error('Cannot find click transform!');
  const idx = content.indexOf('dimensions.width - 60');
  console.log('Index:', idx, 'Nearby:', JSON.stringify(content.slice(idx-10, idx+200)));
  process.exit(1);
}

content = content.replace(oldClickTransform, newClickTransform);

// Fix 2: pin drag handler (another place that may have 60)
const oldDragTransform = `          const fitScale = Math.min((dimensions.width - 60) / canvasBounds.width, (dimensions.height - 60) / canvasBounds.height);`;
const newDragTransform = `          const fitScale = Math.min((dimensions.width - 40) / canvasBounds.width, (dimensions.height - 40) / canvasBounds.height);`;

if (content.includes(oldDragTransform)) {
  content = content.replace(oldDragTransform, newDragTransform);
  console.log('Also fixed drag transform');
} else {
  console.log('No separate drag transform found (may use same vars)');
}

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'));
console.log('SUCCESS: Fixed coordinate transform mismatch (60→40px margin)');

