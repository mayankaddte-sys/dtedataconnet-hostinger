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

/** Trim table data before saving: linked grids are cut to the chosen count, manual grids drop fully empty rows. */
export function normalizeGridData(fields: CustomFieldDefinition[], data: FieldSubmissionData): FieldSubmissionData {
  const out: FieldSubmissionData = { ...data };
  fields.forEach(f => {
    if (f.type !== 'table_grid') return;
    const rows = Array.isArray(out[f.id]) ? (out[f.id] as TableRowData[]) : [];
    const n = linkedRowCount(f, data);
    if (n !== null) {
      out[f.id] = Array.from({ length: n }, (_, i) => rows[i] || {});
    } else {
      out[f.id] = rows.filter(r => !isEmptyRow(r)).slice(0, Math.min(f.maxRows || MAX_GRID_ROWS, MAX_GRID_ROWS));
    }
  });
  return out;
}

/** Plain-text form of any answer (used by CSV export and previews). */
export function formatAnswer(value: unknown, field?: CustomFieldDefinition): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const cols = field?.tableColumns;
      return (value as TableRowData[])
        .map((row, i) => {
          const parts = cols && cols.length
            ? cols.map(c => `${c.label}: ${row[c.id] ?? ''}`)
            : Object.entries(row).map(([k, v]) => `${k}: ${v}`);
          return `${i + 1}) ${parts.join('; ')}`;
        })
        .join('\n');
    }
    return (value as unknown[]).join(', ');
  }
  return String(value);
}

/**
 * Checks a form definition before it is saved (used by Create and Edit demand).
 * Returns a Hindi message for the first problem found, or null when the form is usable.
 */
export function validateCustomFields(fields: CustomFieldDefinition[]): string | null {
  const byId = new Map(fields.map(f => [f.id, f]));
  for (const f of fields) {
    const name = f.label?.trim() ? `"${f.label.trim()}"` : 'एक फ़ील्ड';
    if (!f.label || !f.label.trim()) return 'सभी फ़ील्ड का नाम/प्रश्न भरा होना चाहिए।';
    if ((f.type === 'select' || f.type === 'radio') && (f.options || []).filter(o => o.trim()).length < 1)
      return `${name} के लिए कम से कम एक विकल्प दर्ज करें।`;

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
