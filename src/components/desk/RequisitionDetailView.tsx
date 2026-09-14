import React, { useState } from 'react';
import { 
  Requisition, 
  SubmissionRecord, 
  FieldUnit, 
  ExtensionRequest, 
  DirectorateDesk 
} from '../../types/portal';
import { PriorityBadge } from '../common/PriorityBadge';
import { CountdownTimer } from '../common/CountdownTimer';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateTime } from '../../utils/dateUtils';
import { exportRequisitionDataToCSV } from '../../utils/exportUtils';
import { dispatchManualEmailReminder } from '../../lib/emailReminderEngine';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  MessageSquare, 
  ShieldCheck, 
  Calendar,
  X,
  UserCheck,
  Building2,
  PhoneCall,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  BellRing,
  Trash2,
  Stamp,
  FileCheck,
  Fingerprint,
  BookOpen,
  Mail
} from 'lucide-react';

interface RequisitionDetailViewProps {
  requisition: Requisition;
  onBack: () => void;
  submissions: SubmissionRecord[];
  fieldUnits: FieldUnit[];
  desk: DirectorateDesk;
  extensions: ExtensionRequest[];
  onUpdateSubmissionStatus: (submissionId: string, status: 'APPROVED' | 'REVISION_REQUESTED', comments?: string) => void;
  onSendDefaulterNotice: (unitIds: string[], subject: string, message: string) => void;
  onGrantExtension: (requisitionId: string, unitId: string | 'ALL', newDeadline: string) => void;
  onUpdateRequisitionDeadline?: (requisitionId: string, newDeadline: string) => void;
  onDeleteRequisition?: (requisitionId: string) => void;
  onDeleteSubmission?: (submissionId: string) => void;
}

export const RequisitionDetailView: React.FC<RequisitionDetailViewProps> = ({
  requisition,
  onBack,
  submissions,
  fieldUnits,
  desk,
  extensions,
  onUpdateSubmissionStatus,
  onSendDefaulterNotice,
  onGrantExtension,
  onUpdateRequisitionDeadline,
  onDeleteRequisition,
  onDeleteSubmission
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionRecord | null>(null);
  const [viewingUnit, setViewingUnit] = useState<FieldUnit | null>(null);
  const [isDeletingReqConfirmOpen, setIsDeletingReqConfirmOpen] = useState<boolean>(false);
  const [deletingSubRecord, setDeletingSubRecord] = useState<{ sub: SubmissionRecord; unitName: string } | null>(null);
  
  // Review action inside modal
  const [deskComments, setDeskComments] = useState<string>('');
  const [previewingSignedDoc, setPreviewingSignedDoc] = useState<SubmissionRecord | null>(null);
  const [previewingAttachedOrder, setPreviewingAttachedOrder] = useState<boolean>(false);
  
  // Defaulter Notice Modal
  const [isDefaulterModalOpen, setIsDefaulterModalOpen] = useState<boolean>(false);
  const [noticeSubject, setNoticeSubject] = useState<string>(`Urgent Reminder: Requisition No. ${requisition.requisitionNumber} data pending`);
  const [noticeMessage, setNoticeMessage] = useState<string>(`यह एक आधिकारिक स्मरण पत्र है कि मांग आदेश "${requisition.title}" का डेटा निर्धारित समय-सीमा ${formatDateTime(requisition.deadline)} तक पोर्टल पर अपलोड करें। विलंब होने की स्थिति में उच्चाधिकारियों को सूचित किया जाएगा।`);
  const [noticeSentSuccess, setNoticeSentSuccess] = useState<boolean>(false);

  // Deadline Extension Modal
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);
  const [newDeadlineInput, setNewDeadlineInput] = useState<string>(
    new Date(new Date(requisition.deadline).getTime() + 24 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [extensionTargetUnitId, setExtensionTargetUnitId] = useState<string>('ALL');

  // Filter target units
  const targetUnits = fieldUnits.filter(u => requisition.targetUnitIds.includes(u.id));
  const zones = Array.from(new Set(targetUnits.map(u => u.zone)));

  // Calculate compliance statistics
  const reqSubmissions = submissions.filter(s => s.requisitionId === requisition.id);
  const submittedUnitIds = new Set(reqSubmissions.map(s => s.fieldUnitId));
  const pendingUnits = targetUnits.filter(u => !submittedUnitIds.has(u.id));
  
  const isOverdue = new Date(requisition.deadline).getTime() < Date.now();
  const complianceRate = targetUnits.length > 0 
    ? Math.round((reqSubmissions.length / targetUnits.length) * 100) 
    : 0;

  const approvedCount = reqSubmissions.filter(s => s.status === 'APPROVED').length;
  const underReviewCount = reqSubmissions.filter(s => s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED').length;
  const revisionCount = reqSubmissions.filter(s => s.status === 'REVISION_REQUESTED').length;

  // Filter units for table
  const filteredUnits = targetUnits.filter(unit => {
    const sub = reqSubmissions.find(s => s.fieldUnitId === unit.id);
    const matchesZone = selectedZone === 'ALL' || unit.zone === selectedZone;
    const matchesSearch = unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          unit.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          unit.district.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesZone || !matchesSearch) return false;

    if (statusFilter === 'SUBMITTED') return !!sub;
    if (statusFilter === 'APPROVED') return sub?.status === 'APPROVED';
    if (statusFilter === 'PENDING') return !sub;
    if (statusFilter === 'REVISION') return sub?.status === 'REVISION_REQUESTED';
    return true;
  });

  const handleOpenSubmissionDetail = (unit: FieldUnit, sub?: SubmissionRecord) => {
    setViewingUnit(unit);
    setViewingSubmission(sub || null);
    setDeskComments(sub?.deskComments || '');
  };

  const handleSendReview = (status: 'APPROVED' | 'REVISION_REQUESTED') => {
    if (!viewingSubmission) return;
    onUpdateSubmissionStatus(viewingSubmission.id, status, deskComments);
    setViewingSubmission(prev => prev ? { ...prev, status, deskComments } : null);
  };

  const handleDispatchReminders = () => {
    const pendingIds = pendingUnits.map(u => u.id);
    if (pendingIds.length === 0) {
      alert('सभी फील्ड इकाइयों द्वारा डेटा सबमिट किया जा चुका है।');
      return;
    }
    // Dispatch in-portal defaulter notices and send emails simultaneously
    onSendDefaulterNotice(pendingIds, noticeSubject, noticeMessage);

    setNoticeSentSuccess(true);
    setIsDefaulterModalOpen(false);
  };

  const handleApplyDeadlineExtension = () => {
    onGrantExtension(requisition.id, extensionTargetUnitId, new Date(newDeadlineInput).toISOString());
    setIsExtensionModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Bar with Back Button & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="Back to Requisitions List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                {requisition.requisitionNumber}
              </span>
              <PriorityBadge priority={requisition.priority} isAssemblyQuestion={requisition.isAssemblyQuestion} size="sm" />
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1 line-clamp-1">
              {requisition.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Delete Requisition Order Button for Directorate */}
          {onDeleteRequisition && (
            <button
              onClick={() => setIsDeletingReqConfirmOpen(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="निदेशालय स्तर पर मांग आदेश विलोपित करें"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>मांग आदेश विलोपित करें (Delete Order)</span>
            </button>
          )}

          {/* Dispatch Reminders */}
          <button
            onClick={() => setIsDefaulterModalOpen(true)}
            disabled={pendingUnits.length === 0}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Send Reminder Notice ({pendingUnits.length})</span>
          </button>

          {/* Extend Deadline */}
          <button
            onClick={() => setIsExtensionModalOpen(true)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Extend Deadline</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={() => exportRequisitionDataToCSV(requisition, reqSubmissions, targetUnits)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Report</span>
          </button>
        </div>
      </div>

      {/* Meta & Compliance Progress Bar Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Requisition Scope & Deadline Info */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Desk: <strong className="text-slate-900">{requisition.deskName}</strong>
            </span>
            <CountdownTimer deadline={requisition.deadline} isStrictCutoff={requisition.isStrictCutoff} />
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
            {requisition.description}
          </p>

          {/* Attached Official Government Order / Circular */}
          {(requisition.orderDocumentName || requisition.orderReferenceNumber || requisition.orderDocumentUrl || requisition.attachmentNoticeDocUrl) && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>संलग्न शासकीय आदेश / मार्गदर्शिका:</span>
                    <span className="font-mono text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded text-[11px]">
                      {requisition.orderReferenceNumber || requisition.requisitionNumber}
                    </span>
                    {requisition.orderDate && (
                      <span className="text-slate-500 font-normal text-[11px]">({requisition.orderDate})</span>
                    )}
                  </div>
                  {requisition.orderDocumentName && (
                    <div className="text-[11px] text-slate-600 truncate mt-0.5 font-mono">
                      फाइल: {requisition.orderDocumentName} {requisition.orderDocumentSize && `(${requisition.orderDocumentSize})`}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewingAttachedOrder(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>आदेश देखें (View)</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block font-medium">Mode</span>
              <span className="font-bold text-slate-800">
                {requisition.mode === 'CUSTOM_FORM' ? 'Portal Form' : requisition.mode === 'GOOGLE_SHEET' ? 'Google Sheet' : requisition.mode === 'GOOGLE_FORM' ? 'Google Form' : 'Hybrid'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block font-medium">Cut-off Policy</span>
              <span className="font-bold text-slate-800">
                {requisition.isStrictCutoff ? 'Strict Auto-Lock' : 'Allowed with Reason'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block font-medium">Target Scope</span>
              <span className="font-bold text-slate-800">
                {requisition.targetScope === 'ALL_FIELD_UNITS' 
                  ? 'All Field Units (JDs + ITIs)' 
                  : requisition.targetScope === 'ALL_ITIS' 
                  ? 'All ITIs (समस्त आईटीआई)' 
                  : requisition.targetScope === 'ALL_JD_OFFICES' 
                  ? 'All JD Offices (समस्त JD कार्यालय)' 
                  : requisition.targetScope === 'SELECTED_JD_OFFICES'
                  ? 'Selected JD Offices (मण्डल-वार)'
                  : requisition.targetScope === 'SELECTED_ITIS'
                  ? 'Selected ITIs (जिला/आईटीआई-वार)'
                  : 'Selected Units'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block font-medium">Deadline & Time</span>
              <span className="font-bold text-slate-800">{formatDateTime(requisition.deadline)}</span>
            </div>
          </div>
        </div>

        {/* Real-time Compliance Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Compliance Rate
              </h3>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                {reqSubmissions.length} / {targetUnits.length} Units
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{complianceRate}%</span>
              <span className="text-xs text-slate-500 font-medium">Total Received Reports</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all duration-500 ${
                  complianceRate >= 80 ? 'bg-emerald-500' : complianceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-slate-100 text-center text-xs">
            <div className="bg-emerald-50 p-1.5 rounded text-emerald-800">
              <div className="font-bold text-sm">{approvedCount}</div>
              <div className="text-[10px]">Approved</div>
            </div>
            <div className="bg-blue-50 p-1.5 rounded text-blue-800">
              <div className="font-bold text-sm">{underReviewCount}</div>
              <div className="text-[10px]">Under Review</div>
            </div>
            <div className="bg-rose-50 p-1.5 rounded text-rose-800">
              <div className="font-bold text-sm">{pendingUnits.length}</div>
              <div className="text-[10px]">Pending (Defaulters)</div>
            </div>
          </div>
        </div>

      </div>

      {/* Target Units Submission Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
              {[
                { id: 'ALL', label: `All (${targetUnits.length})` },
                { id: 'SUBMITTED', label: `Received (${reqSubmissions.length})` },
                { id: 'APPROVED', label: `Approved (${approvedCount})` },
                { id: 'PENDING', label: `Pending (${pendingUnits.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Zone Filter */}
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">All Zones ({zones.length})</option>
              {zones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ITI name, code or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Field Unit / ITI</th>
                <th className="py-3 px-4">Zone & District</th>
                <th className="py-3 px-4">Officer In-Charge</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted Date & Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    फ़िल्टर के अनुसार कोई इकाई नहीं मिली (No units found).
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const sub = reqSubmissions.find(s => s.fieldUnitId === unit.id);
                  const isJD = unit.type === 'JD_OFFICE';
                  
                  return (
                    <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase ${
                            isJD ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                          }`}>
                            {isJD ? 'JD' : 'ITI'}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-1">{unit.name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{unit.code}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div>{unit.zone}</div>
                        <div className="text-[11px] text-slate-500">{unit.district}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-900">{unit.headOfficer}</div>
                        <div className="text-[11px] text-slate-500">{unit.phone}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {sub ? (
                          <StatusBadge status={sub.status} isLate={sub.isLate} size="sm" />
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            Overdue / Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {sub ? formatDateTime(sub.submittedAt) : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {sub ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenSubmissionDetail(unit, sub)}
                              className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-bold text-xs inline-flex items-center gap-1 transition-colors"
                              title="सबमिशन समीक्षा व सत्यापन"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Review Data</span>
                            </button>

                            {onDeleteSubmission && (
                              <button
                                onClick={() => setDeletingSubRecord({ sub, unitName: unit.name })}
                                className="p-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded transition-colors border border-rose-200 hover:border-rose-600 shadow-2xs"
                                title="इस इकाई का सबमिशन डेटा विलोपित करें (संस्थान पुनः डेटा अपलोड कर सकेगा)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onSendDefaulterNotice(
                                [unit.id],
                                `Urgent Demand Reminder: ${requisition.requisitionNumber}`,
                                `कृपया मांग आदेश "${requisition.title}" हेतु अविलंब डेटा पोर्टल पर अपलोड करें।`
                              );
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-600 rounded-md font-medium text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="पोर्टल नोटिस एवं आधिकारिक ईमेल (@vppup.in) पर स्मरण पत्र भेजें"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send Reminder</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL 1: Individual Submission Review & Verification Modal */}
      {viewingSubmission && viewingUnit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-slate-800 text-amber-400 px-2 py-0.5 rounded">
                    {viewingUnit.code}
                  </span>
                  <StatusBadge status={viewingSubmission.status} isLate={viewingSubmission.isLate} />
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  {viewingUnit.name}
                </h2>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50 text-xs">
              
              {/* Officer In-Charge Signature Meta */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase block">Submitted & Verified By:</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {viewingSubmission.submittedByOfficer || viewingSubmission.officerDesignation || 'Officer In-Charge'}
                  </div>
                  {viewingSubmission.submittedByOfficer && viewingSubmission.officerDesignation && (
                    <div className="text-slate-600 font-medium">
                      {viewingSubmission.officerDesignation}
                    </div>
                  )}
                  {viewingSubmission.officerContact && (
                    <div className="text-slate-500 font-medium">
                      Contact: {viewingSubmission.officerContact}
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-500 font-bold uppercase block">Submission Date & Time:</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {formatDateTime(viewingSubmission.submittedAt)}
                  </div>
                  {viewingSubmission.isLate && (
                    <span className="text-rose-700 font-bold text-[11px] block mt-0.5">
                      ⚠️ Late Submission (Received after deadline)
                    </span>
                  )}
                </div>
              </div>

              {/* Late Justification (if any) */}
              {viewingSubmission.lateJustification && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  <span className="font-bold block mb-1">Reason given for delay:</span>
                  <p className="italic leading-relaxed">{viewingSubmission.lateJustification}</p>
                </div>
              )}

              {/* Custom Fields Answers */}
              {requisition.customFields && requisition.customFields.length > 0 && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Custom Form Field Data</span>
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    {requisition.customFields.map((field) => {
                      const value = viewingSubmission.data[field.id];
                      return (
                        <div key={field.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-600 block text-[11px]">
                            {field.label} {field.unit ? `(${field.unit})` : ''}
                          </span>
                          <div className="text-sm font-bold text-slate-900 mt-1 break-words">
                            {value !== undefined && value !== '' ? String(value) : <span className="text-slate-400 font-normal italic">Not provided</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Google Sheet Integration View */}
              {viewingSubmission.googleSheetSubmittedUrl && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                  <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Submitted Google Sheet Link</span>
                  </h3>
                  <a
                    href={viewingSubmission.googleSheetSubmittedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1.5 break-all"
                  >
                    <span>{viewingSubmission.googleSheetSubmittedUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}

              {/* Google Form Response Reference */}
              {viewingSubmission.googleFormResponseId && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                  <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Google Form Response Reference</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-800 break-all block">
                    {viewingSubmission.googleFormResponseId}
                  </span>
                </div>
              )}

              {/* Uploaded Signed Document — only shown when it's a genuine
                  separate upload, not the finger-signature reused as a
                  fallback placeholder when no separate file was attached. */}
              {/* Signed Letter — shown for ANY submission with proof of
                  authentication (genuine upload or e-signature alone), same
                  reasoning as the Submissions Report view: when no scan was
                  uploaded, the preview modal composes the formal covering
                  letter instead of leaving nothing to view. */}
              {(viewingSubmission.uploadedDocumentUrl || viewingSubmission.digitalSignatureDataUrl) && (
                <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                        <Stamp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {viewingSubmission.uploadedDocumentUrl && viewingSubmission.uploadedDocumentUrl !== viewingSubmission.digitalSignatureDataUrl
                            ? viewingSubmission.uploadedDocumentName
                            : 'हस्ताक्षरित आवरण पत्र (Signed Covering Letter)'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>हस्ताक्षरित एवं मुहरयुक्त आधिकारिक पत्र</span>
                          {viewingSubmission.signedLetterDispatchNumber && (
                            <span>• पत्रांक: <strong className="text-slate-700">{viewingSubmission.signedLetterDispatchNumber}</strong></span>
                          )}
                          {viewingSubmission.signedLetterDate && (
                            <span>• दिनांक: <strong className="text-slate-700">{viewingSubmission.signedLetterDate}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setPreviewingSignedDoc(viewingSubmission)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>View Signed Letter</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Desk Feedback & Action Panel */}
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 shadow-xs space-y-3">
                <h3 className="font-bold text-indigo-950 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-700" />
                  <span>Directorate Desk Review & Verification Remarks</span>
                </h3>

                <textarea
                  value={deskComments}
                  onChange={(e) => setDeskComments(e.target.value)}
                  placeholder="सत्यापन टिप्पणी या संशोधन निर्देश दर्ज करें (Enter verification remarks or correction instructions)..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 bg-white border border-indigo-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  {onDeleteSubmission ? (
                    <button
                      onClick={() => {
                        const targetSub = viewingSubmission;
                        const targetUnitName = viewingUnit?.name || 'Field Unit';
                        setViewingSubmission(null);
                        setViewingUnit(null);
                        setDeletingSubRecord({ sub: targetSub, unitName: targetUnitName });
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                      title="इस इकाई का सबमिशन डेटा विलोपित करें"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>सबमिशन हटाएं (Delete Submission)</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendReview('REVISION_REQUESTED')}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Send for Revision</span>
                    </button>

                    <button
                      onClick={() => handleSendReview('APPROVED')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify & Approve Report</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Defaulter Notice Dispatch Modal */}
      {isDefaulterModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5" />
                <h3 className="font-bold text-base">Send Defaulter Notice</h3>
              </div>
              <button onClick={() => setIsDefaulterModalOpen(false)} className="text-rose-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1.5">
                <div>
                  यह नोटिस सभी <strong className="font-bold">{pendingUnits.length} लंबित फील्ड इकाइयों</strong> को तत्काल प्रेषित किया जाएगा।
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-800 bg-rose-100/70 px-2 py-1 rounded">
                  <Mail className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                  <span>स्वचालित ईमेल अनुस्मारक: संबंधित प्रधानाचार्यों के अधिकृत @vppup.in ईमेल पर भी स्वतः ईमेल भेजी जाएगी।</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Subject</label>
                <input
                  type="text"
                  value={noticeSubject}
                  onChange={(e) => setNoticeSubject(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Message Body</label>
                <textarea
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  rows={4}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg leading-relaxed"
                />
              </div>

              {noticeSentSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>सभी {pendingUnits.length} लंबित इकाइयों को नोटिस सफलतापूर्वक प्रेषित किया गया।</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setIsDefaulterModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatchReminders}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Official Notice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Deadline Extension Adjustment Modal */}
      {isExtensionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-base">Extend Deadline</h3>
              </div>
              <button onClick={() => setIsExtensionModalOpen(false)} className="text-amber-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Current Deadline</label>
                <div className="font-mono bg-slate-100 p-2.5 rounded-lg border text-slate-800 font-bold">
                  {formatDateTime(requisition.deadline)}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select New Deadline Date & Time *</label>
                <input
                  type="datetime-local"
                  value={newDeadlineInput}
                  onChange={(e) => setNewDeadlineInput(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Extension Target Scope</label>
                <select
                  value={extensionTargetUnitId}
                  onChange={(e) => setExtensionTargetUnitId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="ALL">Apply to all target units (Statewide Extension)</option>
                  {targetUnits.map(u => (
                    <option key={u.id} value={u.id}>Only: {u.name} ({u.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setIsExtensionModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyDeadlineExtension}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Deadline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Requisition Order Confirmation Modal */}
      {isDeletingReqConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">मांग आदेश विलोपन (Delete Order)</h3>
                <p className="text-xs text-slate-500">निदेशालय स्तर पर सूचना मांग आदेश विलोपित करें</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                क्या आप निम्नलिखित डेटा मांग आदेश को पूर्णतः विलोपित करना चाहते हैं?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><span className="font-bold text-slate-800">मांग सं.:</span> <span className="font-mono text-indigo-700 font-bold">{requisition.requisitionNumber}</span></div>
                <div><span className="font-bold text-slate-800">विषय:</span> {requisition.title}</div>
                <div><span className="font-bold text-slate-800">प्रकोष्ठ:</span> {requisition.deskName}</div>
                <div><span className="font-bold text-slate-800">प्राप्त आख्याएं:</span> {reqSubmissions.length} / {targetUnits.length}</div>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                <strong>सावधानी:</strong> इस आदेश को हटाने पर इससे संबंधित सभी <strong>{reqSubmissions.length} सबमिशन रिकॉर्ड्स</strong>, समय-सीमा विस्तार आवेदन, तथा निर्गत नोटिस भी पोर्टल से स्थायी रूप से हटा दिए जाएंगे।
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeletingReqConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                onClick={() => {
                  if (onDeleteRequisition) {
                    onDeleteRequisition(requisition.id);
                    onBack();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>हां, आदेश विलोपित करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Single Submission Confirmation Modal */}
      {deletingSubRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">सबमिशन डेटा विलोपन</h3>
                <p className="text-xs text-slate-500">इकाई सबमिशन रिकॉर्ड पोर्टल से हटाएं</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                क्या आप <strong className="text-slate-900">{deletingSubRecord.unitName}</strong> द्वारा प्रेषित सबमिशन रिकॉर्ड को विलोपित करना चाहते हैं?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><span className="font-bold text-slate-800">सबमिशन समय:</span> {formatDateTime(deletingSubRecord.sub.submittedAt)}</div>
                <div><span className="font-bold text-slate-800">वर्तमान स्थिति:</span> <StatusBadge status={deletingSubRecord.sub.status} size="sm" /></div>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>प्रभाव:</strong> यह सबमिशन डेटा हटाने के बाद संबंधित संस्थान को पुनः <strong>लंबित (Pending)</strong> सूची में डाल दिया जाएगा तथा वे फ्रेश डेटा प्रविष्टि कर सकेंगे।
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingSubRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                onClick={() => {
                  if (onDeleteSubmission) {
                    onDeleteSubmission(deletingSubRecord.sub.id);
                  }
                  setDeletingSubRecord(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>हां, सबमिशन हटाएं</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIGNED LETTER PREVIEW MODAL FOR DESK */}
      {previewingSignedDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Stamp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  सत्यापित एवं हस्ताक्षरित शासकीय पत्र (Official Signed Letter)
                </h3>
              </div>
              <button onClick={() => setPreviewingSignedDoc(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b pb-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">पत्रांक संख्या:</span>
                  <span className="font-bold font-mono text-slate-900">{previewingSignedDoc.signedLetterDispatchNumber || 'रा.आ./2026/DTE-RET'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">पत्र दिनांक:</span>
                  <span className="font-bold text-slate-900">{previewingSignedDoc.signedLetterDate || formatDateTime(previewingSignedDoc.submittedAt)}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">प्रेषक संस्था (Field Unit):</span>
                <span className="font-bold text-slate-900 text-sm">{previewingSignedDoc.fieldUnitName}</span>
                <span className="text-slate-500 block text-[11px]">{previewingSignedDoc.fieldUnitZone} मंडल • {previewingSignedDoc.fieldUnitDistrict}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">हस्ताक्षरकर्ता अधिकारी (Nodal Officer):</span>
                <span className="font-bold text-slate-800">{previewingSignedDoc.submittedByOfficer} ({previewingSignedDoc.officerDesignation})</span>
                {previewingSignedDoc.officerContact && (
                  <span className="text-slate-500 block font-mono text-[11px]">दूरभाष: {previewingSignedDoc.officerContact}</span>
                )}
              </div>

              {/* Standalone signature proof — shown only alongside a
                  genuinely separate uploaded file, to avoid duplicating the
                  same image the composed covering letter shows below when
                  there's no separate upload. */}
              {previewingSignedDoc.uploadedDocumentUrl &&
                previewingSignedDoc.uploadedDocumentUrl !== previewingSignedDoc.digitalSignatureDataUrl &&
                previewingSignedDoc.digitalSignatureDataUrl && (
                <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-blue-600" />
                    <span>उंगली द्वारा डिजिटल हस्ताक्षर (Touch/Finger Digital Signature Verified)</span>
                  </span>
                  <div className="border border-dashed border-blue-300 rounded-lg p-3 bg-blue-50/20 flex items-center justify-center">
                    <img src={previewingSignedDoc.digitalSignatureDataUrl} alt="Officer Digital Signature" className="max-h-24 object-contain" />
                  </div>
                </div>
              )}

              {/* Separately uploaded scanned letter when one exists; otherwise
                  reconstruct the formal covering letter from dispatch details
                  + e-signature, so there's always an actual letter to view. */}
              {previewingSignedDoc.uploadedDocumentUrl && previewingSignedDoc.uploadedDocumentUrl !== previewingSignedDoc.digitalSignatureDataUrl ? (
                <>
                  {previewingSignedDoc.uploadedDocumentUrl.startsWith('data:image') ? (
                    <div className="border rounded-lg overflow-hidden max-h-80 flex items-center justify-center bg-slate-100">
                      <img src={previewingSignedDoc.uploadedDocumentUrl} alt="Signed letter" className="max-h-80 object-contain" />
                    </div>
                  ) : previewingSignedDoc.uploadedDocumentUrl.startsWith('data:application/pdf') ? (
                    <div className="border rounded-lg overflow-hidden bg-slate-100">
                      <iframe
                        src={previewingSignedDoc.uploadedDocumentUrl}
                        title="Signed letter"
                        className="w-full h-96"
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-2">
                      <FileCheck className="w-12 h-12 text-indigo-600 mx-auto" />
                      <div className="font-bold text-slate-900 text-sm">{previewingSignedDoc.uploadedDocumentName}</div>
                      <p className="text-slate-500 text-[11px]">
                        कार्यालय प्रमुख द्वारा विधिवत हस्ताक्षरित एवं प्रमाणित पत्र संलग्न है।
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <a
                      href={previewingSignedDoc.uploadedDocumentUrl}
                      download={previewingSignedDoc.uploadedDocumentName || 'signed-letter'}
                      target={previewingSignedDoc.uploadedDocumentUrl.startsWith('data:') ? undefined : '_blank'}
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>डाउनलोड करें (Download)</span>
                    </a>
                  </div>
                </>
              ) : previewingSignedDoc.digitalSignatureDataUrl ? (
                <div className="bg-white p-6 rounded-xl border border-slate-300 space-y-4 font-serif text-slate-900 leading-relaxed shadow-sm">
                  <div className="text-center border-b pb-3 space-y-1">
                    <div className="font-bold text-sm tracking-wide uppercase">कार्यालय: {previewingSignedDoc.fieldUnitName}</div>
                    <div className="text-[11px] text-slate-600 font-sans">
                      क्षेत्रीय मंडल: {previewingSignedDoc.fieldUnitZone} • जनपद: {previewingSignedDoc.fieldUnitDistrict} (उ.प्र.)
                    </div>
                  </div>

                  <div className="flex justify-between font-sans text-[11px] font-bold text-slate-700">
                    <span>पत्रांक: {previewingSignedDoc.signedLetterDispatchNumber || '—'}</span>
                    <span>दिनांक: {previewingSignedDoc.signedLetterDate || formatDateTime(previewingSignedDoc.submittedAt)}</span>
                  </div>

                  <div className="space-y-1 text-xs font-sans">
                    <div>सेवा में,</div>
                    <div className="font-bold pl-4">प्रभारी अधिकारी / निदेशक,</div>
                    <div className="pl-4">{requisition.deskName},</div>
                    <div className="pl-4">प्रशिक्षण निदेशालय, उत्तर प्रदेश, लखनऊ।</div>
                  </div>

                  <div className="font-bold text-slate-900 bg-slate-100 p-2 rounded text-[11px] font-sans">
                    विषय: {requisition.title} (मांग सं.: {requisition.requisitionNumber}) के संबंध में वांछित सूचना प्रेषण।
                  </div>

                  <p className="text-xs font-sans indent-4">
                    उपर्युक्त संदर्भित विषयक निदेशालय के मांग आदेश के अनुपालन में संस्थान का वांछित प्रमाणित डेटा एवं आख्या विभागीय पोर्टल पर ऑनलाइन सबमिट कर दी गई है।
                  </p>

                  <div className="pt-4 flex justify-end">
                    <div className="text-center space-y-1 min-w-44">
                      <div className="mb-1 flex flex-col items-center">
                        <img src={previewingSignedDoc.digitalSignatureDataUrl} alt="Officer Signature" className="h-12 object-contain" />
                        <div className="text-[9px] text-blue-800 font-mono font-bold">[Digitally Signed via Touch Pad]</div>
                      </div>
                      <div className="font-bold font-sans text-xs">({previewingSignedDoc.submittedByOfficer || 'हस्ताक्षर'})</div>
                      <div className="text-[11px] text-slate-600 font-sans">{previewingSignedDoc.officerDesignation || 'प्रधानाचार्य / नोडल अधिकारी'}</div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-200 print:hidden">
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>प्रिंट / PDF सेव करें (Print)</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setPreviewingSignedDoc(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW ATTACHED GOVERNMENT ORDER MODAL */}
      {previewingAttachedOrder && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  संलग्न शासकीय आदेश / परिपत्र पूर्वावलोकन
                </h3>
              </div>
              <button onClick={() => setPreviewingAttachedOrder(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b pb-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">शासनादेश / पत्रांक संख्या:</span>
                  <span className="font-bold font-mono text-slate-900">{requisition.orderReferenceNumber || requisition.requisitionNumber}</span>
                </div>
                {requisition.orderDate && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">आदेश दिनांक:</span>
                    <span className="font-bold text-slate-900">{requisition.orderDate}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">मांग आदेश शीर्षक:</span>
                <span className="font-bold text-slate-900 text-xs">{requisition.title}</span>
              </div>

              {requisition.orderDocumentName && (
                <div>
                  <span className="text-slate-500 block text-[11px]">संलग्नक फाइल नाम:</span>
                  <span className="font-bold text-indigo-700">{requisition.orderDocumentName}</span>
                </div>
              )}

              {requisition.orderDocumentUrl && requisition.orderDocumentUrl.startsWith('data:image') ? (
                <div className="border rounded-lg overflow-hidden max-h-80 flex items-center justify-center bg-slate-100">
                  <img src={requisition.orderDocumentUrl} alt="Attached Order Document" className="max-h-80 object-contain" />
                </div>
              ) : requisition.orderDocumentUrl && requisition.orderDocumentUrl.startsWith('data:application/pdf') ? (
                <div className="border rounded-lg overflow-hidden bg-slate-100">
                  <iframe
                    src={requisition.orderDocumentUrl}
                    title="Attached Order Document"
                    className="w-full h-96"
                  />
                </div>
              ) : (
                <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-2">
                  <FileCheck className="w-12 h-12 text-indigo-600 mx-auto" />
                  <div className="font-bold text-slate-900 text-sm">
                    {requisition.orderDocumentName || 'निदेशालय आधिकारिक आदेश पत्र (Official Document Attached)'}
                  </div>
                  <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                    यह आदेश पत्र सभी लक्षित क्षेत्रीय इकाइयों (JD/ITIs) को दिशा-निर्देश प्रदान करने हेतु संलग्न किया गया है।
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              {requisition.orderDocumentUrl && !requisition.orderDocumentUrl.startsWith('data:') ? (
                <a
                  href={requisition.orderDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>वेब पोर्टल पर आदेश खोलें</span>
                </a>
              ) : requisition.orderDocumentUrl ? (
                <a
                  href={requisition.orderDocumentUrl}
                  download={requisition.orderDocumentName || 'order-document'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>डाउनलोड करें (Download)</span>
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">कोई फाइल संलग्न नहीं</span>
              )}

              <button
                type="button"
                onClick={() => setPreviewingAttachedOrder(false)}
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
