import React, { createContext, useContext, useState, useEffect } from 'react';
import { Campus, Building, Floor, SupportedLanguage } from '../types';
import { campusService } from '../api/campus.service';
import { env } from '../config/env';

interface AppContextType {
  campuses: Campus[];
  activeCampus: Campus | null;
  buildings: Building[];
  activeBuilding: Building | null;
  floors: Floor[];
  activeFloor: Floor | null;
  language: SupportedLanguage;
  isLoading: boolean;
  error: string | null;
  setLanguage: (lang: SupportedLanguage) => void;
  selectCampus: (campusId: string) => Promise<void>;
  selectBuilding: (buildingId: string) => Promise<void>;
  selectFloor: (floorId: string) => Promise<void>;
  refreshCampusData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [activeCampus, setActiveCampus] = useState<Campus | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [activeFloor, setActiveFloor] = useState<Floor | null>(null);
  const [language, setLanguageState] = useState<SupportedLanguage>(env.defaultLanguage as SupportedLanguage);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await campusService.getCampuses();
      setCampuses(res.data);

      if (res.data.length > 0) {
        const defaultC = res.data.find((c: Campus) => c.id === env.defaultCampusId) || res.data[0];
        setActiveCampus(defaultC);

        // Fetch buildings for default campus
        const bldRes = await campusService.getBuildingsByCampus(defaultC.id);
        setBuildings(bldRes.data);
        if (bldRes.data.length > 0) {
          const firstBld = bldRes.data[0];
          setActiveBuilding(firstBld);

          const flRes = await campusService.getFloorsByBuilding(firstBld.id);
          setFloors(flRes.data);
          if (flRes.data.length > 0) {
            setActiveFloor(flRes.data[0]);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize application.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const selectCampus = async (campusId: string) => {
    setIsLoading(true);
    try {
      const target = campuses.find((c) => c.id === campusId);
      if (target) {
        setActiveCampus(target);
        const bldRes = await campusService.getBuildingsByCampus(target.id);
        setBuildings(bldRes.data);
        if (bldRes.data.length > 0) {
          const firstBld = bldRes.data[0];
          setActiveBuilding(firstBld);
          const flRes = await campusService.getFloorsByBuilding(firstBld.id);
          setFloors(flRes.data);
          setActiveFloor(flRes.data.length > 0 ? flRes.data[0] : null);
        } else {
          setActiveBuilding(null);
          setFloors([]);
          setActiveFloor(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error switching campus');
    } finally {
      setIsLoading(false);
    }
  };

  const selectBuilding = async (buildingId: string) => {
    const target = buildings.find((b) => b.id === buildingId);
    if (target) {
      setActiveBuilding(target);
      const flRes = await campusService.getFloorsByBuilding(target.id);
      setFloors(flRes.data);
      setActiveFloor(flRes.data.length > 0 ? flRes.data[0] : null);
    }
  };

  const selectFloor = async (floorId: string) => {
    const target = floors.find((f) => f.id === floorId);
    if (target) {
      setActiveFloor(target);
    }
  };

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
  };

  const refreshCampusData = async () => {
    if (activeCampus) {
      await selectCampus(activeCampus.id);
    } else {
      await loadInitialData();
    }
  };

  return (
    <AppContext.Provider
      value={{
        campuses,
        activeCampus,
        buildings,
        activeBuilding,
        floors,
        activeFloor,
        language,
        isLoading,
        error,
        setLanguage,
        selectCampus,
        selectBuilding,
        selectFloor,
        refreshCampusData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
