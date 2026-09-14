import React, { useState, useEffect } from 'react';
import { 
  getStoredEmailLogs, 
  getAutoEmailSettings, 
  saveAutoEmailSettings, 
  runAutomaticEmailReminderCycle,
  EmailDispatchLog,
  AutoEmailSettings
} from '../../lib/emailReminderEngine';
import { Requisition, FieldUnit, DirectorateDesk, SubmissionRecord } from '../../types/portal';
import { formatDateTime } from '../../utils/dateUtils';
import { 
  Mail, 
  BellRing, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  Send, 
  Sliders, 
  Sparkles, 
  Inbox,
  Filter,
  Search,
  Building2,
  GraduationCap
} from 'lucide-react';

interface AutoEmailMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisitions: Requisition[];
  fieldUnits: FieldUnit[];
  submissions: SubmissionRecord[];
  desks: DirectorateDesk[];
}

export const AutoEmailMonitorModal: React.FC<AutoEmailMonitorModalProps> = ({
  isOpen,
  onClose,
  requisitions,
  fieldUnits,
  submissions,
  desks
}) => {
  const [logs, setLogs] = useState<EmailDispatchLog[]>([]);
  const [settings, setSettings] = useState<AutoEmailSettings>(getAutoEmailSettings());
  const [activeTab, setActiveTab] = useState<'LOGS' | 'CONFIG'>('LOGS');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLogs(getStoredEmailLogs());
      setSettings(getAutoEmailSettings());
      setStatusNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunManualCycle = () => {
    setIsTriggering(true);
    setStatusNotice(null);
    setTimeout(() => {
      const res = runAutomaticEmailReminderCycle(requisitions, fieldUnits, submissions, desks);
      setLogs(getStoredEmailLogs());
      setIsTriggering(false);
      if (res.newLogsCount > 0) {
        setStatusNotice(`सफलता! कुल ${res.newLogsCount} लंबित आईटीआई/जेडी इकाइयों को @vppup.in ईमेल अनुस्मारक तत्काल प्रेषित किए गए।`);
      } else {
        setStatusNotice('सभी सक्रिय मांग पत्रों का समय-सीमा व ईमेल चक्र अद्यतन है। कोई नई लंबित इकाई शेष नहीं थी।');
      }
    }, 600);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveAutoEmailSettings(settings);
    setStatusNotice('स्वचालित ईमेल डिस्पैच सेटिंग्स सफलतापूर्वक सुरक्षित कर दी गईं!');
  };

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'ALL' && log.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.recipientName.toLowerCase().includes(q) ||
        log.recipientEmail.toLowerCase().includes(q) ||
        log.requisitionNumber.toLowerCase().includes(q) ||
        log.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30 text-amber-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  स्वचालित ईमेल अनुस्मारक मॉनिटर (Auto Email Reminders System)
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                  @vppup.in Gateway
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                समय-सीमा समाप्ति पूर्व स्वचालित 48h / 24h व डिफ़ॉल्टर नोटिस प्रेषण लॉग
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Top Controls & Navigation */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'LOGS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>प्रेषित ईमेल लॉग ({logs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('CONFIG')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CONFIG'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ऑटोमेशन सेटिंग्स</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunManualCycle}
              disabled={isTriggering}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
              <span>{isTriggering ? 'जांच हो रही है...' : 'समय-सीमा जांच चक्र चलाएं (Run Auto-Dispatch Now)'}</span>
            </button>
          </div>
        </div>

        {statusNotice && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{statusNotice}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          
          {/* TAB 1: LOGS */}
          {activeTab === 'LOGS' && (
            <div className="space-y-4">
              
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="संस्थान नाम, ईमेल, पत्र संख्या या विषय से खोजें..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 shrink-0">
                    <Filter className="w-3 h-3" /> फ़िल्टर:
                  </span>
                  {[
                    { id: 'ALL', label: 'सभी' },
                    { id: 'AUTO_REMINDER_48H', label: '48h रिमाइंडर' },
                    { id: 'AUTO_REMINDER_24H', label: '24h रिमाइंडर' },
                    { id: 'OVERDUE_ALERT', label: 'डिफ़ॉल्टर चेतावनी' },
                    { id: 'MANUAL_REMINDER', label: 'मैनुअल अनुस्मारक' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterType(f.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 cursor-pointer transition-all ${
                        filterType === f.id
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logs List */}
              {filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Inbox className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">कोई ईमेल लॉग दर्ज नहीं है</p>
                  <p className="text-xs text-slate-400 mt-1">ऊपर दिए गए "समय-सीमा जांच चक्र चलाएं" बटन से तत्काल रिमाइंडर ट्रिगर करें।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map(log => {
                    let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                    let typeLabel = 'ईमेल सूचना';
                    if (log.type === 'AUTO_REMINDER_48H') {
                      badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
                      typeLabel = '⏰ 48 घंटे पूर्व अनुस्मारक';
                    } else if (log.type === 'AUTO_REMINDER_24H') {
                      badgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
                      typeLabel = '🚨 24 घंटे पूर्व अति-आवश्यक';
                    } else if (log.type === 'OVERDUE_ALERT') {
                      badgeColor = 'bg-red-100 text-red-950 border-red-300';
                      typeLabel = '⚠️ डिफ़ॉल्टर नोटिस';
                    } else if (log.type === 'MANUAL_REMINDER') {
                      badgeColor = 'bg-purple-100 text-purple-900 border-purple-300';
                      typeLabel = '📢 मैनुअल रिमाइंडर';
                    }

                    return (
                      <div key={log.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                              {typeLabel}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {log.requisitionNumber}
                            </span>
                            <span className="font-semibold text-slate-700">
                              {log.recipientName} ({log.recipientDistrict})
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {formatDateTime(log.dispatchedAt)}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {log.subject}
                          </h4>
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                            {log.bodySnippet}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <span>प्रेषक: <strong>{log.senderDeskName}</strong></span>
                            <span>•</span>
                            <span>प्राप्तकर्ता ईमेल: <strong className="font-mono text-indigo-700">{log.recipientEmail}</strong></span>
                          </div>
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ईमेल डिलीवर (Delivered)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: CONFIGURATION */}
          {activeTab === 'CONFIG' && (
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl">
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs text-indigo-950 space-y-1">
                <div className="font-bold text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>स्वचालित समय-सीमा अनुस्मारक नियम (Automated Dispatch Rules)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  पोर्टल बिना किसी मानवीय हस्तक्षेप के अंतिम तिथि की गणना कर लंबित राजकीय आईटीआई व संयुक्त निदेशक कार्यालयों को उनके आधिकारिक <strong className="text-indigo-900">@vppup.in</strong> ईमेल पर नोटिस भेजता है।
                </p>
              </div>

              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                
                {/* 48h toggle */}
                <label className="flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.auto48HourEnabled}
                    onChange={(e) => setSettings({ ...settings, auto48HourEnabled: e.target.checked })}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-900">अंतिम तिथि से 48 घंटे पूर्व स्वचालित रिमाइंडर (48-Hour Reminder)</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">समय समाप्त होने से 2 दिन पहले लंबित संस्थाओं को सतर्कता ईमेल प्रेषित करता है।</div>
                  </div>
                </label>

                {/* 24h toggle */}
                <label className="flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.auto24HourEnabled}
                    onChange={(e) => setSettings({ ...settings, auto24HourEnabled: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-900">अंतिम तिथि से 24 घंटे पूर्व अति-महत्वपूर्ण चेतावनी (24-Hour Urgent Alert)</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">अंतिम 24 घंटों में उच्च-प्राथमिकता वाला चेतावनी संदेश भेजता है।</div>
                  </div>
                </label>

                {/* Overdue toggle */}
                <label className="flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoOverdueEnabled}
                    onChange={(e) => setSettings({ ...settings, autoOverdueEnabled: e.target.checked })}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-900">समय-सीमा समाप्त होने पर डिफ़ॉल्टर नोटिस (Overdue Defaulter Notice)</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">कट-ऑफ बीतने के पश्चात डिफ़ॉल्ट करने वाले प्रधानाचार्यों को कारण-बताओ/चेतावनी ईमेल भेजता है।</div>
                  </div>
                </label>

              </div>

              {/* Sender Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    आधिकारिक मेल डोमेन (Official Mail Domain)
                  </label>
                  <input
                    type="text"
                    value={settings.domainSuffix}
                    onChange={(e) => setSettings({ ...settings, domainSuffix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    प्रेषक ईमेल पता (System Sender Email)
                  </label>
                  <input
                    type="text"
                    value={settings.senderEmail}
                    onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>सेटिंग्स सहेजें (Save Automation Rules)</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>प्रशिक्षण निदेशालय, उ.प्र. • आधिकारिक ईमेल ऑटोमेशन गेटवे</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
          >
            बंद करें
          </button>
        </div>

      </div>
    </div>
  );
};
