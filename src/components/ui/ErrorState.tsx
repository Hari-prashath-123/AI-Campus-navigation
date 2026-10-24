import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Data Fetch Error',
  message,
  onRetry,
}) => {
  return (
    <div className="glass-panel p-6 border-rose-500/30 bg-rose-950/20 text-center flex flex-col items-center justify-center my-4 animate-fade-in">
      <div className="p-2.5 bg-rose-500/15 rounded-xl mb-2 text-rose-400 border border-rose-500/30">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h4 className="text-sm font-bold text-rose-200 mb-1">{title}</h4>
      <p className="text-xs text-rose-300/80 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={<RotateCcw className="w-3.5 h-3.5" />}>
          Retry Operation
        </Button>
      )}
    </div>
  );
};
