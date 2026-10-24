-- ============================================================
-- Seed: 001_seed_demo_data.sql
-- Purpose:   Minimal generic demo data verifying that two
--            completely independent campuses can coexist.
--            NO real college, hospital, or organization names.
--            All names are fictional and clearly labeled DEMO.
-- ============================================================

-- ---- 1. Organizations ----

INSERT INTO organizations (id, slug, name, description, is_active) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'demo-university-group',
    '{"en": "Demo University Group", "es": "Grupo Universitario Demo", "ta": "டெமோ பல்கலைக்கழக குழு", "hi": "डेमो विश्वविद्यालय समूह"}',
    '{"en": "A fictional multi-campus university group for development and testing."}',
    TRUE
),
(
    'a0000000-0000-0000-0000-000000000002',
    'demo-health-network',
    '{"en": "Demo Healthcare Network", "es": "Red de Salud Demo", "ta": "டெமோ சுகாதார வலையமைப்பு", "hi": "डेमो स्वास्थ्य नेटवर्क"}',
    '{"en": "A fictional hospital network for development and testing."}',
    TRUE
);

-- ---- 2. Campuses ----

INSERT INTO campuses (id, organization_id, slug, code, name, description, coordinate_system, is_active, is_published) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'north-campus',
    'UNI-NORTH',
    '{"en": "North Campus", "es": "Campus Norte", "ta": "வடக்கு வளாகம்", "hi": "उत्तरी परिसर"}',
    '{"en": "Main academic campus with engineering, science, and arts faculties."}',
    'pixel',
    TRUE,
    TRUE
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'south-campus',
    'UNI-SOUTH',
    '{"en": "South Campus", "es": "Campus Sur", "ta": "தெற்கு வளாகம்", "hi": "दक्षिणी परिसर"}',
    '{"en": "Residential and sports campus with dormitories and athletics facilities."}',
    'pixel',
    TRUE,
    TRUE
),
(
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    'main-medical-centre',
    'HEALTH-MAIN',
    '{"en": "Main Medical Centre", "es": "Centro Médico Principal", "ta": "முதன்மை மருத்துவ மையம்", "hi": "मुख्य चिकित्सा केंद्र"}',
    '{"en": "Multi-specialty hospital campus used for healthcare navigation testing."}',
    'pixel',
    TRUE,
    TRUE
);

-- ---- 3. Buildings ----

INSERT INTO buildings (id, campus_id, code, name, total_floors, base_floor_level, is_accessible, is_active) VALUES
-- North Campus buildings
(
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'ENG-BLOCK',
    '{"en": "Engineering Block", "es": "Bloque de Ingeniería", "ta": "பொறியியல் கட்டிடம்", "hi": "इंजीनियरिंग ब्लॉक"}',
    4, 0, TRUE, TRUE
),
(
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'SCI-BLOCK',
    '{"en": "Science & Research Block", "es": "Bloque de Ciencias", "ta": "அறிவியல் கட்டிடம்", "hi": "विज्ञान ब्लॉक"}',
    3, 0, TRUE, TRUE
),
(
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'CENTRAL-LIB',
    '{"en": "Central Library", "es": "Biblioteca Central", "ta": "மத்திய நூலகம்", "hi": "केंद्रीय पुस्तकालय"}',
    3, 0, TRUE, TRUE
),
-- South Campus buildings
(
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'DORM-A',
    '{"en": "Dormitory Block A", "es": "Dormitorio Bloque A", "ta": "தங்குமிட கட்டிடம் A", "hi": "छात्रावास ब्लॉक A"}',
    5, 0, TRUE, TRUE
),
-- Medical Centre buildings
(
    'c0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    'MED-TOWER-A',
    '{"en": "Medical Tower A", "es": "Torre Médica A", "ta": "மருத்துவ கோபுரம் A", "hi": "मेडिकल टॉवर A"}',
    6, -1, TRUE, TRUE
),
(
    'c0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000003',
    'EMERGENCY-WING',
    '{"en": "Emergency Wing", "es": "Ala de Emergencias", "ta": "அவசர பிரிவு", "hi": "आपातकालीन विंग"}',
    2, 0, TRUE, TRUE
);

-- ---- 4. Floors ----

INSERT INTO floors (id, building_id, campus_id, code, name, floor_number, width, height) VALUES
-- Engineering Block floors
('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ENG-G',  '{"en": "Ground Floor — Main Lobby & Robotics Lab"}', 0, 120.0, 80.0),
('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ENG-01', '{"en": "First Floor — AI & Machine Learning Labs"}', 1, 120.0, 80.0),
('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ENG-02', '{"en": "Second Floor — Lecture Halls"}',             2, 120.0, 80.0),
('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ENG-03', '{"en": "Third Floor — Research Offices"}',           3, 120.0, 80.0),
-- Science Block floors
('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'SCI-G',  '{"en": "Ground Floor — Physics & Chemistry Labs"}', 0, 100.0, 70.0),
('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'SCI-01', '{"en": "First Floor — Biology Labs"}',               1, 100.0, 70.0),
-- Medical Tower floors
('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'MED-B1', '{"en": "Basement — Pharmacy & Pathology"}',          -1, 90.0, 65.0),
('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'MED-G',  '{"en": "Ground Floor — Reception & OPD"}',            0, 90.0, 65.0),
('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'MED-01', '{"en": "First Floor — Cardiology Wing"}',             1, 90.0, 65.0);

-- ---- 5. Object Types (System Built-In Types) ----

INSERT INTO object_types (id, slug, name, category, icon_name, default_color, is_navigable, is_barrier, is_connector, is_system, property_schema) VALUES
('e0000000-0000-0000-0000-000000000001', 'classroom',
    '{"en":"Classroom","es":"Aula","ta":"வகுப்பறை","hi":"कक्षा"}',
    'room', 'BookOpen', '#3b82f6', TRUE, FALSE, FALSE, TRUE,
    '{"type":"object","properties":{"capacity":{"type":"integer","minimum":1},"hasProjector":{"type":"boolean"},"hasWhiteboard":{"type":"boolean"},"occupantName":{"type":"string"},"phoneExtension":{"type":"string"}}}'),

('e0000000-0000-0000-0000-000000000002', 'lab',
    '{"en":"Laboratory","es":"Laboratorio","ta":"ஆய்வகம்","hi":"प्रयोगशाला"}',
    'room', 'FlaskConical', '#06b6d4', TRUE, FALSE, FALSE, TRUE,
    '{"type":"object","properties":{"capacity":{"type":"integer"},"labType":{"type":"string"},"safetyLevel":{"type":"string","enum":["standard","biosafety-2","chemical","high-voltage"]},"occupantName":{"type":"string"}}}'),

('e0000000-0000-0000-0000-000000000003', 'office',
    '{"en":"Office","es":"Oficina","ta":"அலுவலகம்","hi":"कार्यालय"}',
    'room', 'Briefcase', '#64748b', TRUE, FALSE, FALSE, TRUE,
    '{"type":"object","properties":{"occupantName":{"type":"string"},"designation":{"type":"string"},"phoneExtension":{"type":"string"},"isPublicFacing":{"type":"boolean"}}}'),

('e0000000-0000-0000-0000-000000000004', 'auditorium',
    '{"en":"Auditorium","es":"Auditorio","ta":"அரங்கம்","hi":"सभागार"}',
    'room', 'Volume2', '#8b5cf6', TRUE, FALSE, FALSE, TRUE,
    '{"type":"object","properties":{"capacity":{"type":"integer"},"hasAVSystem":{"type":"boolean"},"phoneExtension":{"type":"string"}}}'),

('e0000000-0000-0000-0000-000000000005', 'restroom',
    '{"en":"Restroom","es":"Baño","ta":"கழிப்பறை","hi":"शौचालय"}',
    'amenity', 'Toilet', '#10b981', TRUE, FALSE, FALSE, TRUE,
    '{"type":"object","properties":{"gender":{"type":"string","enum":["male","female","all","accessible"]},"isAccessible":{"type":"boolean"}}}'),

('e0000000-0000-0000-0000-000000000006', 'cafeteria',
    '{"en":"Cafeteria","es":"Cafetería","ta":"உணவகம்","hi":"कैफेटेरिया"}',
    'amenity', 'Utensils', '#f97316', TRUE, FALSE, FALSE, TRUE,
    '{"type":"object","properties":{"seatingCapacity":{"type":"integer"},"operatingHours":{"type":"string"},"cuisineTypes":{"type":"array","items":{"type":"string"}}}}'),

('e0000000-0000-0000-0000-000000000007', 'elevator',
    '{"en":"Elevator","es":"Ascensor","ta":"மின் தூக்கி","hi":"लिफ्ट"}',
    'transit', 'ArrowUpDown', '#f59e0b', TRUE, FALSE, TRUE, TRUE,
    '{"type":"object","properties":{"loadKg":{"type":"integer"},"servicesFloors":{"type":"array","items":{"type":"integer"}},"isAccessible":{"type":"boolean"}}}'),

('e0000000-0000-0000-0000-000000000008', 'stairs',
    '{"en":"Staircase","es":"Escalera","ta":"படிக்கட்டுகள்","hi":"सीढ़ियाँ"}',
    'transit', 'MoveUp', '#eab308', TRUE, FALSE, TRUE, TRUE,
    '{"type":"object","properties":{"servicesFloors":{"type":"array","items":{"type":"integer"}}}}'),

('e0000000-0000-0000-0000-000000000009', 'entrance',
    '{"en":"Main Entrance","es":"Entrada Principal","ta":"முதன்மை நுழைவாயில்","hi":"मुख्य प्रवेश"}',
    'entrance', 'DoorOpen', '#22c55e', TRUE, FALSE, FALSE, TRUE,
    '{"type":"object","properties":{"hasRamp":{"type":"boolean"},"isAutomatic":{"type":"boolean"},"operatingHours":{"type":"string"}}}'),

('e0000000-0000-0000-0000-000000000010', 'emergency_exit',
    '{"en":"Emergency Exit","es":"Salida de Emergencia","ta":"அவசர வெளியேற்றம்","hi":"आपातकालीन निकास"}',
    'entrance', 'AlertTriangle', '#ef4444', TRUE, FALSE, FALSE, TRUE,
    '{"type":"object","properties":{"hasAlarm":{"type":"boolean"}}}'),

('e0000000-0000-0000-0000-000000000011', 'waypoint',
    '{"en":"Navigation Waypoint","es":"Punto de Ruta","ta":"வழிச் சோடி","hi":"नेविगेशन वेपॉइंट"}',
    'virtual', 'Circle', '#475569', FALSE, FALSE, FALSE, TRUE,
    '{}');

-- ---- 6. Objects (Sample — generic no real identifiers) ----

-- Engineering Block Ground Floor objects
INSERT INTO objects (id, campus_id, building_id, floor_id, object_type_id, code, name, geometry_type, status, is_accessible, properties) VALUES
('f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000009', 'ENG-ENT-01',
    '{"en":"Engineering Block Main Entrance","es":"Entrada Principal del Bloque","ta":"முதன்மை நுழைவு","hi":"मुख्य प्रवेश"}',
    'point', 'active', TRUE,
    '{"hasRamp": true, "isAutomatic": true, "operatingHours": "07:00-22:00"}'),

('f0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000002', 'ROOM-G101',
    '{"en":"Robotics Lab G101","es":"Laboratorio de Robótica G101","ta":"ரோபோடிக்ஸ் ஆய்வகம் G101","hi":"रोबोटिक्स लैब G101"}',
    'point', 'active', TRUE,
    '{"capacity": 30, "labType": "robotics", "safetyLevel": "standard", "occupantName": "Demo Lab Staff"}'),

('f0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000007', 'ENG-ELEV-01',
    '{"en":"Engineering Block Elevator A","es":"Ascensor A","ta":"மின் தூக்கி A","hi":"लिफ्ट A"}',
    'point', 'active', TRUE,
    '{"loadKg": 630, "servicesFloors": [0, 1, 2, 3], "isAccessible": true}'),

('f0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000008', 'ENG-STAIR-A',
    '{"en":"Staircase A (Floors 0-3)","es":"Escalera A","ta":"படிக்கட்டுகள் A","hi":"सीढ़ी A"}',
    'point', 'active', FALSE,
    '{"servicesFloors": [0, 1, 2, 3]}'),

('f0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000005', 'ENG-WC-G',
    '{"en":"Ground Floor Accessible Restrooms","es":"Baños Accesibles Planta Baja","ta":"தரை தள கழிப்பறைகள்","hi":"भूतल शौचालय"}',
    'point', 'active', TRUE,
    '{"gender": "all", "isAccessible": true}'),

-- First Floor Engineering objects
('f0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000002', 'ROOM-101',
    '{"en":"AI & ML Laboratory 101","es":"Laboratorio de IA 101","ta":"செயற்கை நுண்ணறிவு ஆய்வகம் 101","hi":"एआई लैब 101"}',
    'point', 'active', TRUE,
    '{"capacity": 40, "labType": "AI/ML", "safetyLevel": "standard", "occupantName": "Demo Research Team"}'),

('f0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001', 'ROOM-102',
    '{"en":"Lecture Hall 102","es":"Aula Magna 102","ta":"சொற்பொழிவு அரங்கம் 102","hi":"व्याख्यान हॉल 102"}',
    'point', 'active', TRUE,
    '{"capacity": 120, "hasProjector": true, "hasWhiteboard": true}'),

-- Medical Tower Ground Floor
('f0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000008',
    'e0000000-0000-0000-0000-000000000009', 'MED-ENT-MAIN',
    '{"en":"Medical Tower Main Entrance","es":"Entrada Principal Torre Médica","ta":"மருத்துவ மையம் நுழைவு","hi":"मुख्य प्रवेश"}',
    'point', 'active', TRUE,
    '{"hasRamp": true, "isAutomatic": true, "operatingHours": "00:00-23:59"}'),

('f0000000-0000-0000-0000-000000000009',
    'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000008',
    'e0000000-0000-0000-0000-000000000003', 'MED-OPD-DESK',
    '{"en":"OPD Registration Desk","es":"Mostrador de Registro OPD","ta":"OPD பதிவு மேசை","hi":"OPD पंजीकरण डेस्क"}',
    'point', 'active', TRUE,
    '{"occupantName": "Reception Staff", "isPublicFacing": true, "phoneExtension": "100"}'),

('f0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000008',
    'e0000000-0000-0000-0000-000000000007', 'MED-ELEV-01',
    '{"en":"Medical Tower Elevator 1","es":"Ascensor 1 Torre Médica","ta":"மருத்துவ மின் தூக்கி 1","hi":"मेडिकल लिफ्ट 1"}',
    'point', 'active', TRUE,
    '{"loadKg": 1000, "servicesFloors": [-1, 0, 1, 2, 3, 4, 5], "isAccessible": true}');

-- ---- 7. Navigation Nodes (minimal sample) ----

INSERT INTO nav_nodes (id, campus_id, building_id, floor_id, object_id, node_type, label, x, y, is_accessible) VALUES
-- Engineering Block Ground Floor
('n0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'door',    'ENG Main Entrance',     60.0, 79.0, TRUE),
('n0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', NULL,                                    'waypoint', 'ENG G Lobby Junction',   60.0, 65.0, TRUE),
('n0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'door',    'Robotics Lab G101 Door', 30.0, 40.0, TRUE),
('n0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'elevator','ENG Elevator A — G',     90.0, 40.0, TRUE),
-- Engineering Block First Floor
('n0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', NULL,                                    'elevator','ENG Elevator A — F1',    90.0, 40.0, TRUE),
('n0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000006', 'door',    'AI Lab 101 Door',        30.0, 40.0, TRUE),
-- Medical Tower Ground Floor
('n0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000008', 'door',    'Medical Main Entrance',  45.0, 64.0, TRUE),
('n0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000009', 'door',    'OPD Desk',               50.0, 35.0, TRUE),
('n0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000010', 'elevator','Medical Elevator 1 — G', 80.0, 32.0, TRUE);

-- Update objects.nav_node_id references
UPDATE objects SET nav_node_id = 'n0000000-0000-0000-0000-000000000001' WHERE id = 'f0000000-0000-0000-0000-000000000001';
UPDATE objects SET nav_node_id = 'n0000000-0000-0000-0000-000000000003' WHERE id = 'f0000000-0000-0000-0000-000000000002';
UPDATE objects SET nav_node_id = 'n0000000-0000-0000-0000-000000000004' WHERE id = 'f0000000-0000-0000-0000-000000000003';
UPDATE objects SET nav_node_id = 'n0000000-0000-0000-0000-000000000006' WHERE id = 'f0000000-0000-0000-0000-000000000006';
UPDATE objects SET nav_node_id = 'n0000000-0000-0000-0000-000000000007' WHERE id = 'f0000000-0000-0000-0000-000000000008';
UPDATE objects SET nav_node_id = 'n0000000-0000-0000-0000-000000000008' WHERE id = 'f0000000-0000-0000-0000-000000000009';
UPDATE objects SET nav_node_id = 'n0000000-0000-0000-0000-000000000009' WHERE id = 'f0000000-0000-0000-0000-000000000010';

-- Update buildings.entrance_node_ids
UPDATE buildings SET entrance_node_ids = ARRAY['n0000000-0000-0000-0000-000000000001']::UUID[] WHERE id = 'c0000000-0000-0000-0000-000000000001';
UPDATE buildings SET entrance_node_ids = ARRAY['n0000000-0000-0000-0000-000000000007']::UUID[] WHERE id = 'c0000000-0000-0000-0000-000000000005';

-- ---- 8. Navigation Edges (minimal connectivity sample) ----

INSERT INTO nav_edges (id, campus_id, source_node_id, target_node_id, traversal_type, direction, distance_meters, weight, is_walkable, is_accessible) VALUES
-- ENG Ground Floor: Entrance → Lobby
('edge-000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
    'n0000000-0000-0000-0000-000000000001', 'n0000000-0000-0000-0000-000000000002',
    'walkway', 'bidirectional', 14.0, 1.0, TRUE, TRUE),

-- ENG Ground Floor: Lobby → Robotics Lab
('edge-000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
    'n0000000-0000-0000-0000-000000000002', 'n0000000-0000-0000-0000-000000000003',
    'walkway', 'bidirectional', 30.0, 1.0, TRUE, TRUE),

-- ENG Ground Floor: Lobby → Elevator G
('edge-000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
    'n0000000-0000-0000-0000-000000000002', 'n0000000-0000-0000-0000-000000000004',
    'walkway', 'bidirectional', 30.0, 1.0, TRUE, TRUE),

-- ENG Elevator: Ground → First Floor
('edge-000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
    'n0000000-0000-0000-0000-000000000004', 'n0000000-0000-0000-0000-000000000005',
    'elevator', 'bidirectional', 4.0, 1.5, TRUE, TRUE),

-- ENG First Floor: Elevator F1 → AI Lab 101
('edge-000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
    'n0000000-0000-0000-0000-000000000005', 'n0000000-0000-0000-0000-000000000006',
    'walkway', 'bidirectional', 60.0, 1.0, TRUE, TRUE),

-- Medical Ground Floor: Entrance → OPD Desk
('edge-000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003',
    'n0000000-0000-0000-0000-000000000007', 'n0000000-0000-0000-0000-000000000008',
    'walkway', 'bidirectional', 20.0, 1.0, TRUE, TRUE),

-- Medical Ground Floor: OPD Desk → Elevator
('edge-000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003',
    'n0000000-0000-0000-0000-000000000008', 'n0000000-0000-0000-0000-000000000009',
    'walkway', 'bidirectional', 30.0, 1.0, TRUE, TRUE);

-- ---- 9. Access Rules (sample) ----

INSERT INTO access_rules (id, campus_id, target_type, object_id, rule_type, name, valid_from, valid_until, is_routing_blocked, is_active, closure_reason) VALUES
(
    'r0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'object',
    'f0000000-0000-0000-0000-000000000002',
    'maintenance',
    'Robotics Lab G101 Scheduled Maintenance',
    '2026-12-01 00:00:00+00',
    '2026-12-07 23:59:59+00',
    TRUE,
    TRUE,
    '{"en": "Lab closed for annual equipment calibration.", "es": "Laboratorio cerrado por calibración anual.", "ta": "ஆண்டு உபகரண சரிசெய்தலுக்காக மூடப்பட்டுள்ளது.", "hi": "वार्षिक उपकरण अंशांकन के लिए बंद।"}'
);
