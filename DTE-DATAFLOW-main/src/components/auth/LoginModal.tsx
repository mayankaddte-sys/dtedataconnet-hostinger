import React, { useState, useEffect } from 'react';
import { DirectorateDesk, FieldUnit, UserSession } from '../../types/portal';
import { 
  Building2, 
  Layers, 
  GraduationCap, 
  KeyRound, 
  ArrowRight, 
  X, 
  Lock, 
  Mail, 
  ShieldCheck, 
  Crown, 
  MapPin, 
  Check, 
  Search, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  LogIn, 
  ShieldAlert 
} from 'lucide-react';
import { verifyUserCredentials } from '../../lib/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  desks: DirectorateDesk[];
  fieldUnits: FieldUnit[];
  currentUser: UserSession | null;
  onSelectUser: (user: UserSession) => void;
  preSelectedTarget?: {
    type: 'DIRECTOR' | 'DESK' | 'JD' | 'ITI';
    data?: DirectorateDesk | FieldUnit;
  } | null;
  onOpenChangePassword?: () => void;
}

// Small helper: return true as soon as any one of the given identifiers
// verifies against the entered password. Runs checks in parallel.
async function verifyAny(identifiers: string[], password: string): Promise<boolean> {
  const results = await Promise.all(
    identifiers.filter(Boolean).map((id) => verifyUserCredentials(id, password))
  );
  return results.some(Boolean);
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  desks,
  fieldUnits,
  currentUser,
  onSelectUser,
  preSelectedTarget,
  onOpenChangePassword
}) => {
  const [activeTab, setActiveTab] = useState<'DIRECTOR' | 'SECTIONS' | 'JD_UNITS' | 'ITIS' | 'CREDENTIALS'>('CREDENTIALS');
  const [filterZone, setFilterZone] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Focused Account Password Challenge State
  const [challengeTarget, setChallengeTarget] = useState<{
    session: UserSession;
    title: string;
    subtitle: string;
    category: string;
    icon: React.ReactNode;
    email: string;
    code: string;
  } | null>(null);

  const [challengePassword, setChallengePassword] = useState<string>('');
  const [showChallengePassword, setShowChallengePassword] = useState<boolean>(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeSuccess, setChallengeSuccess] = useState<string | null>(null);
  const [isVerifyingChallenge, setIsVerifyingChallenge] = useState<boolean>(false);

  // General Credentials Form state
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isVerifyingLogin, setIsVerifyingLogin] = useState<boolean>(false);

  // Initialize with preSelectedTarget if passed
  useEffect(() => {
    if (isOpen && preSelectedTarget) {
      if (preSelectedTarget.type === 'DIRECTOR') {
        initiateDirectorChallenge();
      } else if (preSelectedTarget.type === 'DESK' && preSelectedTarget.data) {
        initiateDeskChallenge(preSelectedTarget.data as DirectorateDesk);
      } else if ((preSelectedTarget.type === 'JD' || preSelectedTarget.type === 'ITI') && preSelectedTarget.data) {
        initiateFieldUnitChallenge(preSelectedTarget.data as FieldUnit);
      }
    } else if (isOpen && !challengeTarget) {
      // Default to general credentials if opened without preselection
      setActiveTab('CREDENTIALS');
    }
  }, [isOpen, preSelectedTarget]);

  if (!isOpen) return null;

  const jdOffices = fieldUnits.filter(u => u.type === 'JD_OFFICE');
  const itiUnits = fieldUnits.filter(u => u.type === 'ITI');
  const zones = Array.from(new Set(fieldUnits.map(u => u.zone)));

  // Initiate Challenge Functions
  const initiateDirectorChallenge = () => {
    const session: UserSession = {
      id: 'director-master',
      role: 'DIRECTORATE_ADMIN',
      displayName: 'निदेशक, प्रशिक्षण एवं सेवायोजन (Director of Training)',
      code: 'DTE-DIRECTOR',
      email: 'info.dte@gmail.com',
      department: 'राज्य निदेशालय शीर्ष सचिवालय'
    };
    setChallengeTarget({
      session,
      title: 'निदेशक, प्रशिक्षण एवं सेवायोजन (Director of Training)',
      subtitle: 'राज्य निदेशालय शीर्ष सचिवालय (Apex Executive Access)',
      category: 'शीर्ष प्रशासनिक लॉगिन',
      icon: <Crown className="w-6 h-6 text-amber-400" />,
      email: 'info.dte@gmail.com',
      code: 'DTE-DIRECTOR'
    });
    setChallengePassword('');
    setChallengeError(null);
    setChallengeSuccess(null);
  };

  const initiateDeskChallenge = (desk: DirectorateDesk) => {
    const session: UserSession = {
      id: desk.id,
      role: 'DIRECTORATE_DESK',
      deskId: desk.id,
      displayName: desk.name,
      code: desk.code,
      email: desk.email,
      department: 'प्रशिक्षण निदेशालय मुख्यालय'
    };
    setChallengeTarget({
      session,
      title: desk.name,
      subtitle: `प्रभारी: ${desk.designation} (${desk.officerInCharge || 'मुख्यालय'})`,
      category: 'मुख्यालय प्रशासनिक अनुभाग',
      icon: <Building2 className="w-6 h-6 text-indigo-400" />,
      email: desk.email,
      code: desk.code
    });
    setChallengePassword('');
    setChallengeError(null);
    setChallengeSuccess(null);
  };

  const initiateFieldUnitChallenge = (unit: FieldUnit) => {
    const session: UserSession = {
      id: unit.id,
      role: unit.type === 'JD_OFFICE' ? 'FIELD_JD' : 'FIELD_ITI',
      fieldUnitId: unit.id,
      displayName: unit.name,
      code: unit.code,
      email: unit.email,
      department: unit.type === 'JD_OFFICE' 
        ? 'संयुक्त निदेशक क्षेत्रीय कार्यालय (JD Office)' 
        : 'राजकीय औद्योगिक प्रशिक्षण संस्थान (ITI)'
    };
    setChallengeTarget({
      session,
      title: unit.name,
      subtitle: `${unit.district} • ${unit.zone} (${unit.designation})`,
      category: unit.type === 'JD_OFFICE' ? 'संयुक्त निदेशक मण्डल कार्यालय' : 'राजकीय आईटीआई संस्थान',
      icon: unit.type === 'JD_OFFICE' ? <Layers className="w-6 h-6 text-purple-400" /> : <GraduationCap className="w-6 h-6 text-emerald-400" />,
      email: unit.email,
      code: unit.code
    });
    setChallengePassword('');
    setChallengeError(null);
    setChallengeSuccess(null);
  };

  // Submit Challenge Password
  const handleVerifyChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeTarget) return;

    setChallengeError(null);
    setChallengeSuccess(null);

    const enteredPass = challengePassword.trim();
    if (!enteredPass) {
      setChallengeError('कृपया इस खाते का पासवर्ड दर्ज करें।');
      return;
    }

    setIsVerifyingChallenge(true);
    const targetSession = challengeTarget.session;
    let isValid = false;
    try {
      isValid = await verifyAny(
        [targetSession.id, targetSession.code, targetSession.email],
        enteredPass
      );
    } catch (err) {
      console.error('Credential verification failed', err);
    }
    setIsVerifyingChallenge(false);

    if (isValid) {
      setChallengeSuccess('प्रमाणीकरण सफल! सुरक्षित सत्र प्रारंभ किया जा रहा है...');
      setTimeout(() => {
        onSelectUser(targetSession);
        setChallengeTarget(null);
        onClose();
      }, 500);
    } else {
      setChallengeError('अमान्य पासवर्ड! इस खाते में प्रवेश हेतु सही पासवर्ड दर्ज करें। (डिफ़ॉल्ट: admin123)');
    }
  };

  // General Credentials Form Handler
  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const identifier = loginIdentifier.trim().toLowerCase();
    const enteredPass = loginPassword.trim();

    if (!identifier) {
      setAuthError('कृपया यूज़र आईडी, ईमेल या संस्थान कोड दर्ज करें।');
      return;
    }
    if (!enteredPass) {
      setAuthError('कृपया पासवर्ड दर्ज करें।');
      return;
    }

    setIsVerifyingLogin(true);
    try {
      // 1. Check if Director
      if (
        identifier === 'director-master' ||
        identifier === 'info.dte@gmail.com' ||
        identifier === 'director.general@dte.gov.in' ||
        identifier === 'dte-director' ||
        identifier === 'director'
      ) {
        const ok = await verifyAny(
          ['director-master', 'info.dte@gmail.com', 'director.general@dte.gov.in', 'DTE-DIRECTOR'],
          enteredPass
        );
        if (ok) {
          setAuthSuccess('प्रमाणीकरण सफल! निदेशक सत्र प्रारंभ हो रहा है...');
          setTimeout(() => {
            onSelectUser({
              id: 'director-master',
              role: 'DIRECTORATE_ADMIN',
              displayName: 'निदेशक, प्रशिक्षण एवं सेवायोजन (Director of Training)',
              code: 'DTE-DIRECTOR',
              email: 'info.dte@gmail.com',
              department: 'राज्य निदेशालय शीर्ष सचिवालय'
            });
            onClose();
          }, 500);
        } else {
          setAuthError('निदेशक लॉगिन हेतु पासवर्ड अमान्य है।');
        }
        return;
      }

      // 2. Check if Desk Section
      const matchedDesk = desks.find(
        d =>
          d.id.toLowerCase() === identifier ||
          d.code.toLowerCase() === identifier ||
          d.email.toLowerCase() === identifier ||
          d.name.toLowerCase().includes(identifier)
      );

      if (matchedDesk) {
        const ok = await verifyAny([matchedDesk.id, matchedDesk.email, matchedDesk.code], enteredPass);
        if (ok) {
          setAuthSuccess(`प्रमाणीकरण सफल! ${matchedDesk.name} सत्र प्रारंभ हो रहा है...`);
          setTimeout(() => {
            onSelectUser({
              id: matchedDesk.id,
              role: 'DIRECTORATE_DESK',
              deskId: matchedDesk.id,
              displayName: matchedDesk.name,
              code: matchedDesk.code,
              email: matchedDesk.email,
              department: 'प्रशिक्षण निदेशालय मुख्यालय'
            });
            onClose();
          }, 500);
        } else {
          setAuthError('दर्ज किया गया पासवर्ड अमान्य है। (डिफ़ॉल्ट: admin123)');
        }
        return;
      }

      // 3. Check if Field Unit (ITI or JD Office)
      const matchedUnit = fieldUnits.find(
        u =>
          u.id.toLowerCase() === identifier ||
          u.code.toLowerCase() === identifier ||
          u.email.toLowerCase() === identifier ||
          u.email.toLowerCase() === `giti${identifier}@vppup.in` ||
          u.code.toLowerCase() === `iti-${identifier}` ||
          u.code.toLowerCase() === `giti-${identifier}`
      );

      if (matchedUnit) {
        const ok = await verifyAny([matchedUnit.id, matchedUnit.email, matchedUnit.code], enteredPass);
        if (ok) {
          setAuthSuccess(`प्रमाणीकरण सफल! ${matchedUnit.name} सत्र प्रारंभ हो रहा है...`);
          setTimeout(() => {
            onSelectUser({
              id: matchedUnit.id,
              role: unitTypeToRole(matchedUnit.type),
              fieldUnitId: matchedUnit.id,
              displayName: matchedUnit.name,
              code: matchedUnit.code,
              email: matchedUnit.email,
              department: matchedUnit.type === 'JD_OFFICE' 
                ? 'संयुक्त निदेशक क्षेत्रीय कार्यालय (JD Office)' 
                : 'राजकीय औद्योगिक प्रशिक्षण संस्थान (ITI)'
            });
            onClose();
          }, 500);
        } else {
          setAuthError('दर्ज किया गया पासवर्ड अमान्य है। (डिफ़ॉल्ट: admin123)');
        }
        return;
      }

      setAuthError('कोई उपयोगकर्ता, अनुभाग अथवा आईटीआई संस्थान नहीं मिला। कृपया कोड, ईमेल या अनुभाग नाम सही दर्ज करें।');
    } catch (err) {
      console.error('Login verification failed', err);
      setAuthError('सत्यापन के दौरान त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsVerifyingLogin(false);
    }
  };

  const unitTypeToRole = (type: 'JD_OFFICE' | 'ITI') => {
    return type === 'JD_OFFICE' ? 'FIELD_JD' : 'FIELD_ITI';
  };

  const filteredDesks = desks.filter(d => {
    return d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
           d.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
           d.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredJDOffices = jdOffices.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.zone.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = filterZone === 'ALL' || u.zone === filterZone;
    return matchesSearch && matchesZone;
  });

  const filteredITIs = itiUnits.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = filterZone === 'ALL' || u.zone === filterZone;
    return matchesSearch && matchesZone;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">सुरक्षित पोर्टल लॉगिन एवं प्रमाणीकरण</h2>
                <span className="text-[10px] bg-red-950/80 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-800/80">
                  पासवर्ड संरक्षित (Protected)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                प्रत्येक खाते (निदेशक, अनुभाग, JD कार्यालय, ITI) में प्रवेश हेतु पासवर्ड अनिवार्य है।
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

        {/* Current Active User Banner */}
        {currentUser ? (
          <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">वर्तमान सक्रिय सत्र:</span>
              <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-300 shadow-xs">
                {currentUser.displayName}
              </span>
              <span className="text-indigo-700 font-mono font-bold">({currentUser.code})</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <span className="text-[11px] font-mono text-slate-600 font-normal">
                {currentUser.email}
              </span>
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                प्रमाणित
              </span>
            </div>
          </div>
        ) : (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-900 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>कृपया पोर्टल में कार्य करने हेतु अपने अधिकृत खाते से लॉगिन करें।</span>
          </div>
        )}

        {/* POP-UP CHALLENGE PROMPT FOR SPECIFIC ACCOUNT */}
        {challengeTarget ? (
          <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl border-2 border-slate-300 shadow-xl p-6 relative animate-in fade-in zoom-in-95">
              
              <button
                type="button"
                onClick={() => setChallengeTarget(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xs font-bold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> वापस सूची
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-slate-900 rounded-xl shadow-md">
                  {challengeTarget.icon}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {challengeTarget.category}
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-tight mt-1">
                    {challengeTarget.title}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    कोड: {challengeTarget.code}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs text-slate-600 space-y-1">
                <div><span className="font-semibold text-slate-700">पदभार / विवरण:</span> {challengeTarget.subtitle}</div>
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  <span className="font-semibold text-slate-700">ईमेल:</span> {challengeTarget.email}
                </div>
              </div>

              <form onSubmit={handleVerifyChallenge} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>खाता पासवर्ड दर्ज करें (Enter Password) <span className="text-red-500">*</span></span>
                    <span className="text-[10px] text-slate-400 font-normal">डिफ़ॉल्ट: admin123</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showChallengePassword ? 'text' : 'password'}
                      autoFocus
                      required
                      placeholder="इस खाते का पासवर्ड दर्ज करें..."
                      value={challengePassword}
                      onChange={(e) => setChallengePassword(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChallengePassword(!showChallengePassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showChallengePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {challengeError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{challengeError}</span>
                  </div>
                )}

                {challengeSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{challengeSuccess}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setChallengeTarget(null)}
                    className="w-1/3 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingChallenge}
                    className="w-2/3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isVerifyingChallenge ? 'सत्यापित किया जा रहा है...' : 'पासवर्ड सत्यापित कर लॉगिन करें'}</span>
                  </button>
                </div>

                {onOpenChangePassword && (
                  <div className="pt-2 border-t border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenChangePassword();
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1.5 hover:underline cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>इस खाते का पासवर्ड बदलना चाहते हैं? (Change Password)</span>
                    </button>
                  </div>
                )}
              </form>

            </div>
          </div>
        ) : (
          <>
            {/* 5 Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5">
              
              {/* Tab 1: Fast Direct Credentials Form */}
              <button
                onClick={() => { setActiveTab('CREDENTIALS'); setAuthError(null); setAuthSuccess(null); }}
                className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'CREDENTIALS'
                    ? 'bg-slate-900 text-amber-400 shadow-md ring-1 ring-slate-800'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="truncate">1. सीधी आईडी व पासवर्ड</span>
              </button>

              {/* Tab 2: Director */}
              <button
                onClick={() => { setActiveTab('DIRECTOR'); setSearchQuery(''); }}
                className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'DIRECTOR'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-1 ring-amber-600'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Director of Training</span>
              </button>

              {/* Tab 3: Sections */}
              <button
                onClick={() => { setActiveTab('SECTIONS'); setSearchQuery(''); }}
                className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'SECTIONS'
                    ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-700'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">3. Sections ({desks.length})</span>
              </button>

              {/* Tab 4: JD Units */}
              <button
                onClick={() => { setActiveTab('JD_UNITS'); setSearchQuery(''); }}
                className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'JD_UNITS'
                    ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-700'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">4. JD Units ({jdOffices.length})</span>
              </button>

              {/* Tab 5: ITIs */}
              <button
                onClick={() => { setActiveTab('ITIS'); setSearchQuery(''); }}
                className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'ITIS'
                    ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-700'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">5. ITIs ({itiUnits.length})</span>
              </button>

            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              
              {/* TAB 1: FAST DIRECT CREDENTIALS FORM */}
              {activeTab === 'CREDENTIALS' && (
                <div className="max-w-xl mx-auto py-2">
                  <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md">
                    <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                      <div className="p-2.5 bg-slate-900 text-amber-400 rounded-xl">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          यूज़र आईडी / कोड एवं पासवर्ड से लॉगिन करें
                        </h3>
                        <p className="text-xs text-slate-500">
                          निदेशक, अनुभाग, JD कार्यालय अथवा ITI संस्थान की आईडी दर्ज करें
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleCredentialsLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          यूज़र आईडी / ईमेल / संस्थान कोड (User ID / Email / Code) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            placeholder="उदा. info.dte@gmail.com / DTE-UP-TRAIN / iti-lucknow / giti001@vppup.in"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          किसी भी ITI का ईमेल (उदा. giti001@vppup.in) या कोड दर्ज करें।
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            पासवर्ड (Password) <span className="text-red-500">*</span>
                          </label>
                          {onOpenChangePassword && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenChangePassword();
                              }}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                            >
                              पासवर्ड भूल गए? (@vppup.in ईमेल रीसेट)
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="पासवर्ड दर्ज करें..."
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full text-xs pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {authError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>{authError}</span>
                        </div>
                      )}

                      {authSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{authSuccess}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isVerifyingLogin}
                        className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-amber-400 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-slate-900/30"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{isVerifyingLogin ? 'सत्यापित किया जा रहा है...' : 'सत्यापित कर सुरक्षित लॉगिन करें (Secure Login)'}</span>
                      </button>

                      {onOpenChangePassword && (
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenChangePassword();
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1.5 hover:underline cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                            <span>अपना पासवर्ड बदलना या रीसेट करना चाहते हैं? (Change Password)</span>
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: DIRECTOR OF TRAINING */}
              {activeTab === 'DIRECTOR' && (
                <div className="max-w-2xl mx-auto space-y-4 py-2">
                  <div className="p-6 bg-gradient-to-br from-amber-50 via-amber-100/50 to-orange-50 rounded-2xl border-2 border-amber-300 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl shadow-md shrink-0">
                        <Crown className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded">
                            राज्य शीर्ष सचिवालय
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700">DTE-DIRECTOR</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mt-1">
                          निदेशक, प्रशिक्षण एवं सेवायोजन (Director of Training)
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          समस्त 25 मुख्यालय अनुभागों, 18 संयुक्त निदेशक मंडलों एवं समस्त राजकीय आईटीआई की प्रगति, समयबद्ध विधानसभा प्रश्नों एवं अति-महत्वपूर्ण डेटा मांगों की कार्यपालक समीक्षा हेतु सर्वोपरि लॉगिन।
                        </p>
                        
                        <div className="mt-4 pt-3 border-t border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="text-xs text-slate-600 space-y-0.5">
                            <div><span className="font-semibold">ईमेल:</span> info.dte@gmail.com</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-700" /> पासवर्ड सत्यापन आवश्यक
                            </div>
                          </div>
                          <button
                            onClick={initiateDirectorChallenge}
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                          >
                            <Lock className="w-4 h-4" />
                            <span>पासवर्ड दर्ज कर लॉगिन करें</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SECTIONS */}
              {activeTab === 'SECTIONS' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                    <div className="text-xs text-slate-600 font-medium">
                      मुख्यालय के कुल <strong>{desks.length} प्रशासनिक अनुभागों</strong> में से वांछित अनुभाग चुनें (पासवर्ड आवश्यक):
                    </div>
                    <div className="w-full sm:w-72">
                      <input
                        type="text"
                        placeholder="अनुभाग का नाम या कोड खोजें..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {filteredDesks.map((desk) => {
                      const isCurrent = currentUser?.deskId === desk.id;
                      return (
                        <div
                          key={desk.id}
                          onClick={() => initiateDeskChallenge(desk)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative group ${
                            isCurrent
                              ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                                {desk.code}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.2 rounded">
                                  वर्तमान सक्रिय सत्र
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-indigo-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <Lock className="w-3 h-3" /> पासवर्ड लॉगिन <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                            {desk.name}
                          </h3>
                          
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {desk.description}
                          </p>

                          <div className="mt-2 text-xs text-slate-600">
                            <span className="font-medium text-slate-700">अनुभाग अधिकारी:</span> {desk.designation}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="truncate max-w-[200px]">{desk.email}</span>
                            <span className="text-amber-700 font-bold flex items-center gap-1 text-[10px]">
                              <Lock className="w-3 h-3" /> पासवर्ड अनिवार्य
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: JD UNITS */}
              {activeTab === 'JD_UNITS' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                    <div className="text-xs text-slate-600 font-medium">
                      उत्तर प्रदेश के कुल <strong>{jdOffices.length} मण्डल संयुक्त निदेशक कार्यालयों</strong> में से चयन करें:
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={filterZone}
                        onChange={(e) => setFilterZone(e.target.value)}
                        className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      >
                        <option value="ALL">समस्त मण्डल</option>
                        {zones.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="मण्डल / जिला खोजें..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-48 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {filteredJDOffices.map((jd) => {
                      const isCurrent = currentUser?.fieldUnitId === jd.id;
                      return (
                        <div
                          key={jd.id}
                          onClick={() => initiateFieldUnitChallenge(jd)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative group ${
                            isCurrent
                              ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20'
                              : 'border-slate-200 bg-white hover:border-purple-400 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                              {jd.code}
                            </span>
                            <span className="text-xs text-purple-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <Lock className="w-3 h-3" /> पासवर्ड लॉगिन <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 mt-2">
                            {jd.name}
                          </h3>

                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{jd.zone} मण्डल ({jd.district})</span>
                          </div>

                          <div className="mt-2 text-xs text-slate-500">
                            {jd.designation} • {jd.phone}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="truncate max-w-[200px]">{jd.email}</span>
                            <span className="text-amber-700 font-bold flex items-center gap-1 text-[10px]">
                              <Lock className="w-3 h-3" /> पासवर्ड अनिवार्य
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: ITIS */}
              {activeTab === 'ITIS' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                    <div className="text-xs text-slate-600 font-medium">
                      उत्तर प्रदेश के कुल <strong>{itiUnits.length} राजकीय औद्योगिक प्रशिक्षण संस्थानों</strong> में से चुनें:
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={filterZone}
                        onChange={(e) => setFilterZone(e.target.value)}
                        className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      >
                        <option value="ALL">समस्त मण्डल</option>
                        {zones.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="संस्थान नाम, कोड या जनपद खोजें..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-56 text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {filteredITIs.slice(0, 80).map((iti) => {
                      const isCurrent = currentUser?.fieldUnitId === iti.id;
                      return (
                        <div
                          key={iti.id}
                          onClick={() => initiateFieldUnitChallenge(iti)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative group ${
                            isCurrent
                              ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              {iti.code}
                            </span>
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <Lock className="w-3 h-3" /> पासवर्ड लॉगिन <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                            {iti.name}
                          </h3>

                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>जनपद: {iti.district} ({iti.zone})</span>
                          </div>

                          <div className="mt-2 text-xs text-slate-500">
                            {iti.designation} • {iti.phone}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="truncate max-w-[200px]">{iti.email}</span>
                            <span className="text-amber-700 font-bold flex items-center gap-1 text-[10px]">
                              <Lock className="w-3 h-3" /> पासवर्ड अनिवार्य
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </div>
  );
};
