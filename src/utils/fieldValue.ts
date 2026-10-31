import { CustomFieldDefinition, FieldSubmissionData, TableRowData } from '../types/portal';

/** hard ceiling for rows in a table-grid field */
export const MAX_GRID_ROWS = 300;

/**
 * Number of rows a table-grid field must show.
 * - linked grid (rowsFromFieldId set): follows the number the unit picked/typed
 *   in that other field (e.g. "How many instructors?" = 12 -> 12 rows)
 * - manual grid: returns null (unit adds / removes rows itself)
 */
export function linkedRowCount(field: CustomFieldDefinition, data: FieldSubmissionData): number | null {
  if (!field.rowsFromFieldId) return null;
  const raw = data[field.rowsFromFieldId];
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, field.maxRows || MAX_GRID_ROWS, MAX_GRID_ROWS);
}

const isEmptyRow = (row: TableRowData) =>
  Object.values(row || {}).every(v => v === '' || v === undefined || v === null);

const isEmptyValue = (v: unknown): boolean => {
  if (v === '' || v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0 || v.every(x => (typeof x === 'object' && x !== null ? isEmptyInstance(x as FieldSubmissionData) : isEmptyValue(x)));
  return false;
};
const isEmptyInstance = (inst: FieldSubmissionData): boolean => Object.values(inst || {}).every(isEmptyValue);

/**
 * Trim answers before saving: linked tables / groups are cut to the chosen count,
 * manual ones drop fully empty rows, and nested tables inside groups are cleaned the same way.
 */
export function normalizeGridData(fields: CustomFieldDefinition[], data: FieldSubmissionData): FieldSubmissionData {
  const out: FieldSubmissionData = { ...data };
  fields.forEach(f => {
    const cap = Math.min(f.maxRows || MAX_GRID_ROWS, MAX_GRID_ROWS);
    if (f.type === 'table_grid') {
      const rows = Array.isArray(out[f.id]) ? (out[f.id] as TableRowData[]) : [];
      const n = linkedRowCount(f, data);
      out[f.id] = n !== null ? Array.from({ length: n }, (_, i) => rows[i] || {}) : rows.filter(r => !isEmptyRow(r)).slice(0, cap);
    } else if (f.type === 'repeat_group') {
      const inst = Array.isArray(out[f.id]) ? (out[f.id] as FieldSubmissionData[]) : [];
      const n = linkedRowCount(f, data);
      const base = n !== null ? Array.from({ length: n }, (_, i) => inst[i] || {}) : inst.filter(x => !isEmptyInstance(x)).slice(0, cap);
      out[f.id] = base.map(x => normalizeGridData(f.groupFields || [], x));
    }
  });
  return out;
}

/** Sum of a number column across rows (blank / non-numeric cells count as 0). */
export const columnTotal = (rows: TableRowData[], colId: string): number =>
  rows.reduce((sum, r) => sum + (Number(r?.[colId]) || 0), 0);

const formatTableRows = (rows: TableRowData[], field?: CustomFieldDefinition, indent = ''): string => {
  const cols = field?.tableColumns;
  const lines = rows.map((row, i) => {
    const parts = cols && cols.length ? cols.map(c => `${c.label}: ${row[c.id] ?? ''}`) : Object.entries(row).map(([k, v]) => `${k}: ${v}`);
    return `${indent}${i + 1}) ${parts.join('; ')}`;
  });
  const totals = (cols || []).filter(c => c.type === 'number' && c.showTotal);
  if (totals.length) lines.push(`${indent}कुल: ${totals.map(c => `${c.label} = ${columnTotal(rows, c.id)}`).join('; ')}`);
  return lines.join('\n');
};

/** Plain-text form of any answer (used by CSV export and previews). */
export function formatAnswer(value: unknown, field?: CustomFieldDefinition): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      if (field?.type === 'repeat_group' || (field?.groupFields && field.groupFields.length)) {
        const title = field?.itemLabel || field?.label || 'खंड';
        return (value as FieldSubmissionData[])
          .map((inst, i) => {
            const lines = (field?.groupFields || []).map(sf => {
              const v = inst[sf.id];
              if (sf.type === 'table_grid' && Array.isArray(v) && v.length)
                return `   ${sf.label}:\n${formatTableRows(v as TableRowData[], sf, '      ')}`;
              if (sf.type === 'repeat_group' && Array.isArray(v) && v.length)
                return `   ${sf.label}:\n${formatAnswer(v, sf).split('\n').map(l => `      ${l}`).join('\n')}`;
              return `   ${sf.label}: ${formatAnswer(v, sf)}`;
            });
            return `${title} ${i + 1}\n${lines.join('\n')}`;
          })
          .join('\n');
      }
      return formatTableRows(value as TableRowData[], field);
    }
    return (value as unknown[]).join(', ');
  }
  return String(value);
}

/**
 * Checks a form definition before it is saved (used by Create and Edit demand).
 * Returns a Hindi message for the first problem found, or null when the form is usable.
 */
export function validateCustomFields(fields: CustomFieldDefinition[], depth = 0): string | null {
  const byId = new Map(fields.map(f => [f.id, f]));
  for (const f of fields) {
    const name = f.label?.trim() ? `"${f.label.trim()}"` : 'एक फ़ील्ड';
    if (!f.label || !f.label.trim()) return 'सभी फ़ील्ड का नाम/प्रश्न भरा होना चाहिए।';
    if ((f.type === 'select' || f.type === 'radio') && (f.options || []).filter(o => o.trim()).length < 1)
      return `${name} के लिए कम से कम एक विकल्प दर्ज करें।`;

    if (f.type === 'repeat_group') {
      const subs = f.groupFields || [];
      if (subs.length < 1) return `${name} खंड में कम से कम एक फ़ील्ड जोड़ें।`;
      if (depth >= 2 && subs.some(sf => sf.type === 'repeat_group'))
        return `${name} खंड के भीतर अधिकतम 3 स्तर तक ही खंड जोड़े जा सकते हैं।`;
      const inner = validateCustomFields(subs, depth + 1);
      if (inner) return `${name} खंड में: ${inner}`;
      if (f.rowsFromFieldId) {
        const src = byId.get(f.rowsFromFieldId);
        if (!src) return `${name} खंड की संख्या जिस प्रश्न से जुड़ी थी वह अब मौजूद नहीं है। कृपया स्रोत दोबारा चुनें।`;
        if (src.type !== 'select' && src.type !== 'radio' && src.type !== 'number')
          return `${name} खंड की संख्या का स्रोत Dropdown / Radio / Number फ़ील्ड ही हो सकता है।`;
        if ((src.type === 'select' || src.type === 'radio') && (src.options || []).some(o => !/^\d+$/.test(o.trim())))
          return `"${src.label}" के सभी विकल्प केवल संख्याएँ होने चाहिए, तभी ${name} खंड की संख्या उससे तय हो सकेगी।`;
      }
    }

    if (f.type === 'table_grid') {
      const cols = f.tableColumns || [];
      if (cols.length < 1) return `${name} तालिका में कम से कम एक कॉलम जोड़ें।`;
      if (cols.some(c => !c.label.trim())) return `${name} तालिका के सभी कॉलम का नाम भरें।`;
      if (cols.some(c => c.type === 'select' && (c.options || []).length < 1))
        return `${name} तालिका के Dropdown कॉलम के लिए विकल्प दर्ज करें।`;

      if (f.rowsFromFieldId) {
        const src = byId.get(f.rowsFromFieldId);
        if (!src) return `${name} तालिका की पंक्ति-संख्या जिस प्रश्न से जुड़ी थी वह अब मौजूद नहीं है। कृपया पंक्ति-संख्या का स्रोत दोबारा चुनें।`;
        if (src.type !== 'select' && src.type !== 'radio' && src.type !== 'number')
          return `${name} तालिका की पंक्ति-संख्या का स्रोत Dropdown / Radio / Number फ़ील्ड ही हो सकता है।`;
        if ((src.type === 'select' || src.type === 'radio') && (src.options || []).some(o => !/^\d+$/.test(o.trim())))
          return `"${src.label}" के सभी विकल्प केवल संख्याएँ (जैसे 1, 2, 3...) होने चाहिए, तभी ${name} तालिका की पंक्तियाँ उससे तय हो सकेंगी।`;
      }
    }
  }
  return null;
}

/** Remove "rows follow this field" links that point at a field that no longer exists. */
export function clearDanglingRowSources(fields: CustomFieldDefinition[]): CustomFieldDefinition[] {
  const ids = new Set(fields.map(f => f.id));
  return fields.map(f => (f.rowsFromFieldId && !ids.has(f.rowsFromFieldId) ? { ...f, rowsFromFieldId: undefined } : f));
}
