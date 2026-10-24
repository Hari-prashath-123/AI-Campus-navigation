import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from './pages/AdminLayout';
import { UserNavigationPage } from './pages/UserNavigationPage';
import { ObjectTypeList } from './pages/ObjectTypeList';
import { ObjectTypeEdit } from './pages/ObjectTypeEdit';
import { MapEditorPage } from './pages/MapEditorPage';
import { CampusList } from './pages/CampusList';
import { CampusDetail } from './pages/CampusDetail';
import { ConnectionManagement } from './pages/ConnectionManagement';
import { BuildingDetail } from './pages/BuildingDetail';
import { FloorDetail } from './pages/FloorDetail';
import { CampusMapEditor } from './pages/CampusMapEditor';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { CampusImportExportPage } from './pages/CampusImportExportPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<UserNavigationPage />} />
      
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<PlaceholderPage title="Dashboard" />} />
        <Route path="dashboard" element={<PlaceholderPage title="Dashboard" />} />
        <Route path="assets" element={<PlaceholderPage title="Asset Management" />} />
        <Route path="access" element={<PlaceholderPage title="Access Control" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
        
        <Route path="object-types" element={<ObjectTypeList />} />
        <Route path="object-types/new" element={<ObjectTypeEdit />} />
        <Route path="object-types/:id" element={<ObjectTypeEdit />} />
        <Route path="map" element={<MapEditorPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="campuses" element={<CampusList />} />
        <Route path="campuses/:campusId" element={<CampusDetail />} />
        <Route path="campuses/:campusId/connections" element={<ConnectionManagement />} />
        <Route path="campuses/:campusId/map" element={<CampusMapEditor />} />
        <Route path="campuses/:campusId/import-export" element={<CampusImportExportPage />} />
        <Route path="campuses/:campusId/buildings/:buildingId" element={<BuildingDetail />} />
        <Route path="campuses/:campusId/buildings/:buildingId/floors/:floorId" element={<FloorDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
