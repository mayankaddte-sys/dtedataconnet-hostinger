import React from 'react';
import { EmailDispatchLog } from '../../lib/emailReminderEngine';
import { formatDateTime } from '../../utils/dateUtils';
import { 
  CheckCircle2, 
  Mail, 
  Send, 
  Building2, 
  FileText, 
  ExternalLink, 
  ShieldCheck,
  X
} from 'lucide-react';

interface ReminderDispatchSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatchedLogs: EmailDispatchLog[];
  subject: string;
  onOpenFullMonitor?: () => void;
}

export const ReminderDispatchSuccessModal: React.FC<ReminderDispatchSuccessModalProps> = ({
  isOpen,
  onClose,
  dispatchedLogs,
  subject,
  onOpenFullMonitor
}) => {
  if (!isOpen || dispatchedLogs.length === 0) return null;

  const firstLog = dispatchedLogs[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/30 rounded-xl border border-emerald-400/40 text-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  अनुस्मारक एवं ईमेल सफलतापूर्वक प्रेषित!
                </h3>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                  Portal + Email Delivered
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                पोर्टल इनबॉक्स के साथ-साथ सभी संबंधित @vppup.in ईमेल खातों पर भी अनुस्मारक भेजा गया
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Success Summary Stat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <div className="text-[11px] font-bold text-emerald-700">कुल प्राप्तकर्ता संस्थान</div>
              <div className="text-2xl font-black text-emerald-950 mt-0.5">{dispatchedLogs.length}</div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
              <div className="text-[11px] font-bold text-indigo-700">ईमेल डिलीवरी स्थिति</div>
              <div className="text-2xl font-black text-indigo-950 mt-0.5 flex items-center justify-center gap-1">
                <Mail className="w-5 h-5 text-indigo-600 inline" />
                <span>100% प्रेषित</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div className="text-[11px] font-bold text-slate-600">डिस्पैच समय</div>
              <div className="text-xs font-bold text-slate-800 mt-2 font-mono">
                {formatDateTime(firstLog.dispatchedAt)}
              </div>
            </div>
          </div>

          {/* Requisition & Subject Reference */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span>मांग पत्र सं: <strong className="text-slate-800 font-mono">{firstLog.requisitionNumber}</strong></span>
              <span>प्रेषक: <strong className="text-indigo-800">{firstLog.senderDeskName}</strong></span>
            </div>
            <div className="font-bold text-slate-900 flex items-center gap-1.5 pt-1 border-t border-slate-200">
              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>विषय: {subject || firstLog.subject}</span>
            </div>
          </div>

          {/* Recipients List with Email addresses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>ईमेल प्राप्तकर्ता संस्थानों की सूची ({dispatchedLogs.length}):</span>
              </h4>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> @vppup.in इनबॉक्स में डिलीवर
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {dispatchedLogs.map((log, idx) => (
                <div 
                  key={log.id || idx}
                  className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-2xs hover:border-emerald-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{log.recipientName}</div>
                      <div className="text-[10px] text-slate-500">{log.recipientDistrict} • {log.recipientType}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {log.recipientEmail}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sent
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 text-[11px]">
            प्रशिक्षण निदेशालय, उ.प्र. • आधिकारिक ईमेल सेवा
          </span>
          <div className="flex items-center gap-2">
            {onOpenFullMonitor && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullMonitor();
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ईमेल मॉनिटर खोलें</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              ठीक है (Done)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
