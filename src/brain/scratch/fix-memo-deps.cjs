// Fix contextDestinations deps to include editorShapes
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, '../../pages/UserNavigationPage.tsx');

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Fix: add editorShapes to deps of contextDestinations
const oldDeps = '  }, [cleanDestinations, dropdownScope, view, buildings]);';
const newDeps = '  }, [cleanDestinations, dropdownScope, view, buildings, editorShapes]);';

if (!content.includes(oldDeps)) {
  console.error('CANNOT FIND contextDestinations deps!');
  // Find near match
  const idx = content.indexOf('cleanDestinations, dropdownScope, view, buildings');
  console.log('Index:', idx, 'Nearby:', JSON.stringify(content.slice(idx, idx+100)));
  process.exit(1);
}

let newContent = content.replace(oldDeps, newDeps);
fs.writeFileSync(filePath, newContent.replace(/\n/g, '\r\n'));
console.log('SUCCESS: Fixed contextDestinations memo deps to include editorShapes');

