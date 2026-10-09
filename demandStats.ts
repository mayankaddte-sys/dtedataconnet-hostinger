import { ExtensionRequest, Requisition, SubmissionRecord } from '../types/portal';

/**
 * Deadline that applies to ONE field unit for a demand: the demand's own
 * deadline, or the later date from an APPROVED extension for that unit.
 * (Approving an extension stores the granted date in `requestedDeadline`.)
 */
export function getEffectiveDeadline(
  req: Requisition,
  fieldUnitId: string | undefined,
  extensions: ExtensionRequest[]
): string {
  if (!fieldUnitId) return req.deadline;
  let bestTime = new Date(req.deadline).getTime();
  let bestIso = req.deadline;
  for (const e of extensions) {
    if (e.requisitionId !== req.id || e.fieldUnitId !== fieldUnitId || e.status !== 'APPROVED') continue;
    const t = new Date(e.requestedDeadline).getTime();
    if (Number.isFinite(t) && t > bestTime) {
      bestTime = t;
      bestIso = e.requestedDeadline;
    }
  }
  return bestIso;
}

/** One submission per (demand, field unit): keep the most recent one. */
export function dedupeSubmissions(subs: SubmissionRecord[]): SubmissionRecord[] {
  const latest = new Map<string, SubmissionRecord>();
  for (const s of subs) {
    const key = `${s.requisitionId}__${s.fieldUnitId}`;
    const prev = latest.get(key);
    if (!prev || new Date(s.submittedAt).getTime() > new Date(prev.submittedAt).getTime()) {
      latest.set(key, s);
    }
  }
  return Array.from(latest.values());
}

/**
 * How many of the demand's TARGET units have replied. Counts each unit once,
 * so resubmissions/corrections or replies from non-target units can never push
 * compliance above 100%.
 */
export function receivedFromTargets(req: Requisition, subs: SubmissionRecord[]): number {
  const targets = new Set(req.targetUnitIds);
  const seen = new Set<string>();
  for (const s of subs) {
    if (s.requisitionId === req.id && targets.has(s.fieldUnitId)) seen.add(s.fieldUnitId);
  }
  return seen.size;
}
