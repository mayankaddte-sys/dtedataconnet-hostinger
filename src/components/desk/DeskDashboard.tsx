import React, { useState } from 'react';
import { 
  DirectorateDesk, 
  Requisition, 
  SubmissionRecord, 
  ExtensionRequest, 
  FieldUnit, 
  PriorityLevel 
} from '../../types/portal';
import { PriorityBadge } from '../common/PriorityBadge';
import { CountdownTimer } from '../common/CountdownTimer';
import { formatDateTime } from '../../utils/dateUtils';
import { 
  Building2, 
  PlusCircle, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Layers, 
  TrendingUp, 
  Users, 
  ChevronRight, 
  Filter, 
  Search, 
  ShieldAlert,
  Inbox,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface DeskDashboardProps {
  desk: DirectorateDesk;
  requisitions: Requisition[];
  submissions: SubmissionRecord[];
  extensions: ExtensionRequest[];
  fieldUnits: FieldUnit[];
  onSelectRequisition: (req: Requisition) => void;
  onCreateRequisition: () => void;
  onRespondExtension: (extensionId: string, status: 'APPROVED' | 'REJECTED', comments: string) => void;
}

export const DeskDashboard: React.FC<DeskDashboardProps> = ({
  desk,
  requisitions,
  submissions,
  extensions,
  fieldUnits,
  onSelectRequisition,
  onCreateRequisition,
  onRespondExtension
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [extensionComment, setExtensionComment] = useState<string>('24 hours extension approved');

  // Requisitions belonging to this desk
  const deskRequisitions = requisitions.filter(r => r.deskId === desk.id);

  // Filtered by priority and search
  const filteredRequisitions = deskRequisitions.filter(r => {
    const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.requisitionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  // Calculate desk-level statistics
  const totalCalls = deskRequisitions.length;
  const urgentCalls = deskRequisitions.filter(r => r.priority === 'URGENT' || r.isAssemblyQuestion).length;
  
  // Total expected submissions across all desk requisitions
  let totalExpected = 0;
  let totalReceived = 0;
  deskRequisitions.forEach(r => {
    totalExpected += r.targetUnitIds.length;
    const subs = submissions.filter(s => s.requisitionId === r.id);
    totalReceived += subs.length;
  });

  const overallCompliance = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 100;
  
  // Pending extension requests for this desk
  const deskRequisitionIds = new Set(deskRequisitions.map(r => r.id));
  const pendingExtensions = extensions.filter(e => deskRequisitionIds.has(e.requisitionId) && e.status === 'PENDING');

  return (
    <div className="space-y-6">
      
      {/* Directorate Desk Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                {desk.code} • Directorate HQ
              </span>
              <span className="text-xs text-slate-400 font-medium">Desk Management Portal</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {desk.name}
            </h1>

            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {desk.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 text-slate-200">
                <Users className="w-4 h-4 text-indigo-400" />
                {desk.officerInCharge ? (
                  <>Officer In-Charge: <strong className="text-white font-bold">{desk.officerInCharge}</strong> ({desk.designation})</>
                ) : (
                  <>Nodal Post: <strong className="text-white font-bold">{desk.designation}</strong></>
                )}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">{desk.email}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">{desk.phone}</span>
            </div>
          </div>

          <button
            onClick={onCreateRequisition}
            className="self-start md:self-auto px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center gap-2 shrink-0 transition-all transform hover:-translate-y-0.5 border border-indigo-400/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create New Data Demand (Requisition)</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Active Demands</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCalls}</div>
          <div className="text-[11px] text-slate-500 mt-1">Orders Issued by this Desk</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Urgent / High Priority</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">{urgentCalls}</div>
          <div className="text-[11px] text-slate-500 mt-1">Assembly & Critical Demands</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Field Compliance Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{overallCompliance}%</div>
          <div className="text-[11px] text-slate-500 mt-1">{totalReceived} of {totalExpected} Submissions Received</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Extension Requests</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{pendingExtensions.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pending Decision</div>
        </div>

      </div>

      {/* Pending Extension Requests Card (if any) */}
      {pendingExtensions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Extension Requests from Field Units ({pendingExtensions.length})</span>
            </div>
            <span className="text-xs text-amber-800 font-semibold">Action Needed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingExtensions.map((ext) => {
              const req = requisitions.find(r => r.id === ext.requisitionId);
              return (
                <div key={ext.id} className="bg-white p-4 rounded-lg border border-amber-200 space-y-2 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{ext.fieldUnitName}</span>
                      <span className="text-[11px] font-mono text-slate-500">{req?.requisitionNumber}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                      Extension Request
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 italic">
                    &quot;{ext.reason}&quot;
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-slate-500">
                      Requested Deadline: <strong className="text-slate-800">{formatDateTime(ext.requestedDeadline)}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onRespondExtension(ext.id, 'REJECTED', 'समय-सीमा की अनिवार्यता के कारण विस्तार अनुरोध अस्वीकृत किया गया (Rejected due to strict deadline requirements).')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded font-bold text-xs transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => onRespondExtension(ext.id, 'APPROVED', extensionComment)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve Extension</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Requisitions Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table & Filter Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-700 shrink-0">Priority Filter:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'URGENT', label: 'Urgent' },
                { id: 'HIGH', label: 'High' },
                { id: 'NORMAL', label: 'Normal' },
                { id: 'ROUTINE', label: 'Routine' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPriorityFilter(p.id)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    priorityFilter === p.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

        </div>

        {/* Requisitions Grid / List */}
        <div className="divide-y divide-slate-100">
          {filteredRequisitions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <Inbox className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-medium">इस श्रेणी में कोई डेटा मांग आदेश उपलब्ध नहीं है (No demand orders in this category).</p>
              <button
                onClick={onCreateRequisition}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                + Create First Demand Order
              </button>
            </div>
          ) : (
            filteredRequisitions.map((req) => {
              const reqSubmissions = submissions.filter(s => s.requisitionId === req.id);
              const targetCount = req.targetUnitIds.length;
              const compliancePct = targetCount > 0 ? Math.round((reqSubmissions.length / targetCount) * 100) : 0;
              const pendingCount = Math.max(0, targetCount - reqSubmissions.length);

              return (
                <div
                  key={req.id}
                  onClick={() => onSelectRequisition(req)}
                  className="p-5 hover:bg-slate-50/80 transition-all cursor-pointer group flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {req.requisitionNumber}
                      </span>
                      <PriorityBadge priority={req.priority} isAssemblyQuestion={req.isAssemblyQuestion} size="sm" />
                      <span className="text-xs text-slate-500 font-medium">
                        Mode: <strong className="text-slate-700">
                          {req.mode === 'GOOGLE_SHEET' ? 'Google Sheet' : req.mode === 'GOOGLE_FORM' ? 'Google Form' : 'Portal Form'}
                        </strong>
                      </span>
                      {req.isStrictCutoff && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded">
                          Auto-Lock Window
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {req.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      {req.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Deadline: <strong className="text-slate-800">{formatDateTime(req.deadline)}</strong>
                      </span>
                      <span>•</span>
                      <span>Target: <strong className="text-slate-700">
                        {req.targetScope === 'ALL_FIELD_UNITS' || req.targetScope === ('ALL_UNITS' as any)
                          ? 'All Units (JDs + ITIs)' 
                          : req.targetScope === 'ALL_ITIS' 
                          ? 'All ITIs' 
                          : req.targetScope === 'ALL_JD_OFFICES' 
                          ? 'All JD Offices' 
                          : req.targetScope === 'SELECTED_JD_OFFICES'
                          ? 'Selected JDs (Mandal)'
                          : req.targetScope === 'SELECTED_ITIS'
                          ? 'Selected ITIs'
                          : 'Selected Units'}
                      </strong> ({targetCount} Units)</span>
                    </div>
                  </div>

                  {/* Right compliance stat & countdown */}
                  <div className="flex items-center gap-6 self-end lg:self-center shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 w-full lg:w-auto justify-between lg:justify-end">
                    
                    {/* Compliance Mini Progress */}
                    <div className="w-40 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px] font-medium">Compliance Rate</span>
                        <span className="font-bold text-slate-900">{compliancePct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            compliancePct >= 80 ? 'bg-emerald-500' : compliancePct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${compliancePct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        {reqSubmissions.length}/{targetCount} Received ({pendingCount} Pending)
                      </div>
                    </div>

                    {/* Countdown Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <CountdownTimer deadline={req.deadline} isStrictCutoff={req.isStrictCutoff} compact />
                      <span className="text-xs text-indigo-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Manage & Review <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
