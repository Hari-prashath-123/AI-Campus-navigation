import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { campusService } from '../api/campus.service';
import { Campus, Building, Floor } from '../types';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { MapEditor } from '../components/map-editor/MapEditor';

export const FloorDetail: React.FC = () => {
  const { campusId, buildingId, floorId } = useParams<{ campusId: string; buildingId: string; floorId: string }>();

  const [campus, setCampus] = useState<Campus | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [floor, setFloor] = useState<Floor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campusId && buildingId && floorId) {
      loadData(campusId, buildingId, floorId);
    }
  }, [campusId, buildingId, floorId]);

  const loadData = async (cId: string, bId: string, fId: string) => {
    try {
      setLoading(true);
      const [campusRes, buildingRes, floorRes] = await Promise.all([
        campusService.getCampusById(cId),
        campusService.getBuildingById(bId),
        campusService.getFloorById(fId)
      ]);

      if (campusRes.success && campusRes.data) setCampus(campusRes.data);
      else setError('Campus not found.');

      if (buildingRes.success && buildingRes.data) setBuilding(buildingRes.data);
      else setError('Building not found.');

      if (floorRes.success && floorRes.data) setFloor(floorRes.data);
      else setError('Floor not found.');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState text="Loading floor editor..." />;
  if (error || !campus || !building || !floor) return <ErrorState title="Error" message={error || 'Not found'} />;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Breadcrumbs items={[
        { label: 'Campuses', path: '/admin/campuses' },
        { label: campus.name.en || campus.code, path: `/admin/campuses/${campus.id}` },
        { label: building.name.en || building.code, path: `/admin/campuses/${campus.id}/buildings/${building.id}` },
        { label: `L${floor.level} - ${floor.name.en}` }
      ]} />

      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h1 className="text-lg font-outfit font-bold text-slate-900 tracking-tight">
            {floor.name.en} Editor
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            ID: {floor.id} • Dims: {floor.dimensions.widthMeters}m x {floor.dimensions.heightMeters}m
          </p>
        </div>
        <div className="flex gap-2 text-sm text-slate-500">
          <span>Changes are saved to {campus.name.en} &gt; {building.name.en} &gt; Level {floor.level}</span>
        </div>
      </div>
      
      {/* 
        Reusing the MapEditor component. 
        In a real application, we would pass the active floorId/campusId down to the MapEditor 
        so it knows which objects to load and save.
      */}
      <div className="flex-1 overflow-hidden relative">
        <MapEditor />
      </div>
    </div>
  );
};
