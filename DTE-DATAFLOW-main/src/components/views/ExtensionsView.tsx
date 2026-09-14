import React, { useState } from 'react';
import { ExtensionRequest, Requisition, FieldUnit, UserSession, DirectorateDesk } from '../../types/portal';
import { CountdownTimer } from '../common/CountdownTimer';
import { formatDateTime } from '../../utils/dateUtils';
import { getScopedExtensions, getUserZone, getCurrentUserFieldUnit } from '../../utils/userScope';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Building2, 
  Plus, 
  Check, 
  X,
  FileText,
  Search,
  Timer,
  MapPin,
  ShieldCheck
} from 'lucide-react';

interface ExtensionsViewProps {
  extensions: ExtensionRequest[];
  requisitions: Requisition[];
  fieldUnits: FieldUnit[];
  desks: DirectorateDesk[];
  currentUser: UserSession;
  onRespondExtension?: (extensionId: string, status: 'APPROVED' | 'REJECTED', comments: string) => void;
  onRequestExtension?: (requisitionId: string, reason: string) => void;
}

export const ExtensionsView: React.FC<ExtensionsViewProps> = ({
  extensions,
  requisitions,
  fieldUnits,
  desks,
  currentUser,
  onRespondExtension,
  onRequestExtension
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [responseModalExtension, setResponseModalExtension] = useState<ExtensionRequest | null>(null);
  const [responseComment, setResponseComment] = useState('24 घंटे का समय विस्तार स्वीकृत किया जाता है।');
  const [searchQuery, setSearchQuery] = useState('');

  const isField = currentUser.role === 'FIELD_JD' || currentUser.role === 'FIELD_ITI';
  const isJD = currentUser.role === 'FIELD_JD';
  const isITI = currentUser.role === 'FIELD_ITI';
  const isDirectorate = currentUser.role === 'DIRECTORATE_DESK' || currentUser.role === 'DIRECTORATE_ADMIN';

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  const userZone = getUserZone(currentUser, fieldUnits);

  // Scoped extensions:
  // - Admin: all
  // - Desk: for this desk's orders
  // - JD: for JD office + ITIs in his mandal
  // - ITI: for this ITI only
  const relevantExtensions = getScopedExtensions(currentUser, extensions, requisitions, fieldUnits);

  const filteredExtensions = relevantExtensions.filter(e => {
    const matchesTab = activeTab === 'ALL' || e.status === activeTab;
    const matchesSearch = 
      e.fieldUnitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = relevantExtensions.filter(e => e.status === 'PENDING').length;
  const approvedCount = relevantExtensions.filter(e => e.status === 'APPROVED').length;
  const rejectedCount = relevantExtensions.filter(e => e.status === 'REJECTED').length;

  const handleApproveOrReject = (status: 'APPROVED' | 'REJECTED') => {
    if (!responseModalExtension || !onRespondExtension) return;
    onRespondExtension(responseModalExtension.id, status, responseComment);
    setResponseModalExtension(null);
  };

  return (
    <div className="space-y-5">
      {/* Jurisdiction Scope Banner */}
      {isJD && userZone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-200/70 text-amber-800 rounded-md">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">मंडलीय समय-विस्तार अनुरोध: </span>
              <span><strong>{userZone}</strong> — आपके कार्यालय अथवा आपके मंडल की आईटीआई इकाइयों द्वारा प्रस्तुत समय-सीमा विस्तार आवेदन।</span>
            </div>
          </div>
          <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantExtensions.length} आवेदन
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
              <span className="font-bold">संस्थान समय-विस्तार अनुरोध: </span>
              <span><strong>{userUnit.name} ({userUnit.district})</strong> द्वारा प्रेषित विस्तार आवेदन व स्वीकृति स्थिति।</span>
            </div>
          </div>
          <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantExtensions.length} आवेदन
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
              <span className="font-bold">प्रकोष्ठ विस्तार निर्णय: </span>
              <span><strong>{currentUser.displayName}</strong> के मांग आदेशों हेतु प्राप्त समय-विस्तार अनुरोध।</span>
            </div>
          </div>
          <span className="bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantExtensions.length} आवेदन
          </span>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{pendingCount}</div>
            <div className="text-xs font-semibold text-slate-500">Pending Extension Requests (लंबित)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{approvedCount}</div>
            <div className="text-xs font-semibold text-slate-500">Approved Extensions (स्वीकृत समय)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{rejectedCount}</div>
            <div className="text-xs font-semibold text-slate-500">Rejected Requests (अस्वीकृत)</div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Field Unit Name या Reason से Search करें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({relevantExtensions.length})
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'PENDING' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'APPROVED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'REJECTED' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Extensions List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Deadline Extension Requests ({filteredExtensions.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Directorate Approval & Monitoring
          </span>
        </div>

        {filteredExtensions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">कोई समय विस्तार अनुरोध नहीं है (No Requests)</p>
            <p className="text-xs text-slate-400 mt-1">सभी Units निर्धारित समय-सीमा (Deadline) के अनुसार कार्य कर रही हैं।</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExtensions.map((ext) => {
              const req = requisitions.find(r => r.id === ext.requisitionId);
              return (
                <div key={ext.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        ext.status === 'APPROVED' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : ext.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                      }`}>
                        {ext.status === 'APPROVED' ? '✓ Approved (स्वीकृत)' : ext.status === 'REJECTED' ? '✕ Rejected (अस्वीकृत)' : '⏳ Pending Approval (लंबित)'}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Requested: {formatDateTime(ext.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {ext.fieldUnitName}
                    </h3>

                    <div className="text-xs text-indigo-700 font-semibold mt-0.5">
                      Data Demand Order: {req?.title || ext.requisitionId} ({req?.requisitionNumber})
                    </div>

                    <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                      <span className="font-bold text-slate-900 block mb-0.5">Extension Reason (कारण):</span>
                      {ext.reason}
                    </div>

                    {ext.deskResponseComment && (
                      <div className="mt-2 p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-200 text-xs text-indigo-900">
                        <span className="font-bold block mb-0.5">Directorate Feedback (मुख्यालय टिप्पणी):</span>
                        {ext.deskResponseComment}
                      </div>
                    )}
                  </div>

                  {/* Actions for Directorate */}
                  {isDirectorate && ext.status === 'PENDING' && onRespondExtension && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <button
                        onClick={() => setResponseModalExtension(ext)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Take Action (Approve / Reject)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Extension Response Modal */}
      {responseModalExtension && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              समय-सीमा विस्तार अनुरोध पर निर्णय
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              संस्थान: <strong className="text-slate-800">{responseModalExtension.fieldUnitName}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  मुख्यालय अनुमोदन / अस्वीकृति टिप्पणी दर्ज करें:
                </label>
                <textarea
                  rows={3}
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setResponseModalExtension(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  रद्द करें
                </button>
                <button
                  onClick={() => handleApproveOrReject('REJECTED')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>अस्वीकृत करें</span>
                </button>
                <button
                  onClick={() => handleApproveOrReject('APPROVED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>स्वीकृत करें</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
