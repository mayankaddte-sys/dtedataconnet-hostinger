import React from 'react';
import { SubmissionStatus } from '../../types/portal';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: SubmissionStatus;
  isLate?: boolean;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  isLate = false,
  size = 'md'
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  switch (status) {
    case 'APPROVED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Approved (स्वीकृत)</span>
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Submitted (जमा हो गया) {isLate ? '(Late)' : ''}</span>
        </span>
      );
    case 'LATE_SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>Late Submitted (विलंबित)</span>
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 ${sizeClasses}`}>
          <RefreshCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Under Review (जांच में है)</span>
        </span>
      );
    case 'REVISION_REQUESTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-medium ${sizeClasses}`}>
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Correction Needed (सुधार चाहिए)</span>
        </span>
      );
    case 'OVERDUE':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Overdue (डिफॉल्टर / लेट)</span>
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Pending (बाकी है)</span>
        </span>
      );
  }
};
