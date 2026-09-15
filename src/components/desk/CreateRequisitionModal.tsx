import React, { useState, useRef } from 'react';
import { 
  Requisition, 
  DirectorateDesk, 
  FieldUnit, 
  PriorityLevel, 
  RequisitionMode, 
  CustomFieldDefinition, 
  CustomFieldType,
  TargetScopeType
} from '../../types/portal';
import { 
  X, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  FileSpreadsheet, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  Sliders, 
  Building2, 
  FileText,
  HelpCircle,
  Link,
  Sparkles,
  FileUp,
  Paperclip,
  Stamp,
  FileCheck,
  Eye,
  BookOpen,
  Download,
  Target,
  MapPin,
  Search,
  CheckSquare,
  Square,
  Filter,
  GraduationCap,
  Map,
  Check
} from 'lucide-react';

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  desks: DirectorateDesk[];
  fieldUnits: FieldUnit[];
  activeDeskId?: string;
  onSaveRequisition: (req: Requisition) => void;
}

export const CreateRequisitionModal: React.FC<CreateRequisitionModalProps> = ({
  isOpen,
  onClose,
  desks,
  fieldUnits,
  activeDeskId,
  onSaveRequisition
}) => {
  const initialDesk = desks.find(d => d.id === activeDeskId) || desks[0];

  // Basic Details
  const [selectedDeskId, setSelectedDeskId] = useState<string>(initialDesk?.id || desks[0].id);
  const [requisitionNumber, setRequisitionNumber] = useState<string>(() => {
    const code = initialDesk?.code || 'DTE-DESK';
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const tiebreaker = Math.floor(10 + Math.random() * 90);
    return `${code}/${now.getFullYear()}/${month}${String(now.getDate()).padStart(2, '0')}-${hh}${mm}${ss}${tiebreaker}`;
  });
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  // Priority & Deadlines
  const [priority, setPriority] = useState<PriorityLevel>('HIGH');
  const [isAssemblyQuestion, setIsAssemblyQuestion] = useState<boolean>(false);
  const [priorityLabel, setPriorityLabel] = useState<string>('State Level Return');
  
  // Calculate default deadline: 2 days ahead
  const defaultDeadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16);
  const [deadlineDateTime, setDeadlineDateTime] = useState<string>(defaultDeadline);
  const [isStrictCutoff, setIsStrictCutoff] = useState<boolean>(true);
  const [allowLateSubmissionWithReason, setAllowLateSubmissionWithReason] = useState<boolean>(false);

  // Official Orders / Guidelines Upload State (Optional)
  const [orderDocumentName, setOrderDocumentName] = useState<string>('');
  const [orderDocumentUrl, setOrderDocumentUrl] = useState<string>('');
  const [orderDocumentSize, setOrderDocumentSize] = useState<string>('');
  const [orderReferenceNumber, setOrderReferenceNumber] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>('');
  const [isOrderDragOver, setIsOrderDragOver] = useState<boolean>(false);
  const [previewingOrder, setPreviewingOrder] = useState<boolean>(false);
  const orderFileInputRef = useRef<HTMLInputElement>(null);

  // Target Scope - 5 Options
  const [targetScope, setTargetScope] = useState<TargetScopeType>('ALL_ITIS');
  
  // Option 4: Selected JD Offices (Mandal-wise)
  const jdOffices = fieldUnits.filter(u => u.type === 'JD_OFFICE');
  const [selectedJdOfficeIds, setSelectedJdOfficeIds] = useState<string[]>(() => 
    fieldUnits.filter(u => u.type === 'JD_OFFICE').map(u => u.id)
  );
  const [jdSearchQuery, setJdSearchQuery] = useState<string>('');

  // Option 5: Selected ITIs
  const itis = fieldUnits.filter(u => u.type === 'ITI');
  const [itiSelectionSubMode, setItiSelectionSubMode] = useState<'DISTRICT_WISE' | 'ITI_WISE'>('DISTRICT_WISE');
  
  // District-wise state
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>('');
  const [districtZoneFilter, setDistrictZoneFilter] = useState<string>('ALL');

  // ITI-wise state
  const [selectedItiIds, setSelectedItiIds] = useState<string[]>([]);
  const [itiSearchQuery, setItiSearchQuery] = useState<string>('');
  const [itiZoneFilter, setItiZoneFilter] = useState<string>('ALL');
  const [itiDistrictFilter, setItiDistrictFilter] = useState<string>('ALL');

  // Legacy fallback
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  // Mode
  const [mode, setMode] = useState<RequisitionMode>('CUSTOM_FORM');
  
  // Google Sheet Config
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');
  const [sheetInstructions, setSheetInstructions] = useState<string>('Please access the attached Google Sheet template, fill data in your designated tab, and submit your updated link.');

  // Google Form Config
  const [googleFormUrl, setGoogleFormUrl] = useState<string>('');
  const [requireFormResponseId, setRequireFormResponseId] = useState<boolean>(true);

  // Dynamic Custom Fields Builder default sample
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([
    {
      id: 'field_enrolled_trainees',
      label: 'सत्र में कुल नामांकित प्रशिक्षणार्थी (Total Enrolled Trainees)',
      type: 'number',
      placeholder: 'उदा. 450',
      required: true,
      unit: 'प्रशिक्षणार्थी'
    },
    {
      id: 'field_infrastructure_status',
      label: 'कार्यशाला मशीनरी एवं उपकरण स्थिति (Machinery Readiness)',
      type: 'select',
      options: ['श्रेणी क (100% क्रियाशील)', 'श्रेणी ख (आंशिक मरम्मत योग्य)', 'श्रेणी ग (उपकरणों की भारी कमी)'],
      required: true
    },
    {
      id: 'field_officer_remarks',
      label: 'प्रधानाचार्य / नोडल अधिकारी की विशेष टिप्पणी',
      type: 'textarea',
      placeholder: 'संस्थान संबंधी कोई विशेष टिप्पणी या विवरण दर्ज करें...',
      required: false
    }
  ]);

  // Verification
  const [requireOfficerDeclaration, setRequireOfficerDeclaration] = useState<boolean>(true);
  const [requireOfficialSealUpload, setRequireOfficialSealUpload] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleDeskChange = (deskId: string) => {
    setSelectedDeskId(deskId);
    const desk = desks.find(d => d.id === deskId);
    if (desk) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const tiebreaker = Math.floor(10 + Math.random() * 90);
      setRequisitionNumber(`${desk.code}/${now.getFullYear()}/${month}${day}-${hh}${mm}${ss}${tiebreaker}`);
    }
  };

  const processOrderFile = (file: File) => {
    if (!file) return;
    setOrderDocumentName(file.name);
    setOrderDocumentSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setOrderDocumentUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOrderFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processOrderFile(e.target.files[0]);
    }
  };

  const handleOrderDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOrderDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processOrderFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveOrder = () => {
    setOrderDocumentName('');
    setOrderDocumentUrl('');
    setOrderDocumentSize('');
    if (orderFileInputRef.current) {
      orderFileInputRef.current.value = '';
    }
  };

  const handleAddCustomField = (type: CustomFieldType = 'text') => {
    const newField: CustomFieldDefinition = {
      id: `field_${Date.now()}`,
      label: type === 'number' ? 'नया संख्यात्मक फ़ील्ड (Numeric)' : type === 'select' ? 'ड्रॉपडाउन विकल्प फ़ील्ड' : 'नया टेक्स्ट फ़ील्ड',
      type,
      placeholder: '',
      required: true,
      options: type === 'select' || type === 'radio' ? ['विकल्प 1', 'विकल्प 2', 'विकल्प 3'] : undefined,
      unit: type === 'number' ? 'संख्या' : undefined
    };
    setCustomFields([...customFields, newField]);
  };

  const handleRemoveCustomField = (fieldId: string) => {
    setCustomFields(customFields.filter(f => f.id !== fieldId));
  };

  const handleUpdateField = (fieldId: string, updates: Partial<CustomFieldDefinition>) => {
    setCustomFields(customFields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('कृपया मांग का विषय/शीर्षक दर्ज करें।');
      return;
    }

    const desk = desks.find(d => d.id === selectedDeskId);
    if (!desk) return;

    // Determine target units based on 5 scope options
    let targetUnitIds: string[] = [];
    let targetZones: string[] | undefined = undefined;
    let targetDistricts: string[] | undefined = undefined;

    if (targetScope === 'ALL_FIELD_UNITS') {
      targetUnitIds = fieldUnits.map(u => u.id);
    } else if (targetScope === 'ALL_JD_OFFICES') {
      targetUnitIds = jdOffices.map(u => u.id);
    } else if (targetScope === 'ALL_ITIS') {
      targetUnitIds = itis.map(u => u.id);
    } else if (targetScope === 'SELECTED_JD_OFFICES') {
      targetUnitIds = selectedJdOfficeIds;
      const targetedJds = fieldUnits.filter(u => selectedJdOfficeIds.includes(u.id));
      targetZones = Array.from(new Set(targetedJds.map(u => u.zone)));
    } else if (targetScope === 'SELECTED_ITIS') {
      if (itiSelectionSubMode === 'DISTRICT_WISE') {
        targetDistricts = selectedDistricts;
        targetUnitIds = itis.filter(u => selectedDistricts.includes(u.district)).map(u => u.id);
        const targetedItis = fieldUnits.filter(u => targetUnitIds.includes(u.id));
        targetZones = Array.from(new Set(targetedItis.map(u => u.zone)));
      } else {
        targetUnitIds = selectedItiIds;
        const targetedItis = fieldUnits.filter(u => selectedItiIds.includes(u.id));
        targetDistricts = Array.from(new Set(targetedItis.map(u => u.district)));
        targetZones = Array.from(new Set(targetedItis.map(u => u.zone)));
      }
    } else if (targetScope === 'SELECTED_ZONES') {
      targetUnitIds = fieldUnits.filter(u => selectedZones.includes(u.zone)).map(u => u.id);
      targetZones = selectedZones;
    } else {
      targetUnitIds = selectedUnitIds;
    }

    if (targetUnitIds.length === 0) {
      alert('कृपया कम से कम एक लक्षित क्षेत्रीय इकाई (JD अथवा ITI) का चयन करें।');
      return;
    }

    const newReq: Requisition = {
      id: `req-${Date.now()}`,
      requisitionNumber: requisitionNumber.trim() || `DTE-REQ-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      deskId: desk.id,
      deskName: desk.name,
      priority,
      priorityLabel: priorityLabel || (isAssemblyQuestion ? 'विधान सभा तारांकित प्रश्न' : 'राज्य स्तरीय सूचना मांग'),
      isAssemblyQuestion,
      mode,
      createdAt: new Date().toISOString(),
      deadline: new Date(deadlineDateTime).toISOString(),
      isStrictCutoff,
      allowLateSubmissionWithReason,
      targetScope,
      targetZones: targetZones || (targetScope === 'SELECTED_ZONES' ? selectedZones : undefined),
      targetDistricts,
      targetUnitIds,
      customFields: (mode === 'CUSTOM_FORM' || mode === 'HYBRID') ? customFields : undefined,
      googleSheetConfig: (mode === 'GOOGLE_SHEET' || mode === 'HYBRID') ? {
        sheetUrl: googleSheetUrl,
        embedAllowed: true,
        sheetInstructions,
        expectedColumnsSummary: ['Field Data', 'Verified By Head']
      } : undefined,
      googleFormConfig: mode === 'GOOGLE_FORM' ? {
        formUrl: googleFormUrl,
        requireResponseIdConfirmation: requireFormResponseId,
        instructions: 'कृपया गूगल फॉर्म भरें एवं सबमिशन पावती आईडी दर्ज करें।'
      } : undefined,
      requireOfficerDeclaration,
      requireOfficialSealUpload,
      orderDocumentName: orderDocumentName.trim() || undefined,
      orderDocumentUrl: orderDocumentUrl.trim() || undefined,
      orderDocumentSize: orderDocumentSize || undefined,
      orderReferenceNumber: orderReferenceNumber.trim() || undefined,
      orderDate: orderDate || undefined,
      attachmentNoticeDocUrl: orderDocumentUrl.trim() || undefined,
      status: 'ACTIVE'
    };

    onSaveRequisition(newReq);
    onClose();
  };

  // Target Scope helpers
  const allZones: string[] = Array.from(new Set<string>(fieldUnits.map(u => u.zone))).sort();
  const allDistricts: string[] = Array.from(new Set<string>(itis.map(u => u.district))).sort();

  const districtData: { district: string; zone: string; itiCount: number; itiIds: string[] }[] = allDistricts.map(dist => {
    const itisInDist = itis.filter(u => u.district === dist);
    const zone = itisInDist[0]?.zone || 'Other';
    return {
      district: dist,
      zone,
      itiCount: itisInDist.length,
      itiIds: itisInDist.map(u => u.id)
    };
  });

  // Filtered JD offices for Option 4
  const filteredJdOffices = jdOffices.filter(jd => {
    if (!jdSearchQuery.trim()) return true;
    const q = jdSearchQuery.toLowerCase();
    return jd.name.toLowerCase().includes(q) || 
           jd.zone.toLowerCase().includes(q) || 
           jd.district.toLowerCase().includes(q) ||
           jd.code.toLowerCase().includes(q);
  });

  // Filtered districts for Option 5 (District-wise)
  const filteredDistrictData = districtData.filter(d => {
    if (districtZoneFilter !== 'ALL' && d.zone !== districtZoneFilter) return false;
    if (!districtSearchQuery.trim()) return true;
    return d.district.toLowerCase().includes(districtSearchQuery.toLowerCase()) || 
           d.zone.toLowerCase().includes(districtSearchQuery.toLowerCase());
  });

  // Filtered ITIs for Option 5 (ITI-wise)
  const filteredItis = itis.filter(it => {
    if (itiZoneFilter !== 'ALL' && it.zone !== itiZoneFilter) return false;
    if (itiDistrictFilter !== 'ALL' && it.district !== itiDistrictFilter) return false;
    if (!itiSearchQuery.trim()) return true;
    const q = itiSearchQuery.toLowerCase();
    return it.name.toLowerCase().includes(q) || 
           it.code.toLowerCase().includes(q) || 
           it.district.toLowerCase().includes(q) ||
           it.zone.toLowerCase().includes(q);
  });

  // Live count
  let currentEffectiveTargetCount = 0;
  if (targetScope === 'ALL_FIELD_UNITS') {
    currentEffectiveTargetCount = fieldUnits.length;
  } else if (targetScope === 'ALL_JD_OFFICES') {
    currentEffectiveTargetCount = jdOffices.length;
  } else if (targetScope === 'ALL_ITIS') {
    currentEffectiveTargetCount = itis.length;
  } else if (targetScope === 'SELECTED_JD_OFFICES') {
    currentEffectiveTargetCount = selectedJdOfficeIds.length;
  } else if (targetScope === 'SELECTED_ITIS') {
    if (itiSelectionSubMode === 'DISTRICT_WISE') {
      currentEffectiveTargetCount = itis.filter(u => selectedDistricts.includes(u.district)).length;
    } else {
      currentEffectiveTargetCount = selectedItiIds.length;
    }
  } else if (targetScope === 'SELECTED_ZONES') {
    currentEffectiveTargetCount = fieldUnits.filter(u => selectedZones.includes(u.zone)).length;
  }

  const toggleJdOffice = (jdId: string) => {
    if (selectedJdOfficeIds.includes(jdId)) {
      setSelectedJdOfficeIds(selectedJdOfficeIds.filter(id => id !== jdId));
    } else {
      setSelectedJdOfficeIds([...selectedJdOfficeIds, jdId]);
    }
  };

  const toggleDistrict = (districtName: string) => {
    if (selectedDistricts.includes(districtName)) {
      setSelectedDistricts(selectedDistricts.filter(d => d !== districtName));
    } else {
      setSelectedDistricts([...selectedDistricts, districtName]);
    }
  };

  const toggleIti = (itiId: string) => {
    if (selectedItiIds.includes(itiId)) {
      setSelectedItiIds(selectedItiIds.filter(id => id !== itiId));
    } else {
      setSelectedItiIds([...selectedItiIds, itiId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">नई आधिकारिक सूचना मांग (New Requisition) जारी करें</h2>
              <p className="text-xs text-slate-300">
                शासनादेश/मार्गदर्शिका संलग्न करें, कस्टमाइज़्ड फ़ील्ड्स डिज़ाइन करें, प्राथमिकता व अंतिम तिथि निर्धारित करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 bg-slate-50/50">
          
          {/* Section 1: Issuing Desk & Priority Controls */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">1. जारीकर्ता निदेशालय प्रकोष्ठ एवं प्राथमिकता स्तर</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  निदेशालय प्रकोष्ठ / अनुभाग (Directorate Desk) *
                </label>
                <select
                  value={selectedDeskId}
                  onChange={(e) => handleDeskChange(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                >
                  {desks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  मांग संदर्भ संख्या (Requisition Reference Number) *
                </label>
                <input
                  type="text"
                  value={requisitionNumber}
                  onChange={(e) => setRequisitionNumber(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Priority Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                प्राथमिकता स्तर (Priority Severity) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => { setPriority('IMMEDIATE'); setIsAssemblyQuestion(true); }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    priority === 'IMMEDIATE'
                      ? 'border-red-600 bg-red-50 text-red-900 ring-2 ring-red-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>अति-तात्कालिक (IMMEDIATE)</span>
                  </div>
                  <div className="text-[11px] text-red-800/80 mt-0.5 font-medium">
                    विधान सभा / सीएम डैशबोर्ड
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setPriority('HIGH'); setIsAssemblyQuestion(false); }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    priority === 'HIGH'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-800">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>उच्च (HIGH)</span>
                  </div>
                  <div className="text-[11px] text-amber-800/80 mt-0.5 font-medium">
                    कोर्ट / ऑडिट / भारत सरकार
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setPriority('NORMAL'); setIsAssemblyQuestion(false); }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    priority === 'NORMAL'
                      ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold text-blue-700">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>सामान्य (NORMAL)</span>
                  </div>
                  <div className="text-[11px] text-blue-800/80 mt-0.5 font-medium">
                    विभागीय नियमित आख्या
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setPriority('ROUTINE'); setIsAssemblyQuestion(false); }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    priority === 'ROUTINE'
                      ? 'border-slate-500 bg-slate-100 text-slate-900 ring-2 ring-slate-400/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>मासिक / नियमित (ROUTINE)</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    सामान्य आवधिक रिटर्न
                  </div>
                </button>
              </div>
            </div>

            {/* Assembly Question Flag Checkbox */}
            <div className="flex items-center gap-2 p-2.5 bg-red-50/60 border border-red-200 rounded-lg">
              <input
                type="checkbox"
                id="assemblyQuestion"
                checked={isAssemblyQuestion}
                onChange={(e) => setIsAssemblyQuestion(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500"
              />
              <label htmlFor="assemblyQuestion" className="text-xs font-bold text-red-900 cursor-pointer">
                माननीय विधान सभा / विधान परिषद प्रश्न के रूप में चिह्नित करें (क्षेत्रीय इकाइयों के डैशबोर्ड पर लाल रंग की फ्लैश चेतावनी प्रदर्शित होगी)
              </label>
            </div>
          </div>

          {/* Section 2: Requisition Subject & Description */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">2. विषय एवं विस्तृत दिशा-निर्देश</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                मांग का आधिकारिक विषय (Subject / Title) *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="उदा. राजकीय औद्योगिक प्रशिक्षण संस्थानों में आधुनिक सीएनसी एवं रोबोटिक्स लैब स्थापना संबंधी आख्या..."
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                विस्तृत निर्देश एवं आवश्यकता का विवरण (Detailed Instructions)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="क्षेत्रीय अधिकारियों द्वारा भरे जाने वाले डेटा के संदर्भ में स्पष्ट दिशा-निर्देश एवं गणना का प्रारूप यहां दर्ज करें..."
                rows={3}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 3: UPLOAD OFFICIAL ORDERS, CIRCULARS & POLICY GUIDELINES (OPTIONAL) */}
          <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-indigo-950">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold">3. शासनादेश / विभागीय आदेश / मार्गदर्शिका संलग्न करें</h3>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  (ऐच्छिक / Optional)
                </span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                Optional Attachment
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>(ऐच्छिक / Optional)</strong>: यदि इस सूचना मांग के समर्थन में कोई <strong>शासनादेश, विभागीय परिपत्र (Circular), नीतिगत गाइडलाइन या प्रारूप प्रपत्र</strong> उपलब्ध है, तो उसे संलग्न करें। यदि कोई आदेश संलग्न नहीं करना है, तो इस अनुभाग को रिक्त छोड़ सकते हैं।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  शासनादेश / पत्रांक संख्या (Order Reference No.) <span className="text-slate-400 font-normal">(ऐच्छिक)</span>
                </label>
                <input
                  type="text"
                  value={orderReferenceNumber}
                  onChange={(e) => setOrderReferenceNumber(e.target.value)}
                  placeholder="उदा. शासनादेश सं. 142/2026/88-व्या.शि. (यदि लागू हो)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  शासनादेश / आदेश दिनांक (Order Date) <span className="text-slate-400 font-normal">(ऐच्छिक)</span>
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={orderFileInputRef}
              onChange={handleOrderFileInputChange}
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
              className="hidden"
            />

            {/* Upload Area / Selected File Display */}
            {orderDocumentName ? (
              <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-lg shrink-0 shadow-2xs">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {orderDocumentName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="text-indigo-700 font-bold">
                        ✓ संलग्न आदेश / मार्गदर्शिका
                      </span>
                      {orderDocumentSize && <span>• {orderDocumentSize}</span>}
                      {orderReferenceNumber && <span>• {orderReferenceNumber}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewingOrder(true)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>देखें (Preview)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveOrder}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                    title="संलग्नक हटाएं"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsOrderDragOver(true); }}
                onDragLeave={() => setIsOrderDragOver(false)}
                onDrop={handleOrderDrop}
                onClick={() => orderFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isOrderDragOver 
                    ? 'border-indigo-600 bg-indigo-50' 
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 bg-slate-50/30'
                }`}
              >
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-2xs">
                  <FileUp className="w-5 h-5" />
                </div>
                <div className="font-bold text-slate-800 text-xs">
                  शासनादेश, परिपत्र अथवा गाइडलाइन PDF यहां अपलोड करें
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click to browse or Drag & Drop (PDF, DOCX, JPG, PNG up to 20MB)
                </p>
                <div className="mt-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 shadow-2xs">
                    <Paperclip className="w-3 h-3 text-indigo-600" /> Choose Order File (फाइल चुनें)
                  </span>
                </div>
              </div>
            )}

            {/* Direct URL Input Fallback */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                अथवा ऑनलाइन शासनादेश / e-Office / NIC वेब लिंक दर्ज करें (Optional Web Link)
              </label>
              <input
                type="url"
                value={orderDocumentUrl && !orderDocumentUrl.startsWith('data:') ? orderDocumentUrl : ''}
                onChange={(e) => {
                  setOrderDocumentUrl(e.target.value);
                  if (!orderDocumentName) {
                    setOrderDocumentName('e-Office_Shasanadesh_Order.pdf');
                  }
                }}
                placeholder="https://shasanadesh.up.gov.in/orders/..."
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 4: Timelines & Strict Cutoff Policy */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">4. समय-सीमा एवं सख्त कट-ऑफ नीति (Deadline & Cutoff)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  डेटा प्रस्तुत करने की अंतिम तिथि व समय (Last Date & Time) *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={deadlineDateTime}
                    onChange={(e) => setDeadlineDateTime(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  क्षेत्रीय इकाइयों को इस समय के अनुसार लाइव उल्टी गिनती (Countdown Clock) दिखाई देगी।
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700">
                  समय-सीमा समाप्ति उपरांत पोर्टल लॉक नीति *
                </label>

                <div className="flex items-start gap-2 p-2.5 rounded-lg border bg-slate-50">
                  <input
                    type="radio"
                    id="strictLock"
                    name="lockPolicy"
                    checked={isStrictCutoff && !allowLateSubmissionWithReason}
                    onChange={() => { setIsStrictCutoff(true); setAllowLateSubmissionWithReason(false); }}
                    className="mt-0.5 text-indigo-600"
                  />
                  <label htmlFor="strictLock" className="text-xs text-slate-800 cursor-pointer">
                    <span className="font-bold text-slate-900 block">सख्त स्वतः-लॉक (Strict Auto-Lock)</span>
                    अंतिम तिथि समाप्त होते ही फॉर्म स्वतः लॉक हो जाएगा। बिना अनुमति कोई प्रविष्टि संभव नहीं होगी।
                  </label>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-lg border bg-slate-50">
                  <input
                    type="radio"
                    id="allowLate"
                    name="lockPolicy"
                    checked={allowLateSubmissionWithReason}
                    onChange={() => { setIsStrictCutoff(false); setAllowLateSubmissionWithReason(true); }}
                    className="mt-0.5 text-indigo-600"
                  />
                  <label htmlFor="allowLate" className="text-xs text-slate-800 cursor-pointer">
                    <span className="font-bold text-slate-900 block">कारण सहित विलंबित प्रविष्टि की अनुमति</span>
                    विलंब से सबमिट करने की अनुमति होगी परंतु आख्या पर &quot;विलंबित आख्या (Late)&quot; का टैग अंकित रहेगा।
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Target Field Units Selection */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">5. लक्षित क्षेत्रीय इकाइयां (Target Field Units)</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>कुल लक्षित इकाइयां: <strong>{currentEffectiveTargetCount}</strong></span>
              </div>
            </div>

            {/* 5 Target Scope Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { 
                  id: 'ALL_FIELD_UNITS', 
                  title: '1. All units (JDs + ITIs)', 
                  hindi: 'समस्त क्षेत्रीय इकाइयां', 
                  countDesc: `${fieldUnits.length} इकाइयां (18 JD + ${itis.length} ITIs)`,
                  icon: Building2
                },
                { 
                  id: 'ALL_JD_OFFICES', 
                  title: '2. only all JD offices', 
                  hindi: 'केवल समस्त संयुक्त निदेशक कार्यालय', 
                  countDesc: `समस्त ${jdOffices.length} मण्डल कार्यालय`,
                  icon: Layers
                },
                { 
                  id: 'ALL_ITIS', 
                  title: '3. only all ITIs', 
                  hindi: 'केवल समस्त राजकीय आईटीआई', 
                  countDesc: `समस्त ${itis.length} राजकीय आईटीआई`,
                  icon: GraduationCap
                },
                { 
                  id: 'SELECTED_JD_OFFICES', 
                  title: '4. Selected JD offices', 
                  hindi: 'चयनित JD कार्यालय (मण्डल-वार)', 
                  countDesc: `चयनित: ${selectedJdOfficeIds.length} / ${jdOffices.length}`,
                  icon: Map
                },
                { 
                  id: 'SELECTED_ITIS', 
                  title: '5. Selected ITIs', 
                  hindi: 'चयनित आईटीआई (जिलावार / आईटीआई-वार)', 
                  countDesc: itiSelectionSubMode === 'DISTRICT_WISE' 
                    ? `चयनित: ${selectedDistricts.length} जनपद (${itis.filter(u => selectedDistricts.includes(u.district)).length} ITIs)` 
                    : `चयनित: ${selectedItiIds.length} ITIs`,
                  icon: Target
                }
              ].map(item => {
                const IconComp = item.icon;
                const isSelected = targetScope === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTargetScope(item.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70 font-medium'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{item.title}</span>
                          <span className="text-[11px] text-slate-600 font-medium block leading-tight">{item.hindi}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1 shrink-0"></span>
                      )}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{item.countDesc}</span>
                      {isSelected && <span className="text-indigo-700 font-bold">सक्रिय</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sub-Panel for Option 4: Selected JD Offices (Mandal-Wise) */}
            {targetScope === 'SELECTED_JD_OFFICES' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Map className="w-3.5 h-3.5 text-indigo-600" />
                      मण्डल अनुसार संयुक्त निदेशक (JD) कार्यालयों का चयन करें
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      जिन मण्डलों को चयनित किया जाएगा, केवल वही संयुक्त निदेशक इस मांग को देख व सबमिट कर सकेंगे
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJdOfficeIds(jdOffices.map(u => u.id))}
                      className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      सभी 18 मण्डल चुनें
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedJdOfficeIds([])}
                      className="px-2.5 py-1 text-xs bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                    >
                      हटाएं (Clear)
                    </button>
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={jdSearchQuery}
                    onChange={(e) => setJdSearchQuery(e.target.value)}
                    placeholder="मण्डल, जनपद या कार्यालय कोड से खोजें..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* JD Offices Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                  {filteredJdOffices.map(jd => {
                    const isChecked = selectedJdOfficeIds.includes(jd.id);
                    return (
                      <label
                        key={jd.id}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleJdOffice(jd.id);
                        }}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked 
                            ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block font-bold text-slate-900 truncate">
                            {jd.zone} मण्डल (Division)
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {jd.name}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-600 block mt-0.5">
                            {jd.code}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  चयनित JD कार्यालय: <strong>{selectedJdOfficeIds.length}</strong> / {jdOffices.length}
                </div>
              </div>
            )}

            {/* Sub-Panel for Option 5: Selected ITIs (District-Wise or ITI-Wise) */}
            {targetScope === 'SELECTED_ITIS' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                {/* Sub-mode switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 p-0.5 bg-slate-200/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setItiSelectionSubMode('DISTRICT_WISE')}
                      className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                        itiSelectionSubMode === 'DISTRICT_WISE'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      A. जनपद अनुसार चयन (District wise)
                    </button>
                    <button
                      type="button"
                      onClick={() => setItiSelectionSubMode('ITI_WISE')}
                      className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                        itiSelectionSubMode === 'ITI_WISE'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      B. व्यक्तिगत आईटीआई अनुसार चयन (ITI wise)
                    </button>
                  </div>

                  <span className="text-xs font-semibold text-slate-700">
                    लक्षित आईटीआई: <strong className="text-indigo-700">
                      {itiSelectionSubMode === 'DISTRICT_WISE' 
                        ? itis.filter(u => selectedDistricts.includes(u.district)).length 
                        : selectedItiIds.length}
                    </strong> / {itis.length}
                  </span>
                </div>

                {/* Mode A: District Wise Selection */}
                {itiSelectionSubMode === 'DISTRICT_WISE' && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Mandal Filter */}
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-slate-400" />
                          <select
                            value={districtZoneFilter}
                            onChange={(e) => setDistrictZoneFilter(e.target.value)}
                            className="text-xs py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="ALL">समस्त 18 मण्डल (All Zones)</option>
                            {allZones.map(zone => (
                              <option key={zone} value={zone}>{zone} मण्डल</option>
                            ))}
                          </select>
                        </div>

                        {/* Search District */}
                        <div className="relative flex-1 min-w-[160px]">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                          <input
                            type="text"
                            value={districtSearchQuery}
                            onChange={(e) => setDistrictSearchQuery(e.target.value)}
                            placeholder="जनपद खोजें (उदा. लखनऊ, कानपुर, गोरखपुर)..."
                            className="w-full pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const newDists = new Set([...selectedDistricts, ...filteredDistrictData.map(d => d.district)]);
                            setSelectedDistricts(Array.from(newDists));
                          }}
                          className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          दिख रहे जनपद चुनें
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDistricts([])}
                          className="px-2.5 py-1 text-xs bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                        >
                          हटाएं (Clear)
                        </button>
                      </div>
                    </div>

                    {/* Districts Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                      {filteredDistrictData.map(d => {
                        const isChecked = selectedDistricts.includes(d.district);
                        return (
                          <label
                            key={d.district}
                            onClick={(e) => {
                              e.preventDefault();
                              toggleDistrict(d.district);
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked 
                                ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                              />
                              <span className="truncate">{d.district}</span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 ml-1">
                              {d.itiCount} ITIs
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                      <span>चयनित जनपद: <strong>{selectedDistricts.length}</strong> / {allDistricts.length}</span>
                      <span>शामिल राजकीय आईटीआई: <strong>{itis.filter(u => selectedDistricts.includes(u.district)).length}</strong> संस्थान</span>
                    </div>
                  </div>
                )}

                {/* Mode B: ITI Wise Individual Selection */}
                {itiSelectionSubMode === 'ITI_WISE' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Mandal Filter */}
                      <select
                        value={itiZoneFilter}
                        onChange={(e) => {
                          setItiZoneFilter(e.target.value);
                          setItiDistrictFilter('ALL');
                        }}
                        className="text-xs py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">समस्त मण्डल (All Zones)</option>
                        {allZones.map(zone => (
                          <option key={zone} value={zone}>{zone} मण्डल</option>
                        ))}
                      </select>

                      {/* District Filter */}
                      <select
                        value={itiDistrictFilter}
                        onChange={(e) => setItiDistrictFilter(e.target.value)}
                        className="text-xs py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">समस्त जनपद (All Districts)</option>
                        {allDistricts
                          .filter(d => itiZoneFilter === 'ALL' || itis.some(it => it.district === d && it.zone === itiZoneFilter))
                          .map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                      </select>

                      {/* Search ITI */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          value={itiSearchQuery}
                          onChange={(e) => setItiSearchQuery(e.target.value)}
                          placeholder="आईटीआई नाम या कोड खोजें..."
                          className="w-full pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">
                        दिख रहे संस्थान: {filteredItis.length} | कुल चयनित: <strong>{selectedItiIds.length}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newIds = new Set([...selectedItiIds, ...filteredItis.map(u => u.id)]);
                            setSelectedItiIds(Array.from(newIds));
                          }}
                          className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          दिख रहे ITIs चुनें ({filteredItis.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedItiIds([])}
                          className="px-2.5 py-1 text-xs bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                        >
                          हटाएं (Clear)
                        </button>
                      </div>
                    </div>

                    {/* ITIs List Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                      {filteredItis.map(iti => {
                        const isChecked = selectedItiIds.includes(iti.id);
                        return (
                          <label
                            key={iti.id}
                            onClick={(e) => {
                              e.preventDefault();
                              toggleIti(iti.id);
                            }}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked 
                                ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="block font-bold text-slate-900 truncate">
                                {iti.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span className="font-mono text-indigo-600">{iti.code}</span>
                                <span>•</span>
                                <span>{iti.district}</span>
                                <span>•</span>
                                <span>{iti.zone}</span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 6: Data Collection Mode & Custom Fields / Google Integration */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">6. डेटा संकलन का माध्यम (Data Collection Mode)</h3>
            </div>

            {/* Mode selection buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'CUSTOM_FORM', label: 'कस्टमाइज़्ड फॉर्म फ़ील्ड्स', icon: Sliders, desc: 'पोर्टल संरचित इनपुट फ़ील्ड्स' },
                { id: 'GOOGLE_SHEET', label: 'गूगल स्प्रेडशीट मोड', icon: FileSpreadsheet, desc: 'मास्टर गूगल शीट लिंक' },
                { id: 'GOOGLE_FORM', label: 'गूगल फॉर्म मोड', icon: Link, desc: 'गूगल फॉर्म लिंक एवं पावती' },
                { id: 'HYBRID', label: 'हाइब्रिड (फॉर्म + शीट)', icon: Sparkles, desc: 'फ़ील्ड्स एवं स्प्रेडशीट दोनों' }
              ].map(m => {
                const IconComponent = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id as RequisitionMode)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      mode === m.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 text-indigo-600 mb-1" />
                    <div className="text-xs font-bold">{m.label}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{m.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Google Sheet Config Section */}
            {(mode === 'GOOGLE_SHEET' || mode === 'HYBRID') && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>मास्टर गूगल स्प्रेडशीट टेम्पलेट कॉन्फ़िगरेशन</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    मास्टर गूगल शीट का यूआरएल (Google Sheet URL) *
                  </label>
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full text-xs px-3 py-2 bg-white border border-emerald-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                    required={mode === 'GOOGLE_SHEET'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    इकाइयों हेतु विशेष निर्देश
                  </label>
                  <input
                    type="text"
                    value={sheetInstructions}
                    onChange={(e) => setSheetInstructions(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-emerald-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Custom Form Fields Builder */}
            {(mode === 'CUSTOM_FORM' || mode === 'HYBRID') && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    प्रश्नावली / डेटा फ़ील्ड्स सूची ({customFields.length} फ़ील्ड्स)
                  </span>
                  
                  {/* Add Field Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">नया फ़ील्ड जोड़ें:</span>
                    <button
                      type="button"
                      onClick={() => handleAddCustomField('text')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Text
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomField('number')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Numeric
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomField('select')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Dropdown
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCustomField('textarea')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Paragraph
                    </button>
                  </div>
                </div>

                {/* List of Defined Fields */}
                <div className="space-y-3">
                  {customFields.map((field, idx) => (
                    <div key={field.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700 uppercase">
                            फ़ील्ड प्रकार: <strong className="text-indigo-600">{field.type}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(field.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="फ़ील्ड हटाएं"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-0.5">फ़ील्ड लेबल / प्रश्न *</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                            className="w-full text-xs font-semibold px-2.5 py-1 bg-white border border-slate-300 rounded"
                            required
                          />
                        </div>

                        {field.type === 'number' && (
                          <div>
                            <label className="text-[11px] font-medium text-slate-600 block mb-0.5">इकाई / Unit (उदा. छात्र, मशीन, लाख ₹)</label>
                            <input
                              type="text"
                              value={field.unit || ''}
                              onChange={(e) => handleUpdateField(field.id, { unit: e.target.value })}
                              placeholder="उदा. संख्या / प्रतिशत"
                              className="w-full text-xs px-2.5 py-1 bg-white border border-slate-300 rounded"
                            />
                          </div>
                        )}

                        {(field.type === 'select' || field.type === 'radio') && (
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                              विकल्प (अल्पविराम / Comma से अलग करें)
                            </label>
                            <input
                              type="text"
                              value={(field.options || []).join(', ')}
                              onChange={(e) => handleUpdateField(field.id, { 
                                options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                              })}
                              placeholder="विकल्प क, विकल्प ख, विकल्प ग"
                              className="w-full text-xs px-2.5 py-1 bg-white border border-slate-300 rounded"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-medium text-slate-600 block mb-0.5">सहायता टेक्स्ट (Placeholder)</label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                            placeholder="क्षेत्रीय अधिकारी के मार्गदर्शन हेतु..."
                            className="w-full text-xs px-2.5 py-1 bg-white border border-slate-300 rounded"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-3 sm:pt-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                              className="rounded text-indigo-600"
                            />
                            <span>अनिवार्य फ़ील्ड (Mandatory)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 7: Officer Sign-off & Official Stamp Requirements */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">7. प्रमाणीकरण एवं आधिकारिक मुहर आवश्यकताएं</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireOfficerDeclaration}
                  onChange={(e) => setRequireOfficerDeclaration(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">संस्थान प्रमुख / नोडल अधिकारी स्व-घोषणा</span>
                  <span className="text-[11px] text-slate-600">
                    अधिकारी का नाम, पदनाम एवं आधिकारिक मोबाइल नंबर सत्यापन अनिवार्य।
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireOfficialSealUpload}
                  onChange={(e) => setRequireOfficialSealUpload(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">हस्ताक्षरित एवं मुहरयुक्त PDF / डिजिटल साइन</span>
                  <span className="text-[11px] text-slate-600">
                    संस्थान की मुहर व उंगली से ई-हस्ताक्षर अथवा पत्र की प्रति संलग्न करना अनिवार्य।
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>सूचना मांग जारी करें (Publish Requisition)</span>
            </button>
          </div>

        </form>

      </div>

      {/* PREVIEW ATTACHED ORDER MODAL */}
      {previewingOrder && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  संलग्न शासनादेश / विभागीय आदेश पूर्वावलोकन
                </h3>
              </div>
              <button onClick={() => setPreviewingOrder(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b pb-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">शासनादेश / पत्रांक संख्या:</span>
                  <span className="font-bold font-mono text-slate-900">{orderReferenceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">आदेश दिनांक:</span>
                  <span className="font-bold text-slate-900">{orderDate}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">संलग्नक फाइल नाम:</span>
                <span className="font-bold text-slate-900">{orderDocumentName}</span>
              </div>

              {orderDocumentUrl && orderDocumentUrl.startsWith('data:image') ? (
                <div className="border rounded-lg overflow-hidden max-h-80 flex items-center justify-center bg-slate-100">
                  <img src={orderDocumentUrl} alt="Attached Order" className="max-h-80 object-contain" />
                </div>
              ) : (
                <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-2">
                  <FileCheck className="w-12 h-12 text-indigo-600 mx-auto" />
                  <div className="font-bold text-slate-900 text-sm">{orderDocumentName}</div>
                  <p className="text-slate-500 text-[11px]">
                    यह आधिकारिक शासनादेश इस मांग पत्र के साथ सभी क्षेत्रीय इकाइयों (JD/ITIs) को डाउनलोड एवं अवलोकन हेतु उपलब्ध कराया जाएगा।
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewingOrder(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
