export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return isoString;
  }
}

export interface CountdownResult {
  isOverdue: boolean;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedText: string;
  urgencyLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'OVERDUE';
}

export function calculateCountdown(deadlineIso: string): CountdownResult {
  const now = Date.now();
  const deadlineTime = new Date(deadlineIso).getTime();
  const diffMs = deadlineTime - now;

  if (diffMs <= 0) {
    const overdueMs = Math.abs(diffMs);
    const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const overdueMins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      isOverdue: true,
      totalSeconds: Math.floor(diffMs / 1000),
      days: 0,
      hours: overdueHours,
      minutes: overdueMins,
      seconds: 0,
      formattedText: overdueHours > 24 
        ? `समय-सीमा समाप्त: ${Math.floor(overdueHours / 24)} दिन ${overdueHours % 24} घंटे विलंब`
        : `समय-सीमा समाप्त: ${overdueHours} घंटे ${overdueMins} मिनट विलंब`,
      urgencyLevel: 'OVERDUE'
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formattedText = '';
  if (days > 0) {
    formattedText = `${days} दिन ${hours} घंटे शेष`;
  } else if (hours > 0) {
    formattedText = `${hours} घंटे ${minutes} मिनट शेष`;
  } else {
    formattedText = `${minutes} मिनट ${seconds} सेकंड शेष`;
  }

  let urgencyLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'OVERDUE' = 'NORMAL';
  if (totalSeconds < 4 * 3600) {
    urgencyLevel = 'CRITICAL';
  } else if (totalSeconds < 24 * 3600) {
    urgencyLevel = 'WARNING';
  }

  return {
    isOverdue: false,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    formattedText,
    urgencyLevel
  };
}
