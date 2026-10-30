import { v4 as uuidv4 } from 'uuid';
import { SpatialNode, CampusConnection, SpatialNodeType, ConnectionType } from '../types/connection';
import { MapObject } from '../types/object';
import { EditorShape, MapCalibration } from '../types';

export interface GraphGeneratorOptions {
  /** Snapping threshold for joining path vertices into explicit junctions (in meters). Default 0.8m */
  snapToleranceMeters?: number;
  /** Snapping threshold for connecting doors/entrances to nearby walkable paths (in meters). Default 5.0m */
  doorSnapToleranceMeters?: number;
  /** Whether to retain existing node/edge IDs, labels, custom weights, and metadata. Default true */
  preserveMetadata?: boolean;
  /** Whether to automatically link doors to rooms within proximity. Default true */
  autoAssociateRooms?: boolean;
  /** Whether to automatically create vertical transitions between aligned stairs/elevators across floors. Default true */
  autoConnectFloorTransitions?: boolean;
}

export interface GraphGenerationResult {
  nodes: SpatialNode[];
  connections: CampusConnection[];
  updatedObjects: MapObject[];
  stats: {
    corridorNodesCount: number;
    doorNodesCount: number;
    connectorNodesCount: number;
    edgesCreatedCount: number;
    edgesPreservedCount: number;
    roomsAssociatedCount: number;
    interFloorTransitionsCount: number;
    duplicateEdgesRemovedCount: number;
    danglingEdgesRemovedCount: number;
  };
}

/**
 * Calculates Euclidean distance in meters between two points using calibration.
 */
export function calculateDistanceMeters(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  calibration: MapCalibration
): number {
  const pxPerM = calibration.canvasWidthPx / calibration.realWidthMeters;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy) / pxPerM;
  return Math.max(0.1, Math.round(dist * 10) / 10);
}

/**
 * Checks whether a shape represents an explicitly walkable path or corridor.
 */
export function isWalkablePathShape(shape: EditorShape): boolean {
  if (shape.geometryType === 'polyline') return true;
  if (shape.attributes?.isWalkable === true) return true;
  const category = (shape.attributes?.category || shape.objectTypeId || '').toLowerCase();
  const name = (shape.name || '').toLowerCase();
  if (category.includes('corridor') || category.includes('hallway') || category.includes('path') || category.includes('walkway')) {
    return true;
  }
  if (name.includes('corridor') || name.includes('hallway') || name.includes('walkway') || name.includes('path')) {
    return true;
  }
  return false;
}

/**
 * Core Graph Generator: converts administrator-drawn geometry, walkable paths,
 * rooms, doors, and connectors into an authoritative, clean navigation graph.
 */
export class CampusGraphGenerator {
  /**
   * Generates or incrementally updates navigation nodes, connections, and room associations.
   */
  public static generateGraph(
    campusId: string,
    floorId: string | undefined,
    buildingId: string | undefined,
    shapes: EditorShape[],
    existingNodes: SpatialNode[],
    existingConnections: CampusConnection[],
    objects: MapObject[],
    calibration: MapCalibration,
    options: GraphGeneratorOptions = {}
  ): GraphGenerationResult {
    const snapToleranceM = options.snapToleranceMeters ?? 0.8;
    const doorSnapToleranceM = options.doorSnapToleranceMeters ?? 5.0;
    const preserveMeta = options.preserveMetadata ?? true;
    const autoAssociate = options.autoAssociateRooms ?? true;
    const pxPerM = calibration.canvasWidthPx / calibration.realWidthMeters;
    const snapTolerancePx = snapToleranceM * pxPerM;

    // Filter relevant existing data
    const otherFloorNodes = floorId ? existingNodes.filter(n => n.floorId !== floorId) : [];
    const currentFloorExistingNodes = floorId ? existingNodes.filter(n => n.floorId === floorId) : existingNodes;

    const otherFloorConnections = floorId
      ? existingConnections.filter(c => c.sourceFloorId !== floorId && c.targetFloorId !== floorId)
      : [];
    const currentFloorExistingConnections = floorId
      ? existingConnections.filter(c => c.sourceFloorId === floorId || c.targetFloorId === floorId)
      : existingConnections;

    // ── STEP 1: Identify Walkable Path Shapes & Extract Vertices ────────────────
    const pathShapes = shapes.filter(s => isWalkablePathShape(s));
    
    // Explicit vertex clustering: only vertices within snap tolerance snap together.
    // We NEVER assume every arbitrary geometric crossing is traversable without a snapped vertex.
    interface RawVertex {
      x: number;
      y: number;
      shapeId: string;
      isEndpoint: boolean;
      index: number;
    }
    const rawVertices: RawVertex[] = [];

    for (const ps of pathShapes) {
      const pts = ps.points || [ps.x, ps.y, ps.x + (ps.width || 0), ps.y + (ps.height || 0)];
      const numPoints = Math.floor(pts.length / 2);
      for (let i = 0; i < numPoints; i++) {
        rawVertices.push({
          x: pts[i * 2],
          y: pts[i * 2 + 1],
          shapeId: ps.id,
          isEndpoint: i === 0 || i === numPoints - 1,
          index: i,
        });
      }
    }

    // Cluster raw vertices into explicit junction/corridor nodes
    interface ClusteredNode {
      id: string;
      x: number;
      y: number;
      type: SpatialNodeType;
      label?: string;
      isAccessible: boolean;
      isRestricted: boolean;
      sourceVertexIndices: { shapeId: string; index: number }[];
    }
    const clusteredNodes: ClusteredNode[] = [];

    for (const v of rawVertices) {
      let match = clusteredNodes.find(cn => Math.hypot(cn.x - v.x, cn.y - v.y) <= snapTolerancePx);
      if (!match) {
        // Try matching with an existing node if preserveMetadata is true
        let existingMatch: SpatialNode | undefined;
        if (preserveMeta) {
          existingMatch = currentFloorExistingNodes.find(
            en => Math.hypot(en.coordinates.x - v.x, en.coordinates.y - v.y) <= snapTolerancePx
          );
        }

        const newNodeId = existingMatch?.id || uuidv4();
        const newNode: ClusteredNode = {
          id: newNodeId,
          x: existingMatch ? existingMatch.coordinates.x : v.x,
          y: existingMatch ? existingMatch.coordinates.y : v.y,
          type: existingMatch?.type || 'hallway',
          label: existingMatch?.label || `Junction (${Math.round(v.x)}, ${Math.round(v.y)})`,
          isAccessible: existingMatch?.isAccessible ?? true,
          isRestricted: existingMatch?.isRestricted ?? false,
          sourceVertexIndices: [{ shapeId: v.shapeId, index: v.index }],
        };
        clusteredNodes.push(newNode);
      } else {
        match.sourceVertexIndices.push({ shapeId: v.shapeId, index: v.index });
      }
    }

    // ── STEP 2: Retain and Synchronize Explicit Doors & Connectors ──────────────
    // Collect standalone spatial nodes on current floor (doors, entrances, stairs, elevators, ramps, bridges)
    const preservedSpecialNodes: SpatialNode[] = [];
    for (const en of currentFloorExistingNodes) {
      if (['door', 'entrance', 'stairs', 'elevator', 'ramp', 'bridge'].includes(en.type)) {
        preservedSpecialNodes.push(en);
      }
    }

    // Also look for shapes that represent doors/connectors if not already in nodes
    for (const s of shapes) {
      const type = (s.attributes?.type || s.objectTypeId || '').toLowerCase();
      if (['door', 'entrance', 'stairs', 'elevator', 'ramp', 'bridge'].includes(type)) {
        const alreadyExists = preservedSpecialNodes.some(
          pn => Math.hypot(pn.coordinates.x - s.x, pn.coordinates.y - s.y) <= snapTolerancePx
        );
        if (!alreadyExists) {
          preservedSpecialNodes.push({
            id: uuidv4(),
            campusId,
            buildingId,
            floorId,
            type: type as SpatialNodeType,
            coordinates: { x: s.x, y: s.y },
            isAccessible: type === 'staircase' || type === 'stairs' ? false : true,
            label: s.name || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          });
        }
      }
    }

    // Preserve any existing nodes on this floor that are not clustered or special
    const unclusteredExistingNodes = currentFloorExistingNodes.filter(en => {
      if (clusteredNodes.some(cn => cn.id === en.id)) return false;
      if (preservedSpecialNodes.some(pn => pn.id === en.id)) return false;
      if (pathShapes.length > 0 && en.type === 'hallway') {
        const snapped = clusteredNodes.some(cn => Math.hypot(cn.x - en.coordinates.x, cn.y - en.coordinates.y) <= snapTolerancePx);
        if (snapped) return false;
      }
      return true;
    });

    // All active nodes for this floor
    const generatedFloorNodes: SpatialNode[] = [
      ...clusteredNodes.map(cn => ({
        id: cn.id,
        campusId,
        buildingId,
        floorId,
        type: cn.type,
        coordinates: { x: Math.round(cn.x), y: Math.round(cn.y) },
        isAccessible: cn.isAccessible,
        isRestricted: cn.isRestricted,
        label: cn.label,
      })),
      ...preservedSpecialNodes.filter(pn => !clusteredNodes.some(cn => cn.id === pn.id)),
      ...unclusteredExistingNodes,
    ];

    const nodeLookup = new Map<string, SpatialNode>();
    generatedFloorNodes.forEach(n => nodeLookup.set(n.id, n));

    // ── STEP 3: Create Edges Along Walkable Paths ──────────────────────────────
    const generatedConnections: CampusConnection[] = [];
    const edgePairsKey = new Set<string>();

    const getEdgeKey = (src: string, tgt: string) =>
      src < tgt ? `${src}__${tgt}` : `${tgt}__${src}`;

    let edgesCreatedCount = 0;
    let edgesPreservedCount = 0;

    for (const ps of pathShapes) {
      const pts = ps.points || [ps.x, ps.y, ps.x + (ps.width || 0), ps.y + (ps.height || 0)];
      const numPoints = Math.floor(pts.length / 2);
      const isBidi = ps.attributes?.isBidirectional ?? (ps.attributes?.isOneWay ? false : true);
      const isRestricted = ps.attributes?.isRestricted ?? false;
      const weightMult = ps.attributes?.weightMultiplier ?? 1.0;
      const isAcc = ps.attributes?.isAccessible ?? true;

      for (let i = 0; i < numPoints - 1; i++) {
        const v1 = { x: pts[i * 2], y: pts[i * 2 + 1] };
        const v2 = { x: pts[(i + 1) * 2], y: pts[(i + 1) * 2 + 1] };

        // Find clustered node for v1 and v2
        const n1 = clusteredNodes.find(cn => Math.hypot(cn.x - v1.x, cn.y - v1.y) <= snapTolerancePx);
        const n2 = clusteredNodes.find(cn => Math.hypot(cn.x - v2.x, cn.y - v2.y) <= snapTolerancePx);

        if (n1 && n2 && n1.id !== n2.id) {
          const pairKey = getEdgeKey(n1.id, n2.id);
          if (!edgePairsKey.has(pairKey)) {
            edgePairsKey.add(pairKey);

            // Check if existing connection exists to preserve metadata
            let existingConn: CampusConnection | undefined;
            if (preserveMeta) {
              existingConn = currentFloorExistingConnections.find(
                ec =>
                  (ec.sourceNodeId === n1.id && ec.targetNodeId === n2.id) ||
                  (ec.isBidirectional && ec.sourceNodeId === n2.id && ec.targetNodeId === n1.id)
              );
            }

            const dist = calculateDistanceMeters(n1.x, n1.y, n2.x, n2.y, calibration);
            const now = new Date().toISOString();

            if (existingConn) {
              generatedConnections.push({
                ...existingConn,
                distanceMeters: existingConn.distanceMeters || dist,
                isWalkable: true,
                updatedAt: now,
              });
              edgesPreservedCount++;
            } else {
              generatedConnections.push({
                id: uuidv4(),
                campusId,
                sourceNodeId: n1.id,
                sourceBuildingId: buildingId,
                sourceFloorId: floorId,
                targetNodeId: n2.id,
                targetBuildingId: buildingId,
                targetFloorId: floorId,
                connectionType: 'corridor',
                name: ps.name ? `${ps.name} Segment` : 'Corridor Path',
                isBidirectional: isBidi,
                isAccessible: isAcc,
                isWalkable: true,
                isVehicleAccessible: false,
                isRestricted,
                distanceMeters: dist,
                weightMultiplier: weightMult,
                createdAt: now,
                updatedAt: now,
              });
              edgesCreatedCount++;
            }
          }
        }
      }
    }

    // ── STEP 4: Link Doors & Entrances to Nearby Walkable Paths ─────────────────
    const doorNodes = generatedFloorNodes.filter(n => n.type === 'door' || n.type === 'entrance');
    const corridorNodes = generatedFloorNodes.filter(n => n.type === 'hallway' || n.type === 'outdoor_waypoint');

    for (const door of doorNodes) {
      // Check if door already has connected edges
      const hasConnection =
        generatedConnections.some(c => c.sourceNodeId === door.id || c.targetNodeId === door.id) ||
        currentFloorExistingConnections.some(c => c.sourceNodeId === door.id || c.targetNodeId === door.id);

      if (!hasConnection && corridorNodes.length > 0) {
        // Find nearest corridor node within doorSnapToleranceM
        let closestNode: SpatialNode | null = null;
        let minDist = Infinity;

        for (const cn of corridorNodes) {
          const distM = calculateDistanceMeters(
            door.coordinates.x,
            door.coordinates.y,
            cn.coordinates.x,
            cn.coordinates.y,
            calibration
          );
          if (distM < minDist && distM <= doorSnapToleranceM) {
            minDist = distM;
            closestNode = cn;
          }
        }

        if (closestNode) {
          const pairKey = getEdgeKey(door.id, closestNode.id);
          if (!edgePairsKey.has(pairKey)) {
            edgePairsKey.add(pairKey);
            const now = new Date().toISOString();
            generatedConnections.push({
              id: uuidv4(),
              campusId,
              sourceNodeId: door.id,
              sourceBuildingId: buildingId,
              sourceFloorId: floorId,
              targetNodeId: closestNode.id,
              targetBuildingId: buildingId,
              targetFloorId: floorId,
              connectionType: 'door',
              name: `Door to ${door.label || 'Corridor'}`,
              isBidirectional: true,
              isAccessible: door.isAccessible,
              isWalkable: true,
              isVehicleAccessible: false,
              distanceMeters: minDist,
              weightMultiplier: 1.0,
              createdAt: now,
              updatedAt: now,
            });
            edgesCreatedCount++;
          }
        } else {
          // Check projection onto corridor segments
          let bestSegment: { conn: CampusConnection; projX: number; projY: number; distM: number } | null = null;
          let minSegDistM = Infinity;

          for (const conn of [...generatedConnections, ...currentFloorExistingConnections].filter(c => c.connectionType === 'corridor')) {
            const sn = nodeLookup.get(conn.sourceNodeId);
            const tn = nodeLookup.get(conn.targetNodeId);
            if (!sn || !tn) continue;

            const dx = tn.coordinates.x - sn.coordinates.x;
            const dy = tn.coordinates.y - sn.coordinates.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) continue;

            const t = Math.max(0, Math.min(1, ((door.coordinates.x - sn.coordinates.x) * dx + (door.coordinates.y - sn.coordinates.y) * dy) / lenSq));
            const projX = Math.round(sn.coordinates.x + t * dx);
            const projY = Math.round(sn.coordinates.y + t * dy);
            const distM = calculateDistanceMeters(door.coordinates.x, door.coordinates.y, projX, projY, calibration);

            if (distM < minSegDistM && distM <= doorSnapToleranceM) {
              minSegDistM = distM;
              bestSegment = { conn, projX, projY, distM };
            }
          }

          if (bestSegment) {
            const now = new Date().toISOString();
            // Create junction node at projection point
            const junctionNode: SpatialNode = {
              id: uuidv4(),
              campusId,
              buildingId,
              floorId,
              type: 'hallway',
              coordinates: { x: bestSegment.projX, y: bestSegment.projY },
              isAccessible: true,
              label: `Corridor Junction for ${door.label || 'Door'}`,
            };
            generatedFloorNodes.push(junctionNode);
            nodeLookup.set(junctionNode.id, junctionNode);

            // Split the corridor connection into two segments
            const oldConn = bestSegment.conn;
            const sn = nodeLookup.get(oldConn.sourceNodeId);
            const tn = nodeLookup.get(oldConn.targetNodeId);
            if (sn && tn) {
              const dist1 = calculateDistanceMeters(sn.coordinates.x, sn.coordinates.y, junctionNode.coordinates.x, junctionNode.coordinates.y, calibration);
              const dist2 = calculateDistanceMeters(junctionNode.coordinates.x, junctionNode.coordinates.y, tn.coordinates.x, tn.coordinates.y, calibration);

              const idx = generatedConnections.indexOf(oldConn);
              if (idx !== -1) {
                generatedConnections.splice(idx, 1);
              }
              generatedConnections.push({
                ...oldConn,
                id: uuidv4(),
                targetNodeId: junctionNode.id,
                distanceMeters: dist1,
                updatedAt: now,
              });
              generatedConnections.push({
                ...oldConn,
                id: uuidv4(),
                sourceNodeId: junctionNode.id,
                distanceMeters: dist2,
                updatedAt: now,
              });

              // Connect door to junctionNode
              const pairKey = getEdgeKey(door.id, junctionNode.id);
              edgePairsKey.add(pairKey);
              generatedConnections.push({
                id: uuidv4(),
                campusId,
                sourceNodeId: door.id,
                sourceBuildingId: buildingId,
                sourceFloorId: floorId,
                targetNodeId: junctionNode.id,
                targetBuildingId: buildingId,
                targetFloorId: floorId,
                connectionType: 'door',
                name: `Door to Corridor (${door.label || 'Door'})`,
                isBidirectional: true,
                isAccessible: door.isAccessible,
                isWalkable: true,
                isVehicleAccessible: false,
                distanceMeters: bestSegment.distM,
                weightMultiplier: 1.0,
                createdAt: now,
                updatedAt: now,
              });
              edgesCreatedCount++;
            }
          }
        }
      }
    }

    // ── STEP 5: Connect Connectors (Stairs, Elevators, Ramps, Bridges) to Floor ───
    const connectorNodes = generatedFloorNodes.filter(n =>
      ['stairs', 'elevator', 'ramp', 'bridge'].includes(n.type)
    );

    for (const connNode of connectorNodes) {
      const isConnectedOnFloor = generatedConnections.some(
        c => c.sourceNodeId === connNode.id || c.targetNodeId === connNode.id
      );
      if (!isConnectedOnFloor && corridorNodes.length > 0) {
        let closestNode: SpatialNode | null = null;
        let minDist = Infinity;

        for (const cn of corridorNodes) {
          const distM = calculateDistanceMeters(
            connNode.coordinates.x,
            connNode.coordinates.y,
            cn.coordinates.x,
            cn.coordinates.y,
            calibration
          );
          if (distM < minDist && distM <= doorSnapToleranceM * 1.5) {
            minDist = distM;
            closestNode = cn;
          }
        }

        if (closestNode) {
          const pairKey = getEdgeKey(connNode.id, closestNode.id);
          if (!edgePairsKey.has(pairKey)) {
            edgePairsKey.add(pairKey);
            const now = new Date().toISOString();
            generatedConnections.push({
              id: uuidv4(),
              campusId,
              sourceNodeId: connNode.id,
              sourceBuildingId: buildingId,
              sourceFloorId: floorId,
              targetNodeId: closestNode.id,
              targetBuildingId: buildingId,
              targetFloorId: floorId,
              connectionType: 'corridor',
              name: `Approach to ${connNode.label || connNode.type}`,
              isBidirectional: true,
              isAccessible: connNode.isAccessible,
              isWalkable: true,
              isVehicleAccessible: false,
              distanceMeters: minDist,
              weightMultiplier: 1.0,
              createdAt: now,
              updatedAt: now,
            });
            edgesCreatedCount++;
          }
        }
      }
    }

    // ── STEP 6: Inter-floor Transitions (Stairs / Elevators) ────────────────────
    let interFloorTransitionsCount = 0;
    // Retain existing inter-floor transitions
    for (const ec of currentFloorExistingConnections) {
      if (ec.sourceFloorId && ec.targetFloorId && ec.sourceFloorId !== ec.targetFloorId) {
        if (!generatedConnections.some(c => c.id === ec.id)) {
          generatedConnections.push(ec);
          interFloorTransitionsCount++;
        }
      }
    }

    // Auto-connect vertical shafts if enabled
    if (options.autoConnectFloorTransitions && buildingId) {
      const allBuildingNodes = [...otherFloorNodes, ...generatedFloorNodes].filter(
        n => n.buildingId === buildingId
      );
      const verticalTypes: SpatialNodeType[] = ['elevator', 'stairs', 'ramp'];

      for (const fn of connectorNodes.filter(n => verticalTypes.includes(n.type))) {
        // Look for matching node on other floors at same (x, y) location (within 1.5m)
        const matchesOnOtherFloors = allBuildingNodes.filter(
          on =>
            on.id !== fn.id &&
            on.floorId !== fn.floorId &&
            on.type === fn.type &&
            Math.hypot(on.coordinates.x - fn.coordinates.x, on.coordinates.y - fn.coordinates.y) <= snapTolerancePx * 2
        );

        for (const matchNode of matchesOnOtherFloors) {
          const hasExistingVertical = [
            ...generatedConnections,
            ...otherFloorConnections,
          ].some(
            c =>
              (c.sourceNodeId === fn.id && c.targetNodeId === matchNode.id) ||
              (c.sourceNodeId === matchNode.id && c.targetNodeId === fn.id)
          );

          if (!hasExistingVertical) {
            const now = new Date().toISOString();
            const connType: ConnectionType =
              fn.type === 'elevator' ? 'elevator' : fn.type === 'stairs' ? 'staircase' : 'ramp';
            const isAccessible = fn.type === 'elevator' || fn.type === 'ramp';
            const weightMult = fn.type === 'stairs' ? 2.0 : fn.type === 'elevator' ? 1.2 : 1.5;

            generatedConnections.push({
              id: uuidv4(),
              campusId,
              sourceNodeId: fn.id,
              sourceBuildingId: fn.buildingId,
              sourceFloorId: fn.floorId,
              targetNodeId: matchNode.id,
              targetBuildingId: matchNode.buildingId,
              targetFloorId: matchNode.floorId,
              connectionType: connType,
              name: `${fn.type === 'elevator' ? 'Elevator Shaft' : 'Staircase'} (${fn.floorId} ↔ ${matchNode.floorId})`,
              isBidirectional: true,
              isAccessible,
              isWalkable: true,
              isVehicleAccessible: false,
              distanceMeters: 4.0, // standard floor height
              weightMultiplier: weightMult,
              createdAt: now,
              updatedAt: now,
            });
            interFloorTransitionsCount++;
          }
        }
      }
    }

    // ── STEP 7: Associate Rooms with Valid Entrances ───────────────────────────
    const updatedObjects: MapObject[] = [];
    let roomsAssociatedCount = 0;

    const roomShapes = shapes.filter(
      s => s.geometryType === 'polygon' || s.geometryType === 'circle' || s.geometryType === 'ellipse' || s.width
    );

    for (const obj of objects) {
      if (floorId && obj.floorId !== floorId) {
        updatedObjects.push(obj);
        continue;
      }

      const matchingShape = roomShapes.find(s => s.objectId === obj.id || s.name === obj.code || s.name === obj.name?.en);
      let primaryDoorId = obj.associatedNodeId || matchingShape?.attributes?.associatedNodeId || '';
      let allEntranceIds: string[] = obj.entranceNodeIds || matchingShape?.attributes?.entranceNodeIds || [];

      if (autoAssociate && matchingShape) {
        // Room perimeter / bounds
        const rx = matchingShape.x;
        const ry = matchingShape.y;
        const rw = matchingShape.width || 40;
        const rh = matchingShape.height || 40;
        const roomTolerancePx = 2.5 * pxPerM; // 2.5 meters search radius around room perimeter

        // Find all door nodes touching or within perimeter tolerance of room
        const nearbyDoors = doorNodes.filter(dn => {
          const dx = dn.coordinates.x;
          const dy = dn.coordinates.y;
          const nearX = dx >= rx - roomTolerancePx && dx <= rx + rw + roomTolerancePx;
          const nearY = dy >= ry - roomTolerancePx && dy <= ry + rh + roomTolerancePx;
          return nearX && nearY;
        });

        if (nearbyDoors.length > 0) {
          const doorIds = nearbyDoors.map(d => d.id);
          if (!primaryDoorId || !doorLookup(nodeLookup, primaryDoorId)) {
            primaryDoorId = doorIds[0];
          }
          allEntranceIds = Array.from(new Set([...allEntranceIds, ...doorIds]));
        }
      }

      // Check if primary door exists in graph
      if (primaryDoorId && !doorLookup(nodeLookup, primaryDoorId)) {
        // Fallback to first valid entrance if available
        const validEntrance = allEntranceIds.find(id => doorLookup(nodeLookup, id));
        primaryDoorId = validEntrance || '';
      }

      if (primaryDoorId || allEntranceIds.length > 0) {
        roomsAssociatedCount++;
      }

      updatedObjects.push({
        ...obj,
        associatedNodeId: primaryDoorId,
        entranceNodeIds: allEntranceIds.length > 0 ? allEntranceIds : (primaryDoorId ? [primaryDoorId] : []),
      });
    }

    // ── STEP 8: Cleanup Duplicate & Dangling Edges ──────────────────────────────
    const allFinalNodes = [...otherFloorNodes, ...generatedFloorNodes];
    const finalNodeMap = new Set(allFinalNodes.map(n => n.id));

    // Existing connections on the current floor that were not replaced or regenerated
    const candidateExistingConnections = currentFloorExistingConnections.filter(ec => {
      const isReplaced = generatedConnections.some(gc =>
        (gc.sourceNodeId === ec.sourceNodeId && gc.targetNodeId === ec.targetNodeId) ||
        (gc.sourceNodeId === ec.targetNodeId && gc.targetNodeId === ec.sourceNodeId)
      );
      return !isReplaced;
    });

    const allFinalConnectionsCandidate = [
      ...otherFloorConnections,
      ...generatedConnections,
      ...candidateExistingConnections,
    ];
    const cleanedConnections: CampusConnection[] = [];
    const seenEdges = new Set<string>();

    let duplicateEdgesRemovedCount = 0;
    let danglingEdgesRemovedCount = 0;

    for (const c of allFinalConnectionsCandidate) {
      // Check dangling
      if (!finalNodeMap.has(c.sourceNodeId) || !finalNodeMap.has(c.targetNodeId)) {
        danglingEdgesRemovedCount++;
        continue;
      }
      if (c.sourceNodeId === c.targetNodeId) {
        danglingEdgesRemovedCount++;
        continue;
      }

      // Check duplicates
      const edgeKey = c.isBidirectional
        ? getEdgeKey(c.sourceNodeId, c.targetNodeId)
        : `${c.sourceNodeId}-->${c.targetNodeId}`;

      if (seenEdges.has(edgeKey)) {
        duplicateEdgesRemovedCount++;
        continue;
      }

      seenEdges.add(edgeKey);
      cleanedConnections.push(c);
    }

    return {
      nodes: allFinalNodes,
      connections: cleanedConnections,
      updatedObjects,
      stats: {
        corridorNodesCount: clusteredNodes.length,
        doorNodesCount: doorNodes.length,
        connectorNodesCount: connectorNodes.length,
        edgesCreatedCount,
        edgesPreservedCount,
        roomsAssociatedCount,
        interFloorTransitionsCount,
        duplicateEdgesRemovedCount,
        danglingEdgesRemovedCount,
      },
    };
  }
}

function doorLookup(map: Map<string, SpatialNode>, id: string): boolean {
  return map.has(id);
}
