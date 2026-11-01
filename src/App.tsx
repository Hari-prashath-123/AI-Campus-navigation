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
import { FloorObjectsPage } from './pages/FloorObjectsPage';
import { CampusMapEditor } from './pages/CampusMapEditor';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { CampusImportExportPage } from './pages/CampusImportExportPage';
import { OrganizationList } from './pages/OrganizationList';
import { AccessControlPage } from './pages/AccessControlPage';
import { DatabaseSettingsPage } from './pages/DatabaseSettingsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<UserNavigationPage />} />
      
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<PlaceholderPage title="Dashboard" />} />
        <Route path="dashboard" element={<PlaceholderPage title="Dashboard" />} />
        <Route path="assets" element={<PlaceholderPage title="Asset Management" />} />
        <Route path="settings" element={<DatabaseSettingsPage />} />

        {/* Organizations */}
        <Route path="organizations" element={<OrganizationList />} />

        {/* Object Types */}
        <Route path="object-types" element={<ObjectTypeList />} />
        <Route path="object-types/new" element={<ObjectTypeEdit />} />
        <Route path="object-types/:id" element={<ObjectTypeEdit />} />

        {/* Map Editor (legacy standalone) */}
        <Route path="map" element={<MapEditorPage />} />

        {/* AI Assistant */}
        <Route path="ai-assistant" element={<AIAssistantPage />} />

        {/* Global Access Control */}
        <Route path="access" element={<AccessControlPage />} />

        {/* Campuses Hierarchy */}
        <Route path="campuses" element={<CampusList />} />
        <Route path="campuses/:campusId" element={<CampusDetail />} />
        <Route path="campuses/:campusId/connections" element={<ConnectionManagement />} />
        <Route path="campuses/:campusId/map" element={<CampusMapEditor />} />
        <Route path="campuses/:campusId/import-export" element={<CampusImportExportPage />} />
        <Route path="campuses/:campusId/access" element={<AccessControlPage />} />

        {/* Buildings */}
        <Route path="campuses/:campusId/buildings/:buildingId" element={<BuildingDetail />} />

        {/* Floors — Map Editor & Object List */}
        <Route path="campuses/:campusId/buildings/:buildingId/floors/:floorId" element={<FloorDetail />} />
        <Route path="campuses/:campusId/buildings/:buildingId/floors/:floorId/objects" element={<FloorObjectsPage />} />
        <Route path="campuses/:campusId/buildings/:buildingId/floors/:floorId/map" element={<FloorDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
