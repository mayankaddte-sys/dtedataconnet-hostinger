/* ============================================================
   ITI-wise Pendency List
   Shows every targeted ITI that has NOT yet sent its reply for a demand,
   grouped Mandal (zone) -> District, with CSV (Excel) download and Print.
   ============================================================ */
import React, { useMemo, useState } from 'react';
import { Requisition, FieldUnit, SubmissionRecord } from '../../types/portal';
import { formatDateTime } from '../../utils/dateUtils';
import { X, Download, Printer, Search } from 'lucide-react';

interface Props {
  requisition: Requisition;
  /** all units targeted by the demand (JD + ITI) */
  targetUnits: FieldUnit[];
  /** submissions of THIS requisition only */
  submissions: SubmissionRecord[];
  onClose: () => void;
}

type Row = { unit: FieldUnit; status: 'PENDING' | 'REVISION' };

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const PendencyListModal: React.FC<Props> = ({ requisition, targetUnits, submissions, onClose }) => {
  const [zone, setZone] = useState('ALL');
  const [district, setDistrict] = useState('ALL');
  const [search, setSearch] = useState('');
  const [includeRevision, setIncludeRevision] = useState(true);

  const itis = useMemo(() => targetUnits.filter(u => u.type === 'ITI'), [targetUnits]);

  // Same definition of "pending" as the rest of the app: no submission at all.
  // ITIs whose reply was sent back for revision are shown separately (optional).
  const allRows: Row[] = useMemo(() => {
    const subByUnit = new Map<string, SubmissionRecord>(submissions.map(s => [s.fieldUnitId, s] as [string, SubmissionRecord]));
    const out: Row[] = [];
    itis.forEach(unit => {
      const sub = subByUnit.get(unit.id);
      if (!sub) out.push({ unit, status: 'PENDING' });
      else if (sub.status === 'REVISION_REQUESTED') out.push({ unit, status: 'REVISION' });
    });
    return out;
  }, [itis, submissions]);

  const zoneOptions = useMemo(() => Array.from(new Set(itis.map(u => u.zone).filter(Boolean))).sort(), [itis]);
  const districtOptions = useMemo(
    () =>
      Array.from(new Set(itis.filter(u => zone === 'ALL' || u.zone === zone).map(u => u.district).filter(Boolean))).sort(),
    [itis, zone]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows
      .filter(r => includeRevision || r.status === 'PENDING')
      .filter(r => zone === 'ALL' || r.unit.zone === zone)
      .filter(r => district === 'ALL' || r.unit.district === district)
      .filter(
        r =>
          !q ||
          r.unit.name.toLowerCase().includes(q) ||
          (r.unit.code || '').toLowerCase().includes(q) ||
          (r.unit.district || '').toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          (a.unit.zone || '').localeCompare(b.unit.zone || '') ||
          (a.unit.district || '').localeCompare(b.unit.district || '') ||
          a.unit.name.localeCompare(b.unit.name)
      );
  }, [allRows, includeRevision, zone, district, search]);

  // group by zone
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    rows.forEach(r => {
      const k = r.unit.zone || '—';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return Array.from(m.entries());
  }, [rows]);

  const totalItis = itis.length;
  const pendingCount = allRows.filter(r => r.status === 'PENDING').length;
  const revisionCount = allRows.filter(r => r.status === 'REVISION').length;
  const statusText = (s: Row['status']) => (s === 'PENDING' ? 'डेटा प्राप्त नहीं' : 'संशोधन हेतु वापस');

  const titleLines = () => [
    'उत्तर प्रदेश प्रशिक्षण निदेशालय - ITI-वार लंबित (Pendency) सूची',
    `मांग: ${requisition.title}`,
    `संदर्भ संख्या: ${requisition.requisitionNumber}`,
    `अंतिम तिथि: ${formatDateTime(requisition.deadline)}`,
    `सूची दिनांक: ${formatDateTime(new Date().toISOString())}`
  ];

  const downloadCsv = () => {
    const header = ['क्र.सं.', 'मंडल / Zone', 'जनपद / District', 'ITI कोड', 'ITI का नाम', 'प्रधानाचार्य / Head', 'मोबाइल', 'ईमेल', 'स्थिति'];
    const body = rows.map((r, i) =>
      [i + 1, r.unit.zone, r.unit.district, r.unit.code, r.unit.name, r.unit.headOfficer, r.unit.phone, r.unit.email, statusText(r.status)]
        .map(csvCell)
        .join(',')
    );
    const csv =
      '\uFEFF' +
      [
        ...titleLines().map(l => csvCell(l)),
        csvCell(`कुल ITI: ${totalItis} | लंबित: ${pendingCount} | संशोधन हेतु वापस: ${revisionCount}`),
        '',
        header.map(csvCell).join(','),
        ...body
      ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ITI_Pendency_${requisition.requisitionNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    let n = 0;
    const groupHtml = groups
      .map(
        ([z, rs]) => `
      <tr class="zone"><td colspan="7">${esc(z)} मंडल — ${rs.length} ITI</td></tr>
      ${rs
        .map(
          r => `<tr>
            <td>${++n}</td><td>${esc(r.unit.district)}</td><td>${esc(r.unit.code)}</td>
            <td>${esc(r.unit.name)}</td><td>${esc(r.unit.headOfficer)}</td>
            <td>${esc(r.unit.phone)}</td><td>${esc(statusText(r.status))}</td></tr>`
        )
        .join('')}`
      )
      .join('');
    const w = window.open('', '_blank');
    if (!w) {
      window.alert('Pop-up blocked. कृपया इस साइट के लिए pop-up की अनुमति दें।');
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ITI Pendency</title>
      <style>
        body{font-family:Arial,'Noto Sans Devanagari',sans-serif;font-size:12px;margin:18px;color:#111}
        h2{margin:0 0 4px;font-size:16px} p{margin:2px 0}
        table{border-collapse:collapse;width:100%;margin-top:10px}
        th,td{border:1px solid #444;padding:4px 6px;text-align:left;vertical-align:top}
        th{background:#eee} tr.zone td{background:#f3f4f6;font-weight:bold}
        tr{page-break-inside:avoid}
      </style></head><body>
      <h2>${esc(titleLines()[0])}</h2>
      ${titleLines().slice(1).map(l => `<p>${esc(l)}</p>`).join('')}
      <p><b>कुल ITI: ${totalItis} | लंबित: ${pendingCount} | संशोधन हेतु वापस: ${revisionCount}</b></p>
      <table><thead><tr><th>क्र.</th><th>जनपद</th><th>कोड</th><th>ITI का नाम</th><th>प्रधानाचार्य</th><th>मोबाइल</th><th>स्थिति</th></tr></thead>
      <tbody>${groupHtml}</tbody></table>
      <script>window.onload=function(){window.print();}</script></body></html>`);
    w.document.close();
  };

  const inputCls =
    'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900 text-base">ITI-वार लंबित सूची (Pendency List)</h2>
            <p className="text-[11px] text-slate-500">
              {requisition.title} · {requisition.requisitionNumber}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-900" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* counts */}
        <div className="px-4 pt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="px-2 py-1 rounded-full bg-slate-100 font-bold text-slate-700">कुल ITI: {totalItis}</span>
          <span className="px-2 py-1 rounded-full bg-rose-100 font-bold text-rose-800">लंबित: {pendingCount}</span>
          <span className="px-2 py-1 rounded-full bg-amber-100 font-bold text-amber-800">संशोधन हेतु वापस: {revisionCount}</span>
          <span className="px-2 py-1 rounded-full bg-emerald-100 font-bold text-emerald-800">
            प्राप्त: {totalItis - pendingCount}
          </span>
        </div>

        {/* filters */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select
            className={inputCls}
            value={zone}
            onChange={e => {
              setZone(e.target.value);
              setDistrict('ALL');
            }}
          >
            <option value="ALL">सभी मंडल / Zone</option>
            {zoneOptions.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <select className={inputCls} value={district} onChange={e => setDistrict(e.target.value)}>
            <option value="ALL">सभी जनपद</option>
            {districtOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              className={`${inputCls} pl-8`}
              placeholder="ITI नाम / कोड / जनपद खोजें"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-700 sm:col-span-4 cursor-pointer">
            <input type="checkbox" checked={includeRevision} onChange={e => setIncludeRevision(e.target.checked)} />
            संशोधन हेतु वापस भेजी गई ITI भी सूची में दिखाएँ
          </label>
        </div>

        {/* list */}
        <div className="px-4 pb-2 overflow-y-auto flex-1">
          {totalItis === 0 ? (
            <p className="p-6 text-center text-slate-500 italic">इस मांग में कोई ITI लक्षित नहीं है।</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-emerald-700 font-bold">कोई ITI लंबित नहीं है 🎉</p>
          ) : (
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 sticky top-0">
                <tr>
                  <th className="p-2 text-left w-10">क्र.</th>
                  <th className="p-2 text-left">जनपद</th>
                  <th className="p-2 text-left">कोड</th>
                  <th className="p-2 text-left">ITI का नाम</th>
                  <th className="p-2 text-left">मोबाइल</th>
                  <th className="p-2 text-left">स्थिति</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let n = 0;
                  return groups.map(([z, rs]) => (
                    <React.Fragment key={z}>
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="p-2 font-bold text-slate-800">
                          {z} मंडल — {rs.length} ITI
                        </td>
                      </tr>
                      {rs.map(r => (
                        <tr key={r.unit.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="p-2">{++n}</td>
                          <td className="p-2">{r.unit.district}</td>
                          <td className="p-2 font-mono">{r.unit.code}</td>
                          <td className="p-2 font-bold text-slate-900">{r.unit.name}</td>
                          <td className="p-2">{r.unit.phone}</td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'PENDING' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {statusText(r.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ));
                })()}
              </tbody>
            </table>
          )}
        </div>

        {/* footer */}
        <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">{rows.length} ITI सूची में दिख रही हैं</span>
          <div className="flex gap-2">
            <button
              onClick={printList}
              disabled={rows.length === 0}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={downloadCsv}
              disabled={rows.length === 0}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Download Excel (CSV)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
