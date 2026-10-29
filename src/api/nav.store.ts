import { SpatialNode, CampusConnection } from '../types/connection';
import { INITIAL_NODES } from './mock-data';
import { v4 as uuidv4 } from 'uuid';

const LS_NODES       = 'omnicampus_nodes';
const LS_CONNECTIONS = 'omnicampus_connections';

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {}
  return fallback;
}

function save<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

let nodes: SpatialNode[] = load<SpatialNode>(LS_NODES, INITIAL_NODES);
let connections: CampusConnection[] = load<CampusConnection>(LS_CONNECTIONS, []);

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach(fn => fn()); }

export const navStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getNodes():       SpatialNode[]       { return nodes; },
  getConnections(): CampusConnection[] { return connections; },

  getNodesByCampus(campusId: string): SpatialNode[] {
    return nodes.filter(n => n.campusId === campusId);
  },
  getNodesByFloor(floorId: string): SpatialNode[] {
    return nodes.filter(n => n.floorId === floorId);
  },
  getNodesByBuilding(buildingId: string): SpatialNode[] {
    return nodes.filter(n => n.buildingId === buildingId);
  },
  getNodeById(id: string): SpatialNode | undefined {
    return nodes.find(n => n.id === id);
  },

  createNode(data: Omit<SpatialNode, 'id'>): SpatialNode {
    const node: SpatialNode = { id: uuidv4(), ...data };
    nodes = [...nodes, node];
    save(LS_NODES, nodes);
    notify();
    return node;
  },

  updateNode(id: string, patch: Partial<Omit<SpatialNode, 'id'>>): SpatialNode | null {
    const idx = nodes.findIndex(n => n.id === id);
    if (idx === -1) return null;
    const updated = { ...nodes[idx], ...patch };
    nodes = nodes.map(n => n.id === id ? updated : n);
    save(LS_NODES, nodes);
    notify();
    return updated;
  },

  deleteNode(id: string): boolean {
    if (!nodes.some(n => n.id === id)) return false;
    nodes = nodes.filter(n => n.id !== id);
    connections = connections.filter(c => c.sourceNodeId !== id && c.targetNodeId !== id);
    save(LS_NODES, nodes);
    save(LS_CONNECTIONS, connections);
    notify();
    return true;
  },

  getConnectionsByCampus(campusId: string): CampusConnection[] {
    return connections.filter(c => c.campusId === campusId);
  },
  getConnectionsByFloor(floorId: string): CampusConnection[] {
    return connections.filter(c => c.sourceFloorId === floorId || c.targetFloorId === floorId);
  },
  getConnectionsByNode(nodeId: string): CampusConnection[] {
    return connections.filter(c => c.sourceNodeId === nodeId || c.targetNodeId === nodeId);
  },
  getConnectionById(id: string): CampusConnection | undefined {
    return connections.find(c => c.id === id);
  },

  createConnection(data: Omit<CampusConnection, 'id' | 'createdAt' | 'updatedAt'>): CampusConnection | { error: string } {
    if (data.sourceNodeId === data.targetNodeId) return { error: 'Source and target node cannot be the same.' };
    const now = new Date().toISOString();
    const conn: CampusConnection = { id: uuidv4(), ...data, createdAt: now, updatedAt: now };
    connections = [...connections, conn];
    save(LS_CONNECTIONS, connections);
    notify();
    return conn;
  },

  updateConnection(id: string, patch: Partial<Omit<CampusConnection, 'id' | 'createdAt'>>): CampusConnection | null {
    const idx = connections.findIndex(c => c.id === id);
    if (idx === -1) return null;
    if (patch.sourceNodeId && patch.targetNodeId && patch.sourceNodeId === patch.targetNodeId) return null;
    const updated = { ...connections[idx], ...patch, updatedAt: new Date().toISOString() };
    connections = connections.map(c => c.id === id ? updated : c);
    save(LS_CONNECTIONS, connections);
    notify();
    return updated;
  },

  deleteConnection(id: string): boolean {
    if (!connections.some(c => c.id === id)) return false;
    connections = connections.filter(c => c.id !== id);
    save(LS_CONNECTIONS, connections);
    notify();
    return true;
  },

  deleteByFloor(floorId: string): void {
    const floorNodeIds = new Set(nodes.filter(n => n.floorId === floorId).map(n => n.id));
    nodes = nodes.filter(n => n.floorId !== floorId);
    connections = connections.filter(c => !floorNodeIds.has(c.sourceNodeId) && !floorNodeIds.has(c.targetNodeId));
    save(LS_NODES, nodes);
    save(LS_CONNECTIONS, connections);
    notify();
  },

  reset(): void {
    nodes = [...INITIAL_NODES];
    connections = [];
    save(LS_NODES, nodes);
    save(LS_CONNECTIONS, connections);
    notify();
  },
};
