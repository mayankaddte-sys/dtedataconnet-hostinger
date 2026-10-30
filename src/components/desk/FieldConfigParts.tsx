/* Shared field-builder pieces used by the Create and Edit demand windows:
   - OptionsRangeHelper : "1 to 150" dropdown options in one click
   - RowSourceSelector  : table rows are typed by hand OR follow another field's answer
   - TableColumnsEditor : columns of a table-grid field                                  */
import React, { useState } from 'react';
import { CustomFieldDefinition, TableColumnConfig } from '../../types/portal';
import { Plus, Trash2 } from 'lucide-react';
import { MAX_GRID_ROWS } from '../../utils/fieldValue';

const inputCls =
  'w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden';
const labelCls = 'block text-[11px] font-bold text-slate-700 mb-1';

export const OptionsRangeHelper: React.FC<{ onGenerate: (options: string[]) => void }> = ({ onGenerate }) => {
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('150');
  const make = () => {
    const a = parseInt(from, 10);
    const b = parseInt(to, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) {
      alert('कृपया सही सीमा दर्ज करें (प्रारंभ ≤ अंत)।');
      return;
    }
    if (b - a + 1 > 500) {
      alert('एक बार में अधिकतम 500 विकल्प बनाए जा सकते हैं।');
      return;
    }
    onGenerate(Array.from({ length: b - a + 1 }, (_, i) => String(a + i)));
  };
  return (
    <div className="flex items-center gap-2 flex-wrap p-2 bg-indigo-50/60 border border-indigo-200 rounded-lg text-[11px]">
      <span className="font-bold text-indigo-900">संख्या के विकल्प स्वतः बनाएँ:</span>
      <input type="number" value={from} onChange={e => setFrom(e.target.value)} className={`${inputCls} w-20`} />
      <span>से</span>
      <input type="number" value={to} onChange={e => setTo(e.target.value)} className={`${inputCls} w-20`} />
      <span>तक</span>
      <button
        type="button"
        onClick={make}
        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold"
      >
        विकल्प बनाएँ
      </button>
    </div>
  );
};

export const RowSourceSelector: React.FC<{
  field: CustomFieldDefinition;
  allFields: CustomFieldDefinition[];
  onChange: (patch: Partial<CustomFieldDefinition>) => void;
}> = ({ field, allFields, onChange }) => {
  // a count can come from a dropdown, a radio list or a number field placed anywhere in the form
  const sources = allFields.filter(f => f.id !== field.id && (f.type === 'select' || f.type === 'radio' || f.type === 'number'));
  const linked = !!field.rowsFromFieldId;
  return (
    <div className="space-y-2 p-2.5 bg-white border border-slate-200 rounded-lg">
      <label className={labelCls}>पंक्तियों (Rows) की संख्या कैसे तय होगी?</label>
      <select
        className={inputCls}
        value={field.rowsFromFieldId || ''}
        onChange={e => onChange({ rowsFromFieldId: e.target.value || undefined })}
      >
        <option value="">इकाई स्वयं पंक्तियाँ जोड़े / हटाए (मैन्युअल)</option>
        {sources.map(s => (
          <option key={s.id} value={s.id}>
            ऊपर के प्रश्न के उत्तर के अनुसार: {s.label || '(बिना नाम का फ़ील्ड)'}
          </option>
        ))}
      </select>
      {linked ? (
        <p className="text-[11px] text-slate-500">
          इकाई उस प्रश्न में जो संख्या चुनेगी (जैसे 12), उतनी पंक्तियाँ अपने-आप दिखेंगी। संख्या बदलने पर पंक्तियाँ घटती-बढ़ती रहेंगी।
        </p>
      ) : (
        sources.length === 0 && (
          <p className="text-[11px] text-slate-500">
            संख्या-आधारित पंक्तियों के लिए पहले एक Dropdown / Number फ़ील्ड जोड़ें (उदा. "कुल प्रशिक्षक कितने हैं?")।
          </p>
        )
      )}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-slate-600">अधिकतम पंक्तियाँ</label>
        <input
          type="number"
          min={1}
          max={MAX_GRID_ROWS}
          className={`${inputCls} w-24`}
          value={field.maxRows ?? ''}
          placeholder={String(MAX_GRID_ROWS)}
          onChange={e => onChange({ maxRows: e.target.value === '' ? undefined : Math.min(MAX_GRID_ROWS, Math.max(1, Number(e.target.value))) })}
        />
      </div>
    </div>
  );
};

export const TableColumnsEditor: React.FC<{
  field: CustomFieldDefinition;
  onChange: (patch: Partial<CustomFieldDefinition>) => void;
}> = ({ field, onChange }) => {
  const cols = field.tableColumns || [];
  const [draft, setDraft] = useState<Record<string, string>>({});
  const setCol = (id: string, patch: Partial<TableColumnConfig>) =>
    onChange({ tableColumns: cols.map(c => (c.id === id ? { ...c, ...patch } : c)) });
  return (
    <div className="space-y-2">
      <label className={labelCls}>प्रत्येक पंक्ति में भरी जाने वाली जानकारी (कॉलम)</label>
      {cols.map(c => (
        <div key={c.id} className="flex items-center gap-2 flex-wrap p-2 bg-white border border-slate-200 rounded-lg">
          <input
            className={`${inputCls} flex-1 min-w-[140px]`}
            placeholder="कॉलम का नाम (उदा. प्रशिक्षक का नाम)"
            value={c.label}
            onChange={e => setCol(c.id, { label: e.target.value })}
          />
          <select
            className={`${inputCls} w-28`}
            value={c.type}
            onChange={e => setCol(c.id, { type: e.target.value as TableColumnConfig['type'] })}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Dropdown</option>
          </select>
          {c.type === 'select' && (
            <input
              className={`${inputCls} flex-1 min-w-[160px]`}
              placeholder="विकल्प (कॉमा से अलग)"
              value={draft[c.id] ?? (c.options || []).join(', ')}
              onChange={e => {
                const raw = e.target.value;
                setDraft(d => ({ ...d, [c.id]: raw }));
                setCol(c.id, { options: raw.split(',').map(s => s.trim()).filter(Boolean) });
              }}
            />
          )}
          <label className="flex items-center gap-1 text-[11px]">
            <input type="checkbox" checked={!!c.required} onChange={e => setCol(c.id, { required: e.target.checked })} />
            अनिवार्य
          </label>
          <button
            type="button"
            onClick={() => onChange({ tableColumns: cols.filter(x => x.id !== c.id) })}
            className="p-1 text-slate-400 hover:text-rose-600"
            title="कॉलम हटाएँ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            tableColumns: [...cols, { id: `col_${Date.now().toString(36)}${cols.length}`, label: '', type: 'text', required: true }]
          })
        }
        className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> कॉलम जोड़ें
      </button>
    </div>
  );
};
