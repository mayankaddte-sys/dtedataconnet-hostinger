import React, { useState, useEffect } from 'react';
import { DirectorateDesk, FieldUnit, UserSession } from '../../types/portal';
import { 
  saveUserPassword, 
  verifyUserCredentials 
} from '../../lib/storage';
import {
  requestEmailPasswordReset,
  verifyResetOtp,
  completePasswordReset
} from '../../lib/emailPasswordReset';
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  RefreshCw,
  Building2,
  GraduationCap,
  Crown,
  Layers,
  Mail,
  Send,
  ArrowRight,
  ShieldAlert,
  Inbox,
  Clock,
  Sparkles
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserSession | null;
  desks?: DirectorateDesk[];
  fieldUnits?: FieldUnit[];
  onPasswordChanged?: (newPass: string) => void;
  initialTab?: 'EMAIL_RESET' | 'DIRECT_CHANGE';
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  desks = [],
  fieldUnits = [],
  onPasswordChanged,
  initialTab = 'EMAIL_RESET'
}) => {
  // Mode Tab: 'EMAIL_RESET' (via @vppup.in mail) or 'DIRECT_CHANGE' (via current password)
  const [activeMode, setActiveMode] = useState<'EMAIL_RESET' | 'DIRECT_CHANGE'>(initialTab);

  // --- 1. DIRECT PASSWORD CHANGE STATE ---
  const [selectedUserIdentifier, setSelectedUserIdentifier] = useState<string>('');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // --- 2. EMAIL RESET STATE (@vppup.in OTP flow) ---
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [emailStep, setEmailStep] = useState<'REQUEST' | 'VERIFY_OTP' | 'SET_NEW_PASSWORD'>('REQUEST');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpGeneratedInfo, setOtpGeneratedInfo] = useState<{
    otp: string;
    expiresMinutes: number;
    email: string;
    userCode: string;
    userName: string;
  } | null>(null);
  const [matchedAccount, setMatchedAccount] = useState<{
    displayName: string;
    code: string;
    email: string;
    role: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize selected identifier on open
  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setSelectedUserIdentifier(currentUser.code || currentUser.email || currentUser.id);
        setResetEmailInput(currentUser.email || '');
      } else {
        setSelectedUserIdentifier('');
        setResetEmailInput('');
      }
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setEnteredOtp('');
      setEmailStep('REQUEST');
      setOtpGeneratedInfo(null);
      setMatchedAccount(null);
      setErrorMessage(null);
      setSuccessMessage(null);
      setActiveMode(initialTab);
    }
  }, [isOpen, currentUser, initialTab]);

  if (!isOpen) return null;

  // Calculate password strength
  const getPasswordStrength = (pass: string): { label: string; color: string; score: number } => {
    if (!pass) return { label: 'अनुपस्थित', color: 'bg-slate-200', score: 0 };
    if (pass.length < 6) return { label: 'असुरक्षित (कम से कम 6 अक्षर)', color: 'bg-rose-500', score: 1 };
    
    let score = 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { label: 'मध्यम (Medium)', color: 'bg-amber-500', score: 2 };
    if (score === 3) return { label: 'उत्तम (Good)', color: 'bg-blue-500', score: 3 };
    return { label: 'मजबूत (Strong)', color: 'bg-emerald-500', score: 4 };
  };

  const strength = getPasswordStrength(newPasswordInput);

  // Helper to find an account by email, code, or ID
  const findAccountByQuery = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    // 1. Check Director
    if (q === 'info.dte@gmail.com' || q === 'director' || q === 'dte-director' || q === 'director.general@dte.gov.in' || q === 'director-master') {
      return {
        displayName: 'निदेशक, प्रशिक्षण (Director of Training)',
        code: 'DTE-DIRECTOR',
        email: 'info.dte@gmail.com',
        role: 'निदेशालय शीर्ष सचिवालय'
      };
    }

    // 2. Check Desks
    const desk = desks.find(d => 
      d.email.toLowerCase() === q || 
      d.code.toLowerCase() === q || 
      d.id.toLowerCase() === q ||
      d.name.toLowerCase().includes(q)
    );
    if (desk) {
      return {
        displayName: desk.name,
        code: desk.code,
        email: desk.email,
        role: 'मुख्यालय अनुभाग डेस्क'
      };
    }

    // 3. Check Field Units (ITI / JD)
    const unit = fieldUnits.find(u => 
      u.email.toLowerCase() === q || 
      u.code.toLowerCase() === q || 
      u.id.toLowerCase() === q ||
      (u.type === 'ITI' && (q.includes(u.code.toLowerCase()) || q === `iti.${u.code.toLowerCase()}@vppup.in`))
    );
    if (unit) {
      return {
        displayName: unit.name,
        code: unit.code,
        email: unit.email,
        role: unit.type === 'JD_OFFICE' ? 'संयुक्त निदेशक कार्यालय' : 'राजकीय आईटीआई'
      };
    }

    // 4. Default if looks like @vppup.in
    if (q.includes('@vppup.in') || q.includes('@dte-up.gov.in') || q.includes('@gov.in')) {
      return {
        displayName: `उपयोगकर्ता खाता (${q})`,
        code: q.split('@')[0].toUpperCase(),
        email: q,
        role: 'संस्थान / अनुभाग'
      };
    }

    return null;
  };

  // --- HANDLER: REQUEST EMAIL OTP (@vppup.in) ---
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailQuery = resetEmailInput.trim();
    if (!emailQuery) {
      setErrorMessage('कृपया अपना आधिकारिक @vppup.in ईमेल अथवा संस्थान कोड दर्ज करें।');
      return;
    }

    const matched = findAccountByQuery(emailQuery);
    if (!matched) {
      setErrorMessage('यह ईमेल या कोड पोर्टल रिकॉर्ड में नहीं मिला। कृपया सही @vppup.in पता अथवा कोड दर्ज करें।');
      return;
    }

    setMatchedAccount(matched);
    setIsSubmitting(true);

    try {
      const res = await requestEmailPasswordReset(matched.email, matched.code, matched.displayName);
      if (res.success) {
        setOtpGeneratedInfo({
          otp: res.otp,
          expiresMinutes: res.expiresMinutes,
          email: matched.email,
          userCode: matched.code,
          userName: matched.displayName
        });
        setEmailStep('VERIFY_OTP');
        setSuccessMessage(res.message || `आधिकारिक पासवर्ड रीसेट सुरक्षा OTP सफलतापूर्वक ${matched.email} पर प्रेषित कर दिया गया है।`);
      } else {
        setErrorMessage(res.message || 'ईमेल प्रेषण में त्रुटि हुई।');
      }
    } catch (err) {
      console.error('OTP request failed', err);
      setErrorMessage('ईमेल प्रेषण में त्रुटि हुई।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLER: VERIFY EMAIL OTP ---
  const handleVerifyEmailOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!enteredOtp || enteredOtp.length < 6) {
      setErrorMessage('कृपया 6-अंकीय OTP सुरक्षा कोड दर्ज करें।');
      return;
    }

    const email = matchedAccount?.email || resetEmailInput;
    const verification = verifyResetOtp(email, enteredOtp);

    if (verification.valid) {
      setSuccessMessage('सुरक्षा OTP सफलतापूर्वक सत्यापित हो गया! अब आप नया पासवर्ड निर्धारित कर सकते हैं।');
      setEmailStep('SET_NEW_PASSWORD');
    } else {
      setErrorMessage(verification.error || 'अमान्य OTP कोड।');
    }
  };

  // --- HANDLER: SAVE NEW PASSWORD AFTER EMAIL OTP ---
  const handleCompleteEmailPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setErrorMessage('नया पासवर्ड कम से कम 6 अक्षरों का होना अनिवार्य है।');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setErrorMessage('नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते हैं।');
      return;
    }

    const email = matchedAccount?.email || resetEmailInput;
    const code = matchedAccount?.code || '';
    const aliases = [email, code].filter(Boolean);

    setIsSubmitting(true);
    try {
      const saved = await saveUserPassword(email, newPasswordInput, aliases);
      if (saved) {
        completePasswordReset(email, enteredOtp);
        setSuccessMessage('पासवर्ड सफलतापूर्वक बदल दिया गया है! आगामी लॉगिन हेतु अब आपका यह नया पासवर्ड मान्य होगा।');
        if (onPasswordChanged) {
          onPasswordChanged(newPasswordInput);
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage('पासवर्ड सहेजने में तकनीकी समस्या हुई।');
      }
    } catch (err) {
      console.error('Password reset failed', err);
      setErrorMessage('पासवर्ड सहेजने में तकनीकी समस्या हुई।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLER: DIRECT FORM SUBMIT (with current password) ---
  const handleDirectFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const identifier = (selectedUserIdentifier || currentUser?.id || '').trim();

    if (!identifier) {
      setErrorMessage('कृपया यूज़र आईडी, ईमेल या संस्थान कोड दर्ज करें।');
      return;
    }

    if (!currentPasswordInput) {
      setErrorMessage('कृपया वर्तमान पासवर्ड दर्ज करें।');
      return;
    }

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setErrorMessage('नया पासवर्ड कम से कम 6 अक्षरों का होना अनिवार्य है।');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setErrorMessage('नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते हैं।');
      return;
    }

    if (newPasswordInput === currentPasswordInput) {
      setErrorMessage('नया पासवर्ड वर्तमान पासवर्ड से भिन्न होना चाहिए।');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify current password
      let isCurrentValid = await verifyUserCredentials(identifier, currentPasswordInput);

      if (!isCurrentValid && currentUser) {
        const checks = await Promise.all([
          verifyUserCredentials(currentUser.id, currentPasswordInput),
          verifyUserCredentials(currentUser.email, currentPasswordInput),
          verifyUserCredentials(currentUser.code, currentPasswordInput)
        ]);
        isCurrentValid = checks.some(Boolean);
      }

      if (!isCurrentValid) {
        setErrorMessage('वर्तमान पासवर्ड गलत है। यदि पासवर्ड याद नहीं है तो ऊपर दिए गए "ईमेल (@vppup.in) द्वारा रीसेट करें" विकल्प का उपयोग करें।');
        return;
      }

      const aliases: string[] = [identifier];
      if (currentUser) {
        if (currentUser.email) aliases.push(currentUser.email);
        if (currentUser.code) aliases.push(currentUser.code);
        if (currentUser.id) aliases.push(currentUser.id);
      }

      const desk = desks.find(d => d.id === identifier || d.code === identifier || d.email === identifier);
      if (desk) {
        aliases.push(desk.id, desk.code, desk.email);
      }
      const unit = fieldUnits.find(u => u.id === identifier || u.code === identifier || u.email === identifier);
      if (unit) {
        aliases.push(unit.id, unit.code, unit.email);
      }

      const saved = await saveUserPassword(identifier, newPasswordInput, aliases);
      if (saved) {
        setSuccessMessage('पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है! आगामी लॉगिन हेतु अब यह नया पासवर्ड मान्य होगा।');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        if (onPasswordChanged) {
          onPasswordChanged(newPasswordInput);
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage('पासवर्ड सहेजने में तकनीकी समस्या हुई।');
      }
    } catch (err) {
      console.error('Password change failed', err);
      setErrorMessage('त्रुटि हुई।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = async () => {
    const identifier = (selectedUserIdentifier || currentUser?.id || resetEmailInput || '').trim();
    if (!identifier) {
      setErrorMessage('कृपया यूज़र आईडी, ईमेल या कोड निर्दिष्ट करें।');
      return;
    }

    if (window.confirm(`क्या आप खाता "${identifier}" के पासवर्ड को फ़ैक्टरी डिफ़ॉल्ट (admin123) पर रीसेट करना चाहते हैं?`)) {
      const aliases: string[] = [identifier];
      if (currentUser) {
        if (currentUser.email) aliases.push(currentUser.email);
        if (currentUser.code) aliases.push(currentUser.code);
        if (currentUser.id) aliases.push(currentUser.id);
      }
      setIsSubmitting(true);
      try {
        const saved = await saveUserPassword(identifier, 'admin123', aliases);
        if (saved) {
          setSuccessMessage('पासवर्ड को फ़ैक्टरी डिफ़ॉल्ट "admin123" पर सफलतापूर्वक रीसेट कर दिया गया है।');
          setCurrentPasswordInput('');
          setNewPasswordInput('');
          setConfirmPasswordInput('');
          setErrorMessage(null);
        } else {
          setErrorMessage('रीसेट करने में तकनीकी समस्या हुई।');
        }
      } catch (err) {
        console.error('Reset to default failed', err);
        setErrorMessage('रीसेट करने में तकनीकी समस्या हुई।');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30 text-amber-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  पासवर्ड सुरक्षा एवं रीसेट (Password Reset)
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                  @vppup.in
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                आधिकारिक ईमेल सत्यापन एवं सुरक्षित क्रेडेंशियल प्रबंधन
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveMode('EMAIL_RESET');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'EMAIL_RESET'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-700'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Mail className="w-4 h-4 text-amber-300" />
            <span>ईमेल (@vppup.in OTP रीसेट)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('DIRECT_CHANGE');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'DIRECT_CHANGE'
                ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>वर्तमान पासवर्ड से बदलें</span>
          </button>
        </div>

        {/* Active Logged In User Pill Banner */}
        {currentUser && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-800 truncate">सक्रिय सत्र: {currentUser.displayName}</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              {currentUser.email || currentUser.code}
            </span>
          </div>
        )}

        <div className="p-6">
          
          {/* Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-bold">{successMessage}</div>
            </div>
          )}

          {/* =======================================================
              MODE 1: EMAIL OTP PASSWORD RESET VIA @vppup.in DOMAIN
              ======================================================= */}
          {activeMode === 'EMAIL_RESET' && (
            <div className="space-y-4">
              
              {/* STEP 1: REQUEST OTP */}
              {emailStep === 'REQUEST' && (
                <form onSubmit={handleSendEmailOtp} className="space-y-4">
                  <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80 text-xs text-indigo-950 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-indigo-900">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>आधिकारिक डोमेन आधारित पासवर्ड रीसेट प्रणाली</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      पासवर्ड भूल जाने की स्थिति में अपने संस्थान/अनुभाग का आधिकारिक <strong className="text-indigo-900">@vppup.in</strong> ईमेल अथवा कोड दर्ज करें। सिस्टम पंजीकृत ईमेल पर 6-अंकीय सुरक्षित OTP भेजेगा।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      आधिकारिक ईमेल अथवा संस्थान कोड (Official Email / Code) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        autoFocus
                        value={resetEmailInput}
                        onChange={(e) => setResetEmailInput(e.target.value)}
                        placeholder="उदा. giti001@vppup.in / iti.083@vppup.in / JD-UP-LKO / training.dte-up@gov.in"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 focus:outline-hidden font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      समस्त 300+ राजकीय आईटीआई के लिए अधिकृत <span className="font-mono font-bold text-slate-700">@vppup.in</span> मान्य है।
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'ईमेल प्रेषित हो रहा है...' : 'सुरक्षा OTP ईमेल पर भेजें'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: VERIFY 6-DIGIT OTP */}
              {emailStep === 'VERIFY_OTP' && (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                  
                  {/* Simulated Mail Delivery Notification Banner */}
                  {otpGeneratedInfo && (
                    <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-300 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <Inbox className="w-4 h-4 text-amber-700" />
                          <span>ईमेल इनबॉक्स सिम्युलेशन (@vppup.in Gateway)</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                          वैधता: 15 मिनट
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs space-y-1">
                        <div className="text-[11px] text-slate-500">
                          <strong>प्राप्तकर्ता:</strong> {otpGeneratedInfo.email} ({otpGeneratedInfo.userName})
                        </div>
                        <div className="text-slate-800 font-medium">
                          विषय: <strong>प्रशिक्षण निदेशालय पासवर्ड रीसेट सत्यापन OTP कोड</strong>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-600">आपका 6-अंकीय पासवर्ड रीसेट सुरक्षा OTP:</span>
                          <span className="text-base font-mono font-black text-indigo-700 tracking-widest bg-indigo-50 px-3 py-1 rounded border border-indigo-200">
                            {otpGeneratedInfo.otp}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ईमेल पर प्राप्त 6-अंकीय सुरक्षा OTP दर्ज करें <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="उदा. 482910"
                      className="w-full text-center text-xl tracking-[0.4em] py-3 bg-slate-50 border-2 border-indigo-300 rounded-xl text-indigo-900 font-mono font-black focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                      <span>OTP कोड केवल 15 मिनट के लिए वैध है।</span>
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        className="text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        OTP पुनः भेजें
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setEmailStep('REQUEST')}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                    >
                      ← ईमेल बदलें
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>OTP सत्यापित करें एवं आगे बढ़ें</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: SET NEW PASSWORD */}
              {emailStep === 'SET_NEW_PASSWORD' && (
                <form onSubmit={handleCompleteEmailPasswordReset} className="space-y-4">
                  
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>ईमेल <strong>{matchedAccount?.email}</strong> सफलतापूर्वक सत्यापित। नया पासवर्ड दर्ज करें:</span>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      नया पासवर्ड (New Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        autoFocus
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="नया पासवर्ड दर्ज करें (न्यूनतम 6 अक्षर)"
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pr-10 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength */}
                    {newPasswordInput && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">पासवर्ड मजबूती:</span>
                          <span className="font-bold text-slate-700">{strength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                          <div className={`h-full rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-slate-200'} w-1/4`} />
                          <div className={`h-full rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-slate-200'} w-1/4`} />
                          <div className={`h-full rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-slate-200'} w-1/4`} />
                          <div className={`h-full rounded-full transition-all ${strength.score >= 4 ? strength.color : 'bg-slate-200'} w-1/4`} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      नये पासवर्ड की पुष्टि करें (Confirm New Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="नया पासवर्ड दोबारा दर्ज करें"
                        className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl text-slate-800 focus:ring-2 focus:outline-hidden pr-10 font-mono ${
                          confirmPasswordInput && confirmPasswordInput !== newPasswordInput
                            ? 'border-rose-300 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-indigo-500'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'सहेजा जा रहा है...' : 'नया पासवर्ड सुरक्षित करें'}</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* =======================================================
              MODE 2: DIRECT PASSWORD CHANGE (VIA CURRENT PASSWORD)
              ======================================================= */}
          {activeMode === 'DIRECT_CHANGE' && (
            <form onSubmit={handleDirectFormSubmit} className="space-y-4">
              
              {/* User Identifier Field (if not logged in) */}
              {!currentUser && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    यूज़र आईडी / ईमेल / संस्थान कोड (User ID / Email / Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedUserIdentifier}
                    onChange={(e) => setSelectedUserIdentifier(e.target.value)}
                    placeholder="उदा. giti001@vppup.in / DTE-UP-TRAIN / iti-lucknow / info.dte@gmail.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  />
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  वर्तमान पासवर्ड (Current Password) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="वर्तमान पासवर्ड दर्ज करें (उदा. admin123)"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>डिफ़ॉल्ट: <strong className="font-mono text-slate-700">admin123</strong></span>
                  <button
                    type="button"
                    onClick={() => setActiveMode('EMAIL_RESET')}
                    className="text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    पासवर्ड भूल गए? (@vppup.in ईमेल से रीसेट करें)
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  नया पासवर्ड (New Password) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="नया मजबूत पासवर्ड दर्ज करें (न्यूनतम 6 अक्षर)"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPasswordInput && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">पासवर्ड मजबूती:</span>
                      <span className="font-bold text-slate-700">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-slate-200'} w-1/4`} />
                      <div className={`h-full rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-slate-200'} w-1/4`} />
                      <div className={`h-full rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-slate-200'} w-1/4`} />
                      <div className={`h-full rounded-full transition-all ${strength.score >= 4 ? strength.color : 'bg-slate-200'} w-1/4`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  नये पासवर्ड की पुष्टि करें (Confirm New Password) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="नया पासवर्ड दोबारा दर्ज करें"
                    className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl text-slate-800 focus:ring-2 focus:outline-hidden pr-10 font-mono ${
                      confirmPasswordInput && confirmPasswordInput !== newPasswordInput
                        ? 'border-rose-300 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-indigo-500'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={isSubmitting}
                  className="text-xs text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1 order-2 sm:order-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  डिफ़ॉल्ट (admin123) पर रीसेट करें
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    बंद करें
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {isSubmitting ? 'सहेजा जा रहा है...' : 'पासवर्ड अपडेट करें'}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
