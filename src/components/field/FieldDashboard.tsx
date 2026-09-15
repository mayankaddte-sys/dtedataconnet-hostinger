import React, { useState } from 'react';
import { 
  FieldUnit, 
  Requisition, 
  SubmissionRecord, 
  ExtensionRequest, 
  DefaulterNotice, 
  DirectorateDesk,
  UserSession
} from '../../types/portal';
import { isForwardableByJd, getUnforwardedMandalItis } from '../../utils/userScope';
import { PriorityBadge } from '../common/PriorityBadge';
import { CountdownTimer } from '../common/CountdownTimer';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateTime, calculateCountdown } from '../../utils/dateUtils';
import { 
  GraduationCap, 
  Building2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileEdit, 
  Send, 
  Download, 
  Eye, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldAlert, 
  Layers, 
  AlertTriangle,
  BellRing,
  RotateCw,
  FileCheck2,
  Users,
  Filter,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  BarChart3,
  BookOpen,
  FileText,
  Share2
} from 'lucide-react';

interface FieldDashboardProps {
  fieldUnit: FieldUnit;
  allFieldUnits?: FieldUnit[];
  currentUser?: UserSession;
  requisitions: Requisition[];
  submissions: SubmissionRecord[];
  extensions: ExtensionRequest[];
  defaulterNotices: DefaulterNotice[];
  desks: DirectorateDesk[];
  onOpenSubmitModal: (req: Requisition, existingSub?: SubmissionRecord) => void;
  onForwardToItis?: (requisitionId: string, unitIds: string[]) => void;
  onRequestExtension: (requisitionId: string, reason: string) => void;
  onSelectRequisition?: (req: Requisition) => void;
}

export const FieldDashboard: React.FC<FieldDashboardProps> = ({
  fieldUnit,
  allFieldUnits = [],
  currentUser,
  requisitions,
  submissions,
  extensions,
  defaulterNotices,
  desks,
  onOpenSubmitModal,
  onForwardToItis,
  onRequestExtension,
  onSelectRequisition
}) => {
  const isJD = fieldUnit.type === 'JD_OFFICE';
  const [activeTab, setActiveTab] = useState<'PENDING' | 'URGENT' | 'SUBMITTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedItiForModal, setSelectedItiForModal] = useState<FieldUnit | null>(null);
  const [forwardingRequisition, setForwardingRequisition] = useState<Requisition | null>(null);
  const [selectedForwardUnitIds, setSelectedForwardUnitIds] = useState<string[]>([]);
  const [selectedSubForInspect, setSelectedSubForInspect] = useState<SubmissionRecord | null>(null);

  // Extension Modal
  const [selectedReqForExtension, setSelectedReqForExtension] = useState<Requisition | null>(null);
  const [extensionReason, setExtensionReason] = useState<string>('');

  // Requisitions assigned to this specific field unit
  const assignedRequisitions = requisitions.filter(r => r.targetUnitIds.includes(fieldUnit.id));

  // Field unit specific notices
  const unitNotices = defaulterNotices.filter(n => n.fieldUnitId === fieldUnit.id);

  // Submissions made by this unit
  const unitSubmissions = submissions.filter(s => s.fieldUnitId === fieldUnit.id);

  // ITIs under JD's Mandal (Zone)
  const mandalItis = isJD 
    ? allFieldUnits.filter(u => u.zone === fieldUnit.zone && u.type === 'ITI')
    : [];

  const mandalDistricts = Array.from(new Set(mandalItis.map(u => u.district)));

  // Submissions by ITIs in this JD's mandal
  const mandalItiSubmissions = isJD
    ? submissions.filter(s => s.fieldUnitZone === fieldUnit.zone || mandalItis.some(u => u.id === s.fieldUnitId))
    : [];

  // Filter requisitions for the current unit's action table
  const filteredRequisitions = assignedRequisitions.filter(req => {
    const sub = unitSubmissions.find(s => s.requisitionId === req.id);
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.requisitionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.deskName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'PENDING') {
      return !sub || sub.status === 'REVISION_REQUESTED';
    }
    if (activeTab === 'URGENT') {
      return req.priority === 'URGENT' || req.isAssemblyQuestion;
    }
    if (activeTab === 'SUBMITTED') {
      return !!sub && sub.status !== 'REVISION_REQUESTED';
    }
    return true;
  });

  // Calculate statistics for this unit
  const pendingCount = assignedRequisitions.filter(r => {
    const s = unitSubmissions.find(sub => sub.requisitionId === r.id);
    return !s || s.status === 'REVISION_REQUESTED';
  }).length;

  const urgentCount = assignedRequisitions.filter(r => {
    const s = unitSubmissions.find(sub => sub.requisitionId === r.id);
    const isUrgent = r.priority === 'URGENT' || r.isAssemblyQuestion;
    return isUrgent && (!s || s.status === 'REVISION_REQUESTED');
  }).length;

  const completedCount = unitSubmissions.filter(s => s.status === 'APPROVED' || s.status === 'SUBMITTED').length;
  const revisionNeededCount = unitSubmissions.filter(s => s.status === 'REVISION_REQUESTED').length;

  // Filtered Mandal ITIs
  const filteredMandalItis = mandalItis.filter(iti => {
    const matchesDistrict = selectedDistrict === 'ALL' || iti.district === selectedDistrict;
    const matchesSearch = iti.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          iti.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (iti.headOfficer && iti.headOfficer.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDistrict && matchesSearch;
  });

  const handleSendExtensionRequest = () => {
    if (!selectedReqForExtension || !extensionReason.trim()) {
      alert('कृपया समय-विस्तार का वैध कारण दर्ज करें।');
      return;
    }
    onRequestExtension(selectedReqForExtension.id, extensionReason.trim());
    alert('समय-विस्तार अनुरोध निदेशालय प्रकोष्ठ को प्रेषित कर दिया गया है।');
    setSelectedReqForExtension(null);
    setExtensionReason('');
  };

  // Units still available to forward the currently-open requisition to
  // (mandal ITIs not already targeted by it).
  const forwardableUnits = forwardingRequisition
    ? getUnforwardedMandalItis(forwardingRequisition, fieldUnit, allFieldUnits)
    : [];

  const openForwardModal = (req: Requisition) => {
    setForwardingRequisition(req);
    setSelectedForwardUnitIds([]);
  };

  const handleToggleForwardUnit = (unitId: string) => {
    setSelectedForwardUnitIds(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const handleToggleForwardAll = () => {
    setSelectedForwardUnitIds(prev =>
      prev.length === forwardableUnits.length ? [] : forwardableUnits.map(u => u.id)
    );
  };

  const handleConfirmForward = () => {
    if (!forwardingRequisition || selectedForwardUnitIds.length === 0 || !onForwardToItis) return;
    onForwardToItis(forwardingRequisition.id, selectedForwardUnitIds);
    setForwardingRequisition(null);
    setSelectedForwardUnitIds([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Field Unit Official Identity Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-700 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isJD 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {isJD ? 'Regional Joint Director Office (संयुक्त निदेशक कार्यालय)' : 'Govt / Private ITI Unit'}
              </span>
              <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {fieldUnit.code}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                मंडल: <strong>{fieldUnit.zone}</strong> • जनपद: <strong>{fieldUnit.district}</strong>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {fieldUnit.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300 font-medium">
              <span className="text-slate-200">
                {fieldUnit.headOfficer ? (
                  <>प्रभारी अधिकारी: <strong className="text-white font-bold">{fieldUnit.headOfficer}</strong> ({fieldUnit.designation})</>
                ) : (
                  <>पदनाम: <strong className="text-white font-bold">{fieldUnit.designation}</strong></>
                )}
              </span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {fieldUnit.email}
              </span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {fieldUnit.phone}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 text-right shrink-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase">
              {isJD ? 'मंडलीय आईटीआई संख्या' : 'Compliance Score'}
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {isJD ? (
                `${mandalItis.length} ITIs`
              ) : (
                assignedRequisitions.length > 0
                  ? `${Math.round((completedCount / assignedRequisitions.length) * 100)}%`
                  : '100%'
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isJD ? (
                <span>मंडल: <strong>{fieldUnit.zone}</strong> ({mandalDistricts.length} जनपद)</span>
              ) : (
                <span>{assignedRequisitions.length} में से {completedCount} आदेश पूर्ण</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JOINT DIRECTOR DIVISIONAL SURVEILLANCE PANEL */}
      {isJD && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-amber-950">
                  मंडलीय आईटीआई अनुश्रवण एवं डेटा प्रगति (Divisional ITI Surveillance)
                </h2>
                <p className="text-xs text-amber-800">
                  संयुक्त निदेशक अधिकार क्षेत्र: <strong>{fieldUnit.zone}</strong> के अंतर्गत समस्त राजकीय एवं महिला आईटीआई संस्थानों का डेटा सबमिशन एवं अनुपालन विवरण।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-white border border-amber-300 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs">
                कुल सबमिशन: {mandalItiSubmissions.length}
              </span>
            </div>
          </div>

          {/* Mandal Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold">कुल आईटीआई (Mandal ITIs)</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{mandalItis.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{mandalDistricts.length} जनपदों में</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold">प्राप्त सबमिशन (Submissions)</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{mandalItiSubmissions.length}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">मंडलीय संस्थानों द्वारा</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold">स्वीकृत आख्याएं (Approved)</div>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {mandalItiSubmissions.filter(s => s.status === 'APPROVED').length}
              </div>
              <div className="text-[11px] text-indigo-600 mt-0.5">निदेशालय द्वारा सत्यापित</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold">समीक्षाधीन / लंबित</div>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {mandalItiSubmissions.filter(s => s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED').length}
              </div>
              <div className="text-[11px] text-amber-600 mt-0.5">जांच प्रक्रिया में</div>
            </div>
          </div>

          {/* Mandal ITIs Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {fieldUnit.zone} के अंतर्गत आईटीआई संस्थान सूची
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* District Filter */}
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">सभी जनपद (All Districts)</option>
                  {mandalDistricts.map(d => (
                    <option key={d} value={d}>जनपद: {d}</option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ITI नाम या Principal से खोजें..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">संस्थान का नाम (ITI Name)</th>
                    <th className="px-3 py-3">जनपद (District)</th>
                    <th className="px-3 py-3">प्रभारी / प्रधानाचार्य (Principal)</th>
                    <th className="px-3 py-3">संपर्क (Contact)</th>
                    <th className="px-3 py-3 text-center">प्रेषित आख्याएं (Submissions)</th>
                    <th className="px-4 py-3 text-right">कार्यवाही (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMandalItis.map(iti => {
                    const itiSubs = submissions.filter(s => s.fieldUnitId === iti.id);
                    const approvedSubs = itiSubs.filter(s => s.status === 'APPROVED').length;

                    return (
                      <tr key={iti.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{iti.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{iti.code} • {iti.type}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">
                            {iti.district}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-800">{iti.headOfficer || '—'}</div>
                          <div className="text-[11px] text-slate-500">{iti.designation}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-slate-700 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" /> {iti.phone}
                          </div>
                          <div className="text-slate-500 text-[11px]">{iti.email}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                            {itiSubs.length} Submissions ({approvedSubs} Approved)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedItiForModal(iti)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>विवरण देखें</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Defaulter / Reminder Notices Alert (if any received from Desks) */}
      {unitNotices.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <BellRing className="w-4 h-4 text-rose-600 animate-bounce" />
              <span>Official Defaulter / Reminder Notices ({unitNotices.length})</span>
            </div>
            <span className="text-xs text-rose-700 font-semibold">Immediate Compliance Required</span>
          </div>

          <div className="space-y-2">
            {unitNotices.slice(0, 2).map((notice) => {
              const req = requisitions.find(r => r.id === notice.requisitionId);
              return (
                <div key={notice.id} className="bg-white p-3 rounded-lg border border-rose-200 text-xs text-rose-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{notice.subject}</span>
                    <span className="text-[10px] text-slate-500">{formatDateTime(notice.sentAt)}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed italic">&quot;{notice.message}&quot;</p>
                  {req && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => onOpenSubmitModal(req)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs"
                      >
                        Reply & Submit Data
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revision Needed Alert (if any submission was sent back) */}
      {revisionNeededCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200 rounded-lg text-amber-900">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                कार्यवाही आवश्यक: {revisionNeededCount} आख्या(एं) संशोधन हेतु वापस भेजी गई हैं (Action Required)
              </h3>
              <p className="text-xs text-amber-800">
                निदेशालय प्रकोष्ठ द्वारा स्पष्टीकरण अथवा संशोधित डेटा मांगा गया है। कृपया समीक्षा टिप्पणी देखकर पुनः सबमिट करें।
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('PENDING')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs"
          >
            View Revision Notes
          </button>
        </div>
      )}

      {/* Requisitions Directed to this specific Field Unit */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Navigation & Search Filter Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isJD ? 'संयुक्त निदेशक कार्यालय प्रत्यक्ष कार्य (JD Office Direct Demands)' : 'संस्थान मांग आदेश कार्य (Assigned Demand Orders)'}
            </h3>
            <p className="text-xs text-slate-500">
              {isJD ? 'मांग आदेश जो विशेष रूप से क्षेत्रीय संयुक्त निदेशक कार्यालय को प्रेषित हैं' : 'इस आईटीआई इकाई हेतु निर्गत मांग आदेश'}
            </p>
          </div>
          
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs w-full sm:w-auto">
            {[
              { id: 'PENDING', label: `Pending Action (${pendingCount})` },
              { id: 'URGENT', label: `Urgent (${urgentCount})` },
              { id: 'SUBMITTED', label: `Submitted History (${completedCount})` },
              { id: 'ALL', label: `All Orders (${assignedRequisitions.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Requisitions List */}
        <div className="divide-y divide-slate-100">
          {filteredRequisitions.length === 0 ? (
            <div className="py-10 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-800">सब कुछ अद्यतन है (All Caught Up!)</p>
              <p className="text-xs text-slate-500">इस श्रेणी में कोई लंबित मांग आदेश नहीं है।</p>
            </div>
          ) : (
            filteredRequisitions.map((req) => {
              const sub = unitSubmissions.find(s => s.requisitionId === req.id);
              const countdown = calculateCountdown(req.deadline);
              const isOverdue = countdown.isOverdue;
              const isLocked = isOverdue && req.isStrictCutoff && !sub;

              return (
                <div
                  key={req.id}
                  className={`p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    sub?.status === 'REVISION_REQUESTED'
                      ? 'bg-rose-50/40 border-l-4 border-rose-500'
                      : req.isAssemblyQuestion && !sub
                      ? 'bg-red-50/30 border-l-4 border-red-500'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {req.requisitionNumber}
                      </span>
                      <PriorityBadge priority={req.priority} isAssemblyQuestion={req.isAssemblyQuestion} size="sm" />
                      
                      {sub ? (
                        <StatusBadge status={sub.status} isLate={sub.isLate} size="sm" />
                      ) : (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Pending Submission
                        </span>
                      )}

                      {(req.orderDocumentName || req.orderReferenceNumber || req.attachmentNoticeDocUrl) && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-indigo-600" />
                          <span>शासनादेश संलग्न</span>
                        </span>
                      )}

                      <span className="text-xs text-slate-500 font-medium">
                        Desk: <strong className="text-slate-800">{req.deskName}</strong>
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {req.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {req.description}
                    </p>

                    {/* Revision Note from Desk if revision requested */}
                    {sub?.status === 'REVISION_REQUESTED' && (
                      <div className="p-3 bg-rose-100/70 border border-rose-200 rounded-lg text-rose-950 text-xs space-y-1">
                        <span className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Directorate Desk Correction Instructions:
                        </span>
                        <p className="italic">{sub.deskComments || sub.revisionNotes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Deadline: <strong>{formatDateTime(req.deadline)}</strong>
                      </span>
                      <span>•</span>
                      <span>Mode: <strong className="text-slate-700">{req.mode === 'CUSTOM_FORM' ? 'Portal Form' : req.mode === 'GOOGLE_SHEET' ? 'Google Sheet' : req.mode === 'GOOGLE_FORM' ? 'Google Form' : 'Hybrid'}</strong></span>
                      {sub && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">
                            Submitted on {formatDateTime(sub.submittedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Actions & Countdown */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 self-end lg:self-center shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 w-full lg:w-auto justify-between lg:justify-end">
                    
                    <CountdownTimer deadline={req.deadline} isStrictCutoff={req.isStrictCutoff} />

                    <div className="flex items-center gap-2">
                      {/* JD-only: relay this demand to mandal ITIs for compliance */}
                      {isJD && onForwardToItis && isForwardableByJd(req, fieldUnit, allFieldUnits) && (
                        <button
                          onClick={() => openForwardModal(req)}
                          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>मंडल की ITI को अग्रेषित करें</span>
                        </button>
                      )}
                      {isJD && req.forwardLog && req.forwardLog.filter(f => f.forwardedByJdId === fieldUnit.id).length > 0 && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          {req.forwardLog.filter(f => f.forwardedByJdId === fieldUnit.id).length} ITI को अग्रेषित
                        </span>
                      )}

                      {/* If pending or revision needed */}
                      {!sub || sub.status === 'REVISION_REQUESTED' ? (
                        <>
                          {isLocked ? (
                            <button
                              onClick={() => { setSelectedReqForExtension(req); setExtensionReason(''); }}
                              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Request Deadline Extension</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenSubmitModal(req, sub)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>{sub?.status === 'REVISION_REQUESTED' ? 'Resubmit Corrected Data' : 'Fill & Submit Report'}</span>
                            </button>
                          )}
                        </>
                      ) : (
                        /* Already submitted */
                        <button
                          onClick={() => onOpenSubmitModal(req, sub)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>View Submitted Report</span>
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ITI DETAIL MODAL FOR JD */}
      {selectedItiForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-indigo-800 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-200 font-mono uppercase">{selectedItiForModal.code}</span>
                <h3 className="font-bold text-base text-white">{selectedItiForModal.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedItiForModal(null)}
                className="text-indigo-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">मंडल / Zone:</span>
                  <div className="font-bold text-slate-800">{selectedItiForModal.zone}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">जनपद / District:</span>
                  <div className="font-bold text-slate-800">{selectedItiForModal.district}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">प्रभारी अधिकारी:</span>
                  <div className="font-bold text-slate-800">{selectedItiForModal.headOfficer || '—'} ({selectedItiForModal.designation})</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">दूरभाष / मोबाइल:</span>
                  <div className="font-bold text-slate-800 font-mono">{selectedItiForModal.phone}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">
                  इस आईटीआई द्वारा अपलोड की गई आख्याएं ({submissions.filter(s => s.fieldUnitId === selectedItiForModal.id).length})
                </h4>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {submissions.filter(s => s.fieldUnitId === selectedItiForModal.id).length === 0 ? (
                    <div className="p-4 text-center text-slate-500 italic">
                      इस आईटीआई द्वारा अभी तक कोई डेटा सबमिशन नहीं किया गया है।
                    </div>
                  ) : (
                    submissions.filter(s => s.fieldUnitId === selectedItiForModal.id).map(sub => {
                      const req = requisitions.find(r => r.id === sub.requisitionId);
                      return (
                        <div key={sub.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900">{req?.title || sub.requisitionId}</div>
                            <div className="text-[11px] text-slate-500">सबमिशन: {formatDateTime(sub.submittedAt)} • अधिकारी: {sub.submittedByOfficer}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={sub.status} isLate={sub.isLate} size="sm" />
                            <button
                              onClick={() => setSelectedSubForInspect(sub)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs"
                            >
                              देखें
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  onClick={() => setSelectedItiForModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION INSPECTION MODAL */}
      {selectedSubForInspect && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-200 font-mono uppercase">Submission Record</span>
                <h3 className="font-bold text-base text-white">{selectedSubForInspect.fieldUnitName}</h3>
              </div>
              <button 
                onClick={() => setSelectedSubForInspect(null)}
                className="text-emerald-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">Status:</span>
                  <div className="mt-0.5"><StatusBadge status={selectedSubForInspect.status} isLate={selectedSubForInspect.isLate} size="sm" /></div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Submitted At:</span>
                  <div className="font-bold text-slate-800">{formatDateTime(selectedSubForInspect.submittedAt)}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Submitted By:</span>
                  <div className="font-bold text-slate-800">{selectedSubForInspect.submittedByOfficer} ({selectedSubForInspect.officerDesignation})</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Contact:</span>
                  <div className="font-bold text-slate-800">{selectedSubForInspect.officerContact}</div>
                </div>
              </div>

              {selectedSubForInspect.formData && Object.keys(selectedSubForInspect.formData).length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">प्रस्तुत डेटा विवरण (Form Fields)</h4>
                  <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-white">
                    {Object.entries(selectedSubForInspect.formData).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-500 font-medium">{k}:</span>
                        <span className="font-bold text-slate-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSubForInspect.remarks && (
                <div>
                  <span className="text-slate-500 font-medium">Remarks:</span>
                  <p className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 italic mt-0.5">
                    &quot;{selectedSubForInspect.remarks}&quot;
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                <button
                  onClick={() => setSelectedSubForInspect(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deadline Extension Request Modal */}
      {selectedReqForExtension && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-base">Request Deadline Extension</h3>
              </div>
              <button onClick={() => setSelectedReqForExtension(null)} className="text-amber-100 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-500 block text-[11px]">Subject:</span>
                <div className="font-bold text-slate-900 mt-0.5">{selectedReqForExtension.title}</div>
                <div className="text-slate-500 font-mono">{selectedReqForExtension.requisitionNumber}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Extension (Grounds) *
                </label>
                <textarea
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="समय-विस्तार का कारण दर्ज करें (उदा. सर्वर समस्या, भौतिक सत्यापन प्रक्रियाधीन, अभिलेख मिलान)..."
                  rows={3}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setSelectedReqForExtension(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendExtensionRequest}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Send to {selectedReqForExtension.deskName}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward Requisition to Mandal ITIs Modal (JD only) */}
      {forwardingRequisition && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                <h3 className="font-bold text-base">मंडल की ITI को अग्रेषित करें (Forward to ITIs)</h3>
              </div>
              <button onClick={() => setForwardingRequisition(null)} className="text-amber-100 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-500 block text-[11px]">मांग आदेश (Demand Order):</span>
                <div className="font-bold text-slate-900 mt-0.5">{forwardingRequisition.title}</div>
                <div className="text-slate-500 font-mono">{forwardingRequisition.requisitionNumber}</div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] leading-relaxed">
                चयनित ITI संस्थान इस मांग आदेश को अपने डैशबोर्ड पर देख सकेंगे एवं सीधे अनुपालन डेटा प्रस्तुत कर सकेंगे। प्रत्येक चयनित संस्थान को ईमेल सूचना भी स्वतः प्रेषित की जाएगी।
              </div>

              {forwardableUnits.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  इस मांग आदेश हेतु मंडल की सभी ITI पहले ही अग्रेषित की जा चुकी हैं।
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      ITI चुनें ({selectedForwardUnitIds.length} / {forwardableUnits.length} चयनित):
                    </label>
                    <button
                      type="button"
                      onClick={handleToggleForwardAll}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      {selectedForwardUnitIds.length === forwardableUnits.length ? 'Clear All' : 'सभी चुनें (Select All)'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5 bg-slate-50">
                    {forwardableUnits.map(unit => (
                      <label key={unit.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedForwardUnitIds.includes(unit.id)}
                          onChange={() => handleToggleForwardUnit(unit.id)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="font-semibold text-slate-800">{unit.name}</span>
                        <span className="text-[10px] text-slate-500">({unit.district})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setForwardingRequisition(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmForward}
                  disabled={selectedForwardUnitIds.length === 0}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>अग्रेषित करें ({selectedForwardUnitIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
