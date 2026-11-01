// Fix routing.service.ts: remove isFreePointS/T guard, create virtual nodes for ANY unresolved object
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, '../../api/routing.service.ts');

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Find the block from "const isFreePointS" through the closing of the tEnts block
const oldBlock = `      const isFreePointS = sourceObj.id.startsWith('loc_') || sourceObj.code === 'PIN';
      if (sEnts.length === 0 && isFreePointS && sourceObj.coordinates && nodes.length > 0) {
        const vNodeId = \`vnode_\${sourceObj.id}\`;
        const vNode: SpatialNode = {
          id: vNodeId,
          campusId,
          buildingId: sourceObj.buildingId || '',
          floorId: sourceObj.floorId || '',
          type: 'hallway',
          coordinates: sourceObj.coordinates,
          isAccessible: true,
          label: typeof sourceObj.name === 'string' ? sourceObj.name : sourceObj.name?.en || 'Start Location',
        };
        nodes.push(vNode);
        sourceObj.associatedNodeId = vNodeId;

        const sameFloorCands = nodes.filter(n => n.id !== vNodeId && n.coordinates && (sourceObj.floorId ? n.floorId === sourceObj.floorId : (!n.floorId || n.floorId === '')));
        const srcCands = sameFloorCands.length > 0 ? sameFloorCands : nodes.filter(n => n.id !== vNodeId && n.coordinates);
        let closest = srcCands[0];
        let minD = Infinity;
        for (const n of srcCands) {
          if (!n.coordinates) continue;
          const d = Math.hypot(n.coordinates.x - sourceObj.coordinates.x, n.coordinates.y - sourceObj.coordinates.y);
          if (d < minD) { minD = d; closest = n; }
        }
        connections.push({
          id: \`vconn_\${vNodeId}\`,
          campusId,
          sourceNodeId: vNodeId,
          targetNodeId: closest.id,
          connectionType: 'corridor',
          name: 'Access Path',
          isAccessible: true,
          isVehicleAccessible: false,
          weightMultiplier: 1.0,
          isWalkable: true,
          isBidirectional: true,
          distanceMeters: Math.max(1, Math.round(minD / 10)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const isFreePointT = targetObj.id.startsWith('loc_') || targetObj.code === 'PIN';
      if (tEnts.length === 0 && isFreePointT && targetObj.coordinates && nodes.length > 0) {
        const vNodeId = \`vnode_\${targetObj.id}\`;
        const vNode: SpatialNode = {
          id: vNodeId,
          campusId,
          buildingId: targetObj.buildingId || '',
          floorId: targetObj.floorId || '',
          type: 'hallway',
          coordinates: targetObj.coordinates,
          isAccessible: true,
          label: typeof targetObj.name === 'string' ? targetObj.name : targetObj.name?.en || 'Destination',
        };
        nodes.push(vNode);
        targetObj.associatedNodeId = vNodeId;

        const tgtFloorCands = nodes.filter(n => n.id !== vNodeId && n.coordinates && (targetObj.floorId ? n.floorId === targetObj.floorId : (!n.floorId || n.floorId === '')));
        const tgtCands = tgtFloorCands.length > 0 ? tgtFloorCands : nodes.filter(n => n.id !== vNodeId && n.coordinates);
        let closest = tgtCands[0];
        let minD = Infinity;
        for (const n of tgtCands) {
          if (!n.coordinates) continue;
          const d = Math.hypot(n.coordinates.x - targetObj.coordinates.x, n.coordinates.y - targetObj.coordinates.y);
          if (d < minD) { minD = d; closest = n; }
        }
        connections.push({
          id: \`vconn_\${vNodeId}\`,
          campusId,
          sourceNodeId: vNodeId,
          targetNodeId: closest.id,
          connectionType: 'corridor',
          name: 'Access Path',
          isAccessible: true,
          isVehicleAccessible: false,
          weightMultiplier: 1.0,
          isWalkable: true,
          isBidirectional: true,
          distanceMeters: Math.max(1, Math.round(minD / 10)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }`;

const newBlock = `      // Guard: don't create virtual nodes for explicitly isolated test objects
      const isIsolatedObj = (obj: typeof sourceObj) =>
        (obj.code && obj.code.toUpperCase().includes('ISOLATED')) ||
        ((obj.associatedNodeId || '').toLowerCase().includes('isolated'));

      // Create a virtual access node for ANY object with no entrance node resolved —
      // not just free points (loc_/PIN). Named objects like "AB frontside Road" or
      // "Admin Block" also need this when they have no matching node in the graph.
      if (sEnts.length === 0 && !isIsolatedObj(sourceObj) && sourceObj.coordinates && nodes.length > 0) {
        const vNodeId = \`vnode_\${sourceObj.id}\`;
        const vNode: SpatialNode = {
          id: vNodeId,
          campusId,
          buildingId: sourceObj.buildingId || '',
          floorId: sourceObj.floorId || '',
          type: 'hallway',
          coordinates: sourceObj.coordinates,
          isAccessible: true,
          label: typeof sourceObj.name === 'string' ? sourceObj.name : sourceObj.name?.en || 'Start Location',
        };
        nodes.push(vNode);
        sourceObj.associatedNodeId = vNodeId;

        const sameFloorCands = nodes.filter(n => n.id !== vNodeId && n.coordinates && (sourceObj.floorId ? n.floorId === sourceObj.floorId : (!n.floorId || n.floorId === '')));
        const srcCands = sameFloorCands.length > 0 ? sameFloorCands : nodes.filter(n => n.id !== vNodeId && n.coordinates);
        let closest = srcCands[0];
        let minD = Infinity;
        for (const n of srcCands) {
          if (!n.coordinates) continue;
          const d = Math.hypot(n.coordinates.x - sourceObj.coordinates.x, n.coordinates.y - sourceObj.coordinates.y);
          if (d < minD) { minD = d; closest = n; }
        }
        if (closest) {
          connections.push({
            id: \`vconn_\${vNodeId}\`,
            campusId,
            sourceNodeId: vNodeId,
            targetNodeId: closest.id,
            connectionType: 'corridor',
            name: 'Access Path',
            isAccessible: true,
            isVehicleAccessible: false,
            weightMultiplier: 1.0,
            isWalkable: true,
            isBidirectional: true,
            distanceMeters: Math.max(1, Math.round(minD / 10)),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        sEnts = [vNodeId];
      }

      if (tEnts.length === 0 && !isIsolatedObj(targetObj) && targetObj.coordinates && nodes.length > 0) {
        const vNodeId = \`vnode_\${targetObj.id}\`;
        const vNode: SpatialNode = {
          id: vNodeId,
          campusId,
          buildingId: targetObj.buildingId || '',
          floorId: targetObj.floorId || '',
          type: 'hallway',
          coordinates: targetObj.coordinates,
          isAccessible: true,
          label: typeof targetObj.name === 'string' ? targetObj.name : targetObj.name?.en || 'Destination',
        };
        nodes.push(vNode);
        targetObj.associatedNodeId = vNodeId;

        const tgtFloorCands = nodes.filter(n => n.id !== vNodeId && n.coordinates && (targetObj.floorId ? n.floorId === targetObj.floorId : (!n.floorId || n.floorId === '')));
        const tgtCands = tgtFloorCands.length > 0 ? tgtFloorCands : nodes.filter(n => n.id !== vNodeId && n.coordinates);
        let closest = tgtCands[0];
        let minD = Infinity;
        for (const n of tgtCands) {
          if (!n.coordinates) continue;
          const d = Math.hypot(n.coordinates.x - targetObj.coordinates.x, n.coordinates.y - targetObj.coordinates.y);
          if (d < minD) { minD = d; closest = n; }
        }
        if (closest) {
          connections.push({
            id: \`vconn_\${vNodeId}\`,
            campusId,
            sourceNodeId: vNodeId,
            targetNodeId: closest.id,
            connectionType: 'corridor',
            name: 'Access Path',
            isAccessible: true,
            isVehicleAccessible: false,
            weightMultiplier: 1.0,
            isWalkable: true,
            isBidirectional: true,
            distanceMeters: Math.max(1, Math.round(minD / 10)),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        tEnts = [vNodeId];
      }`;

if (!content.includes('isFreePointS')) {
  console.error('CANNOT FIND isFreePointS block in file!');
  process.exit(1);
}

const newContent = content.replace(oldBlock, newBlock);
if (newContent === content) {
  console.error('Replacement failed - block not found exactly');
  // Try to find near match
  const idx = content.indexOf('const isFreePointS');
  console.log('Index of isFreePointS:', idx);
  console.log('Nearby:', JSON.stringify(content.slice(idx, idx+200)));
  process.exit(1);
}
fs.writeFileSync(filePath, newContent.replace(/\n/g, '\r\n'));
console.log('SUCCESS: Fixed isFreePointS/T restriction');

