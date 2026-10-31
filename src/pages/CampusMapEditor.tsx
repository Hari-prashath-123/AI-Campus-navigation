import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { campusService } from '../api/campus.service';
import { Campus } from '../types';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { MapEditor } from '../components/map-editor/MapEditor';

export const CampusMapEditor: React.FC = () => {
  const { campusId } = useParams<{ campusId: string }>();

  const [campus, setCampus] = useState<Campus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campusId) {
      loadData(campusId);
    }
  }, [campusId]);

  const loadData = async (cId: string) => {
    try {
      setLoading(true);
      const res = await campusService.getCampusById(cId);

      if (res.success && res.data) setCampus(res.data);
      else setError('Campus not found.');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState text="Loading campus editor..." />;
  if (error || !campus) return <ErrorState title="Error" message={error || 'Not found'} />;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-hidden relative">
        <MapEditor key={campus.id} campus={campus} campusId={campus.id} />
      </div>
    </div>
  );
};
