/* Uploaded files are kept OUT of a submission's `data` column.
   Why: the dashboard loads `data` for every submission of every unit; with files inside
   it (base64) that would be hundreds of MB and time out (the same reason the other
   large document columns are left out of the list query).

   So when saving:   data        -> file entries keep only {id,name,size,type} (dataUrl = '')
                     attachments -> { fileId: dataUrl }  (separate LONGTEXT column, loaded
                                                          only when one submission is opened)
   and when a full submission is read, the two are joined again by file id. */

type Json = unknown;
const isFile = (v: any): v is { id?: string; name: string; dataUrl: string } =>
  v && typeof v === 'object' && !Array.isArray(v) && typeof v.name === 'string' && typeof v.dataUrl === 'string' && 'size' in v;

const walk = (node: Json, visit: (file: any) => any): Json => {
  if (Array.isArray(node)) return node.map(n => walk(n, visit));
  if (node && typeof node === 'object') {
    if (isFile(node)) return visit(node);
    const out: Record<string, Json> = {};
    Object.entries(node as Record<string, Json>).forEach(([k, v]) => (out[k] = walk(v, visit)));
    return out;
  }
  return node;
};

export function splitAttachments<T>(data: T): { slim: T; attachments: Record<string, string> } {
  const attachments: Record<string, string> = {};
  const slim = walk(data, f => {
    if (f.dataUrl && f.id) attachments[f.id] = f.dataUrl;
    return f.dataUrl && f.id ? { ...f, dataUrl: '' } : f;
  }) as T;
  return { slim, attachments };
}

export function mergeAttachments<T>(data: T, attachments: Record<string, string> | string | null | undefined): T {
  let map: Record<string, string> = {};
  if (typeof attachments === 'string' && attachments) {
    try { map = JSON.parse(attachments); } catch { map = {}; }
  } else if (attachments && typeof attachments === 'object') map = attachments;
  if (Object.keys(map).length === 0) return data;
  return walk(data, f => (f.id && !f.dataUrl && map[f.id] ? { ...f, dataUrl: map[f.id] } : f)) as T;
}

/** every file in `data` that has its content (dataUrl) */
export function fileContents(data: Json): Record<string, string> {
  const out: Record<string, string> = {};
  walk(data, f => { if (f.id && f.dataUrl) out[f.id] = f.dataUrl; return f; });
  return out;
}

export function hasSlimFiles(data: Json): boolean {
  let slim = false;
  walk(data, f => { if (!f.dataUrl) slim = true; return f; });
  return slim;
}

/** Fill the content of slim files in `data` from the full copy (matched by file id). */
export function hydrateFiles<T>(data: T, full: Json): T {
  return mergeAttachments(data, fileContents(full));
}

/** Remove files whose content is missing (used if the full copy could not be loaded). */
export function dropSlimFiles<T>(data: T): T {
  const clean = (node: Json): Json => {
    if (Array.isArray(node)) return node.filter(n => !(isFile(n) && !n.dataUrl)).map(clean);
    if (node && typeof node === 'object') {
      const out: Record<string, Json> = {};
      Object.entries(node as Record<string, Json>).forEach(([k, v]) => (out[k] = clean(v)));
      return out;
    }
    return node;
  };
  return clean(data) as T;
}
