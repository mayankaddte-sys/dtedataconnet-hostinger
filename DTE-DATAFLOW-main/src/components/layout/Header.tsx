import React, { useState, useRef, useEffect } from 'react';
import { 
  UserSession, 
  Requisition, 
  PortalNavMenu, 
  ExtensionRequest, 
  DefaulterNotice, 
  DirectorateDesk, 
  FieldUnit 
} from '../../types/portal';
import { 
  Building2, 
  GraduationCap, 
  Layers, 
  PlusCircle, 
  RotateCcw, 
  AlertCircle, 
  ChevronDown, 
  LayoutDashboard, 
  FileText, 
  FileSpreadsheet, 
  Clock, 
  BellRing, 
  BookOpen, 
  TrendingUp, 
  Menu, 
  X,
  ShieldCheck,
  Crown,
  MapPin,
  Check,
  Search,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Lock,
  LogOut
} from 'lucide-react';
import { 
  getScopedRequisitions, 
  getScopedExtensions, 
  getScopedNotices 
} from '../../utils/userScope';

interface HeaderProps {
  currentUser: UserSession | null;
  onOpenLoginModal: () => void;
  onOpenChangePassword?: () => void;
  onOpenEmailMonitor?: () => void;
  onCreateRequisition?: () => void;
  onResetData: () => void;
  activeRequisitions: Requisition[];
  urgentCount: number;
  extensions: ExtensionRequest[];
  defaulterNotices: DefaulterNotice[];
  activeMenu: PortalNavMenu;
  onChangeMenu: (menu: PortalNavMenu) => void;
  desks: DirectorateDesk[];
  fieldUnits: FieldUnit[];
  onSelectUser: (user: UserSession) => void;
  onRequireLoginTarget?: (target: { type: 'DIRECTOR' | 'DESK' | 'JD' | 'ITI'; data?: DirectorateDesk | FieldUnit }) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLoginModal,
  onOpenChangePassword,
  onOpenEmailMonitor,
  onCreateRequisition,
  onResetData,
  activeRequisitions,
  urgentCount,
  extensions,
  defaulterNotices,
  activeMenu,
  onChangeMenu,
  desks,
  fieldUnits,
  onSelectUser,
  onRequireLoginTarget,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'SECTIONS' | 'JD' | 'ITI' | null>(null);
  const [itiSearchQuery, setItiSearchQuery] = useState('');
  const [selectedMandalFilter, setSelectedMandalFilter] = useState('ALL');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDirectorAdmin = currentUser?.role === 'DIRECTORATE_ADMIN';
  const isDirectorateDesk = currentUser?.role === 'DIRECTORATE_DESK';
  const isJD = currentUser?.role === 'FIELD_JD';
  const isITI = currentUser?.role === 'FIELD_ITI';
  const isDirectorate = isDirectorAdmin || isDirectorateDesk;
  const isField = isJD || isITI;

  // Filter units into JD offices and ITIs
  const jdOffices = fieldUnits.filter(u => u.type === 'JD_OFFICE');
  const itiUnits = fieldUnits.filter(u => u.type === 'ITI');
  const mandals = Array.from(new Set(fieldUnits.map(u => u.zone)));

  // Filtered ITIs for submenu
  const filteredItis = itiUnits.filter(iti => {
    const matchesSearch = iti.name.toLowerCase().includes(itiSearchQuery.toLowerCase()) ||
                          iti.code.toLowerCase().includes(itiSearchQuery.toLowerCase()) ||
                          iti.district.toLowerCase().includes(itiSearchQuery.toLowerCase());
    const matchesMandal = selectedMandalFilter === 'ALL' || iti.zone === selectedMandalFilter;
    return matchesSearch && matchesMandal;
  });

  // Login handler helpers with strict authentication requirement
  const loginAsDirector = () => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    if (onRequireLoginTarget) {
      onRequireLoginTarget({ type: 'DIRECTOR' });
    } else {
      onOpenLoginModal();
    }
  };

  const loginAsDesk = (desk: DirectorateDesk) => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    if (onRequireLoginTarget) {
      onRequireLoginTarget({ type: 'DESK', data: desk });
    } else {
      onOpenLoginModal();
    }
  };

  const loginAsFieldUnit = (unit: FieldUnit) => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    if (onRequireLoginTarget) {
      onRequireLoginTarget({ type: unit.type === 'JD_OFFICE' ? 'JD' : 'ITI', data: unit });
    } else {
      onOpenLoginModal();
    }
  };

  // Scoped data for this user
  const scopedRequisitions = getScopedRequisitions(currentUser, activeRequisitions, fieldUnits);
  const scopedUrgentCount = scopedRequisitions.filter(r => r.priority === 'URGENT' || r.isAssemblyQuestion).length;
  const scopedExtensions = getScopedExtensions(currentUser, extensions, activeRequisitions, fieldUnits);
  const scopedPendingExtensionsCount = scopedExtensions.filter(e => e.status === 'PENDING').length;
  const scopedNotices = getScopedNotices(currentUser, defaulterNotices, activeRequisitions, fieldUnits);
  const scopedNoticesCount = scopedNotices.length;

  const menuItems: { id: PortalNavMenu; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string; adminOnly?: boolean }[] = [
    {
      id: 'DASHBOARD',
      label: 'डैशबोर्ड',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'REQUISITIONS',
      label: 'डेटा मांग आदेश',
      icon: <FileText className="w-4 h-4" />,
      badge: scopedUrgentCount > 0 ? scopedUrgentCount : scopedRequisitions.length,
      badgeColor: scopedUrgentCount > 0 ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
    },
    {
      id: 'SUBMISSIONS_REPORT',
      label: 'सबमिशन एवं रिपोर्ट',
      icon: <FileSpreadsheet className="w-4 h-4" />
    },
    {
      id: 'EXTENSIONS',
      label: 'समय-सीमा व विस्तार',
      icon: <Clock className="w-4 h-4" />,
      badge: scopedPendingExtensionsCount > 0 ? scopedPendingExtensionsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-900 font-bold'
    },
    {
      id: 'NOTICES',
      label: 'नोटिस व डिफॉल्टर',
      icon: <BellRing className="w-4 h-4" />,
      badge: scopedNoticesCount > 0 ? scopedNoticesCount : undefined,
      badgeColor: 'bg-rose-600 text-white'
    },
    {
      id: 'DIRECTORY',
      label: 'इकाई निर्देशिका',
      icon: <BookOpen className="w-4 h-4" />
    },
    ...(isDirectorAdmin ? [{
      id: 'DIRECTOR_VIEW' as PortalNavMenu,
      label: 'राज्य समीक्षा (Apex View)',
      icon: <TrendingUp className="w-4 h-4" />,
      adminOnly: true
    }] : [])
  ];

  const handleMenuClick = (menu: PortalNavMenu) => {
    onChangeMenu(menu);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-xl" ref={dropdownRef}>
      {/* Top Urgent Alert Bar */}
      {scopedUrgentCount > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-xs px-4 py-1 font-bold flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              अति-महत्वपूर्ण सूचना: {scopedUrgentCount} समयबद्ध / विधानसभा / उच्च प्राथमिकता मांग सक्रिय है।
            </span>
          </div>
        </div>
      )}

      {/* Primary Brand & Actions Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left: Emblem & Institutional Title */}
          <div className="flex items-center gap-4">
            <img
              src="/dte-badge.png"
              alt="DTE DataFlow — प्रशिक्षण निदेशालय, उत्तर प्रदेश"
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-lg ring-2 ring-amber-400/50 shrink-0 bg-white"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase font-bold tracking-wider text-amber-400">
                  प्रशिक्षण निदेशालय, उ.प्र.
                </span>
                <span className="text-[9px] bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-slate-700">
                  शासन
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight leading-tight">
                क्षेत्रीय इकाई डेटा संकलन एवं अनुश्रवण पोर्टल
              </h1>
            </div>
          </div>

          {/* Right: Active Role Pill & Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Create Requisition Button (for Desks / Admin) */}
            {isDirectorate && onCreateRequisition && (
              <button
                onClick={onCreateRequisition}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-all hover:shadow-indigo-500/20 border border-indigo-500 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ नई मांग जारी करें</span>
              </button>
            )}

            {/* Current Active Role Status Pill */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={onOpenChangePassword}
                  title="पासवर्ड एवं प्रोफ़ाइल सुरक्षा (Click to Change Password)"
                  className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-300 transition-colors">
                      लॉगिन:
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white max-w-[180px] truncate">
                    {currentUser.displayName}
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isDirectorAdmin 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : isDirectorateDesk 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                        : isJD
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {currentUser.code}
                  </span>
                </button>

                {/* Logout / Lock Session */}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="सत्र समाप्त / लॉगआउट करें (Logout)"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-200 hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span className="hidden sm:inline">लॉगआउट</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs transition-all shadow-md cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>लॉगिन करें</span>
              </button>
            )}

            {/* Automated Email Reminders Monitor Button */}
            {onOpenEmailMonitor && (
              <button
                onClick={onOpenEmailMonitor}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 hover:border-amber-400 text-amber-200 hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="स्वचालित ईमेल अनुस्मारक मॉनिटर (@vppup.in Auto Reminders)"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden md:inline">ईमेल रिमाइंडर मॉनिटर</span>
              </button>
            )}

            {/* Change Password Button */}
            <button
              onClick={onOpenChangePassword}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-500/50 hover:border-indigo-400 text-indigo-100 hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="पासवर्ड बदलें (Change Password / Security)"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>पासवर्ड बदलें</span>
            </button>

            {/* Switch User / All Logins Modal Trigger */}
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="सभी लॉगिन विकल्प देखें"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">लॉगिन मेन्यू</span>
            </button>

            {/* Reset Data Shortcut */}
            <button
              onClick={() => {
                if (window.confirm('क्या आप पोर्टल के सभी डेटा को प्रारंभिक स्थिति में रीसेट करना चाहते हैं?')) {
                  onResetData();
                }
              }}
              title="डेटा रीसेट करें"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>
      </div>

      {/* 4 PROMINENT LOGIN MENUS BAR (DIRECTOR OF TRAINING, SECTIONS, JD UNITS, ITIS) */}
      <div className="bg-slate-900 border-t border-b border-slate-800/90 px-4 sm:px-6 lg:px-8 py-2 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              पोर्टल लॉगिन मेन्यू:
            </span>
          </div>

          {/* The 4 Login Menus */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 md:max-w-4xl relative">
            
            {/* MENU 1: Director of Training (निदेशक, प्रशिक्षण) */}
            <button
              id="login-menu-director"
              onClick={loginAsDirector}
              className={`flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left group ${
                isDirectorAdmin
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-800/90 hover:bg-amber-500/15 text-amber-300 border-amber-500/30 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Crown className={`w-4 h-4 shrink-0 ${isDirectorAdmin ? 'text-slate-950' : 'text-amber-400 group-hover:scale-110 transition-transform'}`} />
                <div className="truncate">
                  <div className="leading-tight truncate">1. Director of Training</div>
                  <div className={`text-[10px] font-normal truncate ${isDirectorAdmin ? 'text-slate-900' : 'text-amber-400/70'}`}>
                    निदेशक, प्रशिक्षण
                  </div>
                </div>
              </div>
              {isDirectorAdmin ? (
                <span className="text-[9px] bg-slate-950 text-amber-300 font-extrabold px-1.5 py-0.5 rounded shrink-0">सक्रिय</span>
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-amber-400/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
              )}
            </button>

            {/* MENU 2: Sections of Directorate (मुख्यालय प्रकोष्ठ लॉगिन) */}
            <div className="relative">
              <button
                id="login-menu-sections"
                onClick={() => setOpenDropdown(openDropdown === 'SECTIONS' ? null : 'SECTIONS')}
                className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left group ${
                  isDirectorateDesk
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20'
                    : openDropdown === 'SECTIONS'
                      ? 'bg-indigo-950 text-indigo-200 border-indigo-400 ring-2 ring-indigo-500/30'
                      : 'bg-slate-800/90 hover:bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:border-indigo-400'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className={`w-4 h-4 shrink-0 ${isDirectorateDesk ? 'text-white' : 'text-indigo-400 group-hover:scale-110 transition-transform'}`} />
                  <div className="truncate">
                    <div className="leading-tight truncate">2. Directorate Sections</div>
                    <div className={`text-[10px] font-normal truncate ${isDirectorateDesk ? 'text-indigo-200' : 'text-indigo-400/70'}`}>
                      {isDirectorateDesk ? currentUser?.code : `मुख्यालय प्रकोष्ठ (${desks.length})`}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openDropdown === 'SECTIONS' ? 'rotate-180 text-white' : 'text-indigo-400/60'}`} />
              </button>

              {/* Submenu Dropdown for Sections */}
              {openDropdown === 'SECTIONS' && (
                <div className="absolute left-0 sm:-left-12 top-full mt-1.5 w-72 sm:w-88 bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 bg-indigo-950/80 border-b border-indigo-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-white">निदेशालय प्रकोष्ठ लॉगिन (Directorate Sections)</div>
                      <div className="text-[10px] text-indigo-300">डेटा मांग जारी करने एवं समीक्षा हेतु प्रकोष्ठ चुनें:</div>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                      {desks.length} Sections
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-800/60">
                    {desks.map((desk) => {
                      const isCurrent = currentUser?.deskId === desk.id;
                      return (
                        <button
                          key={desk.id}
                          onClick={() => loginAsDesk(desk)}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                            isCurrent
                              ? 'bg-indigo-600/30 border border-indigo-500 text-white'
                              : 'hover:bg-slate-800/90 text-slate-200 hover:text-white'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate">{desk.name}</span>
                              <span className="text-[9px] font-mono font-bold bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                                {desk.code}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              पदभार: {desk.designation}
                            </div>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
                                <Check className="w-3 h-3" /> वर्तमान सक्रिय सत्र
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* MENU 3: JD Units of Mandals (संयुक्त निदेशक मंडल कार्यालय लॉगिन) */}
            <div className="relative">
              <button
                id="login-menu-jd-units"
                onClick={() => setOpenDropdown(openDropdown === 'JD' ? null : 'JD')}
                className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left group ${
                  isJD
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/20'
                    : openDropdown === 'JD'
                      ? 'bg-purple-950 text-purple-200 border-purple-400 ring-2 ring-purple-500/30'
                      : 'bg-slate-800/90 hover:bg-purple-500/15 text-purple-300 border-purple-500/30 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Layers className={`w-4 h-4 shrink-0 ${isJD ? 'text-white' : 'text-purple-400 group-hover:scale-110 transition-transform'}`} />
                  <div className="truncate">
                    <div className="leading-tight truncate">3. JD Units of Mandals</div>
                    <div className={`text-[10px] font-normal truncate ${isJD ? 'text-purple-200' : 'text-purple-400/70'}`}>
                      {isJD ? currentUser?.code : `JD मंडल कार्यालय (${jdOffices.length})`}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openDropdown === 'JD' ? 'rotate-180 text-white' : 'text-purple-400/60'}`} />
              </button>

              {/* Submenu Dropdown for JD Units */}
              {openDropdown === 'JD' && (
                <div className="absolute left-0 sm:-left-20 top-full mt-1.5 w-72 sm:w-92 bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 bg-purple-950/80 border-b border-purple-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-white">संयुक्त निदेशक क्षेत्रीय कार्यालय (JD Units of Mandals)</div>
                      <div className="text-[10px] text-purple-300">मंडल स्तरीय अनुश्रवण एवं आख्या प्रेषण हेतु कार्यालय चुनें:</div>
                    </div>
                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full">
                      {jdOffices.length} Mandals
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                    {jdOffices.map((jd) => {
                      const isCurrent = currentUser?.fieldUnitId === jd.id;
                      return (
                        <button
                          key={jd.id}
                          onClick={() => loginAsFieldUnit(jd)}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                            isCurrent
                              ? 'bg-purple-600/30 border border-purple-500 text-white'
                              : 'hover:bg-slate-800/90 text-slate-200 hover:text-white'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isCurrent ? 'bg-purple-600 text-white' : 'bg-slate-800 text-purple-400'}`}>
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate">{jd.name}</span>
                              <span className="text-[9px] font-mono font-bold bg-slate-800 text-purple-300 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                                {jd.code}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {jd.zone} • {jd.district}
                              </span>
                            </div>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
                                <Check className="w-3 h-3" /> वर्तमान सक्रिय सत्र
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* MENU 4: Login ITIs (राजकीय / अशासकीय आईटीआई लॉगिन) */}
            <div className="relative">
              <button
                id="login-menu-itis"
                onClick={() => setOpenDropdown(openDropdown === 'ITI' ? null : 'ITI')}
                className={`w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left group ${
                  isITI
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/20'
                    : openDropdown === 'ITI'
                      ? 'bg-emerald-950 text-emerald-200 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-800/90 hover:bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <GraduationCap className={`w-4 h-4 shrink-0 ${isITI ? 'text-white' : 'text-emerald-400 group-hover:scale-110 transition-transform'}`} />
                  <div className="truncate">
                    <div className="leading-tight truncate">4. Login ITIs</div>
                    <div className={`text-[10px] font-normal truncate ${isITI ? 'text-emerald-200' : 'text-emerald-400/70'}`}>
                      {isITI ? currentUser?.code : `समस्त ITI संस्थान (${itiUnits.length})`}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${openDropdown === 'ITI' ? 'rotate-180 text-white' : 'text-emerald-400/60'}`} />
              </button>

              {/* Submenu Dropdown for ITIs with Search & Filter */}
              {openDropdown === 'ITI' && (
                <div className="absolute right-0 sm:-right-8 top-full mt-1.5 w-76 sm:w-96 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 bg-emerald-950/80 border-b border-emerald-900/60">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs font-extrabold text-white">राजकीय / अशासकीय आईटीआई लॉगिन (Login ITIs)</div>
                        <div className="text-[10px] text-emerald-300">डेटा प्रविष्टि एवं आख्या प्रस्तुत करने हेतु ITI चुनें:</div>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full shrink-0">
                        {itiUnits.length} ITIs
                      </span>
                    </div>

                    {/* Search and Mandal Filter */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ITI नाम, कोड या जनपद खोजें..."
                          value={itiSearchQuery}
                          onChange={(e) => setItiSearchQuery(e.target.value)}
                          className="w-full text-[11px] pl-7 pr-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-400"
                        />
                      </div>
                      <select
                        value={selectedMandalFilter}
                        onChange={(e) => setSelectedMandalFilter(e.target.value)}
                        className="text-[10px] px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-medium focus:outline-hidden focus:border-emerald-400"
                      >
                        <option value="ALL">समस्त मंडल</option>
                        {mandals.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                    {filteredItis.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        कोई आईटीआई नहीं मिली।
                      </div>
                    ) : (
                      filteredItis.map((iti) => {
                        const isCurrent = currentUser?.fieldUnitId === iti.id;
                        return (
                          <button
                            key={iti.id}
                            onClick={() => loginAsFieldUnit(iti)}
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                              isCurrent
                                ? 'bg-emerald-600/30 border border-emerald-500 text-white'
                                : 'hover:bg-slate-800/90 text-slate-200 hover:text-white'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400'}`}>
                              <GraduationCap className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold truncate">{iti.name}</span>
                                <span className="text-[9px] font-mono font-bold bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                                  {iti.code}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  {iti.district} ({iti.zone})
                                </span>
                              </div>
                              {isCurrent && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
                                  <Check className="w-3 h-3" /> वर्तमान सक्रिय सत्र
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Desktop Main Menu Navigation Bar */}
      <div className="hidden md:block bg-slate-950 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center space-x-1 overflow-x-auto py-1">
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all relative whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="text-[11px] text-slate-400 font-mono hidden lg:block">
            सक्रिय पोर्टल सत्र • DTE-UP-NIC
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 py-3 space-y-3">
          
          {/* Mobile 4 Login Buttons */}
          <div className="space-y-1.5 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">पोर्टल लॉगिन विकल्प:</div>
            
            <button
              onClick={loginAsDirector}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 rounded-lg text-xs font-bold text-amber-300"
            >
              <span className="flex items-center gap-2"><Crown className="w-3.5 h-3.5 text-amber-400" /> 1. Director of Training</span>
              <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded">लॉगिन</span>
            </button>

            <button
              onClick={() => onOpenLoginModal()}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 rounded-lg text-xs font-bold text-indigo-300"
            >
              <span className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-indigo-400" /> 2. Directorate Sections ({desks.length})</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => onOpenLoginModal()}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 rounded-lg text-xs font-bold text-purple-300"
            >
              <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-purple-400" /> 3. JD Units of Mandals ({jdOffices.length})</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => onOpenLoginModal()}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 rounded-lg text-xs font-bold text-emerald-300"
            >
              <span className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> 4. Login ITIs ({itiUnits.length})</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onOpenChangePassword) onOpenChangePassword();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-xs font-bold"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>पासवर्ड बदलें (Change Password)</span>
              </div>
              <span className="text-[10px] text-indigo-400 font-mono">सुरक्षा</span>
            </button>

            {isDirectorate && onCreateRequisition && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onCreateRequisition();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ नई मांग जारी करें</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
