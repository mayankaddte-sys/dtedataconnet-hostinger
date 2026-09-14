import React from 'react';
import { PriorityLevel } from '../../types/portal';
import { AlertCircle, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  isAssemblyQuestion?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  isAssemblyQuestion = false,
  size = 'md',
  showIcon = true
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold'
  };

  if (isAssemblyQuestion) {
    return (
      <span className={`inline-flex items-center rounded-full bg-red-100 text-red-800 border border-red-300 font-bold ${sizeClasses[size]}`}>
        {showIcon && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
        <span>Urgent / Time-bound Data</span>
      </span>
    );
  }

  switch (priority) {
    case 'URGENT':
      return (
        <span className={`inline-flex items-center rounded-full bg-red-100 text-red-800 border border-red-200 font-bold ${sizeClasses[size]}`}>
          {showIcon && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
          <span>Urgent (अति-आवश्यक)</span>
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold ${sizeClasses[size]}`}>
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
          <span>High Priority (जरूरी)</span>
        </span>
      );
    case 'NORMAL':
      return (
        <span className={`inline-flex items-center rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-medium ${sizeClasses[size]}`}>
          {showIcon && <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
          <span>Normal (सामान्य)</span>
        </span>
      );
    case 'ROUTINE':
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses[size]}`}>
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          <span>Routine (नियमित)</span>
        </span>
      );
  }
};
