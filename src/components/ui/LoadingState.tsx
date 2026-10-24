import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  text?: string;
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ text, message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 h-full min-h-[300px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-500">{text || message}</p>
    </div>
  );
};
