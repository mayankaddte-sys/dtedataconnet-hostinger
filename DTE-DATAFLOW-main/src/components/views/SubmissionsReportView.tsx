import React, { useState, useMemo, useEffect } from 'react';
import { SubmissionRecord, Requisition, FieldUnit, DirectorateDesk, UserSession, SubmissionStatus } from '../../types/portal';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateTime } from '../../utils/dateUtils';
import { getScopedSubmissions, getUserZone, getCurrentUserFieldUnit } from '../../utils/userScope';
import { exportSubmissionsToCSV, exportSingleSubmissionToCSV } from '../../utils/exportUtils';
import { useBlobPreviewUrl } from '../../utils/fileUtils';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Eye, 
  FileCheck, 
  Trash2, 
  AlertTriangle, 
  MapPin, 
  ShieldCheck, 
  Check, 
  X, 
  SlidersHorizontal, 
  RotateCcw, 
  Layers, 
  GraduationCap, 
  ChevronRight,
  XCircle,
  FileText,
  HelpCircle,
  Sparkles,
  Stamp,
  Fingerprint
} from 'lucide-react';

interface SubmissionsReportViewProps {
  submissions: SubmissionRecord[];
  requisitions: Requisition[];
  fieldUnits: FieldUnit[];
  desks: DirectorateDesk[];
  currentUser: UserSession;
  onSelectRequisition?: (req: Requisition) => void;
  onDeleteSubmission?: (submissionId: string) => void;
}

export const SubmissionsReportView: React.FC<SubmissionsReportViewProps> = ({
  submissions,
  requisitions,
  fieldUnits,
  desks,
  currentUser,
  onSelectRequisition,
  onDeleteSubmission
}) => {
  const isJD = currentUser.role === 'FIELD_JD';
  const isITI = currentUser.role === 'FIELD_ITI';
  const isDirectorate = currentUser.role === 'DIRECTORATE_DESK' || currentUser.role === 'DIRECTORATE_ADMIN';
  const isAdmin = currentUser.role === 'DIRECTORATE_ADMIN';

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  const userZone = getUserZone(currentUser, fieldUnits);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  // JDs start locked to their own Mandal/division; everyone else starts unfiltered.
  const [selectedMandal, setSelectedMandal] = useState<string>(isJD && userZone ? userZone : 'ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReqFilter, setSelectedReqFilter] = useState<string>('ALL');
  const [unitTypeFilter, setUnitTypeFilter] = useState<'ALL' | 'ITI' | 'JD_OFFICE'>('ALL');

  // UI States
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<SubmissionRecord | null>(null);
  const [previewingDocument, setPreviewingDocument] = useState<SubmissionRecord | null>(null);
  const [previewingOrderDoc, setPreviewingOrderDoc] = useState<Requisition | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<SubmissionRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Blob URL for the currently previewed uploaded letter (renders reliably
  // in an <iframe> even for large PDFs, unlike a raw data: URI).
  const previewedDocBlobUrl = useBlobPreviewUrl(previewingDocument?.uploadedDocumentUrl);
  // Same, for the DTE desk's own order/demand letter attached to a requisition.
  const previewedOrderDocBlobUrl = useBlobPreviewUrl(previewingOrderDoc?.orderDocumentUrl);

  // The requisition (data demand) behind whichever submission is currently
  // open in the detail modal — lets us show which desk/section raised the
  // demand and its original order letter, not just the field unit's reply.
  const viewingRequisition = viewingRecord
    ? requisitions.find(r => r.id === viewingRecord.requisitionId) || null
    : null;

  // Same lookup for whichever submission's letter is currently being
  // previewed — needed to reconstruct the covering-letter header (desk,
  // subject, order number) when there's no separately uploaded scan.
  const previewingDocumentReq = previewingDocument
    ? requisitions.find(r => r.id === previewingDocument.requisitionId) || null
    : null;

  // True only when uploadedDocumentUrl is a genuinely separate file — not
  // just the finger-signature reused as a fallback placeholder when no
  // scanned document was attached.
  const previewingHasGenuineUpload = !!(
    previewingDocument?.uploadedDocumentUrl &&
    previewingDocument.uploadedDocumentUrl !== previewingDocument.digitalSignatureDataUrl
  );

  // Keep a JD's Mandal locked to their own zone even if userZone resolves
  // slightly after initial render (e.g. fieldUnits loading async).
  useEffect(() => {
    if (isJD && userZone) {
      setSelectedMandal(userZone);
    }
  }, [isJD, userZone]);

  // 1. Scoped submissions based on current user jurisdiction
  const relevantSubmissions = useMemo(() => {
    return getScopedSubmissions(currentUser, submissions, requisitions, fieldUnits);
  }, [currentUser, submissions, requisitions, fieldUnits]);

  // 2. All Available Mandals (Zones) from field units and submissions
  const allMandals = useMemo(() => {
    const mandalsSet = new Set<string>();
    fieldUnits.forEach(u => {
      if (u.zone) mandalsSet.add(u.zone);
    });
    relevantSubmissions.forEach(s => {
      if (s.fieldUnitZone) mandalsSet.add(s.fieldUnitZone);
    });
    return Array.from(mandalsSet).sort((a, b) => a.localeCompare(b));
  }, [fieldUnits, relevantSubmissions]);

  // 3. Available Districts - filtered dynamically by selected Mandal if one is chosen
  const availableDistricts = useMemo(() => {
    let units = fieldUnits;
    if (selectedMandal !== 'ALL') {
      units = units.filter(u => u.zone === selectedMandal);
    }
    const districtSet = new Set<string>();
    units.forEach(u => {
      if (u.district) districtSet.add(u.district);
    });
    relevantSubmissions.forEach(s => {
      if (selectedMandal === 'ALL' || s.fieldUnitZone === selectedMandal) {
        if (s.fieldUnitDistrict) districtSet.add(s.fieldUnitDistrict);
      }
    });
    return Array.from(districtSet).sort((a, b) => a.localeCompare(b));
  }, [fieldUnits, relevantSubmissions, selectedMandal]);

  // Handle Mandal Change -> Reset district if not in new mandal
  const handleMandalChange = (mandal: string) => {
    // JDs cannot change away from their own Mandal.
    if (isJD) return;
    setSelectedMandal(mandal);
    if (mandal !== 'ALL') {
      const districtsInMandal = fieldUnits
        .filter(u => u.zone === mandal)
        .map(u => u.district);
      if (selectedDistrict !== 'ALL' && !districtsInMandal.includes(selectedDistrict)) {
        setSelectedDistrict('ALL');
      }
    }
  };

  // 4. Filtered Submissions Logic
  const filteredSubmissions = useMemo(() => {
    return relevantSubmissions.filter(sub => {
      const unitName = sub.fieldUnitName.toLowerCase();
      const unitCode = (sub.fieldUnitCode || '').toLowerCase();
      const districtName = sub.fieldUnitDistrict.toLowerCase();
      const zoneName = sub.fieldUnitZone.toLowerCase();
      const officer = (sub.submittedByOfficer || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      // Find the associated requisition for Requisition title & order number searching
      const req = requisitions.find(r => r.id === sub.requisitionId);
      const reqTitle = (req?.title || '').toLowerCase();
      const reqOrderNo = (req?.orderNumber || req?.requisitionNumber || '').toLowerCase();
      const deskName = (req?.issuedByDeskName || '').toLowerCase();

      // Search match: Field Unit name/code/district or Requisition title/number/desk
      const matchesSearch = !query || 
        unitName.includes(query) ||
        unitCode.includes(query) ||
        reqTitle.includes(query) ||
        reqOrderNo.includes(query) ||
        districtName.includes(query) ||
        zoneName.includes(query) ||
        officer.includes(query) ||
        deskName.includes(query);

      // Mandal Match
      const matchesMandal = selectedMandal === 'ALL' || sub.fieldUnitZone === selectedMandal;

      // District Match
      const matchesDistrict = selectedDistrict === 'ALL' || sub.fieldUnitDistrict === selectedDistrict;

      // Status Match (supports grouped or specific status)
      let matchesStatus = true;
      if (statusFilter === 'ALL') {
        matchesStatus = true;
      } else if (statusFilter === 'APPROVED') {
        matchesStatus = sub.status === 'APPROVED';
      } else if (statusFilter === 'REJECTED' || statusFilter === 'REVISION_REQUESTED') {
        matchesStatus = sub.status === 'REVISION_REQUESTED';
      } else if (statusFilter === 'PENDING') {
        matchesStatus = sub.status === 'PENDING' || sub.status === 'UNDER_REVIEW' || sub.status === 'SUBMITTED';
      } else {
        matchesStatus = sub.status === statusFilter;
      }

      // Requisition Order Match
      const matchesReq = selectedReqFilter === 'ALL' || sub.requisitionId === selectedReqFilter;

      // Unit Type Match
      let matchesUnitType = true;
      if (unitTypeFilter !== 'ALL') {
        const unit = fieldUnits.find(u => u.id === sub.fieldUnitId);
        if (unit) {
          matchesUnitType = unit.type === unitTypeFilter;
        }
      }

      return matchesSearch && matchesMandal && matchesDistrict && matchesStatus && matchesReq && matchesUnitType;
    });
  }, [relevantSubmissions, searchQuery, selectedMandal, selectedDistrict, statusFilter, selectedReqFilter, unitTypeFilter, fieldUnits, requisitions]);

  // Statistics calculation for the filtered / relevant scope
  const stats = useMemo(() => {
    const total = relevantSubmissions.length;
    const approved = relevantSubmissions.filter(s => s.status === 'APPROVED').length;
    const pending = relevantSubmissions.filter(s => s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED' || s.status === 'PENDING').length;
    const rejected = relevantSubmissions.filter(s => s.status === 'REVISION_REQUESTED').length;

    // Status counts matching current Mandal/District/Search
    const currentScopeSubmissions = relevantSubmissions.filter(s => {
      const matchesMandal = selectedMandal === 'ALL' || s.fieldUnitZone === selectedMandal;
      const matchesDistrict = selectedDistrict === 'ALL' || s.fieldUnitDistrict === selectedDistrict;
      return matchesMandal && matchesDistrict;
    });

    const scopeApproved = currentScopeSubmissions.filter(s => s.status === 'APPROVED').length;
    const scopePending = currentScopeSubmissions.filter(s => s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED' || s.status === 'PENDING').length;
    const scopeRejected = currentScopeSubmissions.filter(s => s.status === 'REVISION_REQUESTED').length;

    return {
      total,
      approved,
      pending,
      rejected,
      scopeApproved,
      scopePending,
      scopeRejected
    };
  }, [relevantSubmissions, selectedMandal, selectedDistrict]);

  // Count active filters (a JD's own locked Mandal doesn't count as a filter they applied)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    const mandalIsJDDefault = isJD && userZone && selectedMandal === userZone;
    if (selectedMandal !== 'ALL' && !mandalIsJDDefault) count++;
    if (selectedDistrict !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (selectedReqFilter !== 'ALL') count++;
    if (unitTypeFilter !== 'ALL') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedMandal, selectedDistrict, statusFilter, selectedReqFilter, unitTypeFilter, searchQuery, isJD, userZone]);

  // Reset all filters to default (JDs reset back to their own Mandal, not ALL)
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedMandal(isJD && userZone ? userZone : 'ALL');
    setSelectedDistrict('ALL');
    setStatusFilter('ALL');
    setSelectedReqFilter('ALL');
    setUnitTypeFilter('ALL');
  };

  const handleDeleteConfirm = () => {
    if (!deletingRecord || !onDeleteSubmission) return;
    onDeleteSubmission(deletingRecord.id);
    if (viewingRecord?.id === deletingRecord.id) {
      setViewingRecord(null);
    }
    setDeletingRecord(null);
  };

  // Export to CSV Handler
  const handleExportCSV = (exportAll = false) => {
    const dataToExport = exportAll ? relevantSubmissions : filteredSubmissions;
    if (dataToExport.length === 0) return;

    const filterInfo = {
      searchQuery: searchQuery || undefined,
      mandalFilter: selectedMandal !== 'ALL' ? selectedMandal : undefined,
      districtFilter: selectedDistrict !== 'ALL' ? selectedDistrict : undefined,
      statusFilter: statusFilter !== 'ALL' ? statusFilter : undefined,
      requisitionFilter: selectedReqFilter !== 'ALL' ? selectedReqFilter : undefined
    };

    const success = exportSubmissionsToCSV({
      submissions: dataToExport,
      requisitions,
      fieldUnits,
      desks,
      filterInfo: exportAll ? undefined : filterInfo
    });

    if (success) {
      const count = dataToExport.length;
      setExportNotice(`${count} सबमिशन रिकॉर्ड्स CSV फ़ाइल में सफलतापूर्वक डाउनलोड किए गए।`);
      setTimeout(() => {
        setExportNotice(null);
      }, 3500);
    }
  };

  const handleExportSingle = (record: SubmissionRecord) => {
    const req = requisitions.find(r => r.id === record.requisitionId);
    const unit = fieldUnits.find(u => u.id === record.fieldUnitId);
    exportSingleSubmissionToCSV(record, req, unit);
    setExportNotice(`${record.fieldUnitName} का सबमिशन रिकॉर्ड CSV में डाउनलोड किया गया।`);
    setTimeout(() => {
      setExportNotice(null);
    }, 3500);
  };

  return (
    <div className="space-y-5">
      
      {/* Export Notification Toast */}
      {exportNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-emerald-200 text-emerald-800 rounded-lg">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold">{exportNotice}</span>
          </div>
          <button 
            onClick={() => setExportNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Role Jurisdiction Banners */}
      {isJD && userZone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-200/70 text-amber-800 rounded-md shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">मंडलीय सबमिशन आख्या (Divisional Submissions): </span>
              <span><strong>{userZone}</strong> — आपके संयुक्त निदेशक कार्यालय एवं आपके मंडल की समस्त आईटीआई इकाइयों द्वारा अपलोड की गई आख्याएं।</span>
            </div>
          </div>
          <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantSubmissions.length} कुल सबमिशन
          </span>
        </div>
      )}

      {isITI && userUnit && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-emerald-200/70 text-emerald-800 rounded-md shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">संस्थान सबमिशन इतिहास: </span>
              <span><strong>{userUnit.name} ({userUnit.district})</strong> द्वारा प्रेषित समस्त डेटा सबमिशन आख्याएं।</span>
            </div>
          </div>
          <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantSubmissions.length} सबमिशन
          </span>
        </div>
      )}

      {currentUser.role === 'DIRECTORATE_DESK' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-indigo-200/70 text-indigo-800 rounded-md shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">प्रकोष्ठ सबमिशन समीक्षा: </span>
              <span><strong>{currentUser.displayName}</strong> के मांग आदेशों हेतु प्राप्त आख्याएं।</span>
            </div>
          </div>
          <span className="bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantSubmissions.length} सबमिशन
          </span>
        </div>
      )}

      {/* Top High-Level Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">कुल प्राप्त आख्याएं</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total Submissions</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved (स्वीकृत)
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{stats.approved}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">सत्यापित व अनुमोदित आख्याएं</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending / Under Review
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{stats.pending}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">समीक्षाधीन / प्रक्रियाधीन</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-xs">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected / Revision
          </div>
          <div className="text-2xl font-black text-rose-800 mt-1">{stats.rejected}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">सुधार हेतु वापस प्रेषित</div>
        </div>
      </div>

      {/* Main Container with Filter Sidebar + Results View */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* Mobile Toggle Button for Sidebar — hidden for ITI, they have no filter panel */}
        {!isITI && (
          <div className="w-full lg:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>फ़िल्टर साइडबार {isSidebarOpenMobile ? 'छिपाएं' : 'दिखाएं'}</span>
              {activeFiltersCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {activeFiltersCount} सक्रिय
                </span>
              )}
            </button>

            <button
              onClick={() => handleExportCSV(false)}
              disabled={filteredSubmissions.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV ({filteredSubmissions.length})</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            ADMIN FILTER SIDEBAR (Mandal, District, Submission Status, Requisition)
            Not shown to ITI users — they only ever see their own single unit's
            records, so a filter panel adds nothing but clutter.
           ========================================================================= */}
        {!isITI && (
          <aside 
            className={`w-full lg:w-72 xl:w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 transition-all ${
              isSidebarOpenMobile ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    रिपोर्ट फ़िल्टर साइडबार
                  </h3>
                  <p className="text-[10px] text-slate-500">Submissions Filter Panel</p>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 px-2 py-1 hover:bg-rose-50 rounded-md transition-colors"
                  title="सभी फ़िल्टर रीसेट करें"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>रीसेट</span>
                </button>
              )}
            </div>

            {/* Filter 1: Search Query (Field Unit Name or Requisition Title) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                1. खोजें (Unit Name / Requisition Title)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="submissions-sidebar-search-input"
                  type="text"
                  placeholder="इकाई नाम (ITI/JD) या मांग शीर्षक..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    id="submissions-sidebar-search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="खोज साफ़ करें"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                फील्ड इकाई (राजकीय आईटीआई / JD) अथवा मांग आदेश शीर्षक द्वारा त्वरित फ़िल्टर
              </p>
            </div>

            {/* Filter 2: Submission Status (Approved / Rejected / Pending) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  2. सबमिशन स्थिति (Status)
                </label>
                {statusFilter !== 'ALL' && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                    चयनित
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {/* All Statuses */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left border ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>समस्त स्थितियां (All Statuses)</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {stats.total}
                  </span>
                </button>

                {/* Approved */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('APPROVED')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left border ${
                    statusFilter === 'APPROVED'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approved (स्वीकृत)</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    statusFilter === 'APPROVED' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {stats.approved}
                  </span>
                </button>

                {/* Pending / Under Review */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('PENDING')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left border ${
                    statusFilter === 'PENDING'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-black'
                      : 'bg-amber-50/50 hover:bg-amber-100/50 text-amber-800 border-amber-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending / Under Review (समीक्षाधीन)</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {stats.pending}
                  </span>
                </button>

                {/* Rejected / Revision Requested */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('REJECTED')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left border ${
                    statusFilter === 'REJECTED' || statusFilter === 'REVISION_REQUESTED'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-rose-50/50 hover:bg-rose-100/50 text-rose-800 border-rose-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Rejected / Revision (अस्वीकृत / सुधार)</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    statusFilter === 'REJECTED' || statusFilter === 'REVISION_REQUESTED' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-900'
                  }`}>
                    {stats.rejected}
                  </span>
                </button>
              </div>
            </div>

            {/* Filter 3: Mandal (Zone) Selection — locked to their own Mandal for JD users */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  3. मंडल {isJD ? '(Your Mandal)' : 'चुनें (Mandal / Zone)'}
                </label>
                {selectedMandal !== 'ALL' && !isJD && (
                  <button
                    onClick={() => handleMandalChange('ALL')}
                    className="text-[10px] text-indigo-600 hover:underline"
                  >
                    Clear Mandal
                  </button>
                )}
              </div>

              {isJD && userZone ? (
                <div className="px-3 py-2.5 text-xs bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{userZone} — आपका मंडल (परिवर्तन योग्य नहीं)</span>
                </div>
              ) : (
                <select
                  value={selectedMandal}
                  onChange={(e) => handleMandalChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">समस्त मंडल (All Mandals - {allMandals.length})</option>
                  {allMandals.map(mandal => {
                    const count = relevantSubmissions.filter(s => s.fieldUnitZone === mandal).length;
                    return (
                      <option key={mandal} value={mandal}>
                        {mandal} ({count} आख्याएं)
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Filter 4: Specific District Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  4. जनपद चुनें (Specific District)
                </label>
                {selectedDistrict !== 'ALL' && (
                  <button
                    onClick={() => setSelectedDistrict('ALL')}
                    className="text-[10px] text-indigo-600 hover:underline"
                  >
                    Clear District
                  </button>
                )}
              </div>

              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">
                  {selectedMandal !== 'ALL'
                    ? `${selectedMandal} के समस्त जनपद (${availableDistricts.length})`
                    : `समस्त जनपद (All Districts - ${availableDistricts.length})`}
                </option>
                {availableDistricts.map(district => {
                  const count = relevantSubmissions.filter(s => s.fieldUnitDistrict === district).length;
                  return (
                    <option key={district} value={district}>
                      {district} ({count} आख्याएं)
                    </option>
                  );
                })}
              </select>
              {selectedMandal !== 'ALL' && (
                <p className="text-[10px] text-slate-400 mt-1">
                  चयनित मंडल: <strong>{selectedMandal}</strong> में {availableDistricts.length} जनपद उपलब्ध हैं।
                </p>
              )}
            </div>

            {/* Filter 5: Data Demand Requisition (Government Order) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  5. मांग आदेश (Data Order)
                </label>
                {selectedReqFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedReqFilter('ALL')}
                    className="text-[10px] text-indigo-600 hover:underline"
                  >
                    Clear Order
                  </button>
                )}
              </div>

              <select
                value={selectedReqFilter}
                onChange={(e) => setSelectedReqFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 truncate"
              >
                <option value="ALL">समस्त मांग आदेश (All Requisitions - {requisitions.length})</option>
                {requisitions.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.requisitionNumber} - {r.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 6: Unit Type (ITI vs JD Office) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                6. इकाई का प्रकार (Unit Type)
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => setUnitTypeFilter('ALL')}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    unitTypeFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  सभी
                </button>
                <button
                  type="button"
                  onClick={() => setUnitTypeFilter('ITI')}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    unitTypeFilter === 'ITI' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  आईटीआई
                </button>
                <button
                  type="button"
                  onClick={() => setUnitTypeFilter('JD_OFFICE')}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    unitTypeFilter === 'JD_OFFICE' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  JD कार्यालय
                </button>
              </div>
            </div>

            {/* Export and Action Buttons in Sidebar */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => handleExportCSV(false)}
                disabled={filteredSubmissions.length === 0}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>फ़िल्टर डेटा CSV एक्सपोर्ट करें ({filteredSubmissions.length})</span>
              </button>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>सभी फ़िल्टर हटाएं (Clear All Filters)</span>
                </button>
              )}
            </div>

          </aside>
        )}

        {/* =========================================================================
            MAIN RESULTS AREA: Active Chips, Data Table & Export Bar
           ========================================================================= */}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          
          {/* Active Filter Chips Bar */}
          {activeFiltersCount > 0 && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-indigo-950 flex items-center gap-1 text-[11px] uppercase tracking-wider mr-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  सक्रिय फ़िल्टर:
                </span>

                {/* Mandal Tag — not shown for a JD's own locked Mandal */}
                {selectedMandal !== 'ALL' && !(isJD && selectedMandal === userZone) && (
                  <span className="inline-flex items-center gap-1 bg-white text-indigo-900 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-slate-500 font-normal">मंडल:</span> {selectedMandal}
                    <button onClick={() => handleMandalChange('ALL')} className="hover:text-rose-600 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* District Tag */}
                {selectedDistrict !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-white text-indigo-900 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-slate-500 font-normal">जनपद:</span> {selectedDistrict}
                    <button onClick={() => setSelectedDistrict('ALL')} className="hover:text-rose-600 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Status Tag */}
                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-white text-indigo-900 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-slate-500 font-normal">स्थिति:</span> {
                      statusFilter === 'APPROVED' ? 'Approved (स्वीकृत)' :
                      statusFilter === 'PENDING' ? 'Pending (समीक्षाधीन)' :
                      statusFilter === 'REJECTED' || statusFilter === 'REVISION_REQUESTED' ? 'Rejected / Revision' :
                      statusFilter
                    }
                    <button onClick={() => setStatusFilter('ALL')} className="hover:text-rose-600 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Requisition Tag */}
                {selectedReqFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-white text-indigo-900 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs max-w-xs truncate">
                    <span className="text-slate-500 font-normal">मांग:</span> {
                      requisitions.find(r => r.id === selectedReqFilter)?.title || selectedReqFilter
                    }
                    <button onClick={() => setSelectedReqFilter('ALL')} className="hover:text-rose-600 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Search Query Tag */}
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 bg-white text-indigo-900 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-slate-500 font-normal">खोज:</span> "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Unit Type Tag */}
                {unitTypeFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-white text-indigo-900 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-slate-500 font-normal">इकाई:</span> {unitTypeFilter === 'ITI' ? 'राजकीय आईटीआई' : 'JD कार्यालय'}
                    <button onClick={() => setUnitTypeFilter('ALL')} className="hover:text-rose-600 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline shrink-0"
              >
                सभी फ़िल्टर साफ़ करें
              </button>
            </div>
          )}

          {/* Results Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            
            {/* Table Header Bar */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    सबमिशन आख्या विवरण तालिका (Submissions Data Records)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    कुल {relevantSubmissions.length} में से <strong>{filteredSubmissions.length} रिकॉर्ड्स</strong> प्रदर्शित
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => handleExportCSV(false)}
                  disabled={filteredSubmissions.length === 0}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                  title="वर्तमान फ़िल्टर की गई तालिका को CSV में डाउनलोड करें"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export to CSV ({filteredSubmissions.length})</span>
                </button>

                {relevantSubmissions.length > filteredSubmissions.length && (
                  <button
                    onClick={() => handleExportCSV(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors hidden md:inline-flex items-center gap-1 border border-slate-300"
                    title="समस्त रिकॉर्ड्स को डाउनलोड करें"
                  >
                    <span>Export All ({relevantSubmissions.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Table or Empty State */}
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Filter className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  कोई सबमिशन रिकॉर्ड नहीं मिला (No Matching Submissions)
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  चयनित मंडल ({selectedMandal}), जनपद ({selectedDistrict}) या स्थिति ({statusFilter}) हेतु कोई डेटा उपलब्ध नहीं है।
                </p>
                <div className="mt-4">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>फ़िल्टर रीसेट करें (Show All Submissions)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Field Unit (संस्थान व जनपद)</th>
                      <th className="py-3 px-4">Mandal (मंडल)</th>
                      <th className="py-3 px-4">DTE Unit (निदेशालय अनुभाग)</th>
                      <th className="py-3 px-4">Subject (विषय)</th>
                      <th className="py-3 px-4">Order Date (आदेश दिनांक)</th>
                      <th className="py-3 px-4">Order Letter (शासनादेश)</th>
                      <th className="py-3 px-4">Submission Date</th>
                      <th className="py-3 px-4">Status (स्थिति)</th>
                      <th className="py-3 px-4">Officer Designation</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const req = requisitions.find(r => r.id === sub.requisitionId);
                      const hasOrderLetter = !!(req?.orderDocumentUrl || req?.attachmentNoticeDocUrl);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Unit & District */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 line-clamp-1 flex items-center gap-1.5">
                              {sub.fieldUnitName}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>जनपद: <strong>{sub.fieldUnitDistrict}</strong></span>
                            </div>
                          </td>

                          {/* Mandal (Zone) */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                              {sub.fieldUnitZone}
                            </span>
                          </td>

                          {/* DTE Unit / Desk that raised the demand */}
                          <td className="py-3.5 px-4 max-w-[160px]">
                            {req?.deskName ? (
                              <span className="inline-block text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 line-clamp-2">
                                {req.deskName}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Subject / Requisition Title */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            <div className="font-semibold text-slate-900 line-clamp-2">
                              {req?.title || sub.requisitionId}
                            </div>
                            <div className="text-[11px] font-mono text-indigo-700 font-bold mt-0.5">
                              {req?.requisitionNumber}
                            </div>
                          </td>

                          {/* Order Date */}
                          <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {req?.orderDate || (req?.createdAt ? formatDateTime(req.createdAt) : '—')}
                          </td>

                          {/* Order Letter Attached Y/N */}
                          <td className="py-3.5 px-4">
                            {hasOrderLetter ? (
                              <button
                                onClick={() => req && setPreviewingOrderDoc(req)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 font-bold text-[11px] transition-colors"
                                title="निदेशालय का शासनादेश देखें"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Yes</span>
                              </button>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200 font-bold text-[11px]">
                                No
                              </span>
                            )}
                          </td>

                          {/* Submission Date */}
                          <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {formatDateTime(sub.submittedAt)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <StatusBadge status={sub.status} isLate={sub.isLate} />
                          </td>

                          {/* Officer */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {sub.officerDesignation || 'Principal / Officer'}
                            </div>
                            {sub.submittedByOfficer && (
                              <div className="text-[11px] text-slate-500">{sub.submittedByOfficer}</div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingRecord(sub)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 border border-indigo-200"
                                title="सबमिशन विवरण देखें"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>

                              {(sub.uploadedDocumentUrl || sub.digitalSignatureDataUrl) && (
                                <button
                                  onClick={() => setPreviewingDocument(sub)}
                                  className="p-1 text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                                  title="हस्ताक्षरित पत्र सीधे देखें (View Signed Letter)"
                                >
                                  <Stamp className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleExportSingle(sub)}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                                title="इस रिकॉर्ड को CSV में डाउनलोड करें"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {isDirectorate && onDeleteSubmission && (
                                <button
                                  onClick={() => setDeletingRecord(sub)}
                                  className="p-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition-colors border border-rose-200 hover:border-rose-600 shadow-2xs"
                                  title="निदेशालय द्वारा सबमिशन रिपोर्ट विलोपित करें"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Submission Detail Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase">Submission Details (डेटा रिटर्न विवरण)</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{viewingRecord.fieldUnitName}</h3>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Data Demand Context — which section/desk raised this, and their order letter */}
              {viewingRequisition && (
                <div className="p-3.5 bg-linear-to-r from-indigo-50 via-blue-50/60 to-slate-50 rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      डेटा मांग आदेश (Data Demand Order)
                    </span>
                    {viewingRequisition.deskName && (
                      <span className="text-[11px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        {viewingRequisition.deskName}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{viewingRequisition.title}</div>
                  {viewingRequisition.description && (
                    <p className="text-slate-600 leading-relaxed">{viewingRequisition.description}</p>
                  )}
                  <div className="text-[11px] text-slate-600 font-mono flex items-center gap-2 flex-wrap pt-1">
                    <span>पत्रांक: <strong className="text-slate-800">{viewingRequisition.orderReferenceNumber || viewingRequisition.requisitionNumber}</strong></span>
                    {viewingRequisition.orderDate && (
                      <span>• दिनांक: <strong className="text-slate-800">{viewingRequisition.orderDate}</strong></span>
                    )}
                  </div>
                  {(viewingRequisition.orderDocumentUrl || viewingRequisition.attachmentNoticeDocUrl) && (
                    <div className="pt-1">
                      <button
                        onClick={() => setPreviewingOrderDoc(viewingRequisition)}
                        className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>निदेशालय का शासनादेश देखें (View DTE's Order Letter)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block">Division / District:</span>
                  <span className="font-bold text-slate-800">{viewingRecord.fieldUnitZone} • {viewingRecord.fieldUnitDistrict}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Submission Time:</span>
                  <span className="font-bold text-slate-800 font-mono">{formatDateTime(viewingRecord.submittedAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Officer Designation:</span>
                  <span className="font-bold text-slate-800">{viewingRecord.officerDesignation || 'कार्यालय प्रमुख'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Contact Number:</span>
                  <span className="font-bold text-slate-800">{viewingRecord.officerContact || '-'}</span>
                </div>
              </div>

              {/* Data Fields — only for CUSTOM_FORM/HYBRID submissions that
                  actually have field data. Google Sheet / Google Form modes
                  don't populate this, so we show their actual reply below
                  instead of an empty box. */}
              {Object.keys(viewingRecord.data || {}).length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-2 uppercase">Submitted Data Fields (दर्ज आंकड़े):</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 divide-y divide-slate-200">
                    {Object.entries(viewingRecord.data).map(([key, val]) => (
                      <div key={key} className="py-2 first:pt-0 last:pb-0 flex justify-between gap-4">
                        <span className="text-slate-600 font-medium">{key}:</span>
                        <span className="font-bold text-slate-900 text-right">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Sheet reply — this IS the field unit's submitted
                  data when the demand is in Google Sheet mode, so it needs
                  to be visible here just like custom form fields are. */}
              {viewingRecord.googleSheetSubmittedUrl && (
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>प्रस्तुत गूगल शीट लिंक (Submitted Google Sheet Link)</span>
                  </span>
                  <a
                    href={viewingRecord.googleSheetSubmittedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1.5 break-all"
                  >
                    <span>{viewingRecord.googleSheetSubmittedUrl}</span>
                  </a>
                </div>
              )}

              {/* Google Form response reference — same reasoning. */}
              {viewingRecord.googleFormResponseId && (
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>गूगल फॉर्म पावती संदर्भ (Google Form Response Reference)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800 break-all block">
                    {viewingRecord.googleFormResponseId}
                  </span>
                </div>
              )}

              {/* If none of the above apply, say so plainly instead of
                  showing a blank box that looks broken. */}
              {Object.keys(viewingRecord.data || {}).length === 0 &&
                !viewingRecord.googleSheetSubmittedUrl &&
                !viewingRecord.googleFormResponseId && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[11px] text-center">
                  इस मांग हेतु कोई अतिरिक्त फ़ील्ड डेटा दर्ज नहीं किया गया — केवल हस्ताक्षरित पत्र प्रेषित किया गया है।
                </div>
              )}

              {/* Digital Signature if any */}
              {viewingRecord.digitalSignatureDataUrl && (
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4 text-blue-600" />
                      <span>उंगली द्वारा डिजिटल हस्ताक्षर (Touch / Finger Digital Sign)</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded">
                      ✓ E-Sign Verified
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-200 flex items-center justify-center">
                    <img src={viewingRecord.digitalSignatureDataUrl} alt="Officer Digital Signature" className="max-h-20 object-contain" />
                  </div>
                </div>
              )}

              {/* Signed Letter — shown for ANY submission with proof of
                  authentication, whether that's a genuinely uploaded scan
                  or (when no scan was attached) the formal covering letter
                  reconstructed from the dispatch details + e-signature
                  above. Either way there's now always something to open. */}
              {(viewingRecord.uploadedDocumentUrl || viewingRecord.digitalSignatureDataUrl) && (
                <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0">
                      <Stamp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {viewingRecord.uploadedDocumentUrl && viewingRecord.uploadedDocumentUrl !== viewingRecord.digitalSignatureDataUrl
                          ? viewingRecord.uploadedDocumentName
                          : 'हस्ताक्षरित आवरण पत्र (Signed Covering Letter)'}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span>हस्ताक्षरित एवं प्रमाणित शासकीय पत्र</span>
                        {viewingRecord.signedLetterDispatchNumber && (
                          <span>• पत्रांक: <strong className="text-slate-700">{viewingRecord.signedLetterDispatchNumber}</strong></span>
                        )}
                        {viewingRecord.signedLetterDate && (
                          <span>• दिनांक: <strong className="text-slate-700">{viewingRecord.signedLetterDate}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewingDocument(viewingRecord)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>पत्र देखें (View Letter)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingle(viewingRecord)}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="इस सबमिशन रिकॉर्ड को CSV में डाउनलोड करें"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export Record (CSV)</span>
                </button>

                {isDirectorate && onDeleteSubmission && (
                  <button
                    onClick={() => setDeletingRecord(viewingRecord)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>सबमिशन रिपोर्ट हटाएं (Delete)</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Close (बंद करें)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">सबमिशन रिपोर्ट विलोपन (Delete Report)</h3>
                <p className="text-xs text-slate-500">निदेशालय स्तर पर डेटा प्रविष्टि निरस्तीकरण</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                क्या आप निम्नलिखित इकाई की सबमिशन रिपोर्ट को पोर्टल से विलोपित करना चाहते हैं?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><span className="font-bold text-slate-800">संस्थान:</span> {deletingRecord.fieldUnitName}</div>
                <div><span className="font-bold text-slate-800">जनपद/मंडल:</span> {deletingRecord.fieldUnitDistrict} ({deletingRecord.fieldUnitZone})</div>
                <div><span className="font-bold text-slate-800">सबमिशन समय:</span> {formatDateTime(deletingRecord.submittedAt)}</div>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>नोट:</strong> इस सबमिशन रिपोर्ट को हटाने के पश्चात संबंधित संस्थान की स्थिति पुनः <strong>लंबित (Pending)</strong> हो जाएगी और वे सही डेटा पुनः अपलोड कर सकेंगे।
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>हां, रिपोर्ट विलोपित करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signed Letter / Uploaded Document Preview Modal — this is the actual
          "repository" viewer: lets anyone with access open or download the
          scanned/signed letter a field unit submitted, not just see its name. */}
      {previewingDocument && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Stamp className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    हस्ताक्षरित शासकीय पत्र (Signed Letter)
                  </h3>
                  <p className="text-[11px] text-slate-500">{previewingDocument.fieldUnitName}</p>
                </div>
              </div>
              <button onClick={() => setPreviewingDocument(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2 text-slate-600 flex-wrap gap-1">
                <span>पत्रांक: <strong className="text-slate-900">{previewingDocument.signedLetterDispatchNumber || '—'}</strong></span>
                <span>दिनांक: <strong className="text-slate-900">{previewingDocument.signedLetterDate || formatDateTime(previewingDocument.submittedAt)}</strong></span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">प्रमाणित करने वाले अधिकारी:</span>
                <span className="font-bold text-slate-800">{previewingDocument.submittedByOfficer} • {previewingDocument.officerDesignation}</span>
              </div>

              {/* Standalone signature proof — shown only alongside a
                  genuinely separate uploaded file. When there's no genuine
                  upload, the composed covering letter below already embeds
                  this same signature, so showing it again here would just
                  duplicate it. */}
              {previewingHasGenuineUpload && previewingDocument.digitalSignatureDataUrl && (
                <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-blue-600" />
                    <span>उंगली द्वारा डिजिटल हस्ताक्षर (Finger / Touch Signature)</span>
                  </span>
                  <div className="border border-dashed border-blue-300 rounded-lg p-3 bg-blue-50/20 flex items-center justify-center">
                    <img src={previewingDocument.digitalSignatureDataUrl} alt="Digital Signature" className="max-h-24 object-contain" />
                  </div>
                </div>
              )}

              {/* Separately uploaded scanned letter — shown when the officer
                  actually attached a distinct file (not just the finger
                  signature reused as a fallback placeholder). */}
              {previewingHasGenuineUpload ? (
                <>
                  {previewingDocument.uploadedDocumentUrl!.startsWith('data:image') ? (
                    <div className="border rounded-lg overflow-hidden max-h-80 flex items-center justify-center bg-slate-100">
                      <img src={previewingDocument.uploadedDocumentUrl} alt="Signed letter" className="max-h-80 object-contain" />
                    </div>
                  ) : previewingDocument.uploadedDocumentUrl!.startsWith('data:application/pdf') ? (
                    <div className="border rounded-lg overflow-hidden bg-slate-100">
                      <iframe
                        src={previewedDocBlobUrl || previewingDocument.uploadedDocumentUrl}
                        title="Signed letter"
                        className="w-full h-96"
                      />
                    </div>
                  ) : (
                    previewingDocument.uploadedDocumentName && (
                      <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-2">
                        <FileCheck className="w-10 h-10 text-indigo-600 mx-auto" />
                        <div className="font-bold text-slate-900 text-sm">{previewingDocument.uploadedDocumentName}</div>
                        <p className="text-slate-500 text-[11px]">
                          यह फाइल सीधे ब्राउज़र में पूर्वावलोकन योग्य प्रारूप में नहीं है। कृपया डाउनलोड कर देखें।
                        </p>
                      </div>
                    )
                  )}

                  <div className="flex justify-end">
                    <a
                      href={previewingDocument.uploadedDocumentUrl}
                      download={previewingDocument.uploadedDocumentName || 'signed-letter'}
                      target={previewingDocument.uploadedDocumentUrl!.startsWith('data:') ? undefined : '_blank'}
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>डाउनलोड करें (Download)</span>
                    </a>
                  </div>
                </>
              ) : previewingDocument.digitalSignatureDataUrl ? (
                /* No separate scan was uploaded — reconstruct the formal
                   covering letter from the dispatch details + signature, so
                   there's still an actual letter to view/print rather than
                   nothing at all. */
                <div className="bg-white p-6 rounded-xl border border-slate-300 space-y-4 font-serif text-slate-900 leading-relaxed shadow-sm">
                  <div className="text-center border-b pb-3 space-y-1">
                    <div className="font-bold text-sm tracking-wide uppercase">कार्यालय: {previewingDocument.fieldUnitName}</div>
                    <div className="text-[11px] text-slate-600 font-sans">
                      क्षेत्रीय मंडल: {previewingDocument.fieldUnitZone} • जनपद: {previewingDocument.fieldUnitDistrict} (उ.प्र.)
                    </div>
                  </div>

                  <div className="flex justify-between font-sans text-[11px] font-bold text-slate-700">
                    <span>पत्रांक: {previewingDocument.signedLetterDispatchNumber || '—'}</span>
                    <span>दिनांक: {previewingDocument.signedLetterDate || formatDateTime(previewingDocument.submittedAt)}</span>
                  </div>

                  <div className="space-y-1 text-xs font-sans">
                    <div>सेवा में,</div>
                    <div className="font-bold pl-4">प्रभारी अधिकारी / निदेशक,</div>
                    {previewingDocumentReq?.deskName && <div className="pl-4">{previewingDocumentReq.deskName},</div>}
                    <div className="pl-4">प्रशिक्षण निदेशालय, उत्तर प्रदेश, लखनऊ।</div>
                  </div>

                  {previewingDocumentReq && (
                    <div className="font-bold text-slate-900 bg-slate-100 p-2 rounded text-[11px] font-sans">
                      विषय: {previewingDocumentReq.title} (मांग सं.: {previewingDocumentReq.requisitionNumber}) के संबंध में वांछित सूचना प्रेषण।
                    </div>
                  )}

                  <p className="text-xs font-sans indent-4">
                    उपर्युक्त संदर्भित विषयक निदेशालय के मांग आदेश के अनुपालन में संस्थान का वांछित प्रमाणित डेटा एवं आख्या विभागीय पोर्टल पर ऑनलाइन सबमिट कर दी गई है।
                  </p>

                  <div className="pt-4 flex justify-end">
                    <div className="text-center space-y-1 min-w-44">
                      <div className="mb-1 flex flex-col items-center">
                        <img src={previewingDocument.digitalSignatureDataUrl} alt="Officer Signature" className="h-12 object-contain" />
                        <div className="text-[9px] text-blue-800 font-mono font-bold">[Digitally Signed via Touch Pad]</div>
                      </div>
                      <div className="font-bold font-sans text-xs">({previewingDocument.submittedByOfficer || 'हस्ताक्षर'})</div>
                      <div className="text-[11px] text-slate-600 font-sans">{previewingDocument.officerDesignation || 'प्रधानाचार्य / नोडल अधिकारी'}</div>
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

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setPreviewingDocument(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Close (बंद करें)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DTE Desk's Order/Demand Letter Preview Modal — the letter the desk
          uploaded when raising this data demand, as distinct from the
          field unit's own reply letter above. */}
      {previewingOrderDoc && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Stamp className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    निदेशालय शासनादेश (Directorate Order Letter)
                  </h3>
                  <p className="text-[11px] text-slate-500">{previewingOrderDoc.deskName}</p>
                </div>
              </div>
              <button onClick={() => setPreviewingOrderDoc(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2 text-slate-600 flex-wrap gap-1">
                <span>पत्रांक: <strong className="text-slate-900">{previewingOrderDoc.orderReferenceNumber || previewingOrderDoc.requisitionNumber}</strong></span>
                {previewingOrderDoc.orderDate && (
                  <span>दिनांक: <strong className="text-slate-900">{previewingOrderDoc.orderDate}</strong></span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block font-medium">विषय:</span>
                <span className="font-bold text-slate-800">{previewingOrderDoc.title}</span>
              </div>

              {(() => {
                const docUrl = previewingOrderDoc.orderDocumentUrl || previewingOrderDoc.attachmentNoticeDocUrl;
                if (!docUrl) return null;
                if (docUrl.startsWith('data:image')) {
                  return (
                    <div className="border rounded-lg overflow-hidden max-h-80 flex items-center justify-center bg-slate-100">
                      <img src={docUrl} alt="Order document" className="max-h-80 object-contain" />
                    </div>
                  );
                }
                if (docUrl.startsWith('data:application/pdf')) {
                  return (
                    <div className="border rounded-lg overflow-hidden bg-slate-100">
                      <iframe
                        src={previewedOrderDocBlobUrl || docUrl}
                        title="Order document"
                        className="w-full h-96"
                      />
                    </div>
                  );
                }
                return (
                  <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-2">
                    <FileCheck className="w-10 h-10 text-indigo-600 mx-auto" />
                    <div className="font-bold text-slate-900 text-sm">
                      {previewingOrderDoc.orderDocumentName || 'निदेशालय आधिकारिक आदेश पत्र'}
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      यह फाइल सीधे ब्राउज़र में पूर्वावलोकन योग्य प्रारूप में नहीं है। कृपया डाउनलोड कर देखें।
                    </p>
                  </div>
                );
              })()}

              {(previewingOrderDoc.orderDocumentUrl || previewingOrderDoc.attachmentNoticeDocUrl) && (
                <div className="flex justify-end">
                  <a
                    href={previewingOrderDoc.orderDocumentUrl || previewingOrderDoc.attachmentNoticeDocUrl}
                    download={previewingOrderDoc.orderDocumentName || 'order-document'}
                    target={(previewingOrderDoc.orderDocumentUrl || previewingOrderDoc.attachmentNoticeDocUrl || '').startsWith('data:') ? undefined : '_blank'}
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>डाउनलोड करें (Download)</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setPreviewingOrderDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Close (बंद करें)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
