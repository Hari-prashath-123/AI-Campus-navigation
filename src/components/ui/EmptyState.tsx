import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  message?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  description,
  action,
  actionLabel,
  onAction,
  icon = <Layers className="w-10 h-10 text-slate-300" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
      <div className="mb-4 text-slate-400">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{message || description}</p>
      
      {(action || (actionLabel && onAction)) && (
        <Button variant="primary" onClick={action?.onClick || onAction}>
          {action?.label || actionLabel}
        </Button>
      )}
    </div>
  );
};
