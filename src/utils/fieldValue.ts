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
      out[f.id] = rows.filter(r => !isEmptyRow(r));
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
