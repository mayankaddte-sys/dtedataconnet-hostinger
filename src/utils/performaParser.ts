/* ============================================================
   Generate requisition form fields from an uploaded performa
   ------------------------------------------------------------
   Supports .xlsx, .docx and .csv (read in the browser with JSZip +
   DOMParser, no server needed). Legacy .xls / .doc and PDF are NOT
   supported - their text/table structure cannot be read reliably.

   What is detected
     * a table with several columns (a blank "grid" performa)
           -> one Table Grid field, columns = header cells
     * a 2-column "particulars | answer" table, or lines such as
       "Name of work : ______"  -> one field per question
   Everything generated is shown to the desk in the normal field
   builder, where it can be edited, re-typed, reordered or deleted.
   ============================================================ */
import JSZip from 'jszip';
import { CustomFieldDefinition, CustomFieldType, TableColumnConfig } from '../types/portal';

export interface GeneratedForm {
  fields: CustomFieldDefinition[];
  notes: string[];
}

type FileLike = { name: string; arrayBuffer: () => Promise<ArrayBuffer> };

const MAX_FIELDS = 60;
const MAX_COLUMNS = 25;

/* ---------------- small helpers ---------------- */
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const isBlank = (s: string | undefined) => !s || clean(s) === '' || /^[_.\-–—\u2026\s]*$/.test(s);
const SERIAL_RE = /^(क्र\.?\s*(सं\.?|संख्या)?|क्रम(\s*संख्या)?|s\.?\s*no\.?|sr\.?\s*no\.?|sl\.?\s*no\.?|serial(\s*no\.?)?|#)$/i;
const isSerial = (s: string) => SERIAL_RE.test(clean(s).replace(/[.:]+$/, ''));
const NUMBER_HINT =
  /(संख्या|कुल|total|number|\bno\.?\b|नामांकित|seats?|सीट|amount|राशि|रुपये|\brs\b|₹|%|प्रतिशत|आयु|\bage\b|count|क्षमता|capacity|छात्र|प्रशिक्षणार्थी|नामांकन|उपस्थित|रिक्त|स्वीकृत|प्रवेशित|कर्मचारी)/i;
// (?<![\u0900-\u097F]) keeps "अतिथि" (guest) from being read as "तिथि" (date)
const DATE_HINT = /(दिनांक|(?<![\u0900-\u097F])तिथि|\bdate\b|\bdated\b)/i;
const LONG_HINT = /(टिप्पणी|remarks?|कारण|reason|विवरण\s*दें|describe|details of)/i;

const looksNumeric = (v: string) => /^-?[\d,]+(\.\d+)?%?$/.test(clean(v));

const uid = (i: number) => `field_gen_${Date.now().toString(36)}_${i}`;

const guessFieldType = (label: string): CustomFieldType => {
  if (DATE_HINT.test(label)) return 'date';
  if (LONG_HINT.test(label)) return 'textarea';
  if (NUMBER_HINT.test(label)) return 'number';
  return 'text';
};

const stripNumbering = (s: string) =>
  clean(s)
    .replace(/^(\(?\d{1,3}[.)]|\(?[a-zA-Z][.)]|\([ivxIVX]+\)|[क-ह][.)])\s+/, '')
    .replace(/[:：\-–]+$/, '')
    .trim();

/* ---------------- raw readers ---------------- */
type Block = { kind: 'p'; text: string } | { kind: 't'; rows: string[][] };

const parseXml = (xml: string): Document => new DOMParser().parseFromString(xml, 'application/xml');
const kids = (el: Element, name: string): Element[] =>
  Array.from(el.childNodes).filter(n => n.nodeType === 1 && (n as Element).nodeName === name) as Element[];

function wordText(el: Element): string {
  let out = '';
  const walk = (n: Node) => {
    if (n.nodeType !== 1) return;
    const e = n as Element;
    if (e.nodeName === 'w:t') out += e.textContent || '';
    else if (e.nodeName === 'w:tab') out += ' ';
    else if (e.nodeName === 'w:br' || e.nodeName === 'w:cr') out += ' ';
    else Array.from(e.childNodes).forEach(walk);
  };
  walk(el);
  return clean(out);
}

async function readDocx(buf: ArrayBuffer): Promise<Block[]> {
  const zip = await JSZip.loadAsync(buf);
  const f = zip.file('word/document.xml');
  if (!f) throw new Error('यह वैध Word (.docx) फ़ाइल नहीं लगती।');
  const doc = parseXml(await f.async('string'));
  const body = doc.getElementsByTagName('w:body')[0];
  const blocks: Block[] = [];
  if (!body) return blocks;
  Array.from(body.childNodes).forEach(n => {
    if (n.nodeType !== 1) return;
    const e = n as Element;
    if (e.nodeName === 'w:p') {
      const t = wordText(e);
      if (t) blocks.push({ kind: 'p', text: t });
    } else if (e.nodeName === 'w:tbl') {
      const rows: string[][] = [];
      kids(e, 'w:tr').forEach(tr => {
        const cells = kids(tr, 'w:tc').map(tc => wordText(tc));
        if (cells.some(c => c !== '')) rows.push(cells);
      });
      if (rows.length) blocks.push({ kind: 't', rows });
    }
  });
  return blocks;
}

const colIndex = (ref: string) => {
  const m = /^([A-Z]+)/.exec(ref);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

async function readXlsx(buf: ArrayBuffer): Promise<{ sheetName: string; rows: string[][] }> {
  const zip = await JSZip.loadAsync(buf);
  const wbFile = zip.file('xl/workbook.xml');
  if (!wbFile) throw new Error('यह वैध Excel (.xlsx) फ़ाइल नहीं लगती।');

  // shared strings
  const shared: string[] = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const ss = parseXml(await ssFile.async('string'));
    Array.from(ss.getElementsByTagName('si')).forEach(si => {
      shared.push(Array.from(si.getElementsByTagName('t')).map(t => t.textContent || '').join(''));
    });
  }

  // first sheet -> file path
  const wb = parseXml(await wbFile.async('string'));
  const firstSheet = wb.getElementsByTagName('sheet')[0];
  const sheetName = firstSheet?.getAttribute('name') || 'Sheet1';
  const rid = firstSheet?.getAttribute('r:id') || '';
  let target = 'worksheets/sheet1.xml';
  const relFile = zip.file('xl/_rels/workbook.xml.rels');
  if (relFile && rid) {
    const rels = parseXml(await relFile.async('string'));
    const rel = Array.from(rels.getElementsByTagName('Relationship')).find(r => r.getAttribute('Id') === rid);
    if (rel?.getAttribute('Target')) target = rel.getAttribute('Target')!.replace(/^\/?(xl\/)?/, '');
  }
  const sheetFile = zip.file(`xl/${target}`) || zip.file('xl/worksheets/sheet1.xml');
  if (!sheetFile) throw new Error('Excel फ़ाइल में कोई शीट नहीं मिली।');

  const sheet = parseXml(await sheetFile.async('string'));
  const rows: string[][] = [];
  Array.from(sheet.getElementsByTagName('row')).forEach(rowEl => {
    const r: string[] = [];
    Array.from(rowEl.getElementsByTagName('c')).forEach(c => {
      const idx = colIndex(c.getAttribute('r') || 'A1');
      const t = c.getAttribute('t');
      let val = '';
      if (t === 's') val = shared[parseInt(c.getElementsByTagName('v')[0]?.textContent || '-1', 10)] || '';
      else if (t === 'inlineStr') val = Array.from(c.getElementsByTagName('t')).map(x => x.textContent || '').join('');
      else val = c.getElementsByTagName('v')[0]?.textContent || '';
      r[idx] = clean(val);
    });
    for (let i = 0; i < r.length; i++) if (r[i] === undefined) r[i] = '';
    if (r.some(v => v !== '')) rows.push(r);
  });
  return { sheetName, rows };
}

function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  const t = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(clean(cur)); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(clean(cur)); cur = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(clean(cur));
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

/* ---------------- field generation ---------------- */
function tableToFields(rows: string[][], caption: string, notes: string[], startIdx: number): CustomFieldDefinition[] {
  // header row = first row with at least 2 non-empty cells
  const hIdx = rows.findIndex(r => r.filter(c => !isBlank(c)).length >= 2);
  if (hIdx < 0) return [];
  const header = rows[hIdx];
  const data = rows.slice(hIdx + 1);

  const cols = header
    .map((label, i) => ({ label: clean(label), i }))
    .filter(c => !isBlank(c.label) && !isSerial(c.label));
  if (cols.length === 0) return [];

  const filledRatio = (i: number) =>
    data.length === 0 ? 0 : data.filter(r => !isBlank(r[i])).length / data.length;

  // "Particulars | Answer" style -> one field per row
  if (cols.length === 2 && data.length >= 1 && filledRatio(cols[0].i) >= 0.8 && filledRatio(cols[1].i) <= 0.2) {
    const out: CustomFieldDefinition[] = [];
    data.forEach(r => {
      const label = stripNumbering(r[cols[0].i] || '');
      if (!label) return;
      const type = guessFieldType(label);
      out.push({ id: uid(startIdx + out.length), label, type, required: true, ...(type === 'number' ? { placeholder: '0' } : {}) });
    });
    if (out.length) {
      notes.push(`एक तालिका (विवरण | उत्तर प्रारूप) से ${out.length} प्रश्न-फ़ील्ड बने।`);
      return out;
    }
  }

  // single-column list of questions (header + labels)
  if (cols.length === 1) {
    const out: CustomFieldDefinition[] = [];
    data.forEach(r => {
      const label = stripNumbering(r[cols[0].i] || '');
      if (!label) return;
      out.push({ id: uid(startIdx + out.length), label, type: guessFieldType(label), required: true });
    });
    return out;
  }

  // otherwise a blank grid -> Table Grid field
  const tableColumns: TableColumnConfig[] = cols.slice(0, MAX_COLUMNS).map((c, k) => {
    const samples = data.map(r => r[c.i]).filter(v => !isBlank(v));
    const numeric = samples.length > 0 ? samples.every(looksNumeric) : NUMBER_HINT.test(c.label);
    return { id: `col_gen_${Date.now().toString(36)}_${startIdx}_${k}`, label: c.label, type: numeric ? 'number' : 'text', required: false };
  });
  const prefilled = cols.filter(c => filledRatio(c.i) >= 0.8).length;
  notes.push(
    `"${caption}" से ${tableColumns.length} कॉलम वाली तालिका (Table Grid) बनी।` +
      (prefilled > 0 && data.length > 0 ? ' ध्यान दें: फ़ाइल की भरी हुई पंक्तियाँ फ़ॉर्म में नहीं ली गईं — इकाइयाँ अपनी पंक्तियाँ स्वयं जोड़ेंगी।' : '')
  );
  return [
    {
      id: uid(startIdx),
      label: caption,
      type: 'table_grid',
      required: true,
      tableColumns
    }
  ];
}

const QUESTION_LINE =
  /^(.{3,160}?)\s*[:：]\s*[_.\u2026\-–\s]*$|^(.{3,160}?)\s*[_.\u2026]{3,}\s*$/;

function paragraphToField(text: string, idx: number): CustomFieldDefinition | null {
  const m = QUESTION_LINE.exec(text);
  if (!m) return null;
  const label = stripNumbering(m[1] || m[2] || '');
  if (label.length < 3 || /^(प्रेषक|सेवा में|विषय|महोदय|दिनांक\s*$)/.test(label)) return null;
  const type = guessFieldType(label);
  return { id: uid(idx), label, type, required: true };
}

/* ---------------- public API ---------------- */
export async function generateFieldsFromPerforma(file: FileLike): Promise<GeneratedForm> {
  const name = file.name || 'performa';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const baseTitle = name.replace(/\.[^.]+$/, '');
  const notes: string[] = [];
  let fields: CustomFieldDefinition[] = [];

  if (ext === 'xls' || ext === 'doc') {
    throw new Error('पुरानी .xls/.doc फ़ाइल नहीं पढ़ी जा सकती। कृपया उसे .xlsx / .docx के रूप में "Save As" करके अपलोड करें।');
  }
  if (ext === 'pdf') {
    throw new Error('PDF से फ़ील्ड्स भरोसेमंद ढंग से नहीं बनाए जा सकते। कृपया Excel (.xlsx) या Word (.docx) प्रपत्र अपलोड करें; PDF को "टेम्पलेट संलग्न करें" में लगाया जा सकता है।');
  }

  const buf = await file.arrayBuffer();

  if (ext === 'xlsx') {
    const { sheetName, rows } = await readXlsx(buf);
    fields = tableToFields(rows, sheetName && !/^sheet\d*$/i.test(sheetName) ? sheetName : baseTitle, notes, 0);
  } else if (ext === 'csv') {
    const text = new TextDecoder('utf-8').decode(buf);
    fields = tableToFields(readCsv(text), baseTitle, notes, 0);
  } else if (ext === 'docx') {
    const blocks = await readDocx(buf);
    let lastParagraph = baseTitle;
    blocks.forEach(b => {
      if (fields.length >= MAX_FIELDS) return;
      if (b.kind === 'p') {
        const f = paragraphToField(b.text, fields.length);
        if (f) fields.push(f);
        else if (b.text.length >= 4 && b.text.length <= 80 && !/[,।]/.test(b.text) && !/^(सेवा में|प्रेषक|विषय|महोदय)/.test(b.text))
          lastParagraph = stripNumbering(b.text) || lastParagraph;
      } else {
        fields.push(...tableToFields(b.rows, lastParagraph, notes, fields.length));
      }
    });
    if (fields.some(f => f.type !== 'table_grid') && blocks.some(b => b.kind === 'p')) {
      const q = fields.filter(f => f.type !== 'table_grid').length;
      if (q) notes.push(`फ़ाइल की पंक्तियों/तालिकाओं से कुल ${q} प्रश्न-फ़ील्ड पहचाने गए।`);
    }
  } else {
    throw new Error('केवल .xlsx, .docx या .csv फ़ाइल से फ़ॉर्म बनाया जा सकता है।');
  }

  // de-duplicate labels, cap size
  const seen = new Set<string>();
  fields = fields.filter(f => {
    const k = f.label.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, MAX_FIELDS);

  if (fields.length === 0) {
    throw new Error('फ़ाइल में कोई तालिका या "विवरण : ____" जैसी प्रश्न-पंक्ति नहीं मिली। फ़ील्ड्स हाथ से जोड़ें।');
  }
  return { fields, notes };
}
