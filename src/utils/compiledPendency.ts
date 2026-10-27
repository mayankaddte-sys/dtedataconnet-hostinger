import { Requisition, SubmissionRecord, FieldUnit } from '../types/portal';
import { formatDateTime } from './dateUtils';

/**
 * Compiled (all demands together) ITI-wise pendency list.
 *
 * One row per ITI that still owes data on at least one ACTIVE demand.
 * "Pending" = no submission at all for that demand; an ITI whose reply was
 * sent back for revision is listed too, tagged as such.
 */
export interface CompiledPendencyRow {
  unit: FieldUnit;
  pending: { req: Requisition; kind: 'PENDING' | 'REVISION'; overdue: boolean }[];
}

export function buildCompiledPendency(
  requisitions: Requisition[],
  submissions: SubmissionRecord[],
  fieldUnits: FieldUnit[]
): CompiledPendencyRow[] {
  const now = Date.now();
  const itiById = new Map(fieldUnits.filter(u => u.type === 'ITI').map(u => [u.id, u]));
  const active = requisitions.filter(r => r.status === 'ACTIVE');

  // requisitionId -> (unitId -> submission)
  const subIndex = new Map<string, Map<string, SubmissionRecord>>();
  submissions.forEach(s => {
    if (!subIndex.has(s.requisitionId)) subIndex.set(s.requisitionId, new Map());
    subIndex.get(s.requisitionId)!.set(s.fieldUnitId, s);
  });

  const rows = new Map<string, CompiledPendencyRow>();
  active.forEach(req => {
    const subs = subIndex.get(req.id);
    const overdue = new Date(req.deadline).getTime() < now;
    (req.targetUnitIds || []).forEach(id => {
      const unit = itiById.get(id);
      if (!unit) return; // JD offices / unknown ids are not part of an ITI-wise list
      const sub = subs?.get(id);
      let kind: 'PENDING' | 'REVISION' | null = null;
      if (!sub) kind = 'PENDING';
      else if (sub.status === 'REVISION_REQUESTED') kind = 'REVISION';
      if (!kind) return;
      if (!rows.has(id)) rows.set(id, { unit, pending: [] });
      rows.get(id)!.pending.push({ req, kind, overdue });
    });
  });

  return Array.from(rows.values()).sort(
    (a, b) =>
      (a.unit.zone || '').localeCompare(b.unit.zone || '') ||
      (a.unit.district || '').localeCompare(b.unit.district || '') ||
      a.unit.name.localeCompare(b.unit.name)
  );
}

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function downloadCompiledPendencyCSV(
  requisitions: Requisition[],
  submissions: SubmissionRecord[],
  fieldUnits: FieldUnit[],
  scopeLabel = 'सभी प्रकोष्ठ'
): number {
  const rows = buildCompiledPendency(requisitions, submissions, fieldUnits);
  const activeCount = requisitions.filter(r => r.status === 'ACTIVE').length;

  const header = [
    'क्र.सं.',
    'मंडल / Zone',
    'जनपद / District',
    'ITI कोड',
    'ITI का नाम',
    'प्रधानाचार्य / Head',
    'मोबाइल',
    'ईमेल',
    'लंबित मांगों की संख्या',
    'इनमें से अंतिम तिथि बीत चुकी',
    'लंबित मांगों का विवरण (संदर्भ संख्या – विषय – अंतिम तिथि)'
  ];

  const body = rows.map((r, i) => {
    const detail = r.pending
      .map(
        (p, k) =>
          `${k + 1}. ${p.req.requisitionNumber} – ${p.req.title} – ${formatDateTime(p.req.deadline)}` +
          `${p.overdue ? ' [अंतिम तिथि बीत चुकी]' : ''}${p.kind === 'REVISION' ? ' [संशोधन हेतु वापस]' : ''}`
      )
      .join('\n');
    return [
      i + 1,
      r.unit.zone,
      r.unit.district,
      r.unit.code,
      r.unit.name,
      r.unit.headOfficer,
      r.unit.phone,
      r.unit.email,
      r.pending.length,
      r.pending.filter(p => p.overdue).length,
      detail
    ]
      .map(cell)
      .join(',');
  });

  const csv =
    '\uFEFF' +
    [
      cell('उत्तर प्रदेश प्रशिक्षण निदेशालय - ITI-वार संकलित लंबित (Pendency) सूची'),
      cell(`क्षेत्र: ${scopeLabel}`),
      cell(`सूची दिनांक: ${formatDateTime(new Date().toISOString())}`),
      cell(`सक्रिय मांगें: ${activeCount} | लंबित ITI: ${rows.length}`),
      '',
      header.map(cell).join(','),
      ...body
    ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DTE_ITI_Pendency_Compiled_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return rows.length;
}
