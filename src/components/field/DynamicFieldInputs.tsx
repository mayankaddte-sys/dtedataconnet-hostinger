/* Inputs for the two "repeating" field kinds on the unit's submission form:
   - GridInput  : a table (columns x rows)
   - GroupInput : a block of fields repeated once per trade / batch, each block can hold
                  its own table (e.g. Trade 1 -> its trainees, Trade 2 -> its trainees ...) */
import React, { useRef, useState } from 'react';
import { CustomFieldDefinition, FieldSubmissionData, TableRowData, UploadedFile } from '../../types/portal';
import { acceptAttr, allowedKinds, checkFile, filesOf, fmtBytes, FILE_KINDS, maxBytesOf, maxFilesOf } from '../../utils/fileFields';
import { linkedRowCount, columnTotal, sourceRowsFor, MAX_GRID_ROWS } from '../../utils/fieldValue';

const cell =
  'w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-hidden disabled:bg-slate-100';

/* ---------------- document / report upload ---------------- */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(file);
  });

export const FileInput: React.FC<{
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  /** called with true while files are being read, false when done (lets the form block "submit") */
  onBusy?: (busy: boolean) => void;
}> = ({ field, value, onChange, disabled, onBusy }) => {
  const files = filesOf(value);
  const max = maxFilesOf(field);
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const addFiles = async (list: FileList | File[] | null) => {
    const picked = Array.from(list || []);
    if (picked.length === 0) return;
    const errs: string[] = [];
    const ok: File[] = [];
    picked.forEach(f => {
      const e = checkFile(field, f);
      if (e) errs.push(e);
      else if (files.length + ok.length >= max) errs.push(`"${f.name}": अधिकतम ${max} फ़ाइल ही जोड़ी जा सकती हैं।`);
      else ok.push(f);
    });
    setErrors(errs);
    if (ok.length === 0) return;
    setBusy(true);
    onBusy?.(true);
    try {
      const read: UploadedFile[] = [];
      for (const f of ok)
        read.push({
          id: `file_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          name: f.name,
          size: f.size,
          type: f.type,
          dataUrl: await readAsDataUrl(f)
        });
      onChange([...files, ...read]);
    } catch {
      setErrors(e => [...e, 'फ़ाइल पढ़ी नहीं जा सकी। कृपया दोबारा चुनें।']);
    } finally {
      setBusy(false);
      onBusy?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const full = files.length >= max;
  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={acceptAttr(field)}
        multiple={max > 1}
        disabled={disabled || full}
        onChange={e => addFiles(e.target.files)}
      />
      {!full && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); if (!disabled) addFiles(e.dataTransfer.files); }}
          className={`w-full p-4 border-2 border-dashed rounded-lg text-center transition-colors ${drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:bg-slate-50'} disabled:opacity-60`}
        >
          <div className="text-xs font-bold text-slate-800">{busy ? 'फ़ाइल पढ़ी जा रही है...' : max > 1 ? 'फ़ाइलें चुनें या यहाँ खींचकर छोड़ें' : 'फ़ाइल चुनें या यहाँ खींचकर छोड़ें'}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {allowedKinds(field).map(k => FILE_KINDS[k].label).join(' · ')} · प्रति फ़ाइल अधिकतम {fmtBytes(maxBytesOf(field))} · अधिकतम {max} फ़ाइल
          </div>
        </button>
      )}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{f.name}</div>
                <div className="text-[11px] text-slate-500">{fmtBytes(f.size)}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a href={f.dataUrl} download={f.name} className="text-[11px] font-bold text-indigo-700 underline">देखें / डाउनलोड</a>
                <button type="button" disabled={disabled} onClick={() => onChange(files.filter((_, k) => k !== i))} className="text-[11px] font-bold text-rose-600 hover:text-rose-800">
                  ✕ हटाएँ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 space-y-0.5">
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------------- institute list: division -> district -> ready rows ---------------- */
const SourceGridInput: React.FC<{
  field: CustomFieldDefinition;
  data: FieldSubmissionData;
  siblings: CustomFieldDefinition[];
  onChange: (rows: TableRowData[]) => void;
  disabled?: boolean;
}> = ({ field, data, siblings, onChange, disabled }) => {
  const [district, setDistrict] = useState('');
  const cols = field.tableColumns || [];
  const keyCol = cols.find(c => c.sourceKey === 'regno');
  const districtCol = cols.find(c => c.sourceKey === 'district');
  const divisionLabel = siblings.find(f => f.id === field.rowSource?.divisionFieldId)?.label || 'मंडल';
  const division = String(data[field.rowSource!.divisionFieldId] ?? '');
  const all = sourceRowsFor(field, data); // every institute of the chosen division
  const districts = Array.from(new Set(all.map(r => String(districtCol ? r[districtCol.id] : '')))).filter(Boolean).sort();
  const activeDistrict = districts.includes(district) ? district : '';
  const shown = all.filter(r => activeDistrict === '__all' || !districtCol || String(r[districtCol.id]) === activeDistrict);
  const editable = cols.filter(c => !c.readOnly && !c.sourceKey);
  const isFilled = (r: TableRowData) => editable.some(c => String(r[c.id] ?? '').trim() !== '');
  const filledCount = all.filter(isFilled).length;

  const setCell = (regno: string, colId: string, v: string | number) => {
    onChange(all.map(r => (keyCol && String(r[keyCol.id]) === regno ? { ...r, [colId]: v } : r)));
  };

  if (!division) {
    return (
      <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500">
        पहले "{divisionLabel}" चुनें — फिर जनपद चुनने पर उसके सभी संस्थान यहाँ दिखेंगे।
      </div>
    );
  }

  const showAll = district === '__all';
  const visible = showAll ? all : activeDistrict ? shown : [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={showAll ? '__all' : activeDistrict}
          disabled={disabled}
          onChange={e => setDistrict(e.target.value)}
          className={`${cell} sm:w-64`}
        >
          <option value="">-- जनपद चुनें --</option>
          <option value="__all">सभी जनपद ({all.length})</option>
          {districts.map(d => (
            <option key={d} value={d}>
              {d} ({all.filter(r => String(districtCol ? r[districtCol.id] : '') === d).length})
            </option>
          ))}
        </select>
        <span className="text-[11px] font-bold text-indigo-700">
          {division} मंडल: कुल {all.length} संस्थान · भरे गए {filledCount}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500">
          जनपद चुनें — उस जनपद के सभी संस्थान तालिका में दिखेंगे।
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs border-collapse min-w-[640px]">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-2 text-left w-10">क्र.</th>
                {cols.map(c => (
                  <th key={c.id} className="p-2 text-left font-bold">
                    {c.label}
                    {c.required && !c.readOnly && <span className="text-red-500 ml-0.5">*</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, ri) => {
                const regno = String(keyCol ? row[keyCol.id] : ri);
                return (
                  <tr key={regno} className={`border-t border-slate-100 ${isFilled(row) ? 'bg-emerald-50/40' : ''}`}>
                    <td className="p-2 text-slate-500">{ri + 1}</td>
                    {cols.map(c => (
                      <td key={c.id} className="p-1.5 align-top">
                        {c.readOnly || c.sourceKey ? (
                          <span className="text-slate-900">{String(row[c.id] ?? '')}</span>
                        ) : c.type === 'select' ? (
                          <select
                            disabled={disabled}
                            value={String(row[c.id] ?? '')}
                            onChange={e => setCell(regno, c.id, e.target.value)}
                            className={cell}
                          >
                            <option value="">-- चुनें --</option>
                            {(c.options || []).map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                            step="any"
                            disabled={disabled}
                            value={String(row[c.id] ?? '')}
                            onChange={e => setCell(regno, c.id, c.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
                            className={`${cell} min-w-[110px]`}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ---------------- table ---------------- */
export const GridInput: React.FC<{
  field: CustomFieldDefinition;
  /** the record this field lives in (whole form, or one group block) */
  data: FieldSubmissionData;
  siblings: CustomFieldDefinition[];
  onChange: (rows: TableRowData[]) => void;
  disabled?: boolean;
}> = ({ field, data, siblings, onChange, disabled }) => {
  if (field.rowSource) return <SourceGridInput field={field} data={data} siblings={siblings} onChange={onChange} disabled={disabled} />;
  const cols = field.tableColumns || [];
  const stored: TableRowData[] = Array.isArray(data[field.id]) ? (data[field.id] as TableRowData[]) : [];
  const n = linkedRowCount(field, data);
  const linked = n !== null;
  const rows: TableRowData[] = linked ? Array.from({ length: n as number }, (_, i) => stored[i] || {}) : stored;
  const maxRows = Math.min(field.maxRows || MAX_GRID_ROWS, MAX_GRID_ROWS);
  const sourceLabel = siblings.find(f => f.id === field.rowsFromFieldId)?.label;

  const setCell = (ri: number, colId: string, v: string | number) => {
    const next = rows.map(r => ({ ...r }));
    while (next.length <= ri) next.push({});
    next[ri][colId] = v;
    onChange(next);
  };

  if (linked && n === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500">
        "{sourceLabel || 'संबंधित प्रश्न'}" में संख्या भरने पर उतनी पंक्तियाँ यहाँ भरने के लिए दिखेंगी।
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {linked && (
        <p className="text-[11px] text-indigo-700 font-medium">
          "{sourceLabel}" के अनुसार {n} पंक्तियाँ भरें।
        </p>
      )}
      {(rows.length > 0 || !linked) && (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs border-collapse min-w-[480px]">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-2 text-left w-10">क्र.</th>
                {cols.map(c => (
                  <th key={c.id} className="p-2 text-left font-bold">
                    {c.label}
                    {c.required && <span className="text-red-500 ml-0.5">*</span>}
                  </th>
                ))}
                {!linked && <th className="p-2 w-10" />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 2} className="p-3 text-center text-slate-500 italic">
                    अभी कोई पंक्ति नहीं है — नीचे "+ पंक्ति जोड़ें" दबाकर विवरण भरना शुरू करें।
                  </td>
                </tr>
              )}
              {rows.map((row, ri) => (
                <tr key={ri} className="border-t border-slate-100">
                  <td className="p-2 text-slate-500">{ri + 1}</td>
                  {cols.map(c => (
                    <td key={c.id} className="p-1.5">
                      {c.type === 'select' ? (
                        <select
                          disabled={disabled}
                          value={String(row[c.id] ?? '')}
                          onChange={e => setCell(ri, c.id, e.target.value)}
                          required={!!c.required}
                          className={cell}
                        >
                          <option value="">-- चुनें --</option>
                          {(c.options || []).map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                          step="any"
                          disabled={disabled}
                          value={String(row[c.id] ?? '')}
                          onChange={e => setCell(ri, c.id, c.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
                          required={!!c.required}
                          className={`${cell} min-w-[110px]`}
                        />
                      )}
                    </td>
                  ))}
                  {!linked && (
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(rows.filter((_, i) => i !== ri))}
                        className="text-slate-400 hover:text-rose-600"
                        title="पंक्ति हटाएँ"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {cols.some(c => c.type === 'number' && c.showTotal) && rows.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-300">
                <tr>
                  <td className="p-2 font-bold text-slate-700" colSpan={1}>कुल</td>
                  {cols.map(c => (
                    <td key={c.id} className="p-2 font-bold text-slate-900">
                      {c.type === 'number' && c.showTotal ? columnTotal(rows, c.id) : ''}
                    </td>
                  ))}
                  {!linked && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      {!linked && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disabled || rows.length >= maxRows}
            onClick={() => onChange([...rows, {}])}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold disabled:opacity-50"
          >
            + पंक्ति जोड़ें
          </button>
          <span className="text-[11px] text-slate-500">{rows.length} पंक्तियाँ (अधिकतम {maxRows})</span>
        </div>
      )}
    </div>
  );
};

/* ---------------- single field inside a group block ---------------- */
const SimpleInput: React.FC<{
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (v: string | number) => void;
  disabled?: boolean;
}> = ({ field, value, onChange, disabled }) => {
  const v = value === undefined || value === null ? '' : String(value);
  if (field.type === 'select') {
    return (
      <select disabled={disabled} required={field.required} value={v} onChange={e => onChange(e.target.value)} className={cell}>
        <option value="">-- चुनें --</option>
        {(field.options || []).map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return <textarea disabled={disabled} required={field.required} value={v} onChange={e => onChange(e.target.value)} rows={2} className={cell} />;
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      step={field.type === 'number' ? 'any' : undefined}
      min={field.type === 'number' ? field.min : undefined}
      max={field.type === 'number' ? field.max : undefined}
      disabled={disabled}
      required={field.required}
      placeholder={field.placeholder}
      value={v}
      onChange={e => onChange(field.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
      className={cell}
    />
  );
};

/* ---------------- repeating group ---------------- */
export const GroupInput: React.FC<{
  field: CustomFieldDefinition;
  data: FieldSubmissionData;
  siblings: CustomFieldDefinition[];
  onChange: (blocks: FieldSubmissionData[]) => void;
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
}> = ({ field, data, siblings, onChange, disabled, onBusy }) => {
  const subs = field.groupFields || [];
  const stored: FieldSubmissionData[] = Array.isArray(data[field.id]) ? (data[field.id] as FieldSubmissionData[]) : [];
  const n = linkedRowCount(field, data);
  const linked = n !== null;
  const blocks: FieldSubmissionData[] = linked ? Array.from({ length: n as number }, (_, i) => stored[i] || {}) : stored;
  const maxBlocks = Math.min(field.maxRows || MAX_GRID_ROWS, MAX_GRID_ROWS);
  const title = field.itemLabel || 'खंड';
  const sourceLabel = siblings.find(f => f.id === field.rowsFromFieldId)?.label;

  const setBlock = (bi: number, next: FieldSubmissionData) => {
    const all = blocks.map(b => ({ ...b }));
    while (all.length <= bi) all.push({});
    all[bi] = next;
    onChange(all);
  };

  if (linked && n === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500">
        "{sourceLabel || 'संबंधित प्रश्न'}" में संख्या भरने पर उतने {title} यहाँ भरने के लिए दिखेंगे।
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {linked && (
        <p className="text-[11px] text-indigo-700 font-medium">
          "{sourceLabel}" के अनुसार {n} {title} का विवरण क्रम से भरें।
        </p>
      )}

      {blocks.map((block, bi) => (
        <div key={bi} className="border border-indigo-200 rounded-xl bg-indigo-50/30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-indigo-100/70 border-b border-indigo-200">
            <span className="text-xs font-extrabold text-indigo-900">
              {title} {bi + 1}
            </span>
            {!linked && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(blocks.filter((_, i) => i !== bi))}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
              >
                ✕ हटाएँ
              </button>
            )}
          </div>

          <div className="p-3 space-y-3">
            {subs.map(sf => (
              <div key={sf.id} className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  {sf.label}
                  {sf.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {sf.helpText && <p className="text-[11px] text-slate-500">{sf.helpText}</p>}
                {sf.type === 'repeat_group' ? (
                  <GroupInput
                    field={sf}
                    data={block}
                    siblings={subs}
                    disabled={disabled}
                    onBusy={onBusy}
                    onChange={inner => setBlock(bi, { ...block, [sf.id]: inner })}
                  />
                ) : sf.type === 'file' ? (
                  <FileInput
                    field={sf}
                    value={block[sf.id]}
                    disabled={disabled}
                    onBusy={onBusy}
                    onChange={files => setBlock(bi, { ...block, [sf.id]: files })}
                  />
                ) : sf.type === 'table_grid' ? (
                  <GridInput
                    field={sf}
                    data={block}
                    siblings={subs}
                    disabled={disabled}
                    onChange={rows => setBlock(bi, { ...block, [sf.id]: rows })}
                  />
                ) : (
                  <SimpleInput
                    field={sf}
                    value={block[sf.id]}
                    disabled={disabled}
                    onChange={v => setBlock(bi, { ...block, [sf.id]: v })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!linked && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disabled || blocks.length >= maxBlocks}
            onClick={() => onChange([...blocks, {}])}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
          >
            + {title} जोड़ें
          </button>
          <span className="text-[11px] text-slate-500">{blocks.length} {title} (अधिकतम {maxBlocks})</span>
        </div>
      )}
    </div>
  );
};
