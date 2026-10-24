import React from 'react';

interface PlaceholderPageProps {
  title: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-md w-full">
        <h1 className="text-2xl font-outfit font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500">
          This module is currently under construction. Please check back later.
        </p>
      </div>
    </div>
  );
};
