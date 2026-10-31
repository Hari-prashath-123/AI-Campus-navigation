import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campusService } from '../api/campus.service';
import { Campus, Building, Floor } from '../types';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { MapEditor } from '../components/map-editor/MapEditor';
import { Button } from '../components/ui/Button';
import { Box, ShieldAlert } from 'lucide-react';

export const FloorDetail: React.FC = () => {
  const { campusId, buildingId, floorId } = useParams<{
    campusId: string; buildingId: string; floorId: string;
  }>();

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
        campusService.getFloorById(fId),
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
        { label: `L${floor.level} – ${floor.name.en}` },
      ]} />

      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h1 className="text-lg font-outfit font-bold text-slate-900 tracking-tight">
            {floor.name.en} — Map Editor
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            ID: {floor.id} · {floor.dimensions.widthMeters}m × {floor.dimensions.heightMeters}m
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/admin/campuses/${campusId}/buildings/${buildingId}/floors/${floorId}/objects`}>
            <Button variant="outline" size="sm" icon={<Box size={14} />}>Objects</Button>
          </Link>
          <Link to={`/admin/campuses/${campusId}/access`}>
            <Button variant="outline" size="sm" icon={<ShieldAlert size={14} />}>Access Rules</Button>
          </Link>
          <span className="text-sm text-slate-400 ml-2">
            {campus.name.en} › {building.name.en} › Level {floor.level}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/*
          MapEditor receives the active campus/building/floor context so it knows
          which objects to load and where to persist changes.
        */}
        <MapEditor
          campusId={campusId}
          buildingId={buildingId}
          floorId={floorId}
        />
      </div>
    </div>
  );
};
