/* "Upload a document / report" fields.
   Files are stored inside the submission (as data URLs), the same way the rest of the
   portal stores attachments, so the limits below keep a submission within what the
   server accepts (JSON body up to 15 MB). */
import { CustomFieldDefinition, FieldSubmissionData, FileKind, UploadedFile } from '../types/portal';

export const MAX_FILE_MB_LIMIT = 5;
export const DEFAULT_FILE_MB = 3;
export const MAX_FILES_LIMIT = 10;
/** ceiling for the whole submission payload (characters of JSON, base64 included) */
export const MAX_SUBMISSION_CHARS = 13 * 1000 * 1000;

export const FILE_KINDS: Record<FileKind, { label: string; exts: string[] }> = {
  pdf: { label: 'PDF', exts: ['pdf'] },
  excel: { label: 'Excel / CSV', exts: ['xlsx', 'xls', 'csv'] },
  word: { label: 'Word', exts: ['docx', 'doc'] },
  image: { label: 'फ़ोटो / स्कैन (JPG, PNG)', exts: ['jpg', 'jpeg', 'png'] }
};

export const fmtBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export const allowedKinds = (f: CustomFieldDefinition): FileKind[] =>
  f.fileTypes && f.fileTypes.length ? f.fileTypes : (Object.keys(FILE_KINDS) as FileKind[]);
export const allowedExts = (f: CustomFieldDefinition): string[] => allowedKinds(f).flatMap(k => FILE_KINDS[k].exts);
export const acceptAttr = (f: CustomFieldDefinition) => allowedExts(f).map(e => `.${e}`).join(',');
export const maxFilesOf = (f: CustomFieldDefinition) => Math.min(Math.max(f.maxFiles || 1, 1), MAX_FILES_LIMIT);
export const maxBytesOf = (f: CustomFieldDefinition) => Math.min(Math.max(f.maxFileSizeMB || DEFAULT_FILE_MB, 1), MAX_FILE_MB_LIMIT) * 1024 * 1024;

/** Returns a Hindi error message if the file may not be uploaded to this field, else null. */
export function checkFile(f: CustomFieldDefinition, file: { name: string; size: number }): string | null {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!allowedExts(f).includes(ext))
    return `"${file.name}": यह फ़ाइल-प्रकार स्वीकार्य नहीं है। केवल ${allowedKinds(f).map(k => FILE_KINDS[k].label).join(', ')} अपलोड करें।`;
  if (file.size > maxBytesOf(f))
    return `"${file.name}" (${fmtBytes(file.size)}): फ़ाइल ${fmtBytes(maxBytesOf(f))} से बड़ी है। कृपया छोटी / कंप्रेस की हुई फ़ाइल चुनें।`;
  if (file.size === 0) return `"${file.name}": फ़ाइल खाली है।`;
  return null;
}

/** First required file field (anywhere, including inside groups) that has no file yet, else null. */
export function findMissingRequiredFile(fields: CustomFieldDefinition[], data: FieldSubmissionData): string | null {
  for (const f of fields) {
    const v = data[f.id];
    if (f.type === 'file' && f.required) {
      if (!Array.isArray(v) || v.length === 0) return `कृपया "${f.label}" में फ़ाइल अपलोड करें।`;
    }
    if (f.type === 'repeat_group' && Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const inner = findMissingRequiredFile(f.groupFields || [], (v as FieldSubmissionData[])[i] || {});
        if (inner) return `${f.itemLabel || 'खंड'} ${i + 1}: ${inner}`;
      }
    }
  }
  return null;
}

export const filesOf = (v: unknown): UploadedFile[] =>
  Array.isArray(v) ? (v as UploadedFile[]).filter(x => x && typeof x === 'object' && typeof (x as UploadedFile).dataUrl === 'string') : [];
