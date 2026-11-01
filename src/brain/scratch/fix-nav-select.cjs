// Fix UserNavigationPage.tsx: selectSource/selectDest should upsert obj into objects and set pin positions
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, '../../pages/UserNavigationPage.tsx');

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const oldSelectFns = `  const selectSource = (obj: MapObject) => {
    setSourceObj(obj);
    setSourceQuery(typeof obj.name === 'string' ? obj.name : obj.name?.en || obj.code);
    setIsSearchingSource(false);
    setPickMode(null);
  };
  const selectDest = (obj: MapObject) => {
    setDestObj(obj);
    setDestQuery(typeof obj.name === 'string' ? obj.name : obj.name?.en || obj.code);
    setIsSearchingDest(false);
    setPickMode(null);
  };`;

const newSelectFns = `  const selectSource = (obj: MapObject) => {
    // Upsert into objects so MapViewer can find and render the pin
    objectStore.create(obj);
    setObjects(prev => [...prev.filter(o => o.id !== obj.id), obj]);
    // Set pin position if coordinates are valid canvas coords
    if (obj.coordinates && (obj.coordinates.x > 0 || obj.coordinates.y > 0)) {
      const pinLevel = obj.floorId ? 'floor' : 'campus';
      setSourcePinPos({ x: obj.coordinates.x, y: obj.coordinates.y, level: pinLevel as any, floorId: obj.floorId || undefined });
    }
    setSourceObj(obj);
    setSourceQuery(typeof obj.name === 'string' ? obj.name : obj.name?.en || obj.code);
    setIsSearchingSource(false);
    setPickMode(null);
  };
  const selectDest = (obj: MapObject) => {
    // Upsert into objects so MapViewer can find and render the pin
    objectStore.create(obj);
    setObjects(prev => [...prev.filter(o => o.id !== obj.id), obj]);
    // Set pin position if coordinates are valid canvas coords
    if (obj.coordinates && (obj.coordinates.x > 0 || obj.coordinates.y > 0)) {
      const pinLevel = obj.floorId ? 'floor' : 'campus';
      setDestPinPos({ x: obj.coordinates.x, y: obj.coordinates.y, level: pinLevel as any, floorId: obj.floorId || undefined });
    }
    setDestObj(obj);
    setDestQuery(typeof obj.name === 'string' ? obj.name : obj.name?.en || obj.code);
    setIsSearchingDest(false);
    setPickMode(null);
  };`;

if (!content.includes('const selectSource = (obj: MapObject) => {')) {
  console.error('CANNOT FIND selectSource block!');
  process.exit(1);
}

const newContent = content.replace(oldSelectFns, newSelectFns);
if (newContent === content) {
  console.error('Replacement failed!');
  const idx = content.indexOf('const selectSource');
  console.log('Index:', idx, 'Nearby:', JSON.stringify(content.slice(idx, idx+300)));
  process.exit(1);
}
fs.writeFileSync(filePath, newContent.replace(/\n/g, '\r\n'));
console.log('SUCCESS: Fixed selectSource/selectDest to set pin positions');

