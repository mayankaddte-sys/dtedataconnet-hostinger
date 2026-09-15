import React, { useState, useEffect } from 'react';
import { DefaulterNotice, Requisition, FieldUnit, DirectorateDesk, UserSession, SubmissionRecord } from '../../types/portal';
import { formatDateTime } from '../../utils/dateUtils';
import { getScopedNotices, getUserZone, getCurrentUserFieldUnit, getNonSubmittedTargetUnits } from '../../utils/userScope';
import { runAutomaticEmailReminderCycle, getStoredEmailLogs } from '../../lib/emailReminderEngine';
import { 
  BellRing, 
  AlertTriangle, 
  Send, 
  Search, 
  ShieldAlert, 
  Building2, 
  CheckCircle2, 
  FileText,
  Clock,
  PlusCircle,
  Inbox,
  MapPin,
  ShieldCheck,
  Mail,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface NoticesViewProps {
  defaulterNotices: DefaulterNotice[];
  requisitions: Requisition[];
  fieldUnits: FieldUnit[];
  desks: DirectorateDesk[];
  currentUser: UserSession;
  submissions?: SubmissionRecord[];
  onSendDefaulterNotice?: (unitIds: string[], subject: string, message: string, reqId?: string) => void;
  onOpenEmailMonitor?: () => void;
}

export const NoticesView: React.FC<NoticesViewProps> = ({
  defaulterNotices,
  requisitions,
  fieldUnits,
  desks,
  currentUser,
  submissions = [],
  onSendDefaulterNotice,
  onOpenEmailMonitor
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateNoticeOpen, setIsCreateNoticeOpen] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState(requisitions[0]?.id || '');
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [noticeSubject, setNoticeSubject] = useState('अति-महत्वपूर्ण अनुपालन नोटिस / Defaulter Warning Notice');
  const [noticeMessage, setNoticeMessage] = useState('संबंधित डेटा मांग हेतु आपकी संस्थान द्वारा निर्धारित समय-सीमा में विवरण प्रस्तुत नहीं किया गया है। कृपया 24 घंटे के भीतर अनिवार्य रूप से पोर्टल पर सबमिशन पूर्ण करें।');
  const [autoEmailStatus, setAutoEmailStatus] = useState<string | null>(null);
  const [isDispatchingAuto, setIsDispatchingAuto] = useState(false);

  const emailLogs = getStoredEmailLogs();

  const selectedNoticeReq = requisitions.find(r => r.id === selectedReqId);
  const defaulterUnits = selectedNoticeReq
    ? getNonSubmittedTargetUnits(selectedNoticeReq, submissions, fieldUnits)
    : [];

  // Requisitions often arrive asynchronously after first render, so the
  // initial useState default (requisitions[0]?.id) can end up empty —
  // backfill it once data is available.
  useEffect(() => {
    if (!selectedReqId && requisitions.length > 0) {
      setSelectedReqId(requisitions[0].id);
    }
  }, [requisitions, selectedReqId]);

  // Re-scope the selection to the newly-picked requisition's actual
  // non-submitters whenever the requisition changes (or the modal opens).
  useEffect(() => {
    if (isCreateNoticeOpen) {
      setSelectedUnits(defaulterUnits.map(u => u.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReqId, isCreateNoticeOpen]);

  const isField = currentUser.role === 'FIELD_JD' || currentUser.role === 'FIELD_ITI';
  const isJD = currentUser.role === 'FIELD_JD';
  const isITI = currentUser.role === 'FIELD_ITI';
  const isDirectorate = currentUser.role === 'DIRECTORATE_DESK' || currentUser.role === 'DIRECTORATE_ADMIN';

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  const userZone = getUserZone(currentUser, fieldUnits);

  // Scoped notices:
  // - Admin: all
  // - Desk: for this desk's requisitions
  // - JD: for JD office + ITIs in his mandal
  // - ITI: for this ITI only
  const relevantNotices = getScopedNotices(currentUser, defaulterNotices, requisitions, fieldUnits);

  const filteredNotices = relevantNotices.filter(n => {
    const unit = fieldUnits.find(u => u.id === n.fieldUnitId);
    const matchesSearch = 
      n.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (unit && unit.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleDispatchNotice = () => {
    if (selectedUnits.length === 0) {
      alert('कृपया कम से कम एक क्षेत्रीय इकाई का चयन करें।');
      return;
    }
    if (!noticeSubject.trim() || !noticeMessage.trim()) {
      alert('कृपया विषय एवं नोटिस का विवरण दर्ज करें।');
      return;
    }

    if (onSendDefaulterNotice) {
      onSendDefaulterNotice(selectedUnits, noticeSubject.trim(), noticeMessage.trim(), selectedReqId);
      setIsCreateNoticeOpen(false);
      setSelectedUnits([]);
    }
  };

  const handleSelectAllUnits = () => {
    if (selectedUnits.length === defaulterUnits.length) {
      setSelectedUnits([]);
    } else {
      setSelectedUnits(defaulterUnits.map(u => u.id));
    }
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
              <span className="font-bold">मंडलीय चेतावनी / डिफाल्टर नोटिस: </span>
              <span><strong>{userZone}</strong> — आपके कार्यालय अथवा आपके मंडल की आईटीआई इकाइयों को जारी किए गए नोटिस।</span>
            </div>
          </div>
          <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantNotices.length} नोटिस
          </span>
        </div>
      )}

      {isITI && userUnit && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-rose-200/70 text-rose-800 rounded-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">संस्थान डिफाल्टर नोटिस: </span>
              <span><strong>{userUnit.name} ({userUnit.district})</strong> को निदेशालय से प्राप्त अनुपालन नोटिस।</span>
            </div>
          </div>
          <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantNotices.length} नोटिस
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
              <span className="font-bold">प्रकोष्ठ चेतावनी नोटिस: </span>
              <span><strong>{currentUser.displayName}</strong> द्वारा डिफाल्टर इकाइयों को जारी किए गए नोटिस।</span>
            </div>
          </div>
          <span className="bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {relevantNotices.length} नोटिस
          </span>
        </div>
      )}

      {/* Automated Email Reminder Status Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 text-white shadow-md border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>स्वचालित ईमेल अनुस्मारक प्रणाली (Automated @vppup.in Reminders)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Active
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              समय-सीमा समाप्ति से 48 घंटे, 24 घंटे पूर्व एवं डिफ़ॉल्टर होने पर पोर्टल द्वारा स्वतः ईमेल प्रेषित किए जाते हैं।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {onOpenEmailMonitor && (
            <button
              onClick={onOpenEmailMonitor}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ईमेल डिस्पैच मॉनिटर देखें ({emailLogs.length})</span>
            </button>
          )}

          {isDirectorate && (
            <button
              onClick={() => {
                setIsDispatchingAuto(true);
                setAutoEmailStatus(null);
                setTimeout(() => {
                  const res = runAutomaticEmailReminderCycle(requisitions, fieldUnits, submissions, desks);
                  setIsDispatchingAuto(false);
                  if (res.newLogsCount > 0) {
                    setAutoEmailStatus(`सफलता! कुल ${res.newLogsCount} लंबित संस्थाओं को @vppup.in ईमेल अनुस्मारक तत्काल प्रेषित किए गए।`);
                  } else {
                    setAutoEmailStatus('सभी सक्रिय मांग पत्रों का समय-सीमा व ईमेल चक्र अद्यतन है।');
                  }
                }, 500);
              }}
              disabled={isDispatchingAuto}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDispatchingAuto ? 'animate-spin' : ''}`} />
              <span>{isDispatchingAuto ? 'जांच जारी...' : 'ऑटो-रिमाइंडर चक्र चलाएं'}</span>
            </button>
          )}
        </div>
      </div>

      {autoEmailStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{autoEmailStatus}</span>
          </div>
          <button 
            onClick={() => setAutoEmailStatus(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Action */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Subject, Field Unit या Message Content से Search करें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
          />
        </div>

        {/* Issue notice button for Directorate */}
        {isDirectorate && onSendDefaulterNotice && (
          <button
            onClick={() => setIsCreateNoticeOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>+ Issue Warning / Defaulter Notice</span>
          </button>
        )}
      </div>

      {/* Notices List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Official Defaulter & Reminder Notices ({filteredNotices.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Compliance & Overdue Monitoring
          </span>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">कोई सक्रिय चेतावनी नोटिस नहीं है (No Notices)</p>
            <p className="text-xs text-slate-400 mt-1">सभी Units समय पर अनुपालन कर रही हैं।</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotices.map((notice) => {
              const unit = fieldUnits.find(u => u.id === notice.fieldUnitId);
              const req = requisitions.find(r => r.id === notice.requisitionId);
              const desk = desks.find(d => d.id === notice.sentByDeskId);

              return (
                <div key={notice.id} className="p-5 hover:bg-rose-50/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Warning Notice</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {unit?.name || notice.fieldUnitId}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      Sent: {formatDateTime(notice.sentAt)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {notice.subject}
                  </h3>

                  <div className="mt-1 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                    {notice.message}
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Order: <strong className="text-slate-800">{req?.title || notice.requisitionId}</strong></span>
                    <span>•</span>
                    <span>Desk: <strong className="text-slate-800">{desk?.name || 'निदेशालय मुख्यालय'}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Notice Modal */}
      {isCreateNoticeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Issue Defaulter / Warning Notice</h3>
              </div>
              <button
                onClick={() => setIsCreateNoticeOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Select Requisition */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Data Demand Order (संबद्ध मांग आदेश):
                </label>
                <select
                  value={selectedReqId}
                  onChange={(e) => setSelectedReqId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500"
                >
                  {requisitions.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.requisitionNumber}] {r.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Target Units */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Select Defaulter Units ({selectedUnits.length} / {defaulterUnits.length} Selected):
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllUnits}
                    disabled={defaulterUnits.length === 0}
                    className="text-[11px] font-bold text-indigo-600 hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    {selectedUnits.length === defaulterUnits.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                {defaulterUnits.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs border border-slate-200 rounded-lg bg-slate-50">
                    इस मांग आदेश हेतु सभी लक्षित इकाइयों ने डेटा प्रस्तुत कर दिया है — कोई डिफॉल्टर नहीं है।
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5 bg-slate-50">
                    {defaulterUnits.map(unit => (
                      <label key={unit.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedUnits.includes(unit.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUnits([...selectedUnits, unit.id]);
                            } else {
                              setSelectedUnits(selectedUnits.filter(id => id !== unit.id));
                            }
                          }}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="font-semibold text-slate-800">{unit.name}</span>
                        <span className="text-[10px] text-slate-500">({unit.district})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notice Subject (विषय):
                </label>
                <input
                  type="text"
                  value={noticeSubject}
                  onChange={(e) => setNoticeSubject(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 font-semibold"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notice Message (विवरण):
                </label>
                <textarea
                  rows={4}
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 leading-relaxed"
                />
              </div>

              {/* Automatic Email Guarantee Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-emerald-900">स्वचालित ईमेल प्रेषण सक्षम:</span> पोर्टल नोटिस के साथ-साथ सभी <strong className="font-bold text-emerald-900">{selectedUnits.length}</strong> चयनित संस्थानों के आधिकारिक <strong>@vppup.in</strong> ईमेल पते पर भी नोटिस ईमेल के रूप में स्वतः प्रेषित किया जाएगा।
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateNoticeOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel (रद्द करें)
              </button>
              <button
                type="button"
                onClick={handleDispatchNotice}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Notice ({selectedUnits.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
