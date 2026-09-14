import React, { useState, useEffect } from 'react';
import { calculateCountdown } from '../../utils/dateUtils';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface CountdownTimerProps {
  deadline: string;
  isStrictCutoff?: boolean;
  compact?: boolean;
  showIcon?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  deadline,
  isStrictCutoff = true,
  compact = false,
  showIcon = true
}) => {
  const [countdown, setCountdown] = useState(() => calculateCountdown(deadline));

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (countdown.isOverdue) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}>
        {showIcon && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />}
        <span>{countdown.formattedText}</span>
        {isStrictCutoff && (
          <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-600 text-white px-1.5 py-0.2 rounded">
            Window Lock
          </span>
        )}
      </div>
    );
  }

  if (countdown.urgencyLevel === 'CRITICAL') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-md animate-pulse ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}>
        {showIcon && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
        <span>{countdown.formattedText}</span>
        {isStrictCutoff && (
          <span className="text-[10px] uppercase tracking-wider bg-amber-600 text-white px-1.5 py-0.2 rounded">
            Strict Cut-off
          </span>
        )}
      </div>
    );
  }

  if (countdown.urgencyLevel === 'WARNING') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium text-slate-800 bg-slate-100 border border-slate-200 rounded-md ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}>
        {showIcon && <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        <span>{countdown.formattedText}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md ${
      compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
    }`}>
      {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
      <span>{countdown.formattedText}</span>
    </div>
  );
};
