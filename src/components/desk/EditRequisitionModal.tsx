import React, { useMemo, useRef, useState } from 'react';
import {
  Requisition,
  SubmissionRecord,
  CustomFieldDefinition,
  CustomFieldType,
  TableColumnConfig,
  RequisitionLetter,
  RequisitionResource,
  RequisitionEditLogEntry,
  PriorityLevel
} from '../../types/portal';
import {
  X,
  Plus,
  Trash2,
  FileText,
  FileSpreadsheet,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
  Save,
  AlertTriangle,
  FileUp,
  Settings,
  ListChecks,
  BookOpen,
  Bell,
  RotateCcw
} from 'lucide-react';

/* ============================================================
   EditRequisitionModal
   ------------------------------------------------------------
   Lets the desk that owns a demand (or the Directorate admin)
   amend it AFTER it has been issued:

     1. Basic details / deadline / cut-off policy
     2. Letters      - replace the original order, add later letters
     3. Fields       - add / edit / delete / reorder form fields
     4. Sheets/Forms - edit the main sheet/form link, add new ones

   Nothing is ever deleted from existing submissions: removing a
   field only stops it being asked/shown; the data already sent by
   units stays in the database.
   ============================================================ */

export interface EditRequisitionSaveOptions {
  /** e-mail the targeted units about the amendment */
  notifyUnits: boolean;
  /** move already-submitted units back to REVISION_REQUESTED */
  requestResubmission: boolean;
  /** human readable list of what changed (also stored in editLog) */
  changes: string[];
}

interface EditRequisitionModalProps {
  requisition: Requisition;
  /** submissions of THIS requisition only */
  submissions: SubmissionRecord[];
  editorName: string;
  onClose: () => void;
  onSave: (updated: Requisition, options: EditRequisitionSaveOptions) => Promise<void> | void;
}

type TabKey = 'BASIC' | 'LETTERS' | 'FIELDS' | 'RESOURCES';

const MAX_FILE_BYTES = 3 * 1024 * 1024; // each attachment
const MAX_TOTAL_LETTER_BYTES = 5 * 1024 * 1024; // all added letters together
// Server accepts JSON bodies up to 15 MB (server.js) and the whole requisition
// row (original order + performa + letters, all base64) is sent on every save.
const MAX_PAYLOAD_CHARS = 13 * 1000 * 1000;

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'छोटा टेक्स्ट (Text)',
  textarea: 'लंबा टेक्स्ट (Paragraph)',
  number: 'संख्या (Number)',
  date: 'तिथि (Date)',
  select: 'ड्रॉपडाउन (Dropdown)',
  radio: 'रेडियो विकल्प (Radio)',
  checkbox: 'चेकबॉक्स (Checkbox)',
  file: 'फ़ाइल (File)',
  table_grid: 'तालिका (Table Grid)'
};

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('फ़ाइल पढ़ी नहीं जा सकी।'));
    reader.readAsDataURL(file);
  });

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;

// approximate decoded size of a data URL (for the running total)
const dataUrlBytes = (url?: string) => (url ? Math.floor((url.length * 3) / 4) : 0);

const hasValue = (v: unknown) =>
  v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

const inputCls =
  'w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden';
const labelCls = 'block text-[11px] font-bold text-slate-700 mb-1';

export const EditRequisitionModal: React.FC<EditRequisitionModalProps> = ({
  requisition,
  submissions,
  editorName,
  onClose,
  onSave
}) => {
  const [tab, setTab] = useState<TabKey>('BASIC');
  const [saving, setSaving] = useState(false);

  /* ---------------- Basic details ---------------- */
  const [title, setTitle] = useState(requisition.title);
  const [description, setDescription] = useState(requisition.description || '');
  const [priority, setPriority] = useState<PriorityLevel>(requisition.priority);
  const [priorityLabel, setPriorityLabel] = useState(requisition.priorityLabel || '');
  const [deadlineLocal, setDeadlineLocal] = useState(toLocalInput(requisition.deadline));
  const [isStrictCutoff, setIsStrictCutoff] = useState(requisition.isStrictCutoff);
  const [allowLate, setAllowLate] = useState(requisition.allowLateSubmissionWithReason);
  const [requireDeclaration, setRequireDeclaration] = useState(requisition.requireOfficerDeclaration);
  const [requireSeal, setRequireSeal] = useState(requisition.requireOfficialSealUpload);
  const [allowJdForward, setAllowJdForward] = useState<boolean>(requisition.allowJdForward !== false);

  /* ---------------- Original order + added letters ---------------- */
  const [orderRef, setOrderRef] = useState(requisition.orderReferenceNumber || '');
  const [orderDate, setOrderDate] = useState(requisition.orderDate || '');
  const [orderName, setOrderName] = useState(requisition.orderDocumentName || '');
  const [orderUrl, setOrderUrl] = useState(requisition.orderDocumentUrl || '');
  const [orderSize, setOrderSize] = useState(requisition.orderDocumentSize || '');
  const orderInputRef = useRef<HTMLInputElement>(null);

  const [letters, setLetters] = useState<RequisitionLetter[]>(requisition.additionalLetters || []);
  const [newLetter, setNewLetter] = useState<{
    title: string;
    referenceNumber: string;
    letterDate: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: string;
  }>({ title: '', referenceNumber: '', letterDate: '' });
  const newLetterInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- Fields ---------------- */
  const [fields, setFields] = useState<CustomFieldDefinition[]>(
    (requisition.customFields || []).map(f => ({ ...f }))
  );
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [optionsDraft, setOptionsDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    (requisition.customFields || []).forEach(f => {
      if (f.options) d[f.id] = f.options.join('\n');
    });
    return d;
  });
  const originalFieldIds = useMemo(
    () => new Set((requisition.customFields || []).map(f => f.id)),
    [requisition.customFields]
  );

  // how many existing submissions already hold an answer for each field
  const answerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (requisition.customFields || []).forEach(f => {
      counts[f.id] = submissions.filter(s => hasValue(s.data?.[f.id])).length;
    });
    return counts;
  }, [requisition.customFields, submissions]);

  /* ---------------- Sheets / Forms ---------------- */
  const [sheetUrl, setSheetUrl] = useState(requisition.googleSheetConfig?.sheetUrl || '');
  const [sheetInstr, setSheetInstr] = useState(requisition.googleSheetConfig?.sheetInstructions || '');
  const [formUrl, setFormUrl] = useState(requisition.googleFormConfig?.formUrl || '');
  const [formInstr, setFormInstr] = useState(requisition.googleFormConfig?.instructions || '');

  const [resources, setResources] = useState<RequisitionResource[]>(requisition.additionalResources || []);
  const [newRes, setNewRes] = useState<{
    kind: RequisitionResource['kind'];
    title: string;
    url: string;
    instructions: string;
    responseRequired: boolean;
  }>({ kind: 'GOOGLE_SHEET', title: '', url: '', instructions: '', responseRequired: true });

  /* ---------------- Save options ---------------- */
  const [notifyUnits, setNotifyUnits] = useState(true);
  const [requestResubmission, setRequestResubmission] = useState(false);

  /* ============================================================
     Change detection (drives the "what will change" summary)
     ============================================================ */
  const deadlineIso = useMemo(() => {
    if (!deadlineLocal) return requisition.deadline;
    // keep the exact original value when the input wasn't touched
    if (deadlineLocal === toLocalInput(requisition.deadline)) return requisition.deadline;
    const d = new Date(deadlineLocal);
    return isNaN(d.getTime()) ? requisition.deadline : d.toISOString();
  }, [deadlineLocal, requisition.deadline]);

  const changes = useMemo(() => {
    const out: string[] = [];
    if (title.trim() !== requisition.title) out.push('विषय/शीर्षक बदला गया');
    if (description.trim() !== (requisition.description || '').trim()) out.push('विवरण बदला गया');
    if (priority !== requisition.priority || priorityLabel !== (requisition.priorityLabel || ''))
      out.push('प्राथमिकता बदली गई');
    if (deadlineIso !== requisition.deadline) out.push('अंतिम तिथि बदली गई');
    if (
      isStrictCutoff !== requisition.isStrictCutoff ||
      allowLate !== requisition.allowLateSubmissionWithReason
    )
      out.push('कट-ऑफ नीति बदली गई');
    if (
      requireDeclaration !== requisition.requireOfficerDeclaration ||
      requireSeal !== requisition.requireOfficialSealUpload
    )
      out.push('घोषणा/मुहर संबंधी आवश्यकता बदली गई');
    if (allowJdForward !== (requisition.allowJdForward !== false))
      out.push('JD द्वारा ITI को अग्रेषण की अनुमति बदली गई');

    if (
      orderRef.trim() !== (requisition.orderReferenceNumber || '') ||
      orderDate !== (requisition.orderDate || '') ||
      orderUrl !== (requisition.orderDocumentUrl || '')
    )
      out.push('मूल आदेश पत्र का विवरण/फ़ाइल बदली गई');

    const oldLetters = requisition.additionalLetters || [];
    letters
      .filter(l => !oldLetters.some(o => o.id === l.id))
      .forEach(l => out.push(`नया पत्र जोड़ा गया: ${l.title}`));
    oldLetters
      .filter(o => !letters.some(l => l.id === o.id))
      .forEach(o => out.push(`पत्र हटाया गया: ${o.title}`));

    const oldFields = requisition.customFields || [];
    fields
      .filter(f => !oldFields.some(o => o.id === f.id))
      .forEach(f => out.push(`नया फ़ील्ड जोड़ा गया: ${f.label}`));
    oldFields
      .filter(o => !fields.some(f => f.id === o.id))
      .forEach(o => out.push(`फ़ील्ड हटाया गया: ${o.label}`));
    fields.forEach(f => {
      const o = oldFields.find(x => x.id === f.id);
      if (o && JSON.stringify(o) !== JSON.stringify(f)) out.push(`फ़ील्ड संपादित: ${f.label}`);
    });
    const oldOrder = oldFields.map(f => f.id).join('|');
    const newOrder = fields.filter(f => oldFields.some(o => o.id === f.id)).map(f => f.id).join('|');
    if (oldOrder !== newOrder && oldFields.length === fields.filter(f => oldFields.some(o => o.id === f.id)).length)
      out.push('फ़ील्ड का क्रम बदला गया');

    if (requisition.googleSheetConfig) {
      if (
        sheetUrl.trim() !== requisition.googleSheetConfig.sheetUrl ||
        sheetInstr !== (requisition.googleSheetConfig.sheetInstructions || '')
      )
        out.push('मुख्य Google Sheet का लिंक/निर्देश बदला गया');
    }
    if (requisition.googleFormConfig) {
      if (
        formUrl.trim() !== requisition.googleFormConfig.formUrl ||
        formInstr !== (requisition.googleFormConfig.instructions || '')
      )
        out.push('मुख्य Google Form का लिंक/निर्देश बदला गया');
    }

    const oldRes = requisition.additionalResources || [];
    resources
      .filter(r => !oldRes.some(o => o.id === r.id))
      .forEach(r => out.push(`नया ${r.kind === 'GOOGLE_FORM' ? 'Form' : r.kind === 'GOOGLE_SHEET' ? 'Sheet' : 'लिंक'} जोड़ा गया: ${r.title}`));
    oldRes
      .filter(o => !resources.some(r => r.id === o.id))
      .forEach(o => out.push(`Sheet/Form हटाया गया: ${o.title}`));
    resources.forEach(r => {
      const o = oldRes.find(x => x.id === r.id);
      if (o && JSON.stringify(o) !== JSON.stringify(r)) out.push(`Sheet/Form संपादित: ${r.title}`);
    });

    return out;
  }, [
    title, description, priority, priorityLabel, deadlineIso, isStrictCutoff, allowLate,
    requireDeclaration, requireSeal, allowJdForward, orderRef, orderDate, orderUrl, letters, fields,
    sheetUrl, sheetInstr, formUrl, formInstr, resources, requisition
  ]);

  const contentChanged = changes.some(
    c =>
      c.startsWith('नया') ||
      c.startsWith('फ़ील्ड') ||
      c.startsWith('पत्र') ||
      c.startsWith('Sheet/Form') ||
      c.includes('आदेश पत्र') ||
      c.includes('अंतिम तिथि')
  );
  const fieldOrResourceChanged = changes.some(
    c => c.startsWith('नया फ़ील्ड') || c.startsWith('फ़ील्ड संपादित') || c.startsWith('नया Sheet') || c.startsWith('नया Form') || c.startsWith('नया लिंक')
  );

  const submittedCount = submissions.length;

  /* ============================================================
     Field helpers
     ============================================================ */
  const updateField = (id: string, patch: Partial<CustomFieldDefinition>) =>
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));

  const addField = (type: CustomFieldType) => {
    const id = uid('field');
    const f: CustomFieldDefinition = {
      id,
      label: '',
      type,
      required: false,
      ...(type === 'select' || type === 'radio' ? { options: [] } : {}),
      ...(type === 'table_grid'
        ? { tableColumns: [{ id: uid('col'), label: '', type: 'text' as const }] }
        : {})
    };
    setFields(prev => [...prev, f]);
    setExpandedFieldId(id);
  };

  const removeField = (f: CustomFieldDefinition) => {
    const n = answerCounts[f.id] || 0;
    const msg = n > 0
      ? `"${f.label || 'यह फ़ील्ड'}" हटाने पर यह इकाइयों को दिखना बंद हो जाएगा।\n\n${n} इकाइयों का पहले से भेजा हुआ उत्तर डेटाबेस में सुरक्षित रहेगा, पर फ़ॉर्म/रिपोर्ट में नहीं दिखेगा।\n\nक्या आप फ़ील्ड हटाना चाहते हैं?`
      : `फ़ील्ड "${f.label || 'नया फ़ील्ड'}" हटाएँ?`;
    if (!window.confirm(msg)) return;
    setFields(prev => prev.filter(x => x.id !== f.id));
  };

  const moveField = (idx: number, dir: -1 | 1) =>
    setFields(prev => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const updateColumn = (fieldId: string, colId: string, patch: Partial<TableColumnConfig>) =>
    setFields(prev =>
      prev.map(f =>
        f.id === fieldId
          ? { ...f, tableColumns: (f.tableColumns || []).map(c => (c.id === colId ? { ...c, ...patch } : c)) }
          : f
      )
    );

  /* ============================================================
     File handlers
     ============================================================ */
  const handleReplaceOrder = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      alert(`फ़ाइल ${fmtSize(MAX_FILE_BYTES)} से बड़ी है। कृपया छोटी फ़ाइल (या कंप्रेस्ड PDF) चुनें।`);
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setOrderName(file.name);
      setOrderSize(`${(file.size / 1024).toFixed(1)} KB`);
      setOrderUrl(url);
    } catch (e: any) {
      alert(e?.message || 'फ़ाइल अपलोड विफल।');
    }
  };

  const handleNewLetterFile = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      alert(`फ़ाइल ${fmtSize(MAX_FILE_BYTES)} से बड़ी है। कृपया छोटी फ़ाइल (या कंप्रेस्ड PDF) चुनें।`);
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setNewLetter(p => ({ ...p, fileName: file.name, fileSize: `${(file.size / 1024).toFixed(1)} KB`, fileUrl: url }));
    } catch (e: any) {
      alert(e?.message || 'फ़ाइल अपलोड विफल।');
    }
  };

  const addLetter = () => {
    if (!newLetter.title.trim()) {
      alert('कृपया पत्र का शीर्षक दर्ज करें (जैसे: शुद्धि-पत्र / अतिरिक्त निर्देश)।');
      return;
    }
    if (!newLetter.fileUrl && !newLetter.referenceNumber.trim()) {
      alert('कृपया पत्र की फ़ाइल संलग्न करें या कम से कम पत्र संख्या दर्ज करें।');
      return;
    }
    const total =
      letters.reduce((sum, l) => sum + dataUrlBytes(l.fileUrl), 0) + dataUrlBytes(newLetter.fileUrl);
    if (total > MAX_TOTAL_LETTER_BYTES) {
      alert(`जोड़े गए पत्रों का कुल आकार ${fmtSize(MAX_TOTAL_LETTER_BYTES)} से अधिक नहीं हो सकता।`);
      return;
    }
    const l: RequisitionLetter = {
      id: uid('letter'),
      title: newLetter.title.trim(),
      referenceNumber: newLetter.referenceNumber.trim() || undefined,
      letterDate: newLetter.letterDate || undefined,
      fileName: newLetter.fileName,
      fileUrl: newLetter.fileUrl,
      fileSize: newLetter.fileSize,
      addedAt: new Date().toISOString(),
      addedByName: editorName
    };
    setLetters(prev => [...prev, l]);
    setNewLetter({ title: '', referenceNumber: '', letterDate: '' });
    if (newLetterInputRef.current) newLetterInputRef.current.value = '';
  };

  const addResource = () => {
    if (!newRes.title.trim()) {
      alert('कृपया शीट/फॉर्म का शीर्षक दर्ज करें।');
      return;
    }
    if (!/^https?:\/\//i.test(newRes.url.trim())) {
      alert('कृपया वैध लिंक दर्ज करें (https:// से शुरू होना चाहिए)।');
      return;
    }
    const r: RequisitionResource = {
      id: uid('res'),
      kind: newRes.kind,
      title: newRes.title.trim(),
      url: newRes.url.trim(),
      instructions: newRes.instructions.trim() || undefined,
      responseRequired: newRes.responseRequired,
      addedAt: new Date().toISOString(),
      addedByName: editorName
    };
    setResources(prev => [...prev, r]);
    setNewRes({ kind: 'GOOGLE_SHEET', title: '', url: '', instructions: '', responseRequired: true });
  };

  /* ============================================================
     Save
     ============================================================ */
  const validate = (): string | null => {
    if (!title.trim()) return 'मांग का शीर्षक खाली नहीं हो सकता।';
    if (!deadlineLocal) return 'कृपया अंतिम तिथि चुनें।';
    for (const f of fields) {
      if (!f.label.trim()) return 'सभी फ़ील्ड का नाम/लेबल भरा होना चाहिए (फ़ील्ड टैब देखें)।';
      if ((f.type === 'select' || f.type === 'radio') && (f.options || []).length < 1)
        return `"${f.label}" के लिए कम से कम एक विकल्प दर्ज करें।`;
      if (f.type === 'table_grid') {
        const cols = f.tableColumns || [];
        if (cols.length < 1 || cols.some(c => !c.label.trim()))
          return `"${f.label}" तालिका के सभी कॉलम का नाम भरें।`;
      }
    }
    if (requisition.googleSheetConfig && sheetUrl.trim() && !/^https?:\/\//i.test(sheetUrl.trim()))
      return 'मुख्य Google Sheet का लिंक https:// से शुरू होना चाहिए।';
    if (requisition.googleFormConfig && formUrl.trim() && !/^https?:\/\//i.test(formUrl.trim()))
      return 'मुख्य Google Form का लिंक https:// से शुरू होना चाहिए।';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    if (changes.length === 0) {
      onClose();
      return;
    }

    const entry: RequisitionEditLogEntry = {
      id: uid('edit'),
      at: new Date().toISOString(),
      byName: editorName,
      summary: changes
    };

    const updated: Requisition = {
      ...requisition,
      title: title.trim(),
      description: description.trim(),
      priority,
      priorityLabel: priorityLabel.trim() || requisition.priorityLabel,
      deadline: deadlineIso,
      isStrictCutoff,
      allowLateSubmissionWithReason: allowLate,
      requireOfficerDeclaration: requireDeclaration,
      requireOfficialSealUpload: requireSeal,
      allowJdForward,

      orderReferenceNumber: orderRef.trim() || undefined,
      orderDate: orderDate || undefined,
      orderDocumentName: orderName || undefined,
      orderDocumentUrl: orderUrl || undefined,
      orderDocumentSize: orderSize || undefined,
      attachmentNoticeDocUrl: orderUrl || undefined,

      customFields: fields.length > 0 || requisition.customFields ? fields : undefined,

      googleSheetConfig: requisition.googleSheetConfig
        ? { ...requisition.googleSheetConfig, sheetUrl: sheetUrl.trim(), sheetInstructions: sheetInstr }
        : undefined,
      googleFormConfig: requisition.googleFormConfig
        ? { ...requisition.googleFormConfig, formUrl: formUrl.trim(), instructions: formInstr }
        : undefined,

      additionalLetters: letters,
      additionalResources: resources,
      editLog: [...(requisition.editLog || []), entry]
    };

    if (JSON.stringify(updated).length > MAX_PAYLOAD_CHARS) {
      alert(
        'संलग्न फ़ाइलों (मूल आदेश + प्रपत्र + जोड़े गए पत्र) का कुल आकार सर्वर सीमा से अधिक हो रहा है।\n\nकृपया PDF को कंप्रेस करें या कोई पुरानी/बड़ी फ़ाइल हटाएँ।'
      );
      return;
    }

    setSaving(true);
    try {
      await onSave(updated, {
        notifyUnits: notifyUnits && contentChanged,
        requestResubmission: requestResubmission && fieldOrResourceChanged && submittedCount > 0,
        changes
      });
      onClose();
    } catch (e) {
      // parent already alerts; keep the modal open so edits aren't lost
      console.error('Edit requisition save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'BASIC', label: 'मूल विवरण', icon: <Settings className="w-3.5 h-3.5" /> },
    { key: 'LETTERS', label: 'पत्र / आदेश', icon: <BookOpen className="w-3.5 h-3.5" />, badge: letters.length },
    { key: 'FIELDS', label: 'फ़ील्ड', icon: <ListChecks className="w-3.5 h-3.5" />, badge: fields.length },
    { key: 'RESOURCES', label: 'Sheet / Form', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, badge: resources.length }
  ];

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-50 w-full max-w-4xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">मांग संशोधित करें (Edit Demand)</h2>
            <p className="text-[11px] text-slate-500 font-mono truncate">
              {requisition.requisitionNumber} — {requisition.title}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500" title="बंद करें">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-3 pt-2 bg-white border-b border-slate-200 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span className="text-[10px] bg-slate-200 text-slate-700 rounded-full px-1.5">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* ---------------- BASIC ---------------- */}
          {tab === 'BASIC' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className={labelCls}>विषय / शीर्षक *</label>
                  <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>विवरण / निर्देश</label>
                  <textarea
                    rows={4}
                    className={inputCls}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>प्राथमिकता</label>
                    <select
                      className={inputCls}
                      value={priority}
                      onChange={e => setPriority(e.target.value as PriorityLevel)}
                    >
                      <option value="URGENT">URGENT</option>
                      <option value="HIGH">HIGH</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="ROUTINE">ROUTINE</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>प्राथमिकता लेबल</label>
                    <input className={inputCls} value={priorityLabel} onChange={e => setPriorityLabel(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className={labelCls}>अंतिम तिथि एवं समय *</label>
                  <input
                    type="datetime-local"
                    className={inputCls}
                    value={deadlineLocal}
                    onChange={e => setDeadlineLocal(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    किसी एक इकाई को अलग से समय-विस्तार देने के लिए "Extend Deadline" का उपयोग करें।
                  </p>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={isStrictCutoff} onChange={e => setIsStrictCutoff(e.target.checked)} />
                  <span className="font-medium text-slate-800">कड़ा कट-ऑफ: अंतिम तिथि के बाद फ़ॉर्म लॉक</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={allowLate} onChange={e => setAllowLate(e.target.checked)} />
                  <span className="font-medium text-slate-800">कारण सहित विलंब से सबमिशन की अनुमति</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={requireDeclaration} onChange={e => setRequireDeclaration(e.target.checked)} />
                  <span className="font-medium text-slate-800">अधिकारी घोषणा (Declaration) आवश्यक</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={requireSeal} onChange={e => setRequireSeal(e.target.checked)} />
                  <span className="font-medium text-slate-800">आधिकारिक मुहर/हस्ताक्षर आवश्यक</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={allowJdForward} onChange={e => setAllowJdForward(e.target.checked)} />
                  <span className="font-medium text-slate-800">JD को इस मांग को अपने मंडल की ITI को अग्रेषित करने का अधिकार</span>
                </label>
              </div>
            </div>
          )}

          {/* ---------------- LETTERS ---------------- */}
          {tab === 'LETTERS' && (
            <div className="space-y-4">
              {/* Original order */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>मूल आदेश पत्र (Original Order)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>पत्र / आदेश संख्या</label>
                    <input className={inputCls} value={orderRef} onChange={e => setOrderRef(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>पत्र दिनांक</label>
                    <input type="date" className={inputCls} value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                  </div>
                </div>
                <input
                  ref={orderInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={e => handleReplaceOrder(e.target.files?.[0])}
                />
                {orderName || orderUrl ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-700 shrink-0" />
                      <span className="font-bold text-slate-900 truncate">{orderName || 'संलग्न फ़ाइल'}</span>
                      {orderSize && <span className="text-slate-500 shrink-0">({orderSize})</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => orderInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] font-bold bg-white border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-100"
                      >
                        बदलें
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('मूल आदेश पत्र की फ़ाइल हटाएँ?')) {
                            setOrderName('');
                            setOrderUrl('');
                            setOrderSize('');
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="हटाएँ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => orderInputRef.current?.click()}
                    className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-center hover:bg-slate-50"
                  >
                    <FileUp className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <div className="font-bold text-slate-700">मूल आदेश फ़ाइल संलग्न करें</div>
                  </button>
                )}
              </div>

              {/* Added letters */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>बाद में जोड़े गए पत्र (Additional Letters)</span>
                </h3>

                {letters.length === 0 && (
                  <p className="text-slate-500 italic">अभी कोई अतिरिक्त पत्र नहीं जोड़ा गया है।</p>
                )}

                {letters.map(l => (
                  <div key={l.id} className="flex items-start justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-bold text-slate-900">{l.title}</div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        {l.referenceNumber && <span>पत्र सं.: {l.referenceNumber} </span>}
                        {l.letterDate && <span>| दिनांक: {l.letterDate} </span>}
                      </div>
                      {l.fileName && (
                        <div className="text-[11px] text-indigo-700 font-mono truncate">
                          📎 {l.fileName} {l.fileSize && `(${l.fileSize})`}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        जोड़ा गया: {new Date(l.addedAt).toLocaleString('en-IN')} {l.addedByName && `— ${l.addedByName}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`पत्र "${l.title}" हटाएँ? इकाइयों को यह दिखना बंद हो जाएगा।`))
                          setLetters(prev => prev.filter(x => x.id !== l.id));
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 shrink-0"
                      title="हटाएँ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add-letter form */}
                <div className="p-3 border border-dashed border-indigo-300 rounded-lg bg-indigo-50/40 space-y-2.5">
                  <div className="font-bold text-indigo-900">+ नया पत्र जोड़ें</div>
                  <div>
                    <label className={labelCls}>शीर्षक * (जैसे: शुद्धि-पत्र, अतिरिक्त निर्देश)</label>
                    <input
                      className={inputCls}
                      value={newLetter.title}
                      onChange={e => setNewLetter(p => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>पत्र संख्या</label>
                      <input
                        className={inputCls}
                        value={newLetter.referenceNumber}
                        onChange={e => setNewLetter(p => ({ ...p, referenceNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>दिनांक</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={newLetter.letterDate}
                        onChange={e => setNewLetter(p => ({ ...p, letterDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      ref={newLetterInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={e => handleNewLetterFile(e.target.files?.[0])}
                      className="text-[11px]"
                    />
                    {newLetter.fileName && (
                      <span className="text-[11px] text-emerald-700 font-bold">✓ {newLetter.fileName} ({newLetter.fileSize})</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={addLetter}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>सूची में जोड़ें</span>
                  </button>
                  <p className="text-[10px] text-slate-500">
                    प्रति फ़ाइल अधिकतम {fmtSize(MAX_FILE_BYTES)}। पत्र "Save" दबाने के बाद ही इकाइयों को दिखेगा।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- FIELDS ---------------- */}
          {tab === 'FIELDS' && (
            <div className="space-y-3">
              {submittedCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    इस मांग पर {submittedCount} इकाइयाँ डेटा भेज चुकी हैं। पहले से भेजा गया डेटा कभी नहीं मिटेगा।
                    नया अनिवार्य फ़ील्ड जोड़ने पर, Save करते समय आप उन इकाइयों से पुनः सबमिशन माँग सकते हैं।
                  </p>
                </div>
              )}

              {fields.length === 0 && (
                <p className="text-slate-500 italic bg-white p-4 rounded-xl border border-slate-200">
                  अभी कोई फ़ील्ड नहीं है। नीचे से नया फ़ील्ड जोड़ें।
                </p>
              )}

              {fields.map((f, idx) => {
                const isExisting = originalFieldIds.has(f.id);
                const answered = answerCounts[f.id] || 0;
                const typeLocked = isExisting && answered > 0;
                const open = expandedFieldId === f.id;
                return (
                  <div key={f.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setExpandedFieldId(open ? null : f.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="font-bold text-slate-900 truncate">
                          {idx + 1}. {f.label || <span className="text-rose-500 italic">(नाम दर्ज करें)</span>}
                          {f.required && <span className="text-red-500 ml-0.5">*</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 flex gap-2 flex-wrap">
                          <span>{FIELD_TYPE_LABELS[f.type]}</span>
                          {!isExisting && <span className="text-emerald-700 font-bold">नया</span>}
                          {isExisting && answered > 0 && <span>{answered} उत्तर प्राप्त</span>}
                        </div>
                      </button>
                      <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30" title="ऊपर">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30" title="नीचे">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => removeField(f)} className="p-1 text-slate-400 hover:text-rose-600" title="फ़ील्ड हटाएँ">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {open && (
                      <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-100 bg-slate-50/60">
                        <div>
                          <label className={labelCls}>फ़ील्ड का नाम / प्रश्न *</label>
                          <input className={inputCls} value={f.label} onChange={e => updateField(f.id, { label: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>प्रकार</label>
                            <select
                              className={`${inputCls} disabled:bg-slate-100`}
                              value={f.type}
                              disabled={typeLocked}
                              onChange={e => {
                                const t = e.target.value as CustomFieldType;
                                const patch: Partial<CustomFieldDefinition> = { type: t };
                                if ((t === 'select' || t === 'radio') && !f.options) patch.options = [];
                                if (t === 'table_grid' && !f.tableColumns)
                                  patch.tableColumns = [{ id: uid('col'), label: '', type: 'text' }];
                                updateField(f.id, patch);
                              }}
                            >
                              {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map(t => (
                                <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                              ))}
                            </select>
                            {typeLocked && (
                              <p className="text-[10px] text-amber-700 mt-1">
                                {answered} इकाइयों के उत्तर आ चुके हैं, इसलिए प्रकार नहीं बदला जा सकता। नया फ़ील्ड जोड़ें।
                              </p>
                            )}
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer pb-2">
                              <input type="checkbox" checked={f.required} onChange={e => updateField(f.id, { required: e.target.checked })} />
                              <span className="font-medium text-slate-800">अनिवार्य (Required)</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Placeholder</label>
                            <input className={inputCls} value={f.placeholder || ''} onChange={e => updateField(f.id, { placeholder: e.target.value || undefined })} />
                          </div>
                          <div>
                            <label className={labelCls}>इकाई (Unit, जैसे: संख्या / ₹)</label>
                            <input className={inputCls} value={f.unit || ''} onChange={e => updateField(f.id, { unit: e.target.value || undefined })} />
                          </div>
                        </div>

                        <div>
                          <label className={labelCls}>सहायता टेक्स्ट (Help Text)</label>
                          <input className={inputCls} value={f.helpText || ''} onChange={e => updateField(f.id, { helpText: e.target.value || undefined })} />
                        </div>

                        {f.type === 'number' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>न्यूनतम मान</label>
                              <input
                                type="number"
                                className={inputCls}
                                value={f.min ?? ''}
                                onChange={e => updateField(f.id, { min: e.target.value === '' ? undefined : Number(e.target.value) })}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>अधिकतम मान</label>
                              <input
                                type="number"
                                className={inputCls}
                                value={f.max ?? ''}
                                onChange={e => updateField(f.id, { max: e.target.value === '' ? undefined : Number(e.target.value) })}
                              />
                            </div>
                          </div>
                        )}

                        {(f.type === 'select' || f.type === 'radio') && (
                          <div>
                            <label className={labelCls}>विकल्प (हर पंक्ति में एक विकल्प)</label>
                            <textarea
                              rows={4}
                              className={inputCls}
                              value={optionsDraft[f.id] ?? (f.options || []).join('\n')}
                              onChange={e => {
                                const raw = e.target.value;
                                setOptionsDraft(d => ({ ...d, [f.id]: raw }));
                                updateField(f.id, {
                                  options: raw.split('\n').map(s => s.trim()).filter(Boolean)
                                });
                              }}
                            />
                          </div>
                        )}

                        {f.type === 'table_grid' && (
                          <div className="space-y-2">
                            <label className={labelCls}>तालिका के कॉलम</label>
                            {(f.tableColumns || []).map(c => (
                              <div key={c.id} className="flex items-center gap-2 flex-wrap p-2 bg-white border border-slate-200 rounded-lg">
                                <input
                                  className={`${inputCls} flex-1 min-w-[140px]`}
                                  placeholder="कॉलम का नाम"
                                  value={c.label}
                                  onChange={e => updateColumn(f.id, c.id, { label: e.target.value })}
                                />
                                <select
                                  className={`${inputCls} w-28`}
                                  value={c.type}
                                  onChange={e => updateColumn(f.id, c.id, { type: e.target.value as TableColumnConfig['type'] })}
                                >
                                  <option value="text">Text</option>
                                  <option value="number">Number</option>
                                  <option value="select">Select</option>
                                </select>
                                {c.type === 'select' && (
                                  <input
                                    className={`${inputCls} flex-1 min-w-[140px]`}
                                    placeholder="विकल्प (कॉमा से अलग)"
                                    value={(c.options || []).join(', ')}
                                    onChange={e =>
                                      updateColumn(f.id, c.id, {
                                        options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                      })
                                    }
                                  />
                                )}
                                <label className="flex items-center gap-1 text-[11px]">
                                  <input
                                    type="checkbox"
                                    checked={!!c.required}
                                    onChange={e => updateColumn(f.id, c.id, { required: e.target.checked })}
                                  />
                                  अनिवार्य
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateField(f.id, { tableColumns: (f.tableColumns || []).filter(x => x.id !== c.id) })
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                updateField(f.id, {
                                  tableColumns: [...(f.tableColumns || []), { id: uid('col'), label: '', type: 'text' }]
                                })
                              }
                              className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> कॉलम जोड़ें
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="bg-white p-3 rounded-xl border border-dashed border-indigo-300">
                <div className="font-bold text-indigo-900 mb-2">+ नया फ़ील्ड जोड़ें</div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[])
                    .filter(t => t !== 'file')
                    .map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addField(t)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-lg font-bold"
                      >
                        {FIELD_TYPE_LABELS[t]}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- RESOURCES ---------------- */}
          {tab === 'RESOURCES' && (
            <div className="space-y-4">
              {(requisition.googleSheetConfig || requisition.googleFormConfig) && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h3 className="font-bold text-slate-900">मूल Google Sheet / Form</h3>
                  {requisition.googleSheetConfig && (
                    <div className="space-y-2">
                      <div>
                        <label className={labelCls}>Google Sheet लिंक</label>
                        <input className={`${inputCls} font-mono`} value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelCls}>निर्देश</label>
                        <textarea rows={2} className={inputCls} value={sheetInstr} onChange={e => setSheetInstr(e.target.value)} />
                      </div>
                    </div>
                  )}
                  {requisition.googleFormConfig && (
                    <div className="space-y-2">
                      <div>
                        <label className={labelCls}>Google Form लिंक</label>
                        <input className={`${inputCls} font-mono`} value={formUrl} onChange={e => setFormUrl(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelCls}>निर्देश</label>
                        <textarea rows={2} className={inputCls} value={formInstr} onChange={e => setFormInstr(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-indigo-600" />
                  <span>बाद में जोड़े गए Sheet / Form</span>
                </h3>

                {resources.length === 0 && (
                  <p className="text-slate-500 italic">अभी कोई अतिरिक्त Sheet/Form नहीं जोड़ा गया है।</p>
                )}

                {resources.map(r => (
                  <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            className={inputCls}
                            value={r.kind}
                            onChange={e =>
                              setResources(prev => prev.map(x => (x.id === r.id ? { ...x, kind: e.target.value as RequisitionResource['kind'] } : x)))
                            }
                          >
                            <option value="GOOGLE_SHEET">Google Sheet</option>
                            <option value="GOOGLE_FORM">Google Form</option>
                            <option value="OTHER_LINK">अन्य लिंक</option>
                          </select>
                          <input
                            className={`${inputCls} sm:col-span-2`}
                            value={r.title}
                            onChange={e => setResources(prev => prev.map(x => (x.id === r.id ? { ...x, title: e.target.value } : x)))}
                          />
                        </div>
                        <input
                          className={`${inputCls} font-mono`}
                          value={r.url}
                          onChange={e => setResources(prev => prev.map(x => (x.id === r.id ? { ...x, url: e.target.value } : x)))}
                        />
                        <textarea
                          rows={2}
                          className={inputCls}
                          placeholder="निर्देश (वैकल्पिक)"
                          value={r.instructions || ''}
                          onChange={e =>
                            setResources(prev => prev.map(x => (x.id === r.id ? { ...x, instructions: e.target.value || undefined } : x)))
                          }
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={r.responseRequired}
                            onChange={e =>
                              setResources(prev => prev.map(x => (x.id === r.id ? { ...x, responseRequired: e.target.checked } : x)))
                            }
                          />
                          <span className="font-medium text-slate-800">इकाई से भरा हुआ लिंक / Response ID माँगें</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`"${r.title}" हटाएँ?`)) setResources(prev => prev.filter(x => x.id !== r.id));
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 shrink-0"
                        title="हटाएँ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="p-3 border border-dashed border-indigo-300 rounded-lg bg-indigo-50/40 space-y-2.5">
                  <div className="font-bold text-indigo-900">+ नया Sheet / Form जोड़ें</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={labelCls}>प्रकार</label>
                      <select
                        className={inputCls}
                        value={newRes.kind}
                        onChange={e => setNewRes(p => ({ ...p, kind: e.target.value as RequisitionResource['kind'] }))}
                      >
                        <option value="GOOGLE_SHEET">Google Sheet</option>
                        <option value="GOOGLE_FORM">Google Form</option>
                        <option value="OTHER_LINK">अन्य लिंक</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>शीर्षक *</label>
                      <input className={inputCls} value={newRes.title} onChange={e => setNewRes(p => ({ ...p, title: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>लिंक (URL) *</label>
                    <input
                      className={`${inputCls} font-mono`}
                      placeholder="https://docs.google.com/..."
                      value={newRes.url}
                      onChange={e => setNewRes(p => ({ ...p, url: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>निर्देश</label>
                    <textarea rows={2} className={inputCls} value={newRes.instructions} onChange={e => setNewRes(p => ({ ...p, instructions: e.target.value }))} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newRes.responseRequired} onChange={e => setNewRes(p => ({ ...p, responseRequired: e.target.checked }))} />
                    <span className="font-medium text-slate-800">इकाई से भरा हुआ लिंक / Response ID माँगें</span>
                  </label>
                  <button
                    type="button"
                    onClick={addResource}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>सूची में जोड़ें</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: summary + options + actions */}
        <div className="border-t border-slate-200 bg-white px-4 sm:px-5 py-3 space-y-2.5">
          {changes.length > 0 ? (
            <div className="max-h-24 overflow-y-auto text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-0.5">
              <div className="font-bold text-slate-900">Save करने पर ये बदलाव लागू होंगे ({changes.length}):</div>
              {changes.map((c, i) => (
                <div key={i}>• {c}</div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">अभी कोई बदलाव नहीं किया गया है।</p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              {contentChanged && (
                <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input type="checkbox" checked={notifyUnits} onChange={e => setNotifyUnits(e.target.checked)} />
                  <Bell className="w-3 h-3 text-indigo-600" />
                  <span className="font-medium text-slate-800">लक्षित इकाइयों को ईमेल से संशोधन की सूचना भेजें</span>
                </label>
              )}
              {fieldOrResourceChanged && submittedCount > 0 && (
                <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input type="checkbox" checked={requestResubmission} onChange={e => setRequestResubmission(e.target.checked)} />
                  <RotateCcw className="w-3 h-3 text-amber-600" />
                  <span className="font-medium text-slate-800">
                    जिन {submittedCount} इकाइयों ने डेटा भेज दिया है, उनसे संशोधित/पुनः सबमिशन माँगें
                  </span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50">
                रद्द करें
              </button>
              <button
                onClick={handleSave}
                disabled={saving || changes.length === 0}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'सुरक्षित हो रहा है...' : 'बदलाव सुरक्षित करें'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
