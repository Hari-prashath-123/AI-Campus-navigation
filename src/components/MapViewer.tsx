import React, { useEffect, useRef } from 'react';
import { MapObject, SpatialNode } from '../types';

interface MapViewerProps {
  objects: MapObject[];
  nodes: SpatialNode[];
  routeResult?: any | null;
  currentFloorId?: string;
  width?: number;
  height?: number;
  onObjectClick?: (obj: MapObject) => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({ 
  objects, 
  nodes, 
  routeResult, 
  currentFloorId, 
  width = 800, 
  height = 600,
  onObjectClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background (Grid)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Filter objects & nodes for the current floor
    const floorObjects = objects.filter(o => o.floorId === currentFloorId);
    const floorNodes = nodes.filter(n => n.floorId === currentFloorId);

    // Draw objects
    floorObjects.forEach(obj => {
      // Scale coordinates (assuming they are percentages for now, or raw if we adapt it. Let's assume % for 800x600 for a moment, or direct pixel mapping if it's 0-100)
      // If coordinates are 0-100 (percentage), then scale by width/height.
      const px = (obj.coordinates.x / 100) * width;
      const py = (obj.coordinates.y / 100) * height;

      ctx.fillStyle = obj.category === 'accessible_restroom' ? '#dbeafe' : 
                      obj.category === 'lab' ? '#fef3c7' : 
                      obj.category === 'landmark' ? '#fce7f3' : '#e0e7ff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;

      ctx.beginPath();
      // Draw as simple rectangle/circle
      ctx.arc(px, py, 15, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      const label = typeof obj.name === 'string' ? obj.name : (obj.name.en || 'Unknown');
      ctx.fillText(label, px, py + 25);
    });

    // Draw nodes
    floorNodes.forEach(node => {
      const px = (node.coordinates.x / 100) * width;
      const py = (node.coordinates.y / 100) * height;

      ctx.fillStyle = node.type === 'door' ? '#fbbf24' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Route
    if (routeResult && routeResult.nodes) {
      // Map string IDs to full SpatialNode objects
      const fullPathNodes = routeResult.nodes.map((id: string) => nodes.find(n => n.id === id)).filter(Boolean) as SpatialNode[];
      
      const pathNodesOnFloor = fullPathNodes.filter(n => n.floorId === currentFloorId);
      
      if (pathNodesOnFloor.length > 0) {
        ctx.strokeStyle = '#3b82f6'; // Blue route
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();

        let started = false;
        
        for (let i = 0; i < fullPathNodes.length; i++) {
          const node = fullPathNodes[i];
          if (node.floorId === currentFloorId) {
            const px = (node.coordinates.x / 100) * width;
            const py = (node.coordinates.y / 100) * height;
            
            if (!started) {
              ctx.moveTo(px, py);
              started = true;
            } else {
              const prev = fullPathNodes[i - 1];
              if (prev && prev.floorId === currentFloorId) {
                ctx.lineTo(px, py);
              } else {
                ctx.moveTo(px, py); // Start new segment
              }
            }
          } else {
            started = false; // Break path segment
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [objects, nodes, routeResult, currentFloorId, width, height]);

  // Click handler
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onObjectClick) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pxCoord = (x / width) * 100;
    const pyCoord = (y / height) * 100;

    const floorObjects = objects.filter(o => o.floorId === currentFloorId);
    
    // Find closest object
    for (const obj of floorObjects) {
      const dx = obj.coordinates.x - pxCoord;
      const dy = obj.coordinates.y - pyCoord;
      // if click is within ~5% of coordinates
      if (Math.sqrt(dx * dx + dy * dy) < 5) {
        onObjectClick(obj);
        return;
      }
    }
  };

  return (
    <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        className="block w-full h-auto cursor-pointer"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
};
