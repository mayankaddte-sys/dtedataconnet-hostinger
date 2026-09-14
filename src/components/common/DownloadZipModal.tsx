import React, { useState } from 'react';
import { 
  Download, 
  FolderArchive, 
  CheckCircle2, 
  Terminal, 
  Github, 
  Cloud, 
  X, 
  Copy, 
  Check, 
  FileCode, 
  Server,
  ExternalLink
} from 'lucide-react';

interface DownloadZipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadZipModal: React.FC<DownloadZipModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    const link = document.createElement('a');
    link.href = '/dte-portal-source-code.zip';
    link.download = 'dte-portal-source-code.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloading(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                संपूर्ण प्रोजेक्ट सोर्स कोड ZIP डाउनलोड
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  Full Source Package
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                1-क्लिक में सम्पूर्ण React + TypeScript + Tailwind कोडबेस अपने कंप्यूटर पर डाउनलोड करें
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Direct Download Card */}
          <div className="bg-gradient-to-br from-indigo-50 via-white to-amber-50/40 border border-indigo-100 rounded-xl p-5 text-center">
            <div className="inline-flex p-3 bg-indigo-600 text-white rounded-2xl shadow-md mb-3">
              <Download className="w-6 h-6 animate-bounce" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              dte-portal-source-code.zip
            </h4>
            <p className="text-xs text-slate-600 mb-4 max-w-md mx-auto">
              इस ZIP फ़ाइल में सभी कॉम्पोनेन्ट्स, टाइप्स, डेटा, कॉन्फ़िग फाइल्स एवं स्टाइल्स शामिल हैं।
            </p>
            
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'डाउनलोड हो रहा है...' : 'अभी ZIP फ़ाइल डाउनलोड करें (Download Now)'}</span>
            </button>
          </div>

          {/* Setup Instructions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-600" />
              डाउनलोड के बाद अपने सिस्टम पर चलाने के चरण (Local Setup):
            </h4>
            
            <div className="space-y-2">
              <div className="bg-slate-950 text-slate-100 rounded-xl p-3 text-xs font-mono flex items-center justify-between border border-slate-800">
                <div>
                  <span className="text-slate-500 select-none mr-2">1. अनज़िप और निर्भरताएं इंस्टॉल करें:</span>
                  <div className="text-emerald-400 font-bold mt-1">npm install</div>
                </div>
                <button 
                  onClick={() => copyToClipboard('npm install', 1)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  title="Copy"
                >
                  {copiedIndex === 1 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-3 text-xs font-mono flex items-center justify-between border border-slate-800">
                <div>
                  <span className="text-slate-500 select-none mr-2">2. लोकल डेवलपमेंट सर्वर चलाएं:</span>
                  <div className="text-emerald-400 font-bold mt-1">npm run dev</div>
                </div>
                <button 
                  onClick={() => copyToClipboard('npm run dev', 2)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  title="Copy"
                >
                  {copiedIndex === 2 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-950 text-slate-100 rounded-xl p-3 text-xs font-mono flex items-center justify-between border border-slate-800">
                <div>
                  <span className="text-slate-500 select-none mr-2">3. प्रोडक्शन बिल्ड बनाएं (GitHub Pages/सर्वर हेतु):</span>
                  <div className="text-emerald-400 font-bold mt-1">npm run build</div>
                </div>
                <button 
                  onClick={() => copyToClipboard('npm run build', 3)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  title="Copy"
                >
                  {copiedIndex === 3 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* GitHub Upload Quick Tip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 flex items-start gap-3">
            <Github className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900">GitHub पर अपलोड करने के लिए:</span>
              <p className="text-slate-600 mt-0.5">
                डाउनलोड किए गए फ़ोल्डर को अनज़िप करें और GitHub.com पर नई रिपॉजिटरी बनाकर <span className="font-semibold text-indigo-700">"Upload files"</span> विकल्प से सभी फाइल्स ड्रैग-एंड-ड्रॉप कर दें।
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>सुरक्षित एवं स्वचालित रूप से संकलित आर्काइव</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            बंद करें (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
