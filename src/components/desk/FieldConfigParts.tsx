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
  /** adds a ready-made "how many rows?" number question above this table and links it */
  onCreateCountField?: () => void;
}> = ({ field, allFields, onChange, onCreateCountField }) => {
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
      {!linked && onCreateCountField && (
        <button
          type="button"
          onClick={onCreateCountField}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5"
        >
          <Plus className="w-3 h-3" />
          <span>"कितनी पंक्तियाँ?" संख्या-प्रश्न बनाएँ और इस तालिका से जोड़ें</span>
        </button>
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
  /** return false to cancel removing a column (e.g. when units already answered) */
  confirmRemove?: (col: TableColumnConfig) => boolean;
}> = ({ field, onChange, confirmRemove }) => {
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
            <option value="date">Date (तिथि)</option>
          </select>
          {c.type === 'number' && (
            <label className="flex items-center gap-1 text-[11px]" title="तालिका के नीचे इस कॉलम का योग दिखेगा">
              <input type="checkbox" checked={!!c.showTotal} onChange={e => setCol(c.id, { showTotal: e.target.checked })} />
              कुल (Total)
            </label>
          )}
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
            onClick={() => {
              if (confirmRemove && !confirmRemove(c)) return;
              onChange({ tableColumns: cols.filter(x => x.id !== c.id) });
            }}
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

/* ---------------- repeating group ("trade-wise" blocks) ---------------- */
const subId = (n: number) => `sub_${Date.now().toString(36)}${n}`;

/** Neutral starting point for a new repeating block - the desk defines what is asked. */
export function makeEmptyGroup(): Pick<CustomFieldDefinition, 'itemLabel' | 'groupFields'> {
  return {
    itemLabel: 'प्रविष्टि',
    groupFields: [{ id: subId(0), label: 'नाम / शीर्षक', type: 'text', required: true }]
  };
}

/** Example block: Trade name -> number of trainees -> that trade's trainee table. */
export function makeTradeGroupPreset(): Pick<CustomFieldDefinition, 'itemLabel' | 'groupFields'> {
  const countId = subId(1);
  return {
    itemLabel: 'ट्रेड',
    groupFields: [
      { id: subId(0), label: 'ट्रेड का नाम', type: 'text', required: true },
      { id: countId, label: 'इस ट्रेड में कुल कितने प्रशिक्षणार्थी हैं?', type: 'number', required: true, min: 1, max: 200 },
      {
        id: subId(2),
        label: 'इस ट्रेड के प्रशिक्षणार्थियों का विवरण',
        type: 'table_grid',
        required: true,
        rowsFromFieldId: countId,
        tableColumns: [
          { id: `col_${Date.now().toString(36)}a`, label: 'नाम', type: 'text', required: true },
          { id: `col_${Date.now().toString(36)}b`, label: 'प्रवेश संख्या (Admission No.)', type: 'text', required: true },
          { id: `col_${Date.now().toString(36)}c`, label: 'जन्म तिथि (DoB)', type: 'text', required: true }
        ]
      }
    ]
  };
}

const SUB_TYPE_LABELS: Record<string, string> = {
  text: 'छोटा टेक्स्ट',
  textarea: 'लंबा टेक्स्ट',
  number: 'संख्या',
  date: 'तिथि',
  select: 'Dropdown',
  table_grid: 'तालिका (Table)',
  repeat_group: 'दोहराया खंड (Group)'
};

export const GroupFieldsEditor: React.FC<{
  field: CustomFieldDefinition;
  onChange: (patch: Partial<CustomFieldDefinition>) => void;
  /** nesting level (0 = top-level group); blocks can nest up to 3 levels */
  depth?: number;
}> = ({ field, onChange, depth = 0 }) => {
  const subs = field.groupFields || [];
  const [optDraft, setOptDraft] = useState<Record<string, string>>({});

  const setSubs = (next: CustomFieldDefinition[]) => onChange({ groupFields: next });
  const updateSub = (id: string, patch: Partial<CustomFieldDefinition>) =>
    setSubs(subs.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const removeSub = (id: string) =>
    setSubs(subs.filter(s => s.id !== id).map(s => (s.rowsFromFieldId === id ? { ...s, rowsFromFieldId: undefined } : s)));
  const addSub = (type: CustomFieldDefinition['type']) => {
    const s: CustomFieldDefinition = {
      id: subId(subs.length),
      label: '',
      type,
      required: true,
      ...(type === 'select' ? { options: [] } : {}),
      ...(type === 'repeat_group' ? makeEmptyGroup() : {}),
      ...(type === 'table_grid'
        ? { tableColumns: [{ id: `col_${Date.now().toString(36)}0`, label: '', type: 'text' as const, required: true }] }
        : {})
    };
    setSubs([...subs, s]);
  };

  return (
    <div className="space-y-3 p-3 bg-indigo-50/40 border border-indigo-200 rounded-xl">
      <div>
        <label className={labelCls}>प्रत्येक खंड का नाम (जैसे: ट्रेड, बैच, प्रशिक्षक)</label>
        <input
          className={inputCls}
          value={field.itemLabel || ''}
          placeholder="ट्रेड"
          onChange={e => onChange({ itemLabel: e.target.value || undefined })}
        />
        <p className="text-[11px] text-slate-500 mt-1">
          इकाई को "{field.itemLabel || 'खंड'} 1", "{field.itemLabel || 'खंड'} 2" ... के रूप में क्रम से हर खंड का विवरण भरना होगा।
        </p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm('मौजूदा खंड-फ़ील्ड्स हटाकर उदाहरण (ट्रेड → प्रशिक्षणार्थी तालिका) भरें?')) return;
            onChange(makeTradeGroupPreset());
          }}
          className="mt-1.5 text-[11px] font-bold text-indigo-700 underline"
        >
          उदाहरण भरें: ट्रेड → प्रशिक्षणार्थियों की तालिका
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-700">हर खंड में भरी जाने वाली जानकारी</div>
        {subs.map((s, i) => (
          <div key={s.id} className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 w-4">{i + 1}.</span>
              <input
                className={`${inputCls} flex-1 min-w-[180px]`}
                placeholder="प्रश्न / फ़ील्ड का नाम"
                value={s.label}
                onChange={e => updateSub(s.id, { label: e.target.value })}
              />
              <select
                className={`${inputCls} w-36`}
                value={s.type}
                onChange={e => {
                  const t = e.target.value as CustomFieldDefinition['type'];
                  const patch: Partial<CustomFieldDefinition> = { type: t };
                  if (t === 'select' && !s.options) patch.options = [];
                  if (t === 'repeat_group' && !s.groupFields) Object.assign(patch, makeEmptyGroup());
                  if (t === 'table_grid' && !s.tableColumns)
                    patch.tableColumns = [{ id: `col_${Date.now().toString(36)}0`, label: '', type: 'text', required: true }];
                  updateSub(s.id, patch);
                }}
              >
                {Object.entries(SUB_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-[11px]">
                <input type="checkbox" checked={s.required} onChange={e => updateSub(s.id, { required: e.target.checked })} />
                अनिवार्य
              </label>
              <button type="button" onClick={() => removeSub(s.id)} className="p-1 text-slate-400 hover:text-rose-600" title="हटाएँ">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {s.type === 'select' && (
              <div className="space-y-1.5">
                <input
                  className={inputCls}
                  placeholder="विकल्प (कॉमा से अलग) — जैसे: Electrician, Fitter, Welder"
                  value={optDraft[s.id] ?? (s.options || []).join(', ')}
                  onChange={e => {
                    const raw = e.target.value;
                    setOptDraft(d => ({ ...d, [s.id]: raw }));
                    updateSub(s.id, { options: raw.split(',').map(x => x.trim()).filter(Boolean) });
                  }}
                />
                <OptionsRangeHelper
                  onGenerate={opts => {
                    setOptDraft(d => ({ ...d, [s.id]: opts.join(', ') }));
                    updateSub(s.id, { options: opts });
                  }}
                />
              </div>
            )}

            {s.type === 'table_grid' && (
              <div className="space-y-2 pl-2 border-l-2 border-indigo-200">
                <RowSourceSelector
                  field={s}
                  allFields={subs}
                  onChange={patch => updateSub(s.id, patch)}
                  onCreateCountField={() => {
                    const cid = subId(subs.length + 1);
                    const countField: CustomFieldDefinition = {
                      id: cid,
                      label: `${s.label || 'तालिका'} — कुल कितनी पंक्तियाँ?`,
                      type: 'number',
                      required: true,
                      min: 1,
                      max: s.maxRows || 40
                    };
                    const at = subs.findIndex(x => x.id === s.id);
                    const next = [...subs];
                    next.splice(at < 0 ? next.length : at, 0, countField);
                    setSubs(next.map(x => (x.id === s.id ? { ...x, rowsFromFieldId: cid } : x)));
                  }}
                />
                <TableColumnsEditor field={s} onChange={patch => updateSub(s.id, patch)} />
              </div>
            )}

            {s.type === 'repeat_group' && (
              <div className="space-y-2 pl-2 border-l-2 border-violet-300">
                <RowSourceSelector field={s} allFields={subs} onChange={patch => updateSub(s.id, patch)} />
                <GroupFieldsEditor field={s} depth={depth + 1} onChange={patch => updateSub(s.id, patch)} />
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-1.5">
          {(depth < 2
            ? (['text', 'number', 'select', 'date', 'table_grid', 'repeat_group'] as const)
            : (['text', 'number', 'select', 'date', 'table_grid'] as const)
          ).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => addSub(t)}
              className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {SUB_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
