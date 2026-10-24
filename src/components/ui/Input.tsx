import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  as?: 'input' | 'textarea';
  rows?: number;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, icon, as = 'input', className = '', ...props }) => {
  const inputClass = `w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${
    icon ? 'pl-9' : ''
  } ${error ? 'border-red-500' : ''} disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`;

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3 text-slate-400">{icon}</div>}
        {as === 'textarea' ? (
          <textarea className={inputClass} {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        ) : (
          <input className={inputClass} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
        )}
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-500">{helperText}</span>}
    </div>
  );
};
