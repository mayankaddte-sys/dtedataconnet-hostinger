import React, { useState } from 'react';
import { Requisition, DirectorateDesk, SubmissionRecord, UserSession, FieldUnit } from '../../types/portal';
import { PriorityBadge } from '../common/PriorityBadge';
import { CountdownTimer } from '../common/CountdownTimer';
import { formatDateTime } from '../../utils/dateUtils';
import { getScopedRequisitions, getUserZone, getCurrentUserFieldUnit } from '../../utils/userScope';
import { 
  FileText, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  ArrowRight,
  Send,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Calendar,
  Trash2,
  AlertTriangle,
  MapPin,
  ShieldCheck
} from 'lucide-react';

interface RequisitionsListViewProps {
  requisitions: Requisition[];
  desks: DirectorateDesk[];
  submissions: SubmissionRecord[];
  fieldUnits?: FieldUnit[];
  currentUser: UserSession;
  onSelectRequisition: (req: Requisition) => void;
  onOpenSubmitModal?: (req: Requisition, existingSub?: SubmissionRecord) => void;
  onCreateRequisition?: () => void;
  onDeleteRequisition?: (requisitionId: string) => void;
}

export const RequisitionsListView: React.FC<RequisitionsListViewProps> = ({
  requisitions,
  desks,
  submissions,
  fieldUnits = [],
  currentUser,
  onSelectRequisition,
  onOpenSubmitModal,
  onCreateRequisition,
  onDeleteRequisition
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeskFilter, setSelectedDeskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'URGENT' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [deletingReq, setDeletingReq] = useState<Requisition | null>(null);

  const isField = currentUser.role === 'FIELD_JD' || currentUser.role === 'FIELD_ITI';
  const isJD = currentUser.role === 'FIELD_JD';
  const isITI = currentUser.role === 'FIELD_ITI';
  const isDirectorate = currentUser.role === 'DIRECTORATE_DESK' || currentUser.role === 'DIRECTORATE_ADMIN';

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  const userZone = getUserZone(currentUser, fieldUnits);

  // Scoped requisitions based on role:
  // - Admin: all
  // - Desk: desk requisitions
  // - JD: requisitions targeting JD office OR ITIs in his mandal
  // - ITI: requisitions targeting this ITI
  const relevantRequisitions = getScopedRequisitions(currentUser, requisitions, fieldUnits);

  const filteredRequisitions = relevantRequisitions.filter(req => {
    const matchesSearch = 
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requisitionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.deskName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDesk = selectedDeskFilter === 'ALL' || req.deskId === selectedDeskFilter;

    // Determine status
    const isUrgent = req.priority === 'URGENT' || req.isAssemblyQuestion;
    const isOverdue = new Date(req.deadline).getTime() < Date.now();
    
    let matchesStatus = true;
    if (statusFilter === 'URGENT') {
      matchesStatus = isUrgent;
    } else if (statusFilter === 'OVERDUE') {
      matchesStatus = isOverdue;
    } else if (statusFilter === 'ACTIVE') {
      matchesStatus = !isOverdue;
    }

    return matchesSearch && matchesDesk && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Jurisdiction Scope Banner for JD / ITI / Desk */}
      {isJD && userZone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-200/70 text-amber-800 rounded-md">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">मंडलीय अधिकार क्षेत्र (Divisional Jurisdiction): </span>
              <span><strong>{userZone}</strong> — आपके संयुक्त निदेशक कार्यालय अथवा आपके मंडल की आईटीआई इकाइयों से संबंधित मांग आदेश प्रदर्शित हैं।</span>
            </div>
          </div>
          <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantRequisitions.length} आदेश
          </span>
        </div>
      )}

      {isITI && userUnit && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-emerald-200/70 text-emerald-800 rounded-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">संस्थान अधिकार क्षेत्र (Unit Scope): </span>
              <span><strong>{userUnit.name} ({userUnit.district})</strong> हेतु निर्देशित मांग आदेश।</span>
            </div>
          </div>
          <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantRequisitions.length} आदेश
          </span>
        </div>
      )}

      {currentUser.role === 'DIRECTORATE_DESK' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-indigo-200/70 text-indigo-800 rounded-md">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">प्रकोष्ठ अधिकार क्षेत्र (Desk Scope): </span>
              <span><strong>{currentUser.displayName}</strong> द्वारा निर्गत एवं प्रबंधित मांग आदेश।</span>
            </div>
          </div>
          <span className="bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantRequisitions.length} आदेश
          </span>
        </div>
      )}

      {/* Top Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Order Number, Subject या Desk द्वारा Search करें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Orders ({relevantRequisitions.length})
            </button>
            <button
              onClick={() => setStatusFilter('URGENT')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'URGENT'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-red-700'
              }`}
            >
              ⚡ Urgent Orders
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              🟢 Active
            </button>
            <button
              onClick={() => setStatusFilter('OVERDUE')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                statusFilter === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              ⚠️ Overdue
            </button>
          </div>

          {/* Desk Filter (for admin / full view) */}
          <select
            value={selectedDeskFilter}
            onChange={(e) => setSelectedDeskFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Desks / प्रकोष्ठ</option>
            {desks.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Create Button */}
          {isDirectorate && onCreateRequisition && (
            <button
              onClick={onCreateRequisition}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>+ New Data Demand</span>
            </button>
          )}
        </div>
      </div>

      {/* Requisitions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Data Demand Orders ({filteredRequisitions.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Time-bound Data Tracking & Submission Status
          </span>
        </div>

        {filteredRequisitions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">कोई डेटा मांग आदेश नहीं मिला (No Orders Found)</p>
            <p className="text-xs text-slate-400 mt-1">Filter बदलें या नया आदेश जारी करें।</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequisitions.map((req) => {
              const reqSubmissions = submissions.filter(s => s.requisitionId === req.id);
              const compliancePct = req.targetUnitIds.length > 0 
                ? Math.round((reqSubmissions.length / req.targetUnitIds.length) * 100) 
                : 0;

              const isFieldUser = isField && currentUser.fieldUnitId;
              const fieldSubmission = isFieldUser 
                ? submissions.find(s => s.requisitionId === req.id && s.fieldUnitId === currentUser.fieldUnitId)
                : null;

              return (
                <div 
                  key={req.id}
                  className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  {/* Left info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                        {req.requisitionNumber}
                      </span>
                      <PriorityBadge priority={req.priority} isAssemblyQuestion={req.isAssemblyQuestion} />
                      <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                        {req.deskName}
                      </span>
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>
                          {req.targetScope === 'ALL_FIELD_UNITS'
                            ? 'All Units (JD+ITI)'
                            : req.targetScope === 'ALL_JD_OFFICES'
                            ? 'All JD Offices'
                            : req.targetScope === 'ALL_ITIS'
                            ? 'All ITIs'
                            : req.targetScope === 'SELECTED_JD_OFFICES'
                            ? 'Selected JDs'
                            : req.targetScope === 'SELECTED_ITIS'
                            ? 'Selected ITIs'
                            : 'Selected Units'}
                        </span>
                      </span>
                      {(req.orderDocumentName || req.orderReferenceNumber) && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <FileText className="w-3 h-3 text-indigo-600" />
                          <span>शासनादेश संलग्न</span>
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Date: {formatDateTime(req.createdAt)}
                      </span>
                    </div>

                    <h3 
                      onClick={() => onSelectRequisition(req)}
                      className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer leading-snug"
                    >
                      {req.title}
                    </h3>

                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {req.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Target Units: {req.targetUnitIds.length}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Submissions: {reqSubmissions.length} / {req.targetUnitIds.length} ({compliancePct}%)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                        Format: {req.mode === 'GOOGLE_SHEET' ? 'Google Sheet' : req.mode === 'CUSTOM_FORM' ? 'Portal Form' : 'Hybrid'}
                      </span>
                    </div>
                  </div>

                  {/* Right Action & Deadline */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-slate-500 font-semibold mb-0.5">Deadline:</div>
                      <CountdownTimer deadline={req.deadline} isUrgent={req.priority === 'URGENT'} />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Field User Submit Action */}
                      {isField && onOpenSubmitModal && (
                        <button
                          onClick={() => onOpenSubmitModal(req, fieldSubmission || undefined)}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors ${
                            fieldSubmission?.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : fieldSubmission?.status === 'REVISION_REQUESTED'
                              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                              : fieldSubmission?.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {fieldSubmission?.status === 'APPROVED' 
                              ? 'Approved Data देखें'
                              : fieldSubmission?.status === 'REVISION_REQUESTED'
                              ? 'Revision / सुधार भरें'
                              : fieldSubmission?.status === 'SUBMITTED'
                              ? 'Submission देखें / Edit'
                              : 'डेटा Return भरें'}
                          </span>
                        </button>
                      )}

                      {/* View Detail Button */}
                      <button
                        onClick={() => onSelectRequisition(req)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border border-slate-200"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>

                      {/* Directorate Delete Button */}
                      {isDirectorate && onDeleteRequisition && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingReq(req);
                          }}
                          className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition-colors border border-rose-200 hover:border-rose-600 shadow-2xs"
                          title="मांग आदेश विलोपित करें (Delete Order)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Requisition Confirmation Modal */}
      {deletingReq && (
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
                क्या आप निम्नलिखित डेटा मांग आदेश को स्थायी रूप से विलोपित करना चाहते हैं?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div><span className="font-bold text-slate-800">मांग सं.:</span> <span className="font-mono text-indigo-700 font-bold">{deletingReq.requisitionNumber}</span></div>
                <div><span className="font-bold text-slate-800">विषय:</span> {deletingReq.title}</div>
                <div><span className="font-bold text-slate-800">प्रकोष्ठ:</span> {deletingReq.deskName}</div>
                <div><span className="font-bold text-slate-800">लक्षित इकाइयां:</span> {deletingReq.targetUnitIds.length}</div>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                <strong>सावधानी:</strong> इस आदेश को हटाने पर इससे संबंधित सभी <strong>सबमिशन रिपोर्ट्स</strong>, विस्तार अनुरोध तथा निर्गत नोटिस भी स्वतः हटा दिए जाएंगे।
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                onClick={() => {
                  if (onDeleteRequisition) {
                    onDeleteRequisition(deletingReq.id);
                  }
                  setDeletingReq(null);
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
    </div>
  );
};
