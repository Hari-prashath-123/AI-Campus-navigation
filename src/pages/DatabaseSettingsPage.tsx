import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Download, Map } from 'lucide-react';

/**
 * This application currently persists its workspace in browser storage rather
 * than a server-side PostgreSQL database.  Keep that distinction visible to
 * administrators so they use the portable campus export instead of expecting
 * a database dump that cannot contain their map-editor work.
 */
export const DatabaseSettingsPage: React.FC = () => (
  <div className="max-w-3xl mx-auto p-6 space-y-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
        <Database size={20} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Data backup</h1>
        <p className="text-sm text-slate-500">Export a campus as a portable JSON backup.</p>
      </div>
    </div>

    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
        <Map size={17} className="text-blue-600" /> Complete map backup
      </div>
      <p className="text-sm text-slate-600 leading-6">
        Campus exports include buildings, floors, places, navigation nodes and
        paths, plus the campus, floor, and room maps created in the map editor.
      </p>
      <Link
        to="/admin/campuses"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Download size={16} /> Choose a campus to export
      </Link>
    </section>
  </div>
);
