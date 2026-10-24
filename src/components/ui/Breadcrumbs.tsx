import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center text-sm text-slate-500 bg-slate-50/80 px-4 py-2 border-b border-slate-200" aria-label="Breadcrumb">
      <Link to="/admin/campuses" className="hover:text-blue-600 transition-colors flex items-center">
        <Home size={14} className="mr-1" />
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight size={14} className="mx-1.5 text-slate-400" />
          {item.path ? (
            <Link to={item.path} className="hover:text-blue-600 transition-colors font-medium">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-semibold">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};
