/* Save / load a form (the list of data fields of a demand) as a small JSON file,
   so a desk can reuse a form, share it with another desk, or load a ready-made test form.
   Groups, nested groups and tables are all supported. */
import { CustomFieldDefinition, CustomFieldType } from '../types/portal';
import { validateCustomFields } from './fieldValue';

const FIELD_TYPES: CustomFieldType[] = ['text', 'textarea', 'number', 'date', 'select', 'radio', 'checkbox', 'file', 'table_grid', 'repeat_group'];
const COLUMN_TYPES = ['text', 'number', 'select', 'date'];

export const FORM_TEMPLATE_FORMAT = 'dte-form-template';

export function exportFormTemplate(fields: CustomFieldDefinition[], title = ''): string {
  return JSON.stringify({ format: FORM_TEMPLATE_FORMAT, version: 1, title, customFields: fields }, null, 2);
}

const uid = (() => {
  let n = 0;
  return (prefix: string) => `${prefix}_${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
})();

/** Give every field a fresh id (so a loaded form never clashes with fields already present),
    keeping "rows follow this field" links pointing at the right new ids. */
export function remapFieldIds(fields: CustomFieldDefinition[]): CustomFieldDefinition[] {
  const map = new Map(fields.map(f => [f.id, uid('field')]));
  return fields.map(f => {
    const copy: CustomFieldDefinition = { ...f, id: map.get(f.id)! };
    if (f.rowsFromFieldId) copy.rowsFromFieldId = map.get(f.rowsFromFieldId);
    if (f.rowSource) copy.rowSource = { ...f.rowSource, divisionFieldId: map.get(f.rowSource.divisionFieldId) || f.rowSource.divisionFieldId };
    if (f.groupFields) copy.groupFields = remapFieldIds(f.groupFields);
    if (f.tableColumns) copy.tableColumns = f.tableColumns.map((c, i) => ({ ...c, id: `${uid('col')}${i}` }));
    return copy;
  });
}

function checkNode(f: any, path: string): string | null {
  if (!f || typeof f !== 'object') return `${path}: फ़ील्ड सही रूप में नहीं है।`;
  if (typeof f.id !== 'string' || !f.id) return `${path}: id नहीं है।`;
  if (typeof f.label !== 'string') return `${path}: label नहीं है।`;
  if (!FIELD_TYPES.includes(f.type)) return `${path} ("${f.label}"): अज्ञात प्रकार "${f.type}"।`;
  if (f.options !== undefined && (!Array.isArray(f.options) || f.options.some((o: unknown) => typeof o !== 'string')))
    return `${path} ("${f.label}"): options केवल टेक्स्ट की सूची होनी चाहिए।`;
  if (f.tableColumns !== undefined) {
    if (!Array.isArray(f.tableColumns)) return `${path} ("${f.label}"): tableColumns सूची होनी चाहिए।`;
    for (const c of f.tableColumns)
      if (!c || typeof c.id !== 'string' || typeof c.label !== 'string' || !COLUMN_TYPES.includes(c.type))
        return `${path} ("${f.label}"): किसी कॉलम का id / label / type गलत है।`;
  }
  if (f.rowSource !== undefined) {
    const rs = f.rowSource;
    if (!rs || typeof rs.divisionFieldId !== 'string' || !Array.isArray(rs.rows))
      return `${path} (\"${f.label}\"): rowSource में divisionFieldId और rows चाहिए।`;
    if (rs.rows.some((r: any) => !r || typeof r.division !== 'string' || typeof r.district !== 'string' || typeof r.regno !== 'string'))
      return `${path} (\"${f.label}\"): rowSource की हर पंक्ति में division, district और regno होना चाहिए।`;
  }
  if (f.groupFields !== undefined) {
    if (!Array.isArray(f.groupFields)) return `${path} ("${f.label}"): groupFields सूची होनी चाहिए।`;
    for (let i = 0; i < f.groupFields.length; i++) {
      const e = checkNode(f.groupFields[i], `${path} › ${i + 1}`);
      if (e) return e;
    }
  }
  return null;
}

export function parseFormTemplate(text: string): { fields: CustomFieldDefinition[]; title?: string; error?: string } {
  let data: any;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return { fields: [], error: 'यह वैध JSON फ़ाइल नहीं है।' };
  }
  const list = Array.isArray(data) ? data : data?.customFields || data?.fields;
  if (!Array.isArray(list) || list.length === 0) return { fields: [], error: 'फ़ाइल में कोई फ़ील्ड नहीं मिला (customFields सूची चाहिए)।' };
  for (let i = 0; i < list.length; i++) {
    const e = checkNode(list[i], `फ़ील्ड ${i + 1}`);
    if (e) return { fields: [], error: e };
  }
  const problem = validateCustomFields(list as CustomFieldDefinition[]);
  if (problem) return { fields: [], error: problem };
  return { fields: remapFieldIds(list as CustomFieldDefinition[]), title: typeof data?.title === 'string' ? data.title : undefined };
}
