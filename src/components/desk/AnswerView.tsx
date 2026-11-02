/* Read-only display of one submitted answer on the desk's review screen.
   Plain values as text, tables as tables, repeat groups as one card per trade / batch
   (each card showing its own nested table). */
import React from 'react';
import { CustomFieldDefinition, FieldSubmissionData, TableRowData } from '../../types/portal';
import { formatAnswer, columnTotal } from '../../utils/fieldValue';
import { filesOf, fmtBytes } from '../../utils/fileFields';

const TableView: React.FC<{ field: CustomFieldDefinition; rows: TableRowData[] }> = ({ field, rows }) => (
  <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
    <table className="w-full text-xs font-normal border-collapse">
      <thead className="bg-slate-100 text-slate-700">
        <tr>
          <th className="p-1.5 text-left w-8">#</th>
          {(field.tableColumns || []).map(c => (
            <th key={c.id} className="p-1.5 text-left font-bold">{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className="border-t border-slate-100">
            <td className="p-1.5 text-slate-500">{ri + 1}</td>
            {(field.tableColumns || []).map(c => (
              <td key={c.id} className="p-1.5 text-slate-900">{String(row?.[c.id] ?? '')}</td>
            ))}
          </tr>
        ))}
      </tbody>
      {(field.tableColumns || []).some(c => c.type === 'number' && c.showTotal) && (
        <tfoot className="bg-slate-50 border-t border-slate-300">
          <tr>
            <td className="p-1.5 font-bold text-slate-700">कुल</td>
            {(field.tableColumns || []).map(c => (
              <td key={c.id} className="p-1.5 font-bold text-slate-900">
                {c.type === 'number' && c.showTotal ? columnTotal(rows, c.id) : ''}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  </div>
);

export const AnswerView: React.FC<{ field: CustomFieldDefinition; value: unknown }> = ({ field, value }) => {
  const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  if (empty) return <span className="text-slate-400 font-normal italic">Not provided</span>;

  if (field.type === 'file') {
    const files = filesOf(value);
    if (files.length === 0) return <span className="text-slate-400 font-normal italic">Not provided</span>;
    return (
      <ul className="space-y-1.5 font-normal">
        {files.map((f, i) => (
          <li key={i} className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg">
            {f.type.startsWith('image/') && <img src={f.dataUrl} alt={f.name} className="h-14 w-14 object-cover rounded border border-slate-200" />}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">{f.name}</div>
              <div className="text-[11px] text-slate-500">{fmtBytes(f.size)}</div>
            </div>
            {f.dataUrl ? (
              <a href={f.dataUrl} download={f.name} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold shrink-0">
                डाउनलोड
              </a>
            ) : (
              <span className="text-[11px] text-slate-400 shrink-0">फ़ाइल खुलने पर उपलब्ध</span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (field.type === 'table_grid' && Array.isArray(value)) {
    return <TableView field={field} rows={value as TableRowData[]} />;
  }

  if (field.type === 'repeat_group' && Array.isArray(value)) {
    const title = field.itemLabel || 'खंड';
    return (
      <div className="space-y-2 font-normal">
        {(value as FieldSubmissionData[]).map((block, bi) => (
          <div key={bi} className="border border-indigo-200 rounded-lg bg-white overflow-hidden">
            <div className="px-3 py-1.5 bg-indigo-100/70 text-xs font-extrabold text-indigo-900">
              {title} {bi + 1}
            </div>
            <div className="p-3 space-y-2">
              {(field.groupFields || []).map(sf => (
                <div key={sf.id}>
                  <div className="text-[11px] font-semibold text-slate-500">{sf.label}</div>
                  <div className="text-sm font-bold text-slate-900 break-words">
                    <AnswerView field={sf} value={block?.[sf.id]} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <>{formatAnswer(value, field)}</>;
};
