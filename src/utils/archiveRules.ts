/* Which demands may be moved to the archive?
   Rule: the demand is "old" (its deadline has passed - optionally by a minimum number of days)
   AND every targeted unit has replied and none of the replies is waiting for a revision. */
import { Requisition, SubmissionRecord } from '../types/portal';

export interface ArchiveCheck {
  eligible: boolean;
  reasons: string[];
  targetCount: number;
  completeCount: number;
  daysSinceDeadline: number;
}

const DAY = 24 * 3600 * 1000;

export function checkArchiveEligibility(
  req: Requisition,
  submissions: SubmissionRecord[],
  minDaysAfterDeadline = 0,
  now: number = Date.now()
): ArchiveCheck {
  const reasons: string[] = [];
  const targets = req.targetUnitIds || [];

  // latest reply of each unit for this demand
  const latest = new Map<string, SubmissionRecord>();
  submissions
    .filter(s => s.requisitionId === req.id)
    .forEach(s => {
      const prev = latest.get(s.fieldUnitId);
      if (!prev || new Date(s.submittedAt).getTime() >= new Date(prev.submittedAt).getTime()) latest.set(s.fieldUnitId, s);
    });

  let complete = 0;
  let missing = 0;
  let revision = 0;
  targets.forEach(id => {
    const s = latest.get(id);
    if (!s) missing++;
    else if (s.status === 'REVISION_REQUESTED') revision++;
    else complete++;
  });

  const deadline = new Date(req.deadline).getTime();
  const daysSince = Math.floor((now - deadline) / DAY);

  if (req.status === 'ARCHIVED') reasons.push('यह मांग पहले से संग्रह में है।');
  if (targets.length === 0) reasons.push('इस मांग में कोई लक्षित इकाई नहीं है।');
  if (missing > 0) reasons.push(`${missing} इकाइयों का उत्तर अभी प्राप्त नहीं हुआ।`);
  if (revision > 0) reasons.push(`${revision} इकाइयों का उत्तर संशोधन हेतु लंबित है।`);
  if (!(deadline < now)) reasons.push('अंतिम तिथि अभी बीती नहीं है।');
  else if (daysSince < minDaysAfterDeadline) reasons.push(`अंतिम तिथि को अभी ${minDaysAfterDeadline} दिन पूरे नहीं हुए।`);

  return { eligible: reasons.length === 0, reasons, targetCount: targets.length, completeCount: complete, daysSinceDeadline: daysSince };
}
