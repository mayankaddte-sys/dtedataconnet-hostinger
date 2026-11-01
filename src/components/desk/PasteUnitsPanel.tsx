/* Add many ITIs / JD offices at once by pasting their names or codes
   (e.g. a column copied from Excel). Used when making a Bunch and when
   adding units to an existing demand. */
import React, { useMemo, useState } from 'react';
import { FieldUnit } from '../../types/portal';
import { matchUnitsFromText, MatchResult } from '../../utils/unitMatcher';
import { ClipboardPaste, Check, AlertTriangle, XCircle, Plus } from 'lucide-react';

interface Props {
  fieldUnits: FieldUnit[];
  /** units that are already in the bunch / demand */
  existingIds: string[];
  onAdd: (unitIds: string[]) => void;
}

const HOW: Record<string, string> = { code: 'कोड से', number: 'संख्या से', name: 'नाम से' };

export const PasteUnitsPanel: React.FC<Props> = ({ fieldUnits, existingIds, onAdd }) => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [showMatched, setShowMatched] = useState(false);

  const existing = useMemo(() => new Set(existingIds), [existingIds]);

  const run = () => {
    setMessage('');
    setPicks(new Set());
    setResult(text.trim() ? matchUnitsFromText(text, fieldUnits) : null);
  };

  const togglePick = (id: string) =>
    setPicks(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const newMatched = result ? result.matched.filter(m => !existing.has(m.unit.id)) : [];
  const alreadyIn = result ? result.matched.length - newMatched.length : 0;
  const pickedNew = Array.from(picks).filter(id => !existing.has(id));
  const toAdd = Array.from(new Set([...newMatched.map(m => m.unit.id), ...pickedNew]));

  const doAdd = () => {
    if (toAdd.length === 0) return;
    onAdd(toAdd);
    setMessage(`${toAdd.length} इकाइयाँ जोड़ी गईं।`);
    // keep only what still needs a decision
    if (result) {
      setResult({ ...result, matched: [], ambiguous: result.ambiguous.filter(a => !a.candidates.some(c => picks.has(c.id))), notFound: result.notFound.filter(n => !n.suggestions.some(s => picks.has(s.id))) });
    }
    setPicks(new Set());
  };

  return (
    <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
        <ClipboardPaste className="w-4 h-4 text-indigo-700" />
        <span>एक साथ पेस्ट करके जोड़ें (ITI के नाम / कोड)</span>
      </div>
      <p className="text-[11px] text-indigo-800 leading-relaxed">
        Excel से कॉलम कॉपी करके यहाँ चिपकाएँ — हर पंक्ति में एक ITI का कोड (<span className="font-mono">ITI-UP-209</span> या केवल <span className="font-mono">209</span>) या नाम (जैसे <span className="font-mono">Nandgaon</span>, <span className="font-mono">Government ITI, Agra</span>)। कोड कॉमा से अलग करके भी चिपका सकते हैं।
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        placeholder={'ITI-UP-209\n197\nGovernment ITI, Gonda\nNandgaon'}
        className="w-full text-xs font-mono px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-hidden"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={!text.trim()}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
        >
          मिलान करें
        </button>
        {(text || result) && (
          <button
            type="button"
            onClick={() => { setText(''); setResult(null); setPicks(new Set()); setMessage(''); }}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            साफ़ करें
          </button>
        )}
      </div>

      {message && (
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">{message}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1"><Check className="w-3 h-3" /> मिले: {result.matched.length}</span>
            {result.ambiguous.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> चुनना है: {result.ambiguous.length}</span>
            )}
            {result.notFound.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> नहीं मिले: {result.notFound.length}</span>
            )}
            {alreadyIn > 0 && <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">पहले से शामिल: {alreadyIn}</span>}
            {result.duplicates > 0 && <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">दोहराए गए: {result.duplicates}</span>}
          </div>

          {result.matched.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowMatched(v => !v)} className="text-[11px] font-bold text-indigo-700 underline">
                {showMatched ? 'मिली इकाइयों की सूची छिपाएँ' : 'मिली इकाइयों की सूची देखें'}
              </button>
              {showMatched && (
                <div className="mt-1.5 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {result.matched.map(m => (
                    <div key={m.unit.id} className="px-3 py-1.5 text-[11px] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{m.unit.name}</div>
                        <div className="text-slate-500">{m.unit.code} · {m.unit.district} · चिपकाया: "{m.token}" ({HOW[m.how]})</div>
                      </div>
                      {existing.has(m.unit.id) && <span className="text-slate-500 shrink-0">पहले से शामिल</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {result.ambiguous.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-amber-900">इन नामों से एक से अधिक इकाइयाँ मिलीं — जो चाहिए उन पर टिक करें:</div>
              {result.ambiguous.map((a, i) => (
                <div key={i} className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                  <div className="text-[11px] font-bold text-slate-800">"{a.token}"</div>
                  {a.candidates.slice(0, 12).map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input type="checkbox" checked={picks.has(c.id) || existing.has(c.id)} disabled={existing.has(c.id)} onChange={() => togglePick(c.id)} />
                      <span className="font-medium text-slate-900">{c.name}</span>
                      <span className="text-slate-500">{c.code}</span>
                    </label>
                  ))}
                  {a.candidates.length > 12 && <div className="text-[10px] text-slate-500">... और {a.candidates.length - 12} (नाम और स्पष्ट लिखकर दोबारा मिलान करें)</div>}
                </div>
              ))}
            </div>
          )}

          {result.notFound.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-rose-900">ये नहीं मिले (वर्तनी जाँचें):</div>
              {result.notFound.map((n, i) => (
                <div key={i} className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] space-y-1">
                  <div className="font-bold text-slate-800">"{n.token}"</div>
                  {n.suggestions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-600">क्या आपका आशय:</span>
                      {n.suggestions.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => togglePick(s.id)}
                          className={`px-2 py-0.5 rounded border font-medium ${picks.has(s.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'}`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={doAdd}
            disabled={toAdd.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{toAdd.length} इकाइयाँ जोड़ें</span>
          </button>
        </div>
      )}
    </div>
  );
};
