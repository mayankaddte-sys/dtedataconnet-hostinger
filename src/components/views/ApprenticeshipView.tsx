import React, { useEffect, useMemo, useState } from 'react';
import {
  ApprenticeRow,
  ApprenticeshipReturn,
  DirectorateDesk,
  FieldUnit,
  UserSession
} from '../../types/portal';
import {
  getApprenticeshipReturns,
  upsertApprenticeshipReturn
} from '../../lib/storage';
import { getScopedFieldUnits } from '../../utils/userScope';
import {
  GraduationCap,
  Plus,
  Trash2,
  Save,
  Copy,
  ClipboardPaste,
  Calculator,
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2
} from 'lucide-react';

/* ===========================================================================
   Helpers
   =========================================================================== */

const currentPeriod = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const periodLabel = (period: string): string => {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const prevPeriod = (period: string): string => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Financial year (April–March) that the given period falls in, e.g. "2026-27".
const fyName = (period: string): string => {
  const [y, m] = period.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

// Months still to be paid, from the month after "paid upto" (or from the
// reporting month if nothing is paid yet) through February of the FY end.
const monthsTillFeb = (period: string, paidUpto: string): number => {
  const [py, pm] = period.split('-').map(Number);
  const fyEndYear = pm >= 4 ? py + 1 : py;
  const endIdx = fyEndYear * 12 + 2;
  let startIdx = py * 12 + pm;
  if (/^\d{4}-\d{2}$/.test(paidUpto)) {
    const [y, m] = paidUpto.split('-').map(Number);
    startIdx = y * 12 + m + 1;
  }
  return Math.max(0, endIdx - startIdx + 1);
};

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const blankRow = (): ApprenticeRow => ({
  id: newId(),
  name: '',
  trade: '',
  contractNumber: '',
  contactNumber: '',
  stipend: null,
  stipendPaidUpto: '',
  availableBudget: null,
  requiredBudget: null
});

const isBlankRow = (r: ApprenticeRow): boolean =>
  !r.name.trim() &&
  !r.trade.trim() &&
  !r.contractNumber.trim() &&
  !r.contactNumber.trim() &&
  r.stipend === null &&
  !r.stipendPaidUpto &&
  r.availableBudget === null &&
  r.requiredBudget === null;

const toNum = (v: string): number | null => {
  const cleaned = v.replace(/[, ₹]/g, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

// Lenient parser for "Sep 2026", "09/2026", "2026-09", "September-2026" etc.
const parseMonthYear = (raw: string): string => {
  const s = raw.trim().toLowerCase();
  if (!s) return '';
  let m = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = s.match(/^([a-z]{3})[a-z]*[\s,.\-/]*(\d{2}|\d{4})$/);
  if (m && MONTHS[m[1]]) {
    const y = m[2].length === 2 ? `20${m[2]}` : m[2];
    return `${y}-${String(MONTHS[m[1]]).padStart(2, '0')}`;
  }
  return '';
};

const inr = (n: number | null | undefined): string =>
  n === null || n === undefined ? '—' : n.toLocaleString('en-IN');

const sum = (nums: (number | null)[]): number =>
  nums.reduce<number>((a, b) => a + (b ?? 0), 0);

const csvCell = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  return `"${String(val).replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, rows: unknown[][]) => {
  const body = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  // BOM so Excel opens Hindi / Devanagari text correctly.
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const fmtDateTime = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const inputCls =
  'w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

/* ===========================================================================
   Read-only apprentice table (used by JD / Directorate drill-down)
   =========================================================================== */

const ApprenticeTable: React.FC<{ rows: ApprenticeRow[] }> = ({ rows }) => (
  <div className="overflow-x-auto border border-slate-200 rounded-lg">
    <table className="min-w-full text-xs">
      <thead className="bg-slate-100 text-slate-700">
        <tr>
          {['#', 'Name of apprentice', 'Trade', 'Contract number', 'Contact number', 'Stipend (Rs)', 'Stipend paid upto', 'Available budget', 'Required budget'].map(h => (
            <th key={h} className="px-2.5 py-2 text-left font-bold whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 && (
          <tr><td colSpan={9} className="px-3 py-4 text-center text-slate-500">कोई शिक्षु विवरण दर्ज नहीं है।</td></tr>
        )}
        {rows.map((r, i) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-2.5 py-1.5 text-slate-500">{i + 1}</td>
            <td className="px-2.5 py-1.5 font-semibold text-slate-800">{r.name}</td>
            <td className="px-2.5 py-1.5">{r.trade}</td>
            <td className="px-2.5 py-1.5 font-mono">{r.contractNumber}</td>
            <td className="px-2.5 py-1.5 font-mono">{r.contactNumber}</td>
            <td className="px-2.5 py-1.5 text-right">{inr(r.stipend)}</td>
            <td className="px-2.5 py-1.5 whitespace-nowrap">{r.stipendPaidUpto ? periodLabel(r.stipendPaidUpto) : '—'}</td>
            <td className="px-2.5 py-1.5 text-right">{inr(r.availableBudget)}</td>
            <td className="px-2.5 py-1.5 text-right">{inr(r.requiredBudget)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ===========================================================================
   ITI data-entry screen
   =========================================================================== */

const ItiEntry: React.FC<{ currentUser: UserSession; unit: FieldUnit | undefined }> = ({
  currentUser,
  unit
}) => {
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [history, setHistory] = useState<ApprenticeshipReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [sanctionedSeats, setSanctionedSeats] = useState<string>('');
  const [totalAppointed, setTotalAppointed] = useState<string>('');
  const [rows, setRows] = useState<ApprenticeRow[]>([]);
  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const unitId = unit?.id;

  const loadHistory = async (silent = false) => {
    if (!unitId) return;
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      setHistory(await getApprenticeshipReturns({ fieldUnitId: unitId }));
    } catch (e: any) {
      setLoadError(e?.message || 'डेटा लोड नहीं हो सका।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const existing = useMemo(() => history.find(h => h.period === period), [history, period]);
  const previous = useMemo(
    () => history.find(h => h.period === prevPeriod(period)) || history.find(h => h.period < period),
    [history, period]
  );

  // (Re)initialise the form whenever the month or saved data changes.
  useEffect(() => {
    if (loading) return;
    setSaveMsg(null);
    setDirty(false);
    if (existing) {
      setSanctionedSeats(existing.sanctionedSeats?.toString() ?? '');
      setTotalAppointed(existing.totalAppointed?.toString() ?? '');
      setRows(existing.apprentices.length ? existing.apprentices : [blankRow()]);
    } else {
      const seats = previous?.sanctionedSeats ?? unit?.totalSeats ?? null;
      setSanctionedSeats(seats !== null && seats !== undefined ? String(seats) : '');
      setTotalAppointed('');
      setRows([blankRow()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, period, existing?.id, existing?.updatedAt]);

  if (!unit) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
        आपके लॉगिन से कोई आईटीआई संबद्ध नहीं मिला। कृपया पुनः लॉगिन करें।
      </div>
    );
  }

  const changePeriod = (next: string) => {
    if (!next || next === period) return;
    if (dirty && !window.confirm('असहेजे परिवर्तन हैं। माह बदलने पर वे हट जाएंगे। जारी रखें?')) return;
    setPeriod(next);
  };

  const touch = () => {
    setDirty(true);
    setSaveMsg(null);
  };

  const updateRow = (id: string, patch: Partial<ApprenticeRow>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    touch();
  };

  const addRow = () => {
    setRows(prev => [...prev, blankRow()]);
    touch();
  };

  const removeRow = (id: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.length ? next : [blankRow()];
    });
    touch();
  };

  const copyFromPrevious = () => {
    if (!previous) return;
    if (rows.some(r => !isBlankRow(r)) &&
      !window.confirm('वर्तमान प्रविष्टियाँ पिछले माह की सूची से बदल दी जाएंगी। जारी रखें?')) return;
    setRows(previous.apprentices.map(r => ({ ...r, id: newId() })));
    if (!totalAppointed && previous.totalAppointed !== null) {
      setTotalAppointed(String(previous.totalAppointed));
    }
    touch();
  };

  const autoCalcRequired = () => {
    setRows(prev =>
      prev.map(r =>
        r.stipend !== null
          ? { ...r, requiredBudget: r.stipend * monthsTillFeb(period, r.stipendPaidUpto) }
          : r
      )
    );
    touch();
  };

  const importPasted = () => {
    const lines = pasteText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (!lines.length) return;
    let badDates = 0;
    const imported: ApprenticeRow[] = lines.map(line => {
      const c = line.split('\t');
      const paid = (c[5] || '').trim();
      const parsed = parseMonthYear(paid);
      if (paid && !parsed) badDates++;
      return {
        id: newId(),
        name: (c[0] || '').trim(),
        trade: (c[1] || '').trim(),
        contractNumber: (c[2] || '').trim(),
        contactNumber: (c[3] || '').trim(),
        stipend: toNum(c[4] || ''),
        stipendPaidUpto: parsed,
        availableBudget: toNum(c[6] || ''),
        requiredBudget: toNum(c[7] || '')
      };
    });
    setRows(prev => [...prev.filter(r => !isBlankRow(r)), ...imported]);
    setPasteText('');
    setShowPaste(false);
    touch();
    setSaveMsg({
      type: badDates ? 'err' : 'ok',
      text: `${imported.length} पंक्तियाँ जोड़ी गईं।${badDates ? ` ${badDates} पंक्तियों में "Stipend paid upto" पहचानी नहीं गई — कृपया स्वयं भरें।` : ''} सहेजना न भूलें।`
    });
  };

  const filledRows = rows.filter(r => !isBlankRow(r));

  const validate = (): string | null => {
    if (!/^\d+$/.test(sanctionedSeats.trim())) return 'स्वीकृत सीटें (Sanctioned seats) भरें।';
    if (!/^\d+$/.test(totalAppointed.trim())) return 'कुल नियुक्त शिक्षु (Total apprentice appointed) भरें।';
    for (let i = 0; i < filledRows.length; i++) {
      const r = filledRows[i];
      const n = `पंक्ति ${rows.indexOf(r) + 1}`;
      if (!r.name.trim()) return `${n}: शिक्षु का नाम आवश्यक है।`;
      if (!r.trade.trim()) return `${n}: ट्रेड आवश्यक है।`;
      if (r.contactNumber.trim() && !/^\d{10}$/.test(r.contactNumber.trim()))
        return `${n}: संपर्क नंबर 10 अंकों का होना चाहिए।`;
      if (r.stipend !== null && r.stipend < 0) return `${n}: स्टाइपेंड ऋणात्मक नहीं हो सकता।`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setSaveMsg({ type: 'err', text: err });
      return;
    }
    setSaving(true);
    try {
      const ret: ApprenticeshipReturn = {
        id: `${unit.id}__${period}`,
        fieldUnitId: unit.id,
        fieldUnitName: unit.name,
        zone: unit.zone,
        district: unit.district,
        period,
        sanctionedSeats: Number(sanctionedSeats),
        totalAppointed: Number(totalAppointed),
        apprentices: filledRows.map(r => ({
          ...r,
          name: r.name.trim(),
          trade: r.trade.trim(),
          contractNumber: r.contractNumber.trim(),
          contactNumber: r.contactNumber.trim()
        })),
        submittedBy: currentUser.displayName
      };
      await upsertApprenticeshipReturn(ret);
      await loadHistory(true);
      setSaveMsg({ type: 'ok', text: `${periodLabel(period)} का विवरण सफलतापूर्वक सहेजा गया। आवश्यकता होने पर इसे दोबारा संशोधित किया जा सकता है।` });
    } catch (e: any) {
      setSaveMsg({ type: 'err', text: e?.message || 'सहेजा नहीं जा सका। कृपया पुनः प्रयास करें।' });
    } finally {
      setSaving(false);
    }
  };

  const totalStipend = sum(filledRows.map(r => r.stipend));
  const totalAvail = sum(filledRows.map(r => r.availableBudget));
  const totalReq = sum(filledRows.map(r => r.requiredBudget));
  const countMismatch =
    /^\d+$/.test(totalAppointed.trim()) && Number(totalAppointed) !== filledRows.length;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl"><GraduationCap className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">शिक्षुता डेटा (Apprenticeship Data)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                शिक्षुता अनुभाग, निदेशालय हेतु मासिक / आवश्यकतानुसार विवरण • माह के अनुसार सहेजा जाता है, कभी भी संशोधित किया जा सकता है।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">माह (Month)</label>
            <input
              type="month"
              value={period}
              max={currentPeriod()}
              onChange={e => changePeriod(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-semibold"
            />
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            {loadError}
            <div className="text-rose-600/80 mt-0.5">
              यदि यह पहली बार है, तो सुनिश्चित करें कि सर्वर पर <span className="font-mono">002_add_apprenticeship_returns.sql</span> चलाया जा चुका है।
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> लोड हो रहा है...
        </div>
      ) : (
        <>
          {/* Header block (rows 3–5 of the sheet) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {periodLabel(period)} • वित्तीय वर्ष {fyName(period)}
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${existing ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {existing ? `सहेजा गया: ${fmtDateTime(existing.updatedAt)}` : 'इस माह हेतु अभी सहेजा नहीं गया'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ITI name (as per login)</label>
                <div className="px-2.5 py-2 text-xs bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-800">
                  {unit.name} <span className="font-mono text-slate-500">({unit.code})</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Sanctioned seats</label>
                <input
                  inputMode="numeric"
                  className={inputCls}
                  value={sanctionedSeats}
                  onChange={e => { setSanctionedSeats(e.target.value.replace(/\D/g, '')); touch(); }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Total apprentice appointed</label>
                <input
                  inputMode="numeric"
                  className={inputCls}
                  value={totalAppointed}
                  onChange={e => { setTotalAppointed(e.target.value.replace(/\D/g, '')); touch(); }}
                />
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={addRow} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              <Plus className="w-3.5 h-3.5" /> पंक्ति जोड़ें
            </button>
            <button
              onClick={copyFromPrevious}
              disabled={!previous}
              title={previous ? `${periodLabel(previous.period)} की सूची कॉपी करें` : 'कोई पिछला माह उपलब्ध नहीं'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy className="w-3.5 h-3.5" /> पिछले माह से कॉपी करें
            </button>
            <button onClick={() => setShowPaste(v => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg">
              <ClipboardPaste className="w-3.5 h-3.5" /> Excel से पेस्ट करें
            </button>
            <button onClick={autoCalcRequired} title="Required budget = stipend × शेष माह (फ़रवरी तक)" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg">
              <Calculator className="w-3.5 h-3.5" /> Required budget गणना
            </button>
          </div>

          {showPaste && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="text-xs text-slate-600">
                अपनी Excel शीट से केवल डेटा पंक्तियाँ (शीर्षक छोड़कर) कॉपी करके यहाँ पेस्ट करें। स्तंभ क्रम:
                <span className="font-mono"> Name, Trade, Contract number, Contact number, Stipend, Stipend paid upto, Available budget, Required budget</span>
              </div>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={5}
                className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-md"
                placeholder="Paste here (Ctrl+V)"
              />
              <div className="flex gap-2">
                <button onClick={importPasted} disabled={!pasteText.trim()} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg disabled:opacity-40">तालिका में जोड़ें</button>
                <button onClick={() => { setShowPaste(false); setPasteText(''); }} className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg">रद्द करें</button>
              </div>
            </div>
          )}

          {/* Grid (rows 6+ of the sheet) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-2 py-2 text-left w-10">#</th>
                    <th className="px-2 py-2 text-left min-w-[170px]">Name of apprentice</th>
                    <th className="px-2 py-2 text-left min-w-[130px]">Trade</th>
                    <th className="px-2 py-2 text-left min-w-[130px]">Contract number</th>
                    <th className="px-2 py-2 text-left min-w-[115px]">Contact number</th>
                    <th className="px-2 py-2 text-left min-w-[95px]">Stipend (In Rs)</th>
                    <th className="px-2 py-2 text-left min-w-[140px]">Stipend paid upto (month &amp; year)</th>
                    <th className="px-2 py-2 text-left min-w-[110px]">Available budget</th>
                    <th className="px-2 py-2 text-left min-w-[130px]">Required budget upto (FY {fyName(period)} – till Feb)</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="px-2 py-1.5 text-slate-500">{i + 1}</td>
                      <td className="px-1.5 py-1"><input className={inputCls} value={r.name} onChange={e => updateRow(r.id, { name: e.target.value })} /></td>
                      <td className="px-1.5 py-1"><input className={inputCls} value={r.trade} onChange={e => updateRow(r.id, { trade: e.target.value })} /></td>
                      <td className="px-1.5 py-1"><input className={inputCls} value={r.contractNumber} onChange={e => updateRow(r.id, { contractNumber: e.target.value })} /></td>
                      <td className="px-1.5 py-1"><input className={inputCls} inputMode="numeric" maxLength={10} value={r.contactNumber} onChange={e => updateRow(r.id, { contactNumber: e.target.value.replace(/\D/g, '') })} /></td>
                      <td className="px-1.5 py-1"><input className={inputCls} inputMode="decimal" value={r.stipend ?? ''} onChange={e => updateRow(r.id, { stipend: toNum(e.target.value) })} /></td>
                      <td className="px-1.5 py-1"><input type="month" className={inputCls} value={r.stipendPaidUpto} onChange={e => updateRow(r.id, { stipendPaidUpto: e.target.value })} /></td>
                      <td className="px-1.5 py-1"><input className={inputCls} inputMode="decimal" value={r.availableBudget ?? ''} onChange={e => updateRow(r.id, { availableBudget: toNum(e.target.value) })} /></td>
                      <td className="px-1.5 py-1"><input className={inputCls} inputMode="decimal" value={r.requiredBudget ?? ''} onChange={e => updateRow(r.id, { requiredBudget: toNum(e.target.value) })} /></td>
                      <td className="px-1.5 py-1 text-center">
                        <button onClick={() => removeRow(r.id)} title="पंक्ति हटाएं" className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-800">
                  <tr>
                    <td className="px-2 py-2" colSpan={2}>कुल दर्ज शिक्षु: {filledRows.length}</td>
                    <td colSpan={3}></td>
                    <td className="px-2 py-2">{inr(totalStipend)}</td>
                    <td></td>
                    <td className="px-2 py-2">{inr(totalAvail)}</td>
                    <td className="px-2 py-2">{inr(totalReq)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {countMismatch && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              "Total apprentice appointed" ({totalAppointed}) तालिका में दर्ज शिक्षुओं ({filledRows.length}) से मेल नहीं खाता। कृपया जाँच लें — फिर भी सहेजा जा सकता है।
            </div>
          )}

          {saveMsg && (
            <div className={`rounded-xl p-3 text-xs flex items-start gap-2 border ${saveMsg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {saveMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {saveMsg.text}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 sticky bottom-3">
            {dirty && <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">असहेजे परिवर्तन</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {existing ? 'अद्यतन करें (Update)' : 'सहेजें (Save)'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ===========================================================================
   JD / Directorate review screen
   =========================================================================== */

const Review: React.FC<{ currentUser: UserSession; fieldUnits: FieldUnit[] }> = ({
  currentUser,
  fieldUnits
}) => {
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [returns, setReturns] = useState<ApprenticeshipReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mandal, setMandal] = useState('ALL');
  const [district, setDistrict] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>('ALL');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const itis = useMemo(
    () => getScopedFieldUnits(currentUser, fieldUnits).filter(u => u.type === 'ITI'),
    [currentUser, fieldUnits]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getApprenticeshipReturns({ period })
      .then(data => { if (!cancelled) setReturns(data); })
      .catch(e => { if (!cancelled) setError(e?.message || 'डेटा लोड नहीं हो सका।'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const mandals = useMemo(() => Array.from(new Set(itis.map(u => u.zone))).sort(), [itis]);
  const districts = useMemo(
    () => Array.from(new Set(itis.filter(u => mandal === 'ALL' || u.zone === mandal).map(u => u.district))).sort(),
    [itis, mandal]
  );

  const byUnit = useMemo(() => {
    const m = new Map<string, ApprenticeshipReturn>();
    returns.forEach(r => m.set(r.fieldUnitId, r));
    return m;
  }, [returns]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return itis
      .filter(u => mandal === 'ALL' || u.zone === mandal)
      .filter(u => district === 'ALL' || u.district === district)
      .filter(u => !q || u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q))
      .map(u => ({ unit: u, ret: byUnit.get(u.id) }))
      .filter(x => status === 'ALL' || (status === 'SUBMITTED' ? !!x.ret : !x.ret))
      .sort((a, b) =>
        a.unit.zone.localeCompare(b.unit.zone) ||
        a.unit.district.localeCompare(b.unit.district) ||
        a.unit.name.localeCompare(b.unit.name)
      );
  }, [itis, byUnit, mandal, district, status, query]);

  const submitted = list.filter(x => x.ret);
  const allRows = submitted.flatMap(x => x.ret!.apprentices);
  const totals = {
    iti: list.length,
    submitted: submitted.length,
    seats: sum(submitted.map(x => x.ret!.sanctionedSeats)),
    appointed: sum(submitted.map(x => x.ret!.totalAppointed)),
    stipend: sum(allRows.map(r => r.stipend)),
    available: sum(allRows.map(r => r.availableBudget)),
    required: sum(allRows.map(r => r.requiredBudget))
  };
  const gap = totals.required - totals.available;

  const exportDetail = () => {
    const head = [
      'Sl No', 'Mandal', 'District', 'ITI Code', 'ITI Name', 'Month', 'Sanctioned seats',
      'Total apprentice appointed', 'Name of apprentice', 'Trade', 'Contract number',
      'Contact number', 'Stipend (In Rs)', 'Stipend paid upto (month & year)',
      'Available budget', `Required budget upto (FY ${fyName(period)} - till Feb)`
    ];
    const body: unknown[][] = [];
    let n = 0;
    submitted.forEach(({ unit, ret }) => {
      const rowsOut = ret!.apprentices.length ? ret!.apprentices : [null];
      rowsOut.forEach(r => {
        n++;
        body.push([
          n, unit.zone, unit.district, unit.code, unit.name, periodLabel(period),
          ret!.sanctionedSeats ?? '', ret!.totalAppointed ?? '',
          r?.name ?? '', r?.trade ?? '', r?.contractNumber ?? '', r?.contactNumber ?? '',
          r?.stipend ?? '', r?.stipendPaidUpto ? periodLabel(r.stipendPaidUpto) : '',
          r?.availableBudget ?? '', r?.requiredBudget ?? ''
        ]);
      });
    });
    downloadCsv(`apprenticeship_data_${period}.csv`, [head, ...body]);
  };

  const exportStatus = () => {
    const head = [
      'Sl No', 'Mandal', 'District', 'ITI Code', 'ITI Name', 'Month', 'Status',
      'Sanctioned seats', 'Total appointed', 'Apprentices listed', 'Total monthly stipend',
      'Available budget', 'Required budget', 'Last updated'
    ];
    const body = list.map(({ unit, ret }, i) => [
      i + 1, unit.zone, unit.district, unit.code, unit.name, periodLabel(period),
      ret ? 'Submitted' : 'Pending',
      ret?.sanctionedSeats ?? '', ret?.totalAppointed ?? '', ret?.apprentices.length ?? '',
      ret ? sum(ret.apprentices.map(r => r.stipend)) : '',
      ret ? sum(ret.apprentices.map(r => r.availableBudget)) : '',
      ret ? sum(ret.apprentices.map(r => r.requiredBudget)) : '',
      ret?.updatedAt ? fmtDateTime(ret.updatedAt) : ''
    ]);
    downloadCsv(`apprenticeship_status_${period}.csv`, [head, ...body]);
  };

  const card = (label: string, value: string, tone = 'text-slate-900') => (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-extrabold mt-0.5 ${tone}`}>{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl"><GraduationCap className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">शिक्षुता डेटा समीक्षा (Apprenticeship Data)</h2>
              <p className="text-xs text-slate-500 mt-0.5">आईटीआई द्वारा भरा गया माहवार शिक्षु विवरण, स्टाइपेंड एवं बजट स्थिति।</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportStatus} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 rounded-lg">
              <Download className="w-3.5 h-3.5" /> ITI-wise स्थिति (CSV)
            </button>
            <button onClick={exportDetail} disabled={!submitted.length} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> शिक्षु-वार विवरण (CSV)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">माह</label>
            <input type="month" value={period} max={currentPeriod()} onChange={e => e.target.value && setPeriod(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-semibold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">मण्डल</label>
            <select value={mandal} onChange={e => { setMandal(e.target.value); setDistrict('ALL'); }} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white">
              <option value="ALL">सभी</option>
              {mandals.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">जनपद</label>
            <select value={district} onChange={e => setDistrict(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white">
              <option value="ALL">सभी</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">स्थिति</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white">
              <option value="ALL">सभी</option>
              <option value="SUBMITTED">भरा गया</option>
              <option value="PENDING">लंबित</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">खोजें</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ITI नाम / कोड" className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {card('ITI (चयनित)', `${totals.submitted} / ${totals.iti}`, 'text-emerald-700')}
        {card('Sanctioned seats', inr(totals.seats))}
        {card('Appointed', inr(totals.appointed))}
        {card('Monthly stipend', `₹ ${inr(totals.stipend)}`)}
        {card('Available budget', `₹ ${inr(totals.available)}`)}
        {card('Required budget', `₹ ${inr(totals.required)}`)}
        {card(gap > 0 ? 'Shortfall' : 'Surplus', `₹ ${inr(Math.abs(gap))}`, gap > 0 ? 'text-rose-600' : 'text-emerald-700')}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> लोड हो रहा है...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  {['#', 'मण्डल', 'जनपद', 'ITI', 'स्थिति', 'Seats', 'Appointed', 'Listed', 'Required (₹)', 'Available (₹)', 'अंतिम अद्यतन', ''].map(h => (
                    <th key={h} className="px-2.5 py-2 text-left font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.length === 0 && (
                  <tr><td colSpan={12} className="px-3 py-6 text-center text-slate-500">कोई आईटीआई नहीं मिला।</td></tr>
                )}
                {list.map(({ unit, ret }, i) => {
                  const open = expandedId === unit.id;
                  return (
                    <React.Fragment key={unit.id}>
                      <tr className={`hover:bg-slate-50 ${ret ? 'cursor-pointer' : ''}`} onClick={() => ret && setExpandedId(open ? null : unit.id)}>
                        <td className="px-2.5 py-1.5 text-slate-500">{i + 1}</td>
                        <td className="px-2.5 py-1.5">{unit.zone}</td>
                        <td className="px-2.5 py-1.5">{unit.district}</td>
                        <td className="px-2.5 py-1.5 font-semibold text-slate-800">{unit.name}<span className="ml-1 font-mono text-[10px] text-slate-400">{unit.code}</span></td>
                        <td className="px-2.5 py-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ret ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {ret ? 'भरा गया' : 'लंबित'}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right">{ret ? inr(ret.sanctionedSeats) : '—'}</td>
                        <td className="px-2.5 py-1.5 text-right">{ret ? inr(ret.totalAppointed) : '—'}</td>
                        <td className="px-2.5 py-1.5 text-right">{ret ? ret.apprentices.length : '—'}</td>
                        <td className="px-2.5 py-1.5 text-right">{ret ? inr(sum(ret.apprentices.map(r => r.requiredBudget))) : '—'}</td>
                        <td className="px-2.5 py-1.5 text-right">{ret ? inr(sum(ret.apprentices.map(r => r.availableBudget))) : '—'}</td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap text-slate-500">{ret ? fmtDateTime(ret.updatedAt) : '—'}</td>
                        <td className="px-2.5 py-1.5 text-slate-400">{ret ? (open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null}</td>
                      </tr>
                      {open && ret && (
                        <tr>
                          <td colSpan={12} className="bg-slate-50 px-3 py-3">
                            <div className="text-[11px] text-slate-500 mb-2">
                              भरने वाला: <span className="font-semibold text-slate-700">{ret.submittedBy || '—'}</span>
                            </div>
                            <ApprenticeTable rows={ret.apprentices} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ===========================================================================
   Entry point
   =========================================================================== */

interface ApprenticeshipViewProps {
  currentUser: UserSession;
  fieldUnits: FieldUnit[];
  desks: DirectorateDesk[];
}

export const ApprenticeshipView: React.FC<ApprenticeshipViewProps> = ({
  currentUser,
  fieldUnits
}) => {
  if (currentUser.role === 'FIELD_ITI') {
    const unit = fieldUnits.find(u => u.id === currentUser.fieldUnitId);
    return <ItiEntry currentUser={currentUser} unit={unit} />;
  }
  return <Review currentUser={currentUser} fieldUnits={fieldUnits} />;
};
