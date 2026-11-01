// Fix MapViewer.tsx route rendering: improve segment grouping to include transition nodes
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, '../../components/MapViewer.tsx');

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const oldRouteBlock = `    // 3. Draw Active Route on current floor
    if (routeResult && routeResult.nodes && routeResult.nodes.length > 0) {
      // Build lookup map from prop nodes + resolved pathNodes
      const allNodeMap = new Map(nodes.map(n => [n.id, n]));
      if (routeResult.pathNodes) {
        routeResult.pathNodes.forEach(n => { if (!allNodeMap.has(n.id)) allNodeMap.set(n.id, n); });
      }

      const fullPathNodes = (routeResult.pathNodes && routeResult.pathNodes.length > 0)
        ? routeResult.pathNodes
        : routeResult.nodes.map(id => allNodeMap.get(id)).filter(Boolean) as SpatialNode[];

      // Group path nodes into continuous segments on this floor/campus level
      const segments: SpatialNode[][] = [];
      let curSegment: SpatialNode[] = [];

      for (let i = 0; i < fullPathNodes.length; i++) {
        const node = fullPathNodes[i];
        const nodeFloor = node.floorId || '';
        const curFloor = currentFloorId || '';
        if (nodeFloor === curFloor) {
          curSegment.push(node);
        } else {
          if (curSegment.length > 0) {
            segments.push(curSegment);
            curSegment = [];
          }
        }
      }
      if (curSegment.length > 0) segments.push(curSegment);`;

const newRouteBlock = `    // 3. Draw Active Route on current floor
    if (routeResult && routeResult.nodes && routeResult.nodes.length > 0) {
      // Build lookup map from prop nodes + resolved pathNodes
      const allNodeMap = new Map(nodes.map(n => [n.id, n]));
      if (routeResult.pathNodes) {
        routeResult.pathNodes.forEach(n => { if (!allNodeMap.has(n.id)) allNodeMap.set(n.id, n); });
      }

      const fullPathNodes = (routeResult.pathNodes && routeResult.pathNodes.length > 0)
        ? routeResult.pathNodes
        : routeResult.nodes.map(id => allNodeMap.get(id)).filter(Boolean) as SpatialNode[];

      // Group path nodes into continuous segments on this floor/campus level.
      // Include the first node of the NEXT floor segment as a "bridge endpoint" so the
      // route visually reaches the building entrance from the campus side.
      const segments: SpatialNode[][] = [];
      let curSegment: SpatialNode[] = [];
      const curFloor = currentFloorId || '';

      for (let i = 0; i < fullPathNodes.length; i++) {
        const node = fullPathNodes[i];
        const nodeFloor = node.floorId || '';
        if (nodeFloor === curFloor) {
          curSegment.push(node);
        } else {
          // Node belongs to a different floor.
          // If we're building up a segment for this floor, include this adjacent node
          // as the terminal waypoint so the path visually reaches the transition point.
          if (curSegment.length > 0) {
            // Only append the bridge node if it has valid canvas-scale coordinates
            if (node.coordinates && (node.coordinates.x > 0 || node.coordinates.y > 0)) {
              curSegment.push(node);
            }
            segments.push(curSegment);
            curSegment = [];
          }
        }
      }
      if (curSegment.length > 0) segments.push(curSegment);`;

if (!content.includes('// Group path nodes into continuous segments on this floor/campus level')) {
  console.error('CANNOT FIND route rendering block!');
  process.exit(1);
}

const newContent = content.replace(oldRouteBlock, newRouteBlock);
if (newContent === content) {
  console.error('Replacement failed - segment block not found exactly');
  const idx = content.indexOf('// Group path nodes into continuous segments');
  console.log('Index:', idx);
  console.log('Nearby:', JSON.stringify(content.slice(idx, idx+300)));
  process.exit(1);
}
fs.writeFileSync(filePath, newContent.replace(/\n/g, '\r\n'));
console.log('SUCCESS: Fixed route segment rendering');

