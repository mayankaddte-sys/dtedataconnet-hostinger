import React, { useState, useMemo } from 'react';
import { 
  DirectorateDesk, 
  Requisition, 
  SubmissionRecord, 
  FieldUnit, 
  UserSession 
} from '../../types/portal';
import { CountdownTimer } from '../common/CountdownTimer';
import { 
  Building2, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Plus,
  ChevronDown,
  Search,
  ArrowUpDown,
  Filter,
  Check,
  Send,
  MapPin,
  ExternalLink,
  Users,
  Eye,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface DirectorOverviewProps {
  desks: DirectorateDesk[];
  requisitions: Requisition[];
  submissions: SubmissionRecord[];
  fieldUnits: FieldUnit[];
  currentUser?: UserSession;
  onSelectDesk: (desk: DirectorateDesk) => void;
  onSelectRequisition: (req: Requisition) => void;
  onCreateRequisition?: () => void;
  onOpenLoginModal?: () => void;
  onSelectUser?: (user: UserSession) => void;
  onSendDefaulterNotice?: (unitIds: string[], subject: string, message: string, reqId?: string) => void;
}

export const DirectorOverview: React.FC<DirectorOverviewProps> = ({
  desks,
  requisitions,
  submissions,
  fieldUnits,
  currentUser,
  onSelectDesk,
  onSelectRequisition,
  onCreateRequisition,
  onOpenLoginModal,
  onSelectUser,
  onSendDefaulterNotice
}) => {
  // UI states
  const [sectionViewMode, setSectionViewMode] = useState<'PRIORITY' | 'ALL'>('PRIORITY');
  const [sectionSearch, setSectionSearch] = useState('');
  const [sectionSort, setSectionSort] = useState<'LOWEST_FIRST' | 'HIGHEST_FIRST' | 'NAME' | 'DEMANDS'>('LOWEST_FIRST');
  
  const [districtViewMode, setDistrictViewMode] = useState<'MANDALS' | 'DISTRICTS'>('MANDALS');
  const [districtSearch, setDistrictSearch] = useState('');
  const [selectedDistrictDetail, setSelectedDistrictDetail] = useState<{
    name: string;
    rate: number;
    expected: number;
    received: number;
    defaulters: number;
    units: FieldUnit[];
  } | null>(null);

  const [bannerMenuOpen, setBannerMenuOpen] = useState(false);

  // High-level KPI metrics
  const totalCells = desks.length;
  const activeDemands = requisitions.filter(r => r.status === 'ACTIVE');
  const verifiedAndAccepted = submissions.filter(s => s.status === 'APPROVED').length;
  
  let stateExpected = 0;
  let stateReceived = 0;
  activeDemands.forEach(r => {
    stateExpected += r.targetUnitIds.length;
    stateReceived += submissions.filter(s => s.requisitionId === r.id).length;
  });

  // Calculate defaulters/pending
  const defaultersCount = Math.max(0, stateExpected - stateReceived);

  // Find the top urgent / breached demand for the single alert banner
  const urgentDemands = requisitions.filter(r => r.priority === 'URGENT' || r.isAssemblyQuestion);
  const primaryBreachedDemand = urgentDemands.length > 0 ? urgentDemands[0] : (activeDemands[0] || requisitions[0]);
  const primaryBreachedDesk = primaryBreachedDemand 
    ? (desks.find(d => d.id === primaryBreachedDemand.deskId) || { name: 'Est. Instructors and Guest Faculty Cell', code: 'EST-INST' })
    : { name: 'Est. Instructors and Guest Faculty Cell', code: 'EST-INST' };

  // Calculate Section Compliance
  const sectionStats = useMemo(() => {
    return desks.map(desk => {
      const deskReqs = requisitions.filter(r => r.deskId === desk.id && r.status === 'ACTIVE');
      let expected = 0;
      let received = 0;
      
      deskReqs.forEach(r => {
        expected += r.targetUnitIds.length;
        received += submissions.filter(s => s.requisitionId === r.id).length;
      });

      // If desk has active demands, calculate real compliance rate; otherwise 100% (or 0 if not yet issued)
      const hasDemands = deskReqs.length > 0;
      const rate = expected > 0 ? Math.round((received / expected) * 100) : (hasDemands ? 0 : 100);
      const defaulters = Math.max(0, expected - received);

      // Short code extraction (e.g. DTE-UP-EST-INST -> EST-INST)
      const cleanCode = desk.code.replace('DTE-UP-', '').replace('DTE-', '');

      // Clean English label if available
      let cleanLabel = desk.name;
      const match = desk.name.match(/\((.*?)\)/);
      if (match && match[1]) {
        cleanLabel = match[1];
      }

      return {
        desk,
        code: cleanCode,
        label: cleanLabel,
        fullName: desk.name,
        activeDemandsCount: deskReqs.length,
        expected,
        received,
        defaulters,
        rate,
        isOutlier: rate < 20 && expected > 0
      };
    });
  }, [desks, requisitions, submissions]);

  // Sorted and filtered sections
  const filteredAndSortedSections = useMemo(() => {
    let list = [...sectionStats];

    if (sectionSearch.trim()) {
      const q = sectionSearch.toLowerCase();
      list = list.filter(s => 
        s.code.toLowerCase().includes(q) || 
        s.label.toLowerCase().includes(q) || 
        s.fullName.toLowerCase().includes(q)
      );
    }

    if (sectionSort === 'LOWEST_FIRST') {
      // Prioritize active demands with low compliance first
      list.sort((a, b) => {
        if (a.expected > 0 && b.expected === 0) return -1;
        if (a.expected === 0 && b.expected > 0) return 1;
        return a.rate - b.rate;
      });
    } else if (sectionSort === 'HIGHEST_FIRST') {
      list.sort((a, b) => b.rate - a.rate);
    } else if (sectionSort === 'NAME') {
      list.sort((a, b) => a.label.localeCompare(b.label));
    } else if (sectionSort === 'DEMANDS') {
      list.sort((a, b) => b.activeDemandsCount - a.activeDemandsCount);
    }

    if (sectionViewMode === 'PRIORITY' && !sectionSearch.trim()) {
      // In default preview mode, show the top outlier and key sections
      return list.slice(0, 6);
    }

    return list;
  }, [sectionStats, sectionSearch, sectionSort, sectionViewMode]);

  // Calculate District / Mandal Compliance
  const mandalStats = useMemo(() => {
    const zones: string[] = Array.from(new Set(fieldUnits.map(u => u.zone))).filter(Boolean) as string[];
    
    return zones.map(zone => {
      const zoneUnits = fieldUnits.filter(u => u.zone === zone);
      const zoneUnitIds = new Set(zoneUnits.map(u => u.id));

      let expected = 0;
      let received = 0;

      activeDemands.forEach(r => {
        const targetedInZone = r.targetUnitIds.filter(id => zoneUnitIds.has(id)).length;
        expected += targetedInZone;
        const zoneSubs = submissions.filter(s => s.requisitionId === r.id && zoneUnitIds.has(s.fieldUnitId));
        received += zoneSubs.length;
      });

      const rate = expected > 0 ? Math.round((received / expected) * 100) : 0;
      const defaulters = Math.max(0, expected - received);

      // Clean zone name (e.g. "Devipatan (Gonda)" -> "Devipatan")
      const cleanName = zone.replace(/\s*\([^)]*\)/g, '');

      return {
        name: cleanName,
        fullName: zone,
        rate,
        expected,
        received,
        defaulters,
        unitCount: zoneUnits.length,
        units: zoneUnits
      };
    }).sort((a, b) => {
      // Sort High to Low as requested
      if (b.rate !== a.rate) return b.rate - a.rate;
      if (b.received !== a.received) return b.received - a.received;
      return a.name.localeCompare(b.name);
    });
  }, [fieldUnits, activeDemands, submissions]);

  // District-level stats (75 districts)
  const districtStats = useMemo(() => {
    const districts: string[] = Array.from(new Set(fieldUnits.map(u => u.district))).filter(Boolean) as string[];

    return districts.map(district => {
      const distUnits = fieldUnits.filter(u => u.district === district);
      const distUnitIds = new Set(distUnits.map(u => u.id));

      let expected = 0;
      let received = 0;

      activeDemands.forEach(r => {
        const targetedInDist = r.targetUnitIds.filter(id => distUnitIds.has(id)).length;
        expected += targetedInDist;
        const distSubs = submissions.filter(s => s.requisitionId === r.id && distUnitIds.has(s.fieldUnitId));
        received += distSubs.length;
      });

      const rate = expected > 0 ? Math.round((received / expected) * 100) : 0;
      const defaulters = Math.max(0, expected - received);

      return {
        name: district,
        fullName: district,
        rate,
        expected,
        received,
        defaulters,
        unitCount: distUnits.length,
        units: distUnits
      };
    }).sort((a, b) => {
      if (b.rate !== a.rate) return b.rate - a.rate;
      if (b.received !== a.received) return b.received - a.received;
      return a.name.localeCompare(b.name);
    });
  }, [fieldUnits, activeDemands, submissions]);

  const activeDistrictList = districtViewMode === 'MANDALS' ? mandalStats : districtStats;
  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return activeDistrictList;
    const q = districtSearch.toLowerCase();
    return activeDistrictList.filter(d => d.name.toLowerCase().includes(q));
  }, [activeDistrictList, districtSearch]);

  // Helper for Heat Shading Palette
  const getHeatStyle = (rate: number) => {
    if (rate >= 3) {
      return {
        bg: 'bg-emerald-100/90 hover:bg-emerald-200/90 text-emerald-950 border-emerald-300 shadow-xs',
        textBadge: 'text-emerald-800 font-extrabold',
        dot: 'bg-emerald-600'
      };
    }
    if (rate >= 2) {
      return {
        bg: 'bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 border-amber-300 shadow-xs',
        textBadge: 'text-amber-800 font-extrabold',
        dot: 'bg-amber-600'
      };
    }
    if (rate >= 1) {
      return {
        bg: 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-200 shadow-xs',
        textBadge: 'text-amber-700 font-extrabold',
        dot: 'bg-amber-500'
      };
    }
    return {
      bg: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90',
      textBadge: 'text-slate-500 font-bold',
      dot: 'bg-slate-300'
    };
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* 1. SINGLE BREACHED / URGENT DEADLINE ALERT BANNER */}
      {primaryBreachedDemand && (
        <div className="bg-red-50/90 border border-red-200 rounded-xl px-4 py-3 text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs relative">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-red-100 text-red-700 rounded-lg shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm">
              <span className="font-extrabold text-red-900 whitespace-nowrap">
                1 breached deadline
              </span>
              <span className="text-red-700/80 hidden sm:inline">•</span>
              <span className="text-red-800 font-medium truncate">
                {primaryBreachedDesk.name.replace(/\(.*?\)/, '').trim() || 'Est. Instructors and Guest Faculty Cell'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div className="font-mono text-xs sm:text-sm font-bold text-red-800 bg-red-100/80 px-2.5 py-1 rounded-md border border-red-200/70">
              <CountdownTimer deadline={primaryBreachedDemand.deadline} isStrictCutoff={primaryBreachedDemand.isStrictCutoff} compact />
            </div>

            <div className="relative">
              <button
                onClick={() => setBannerMenuOpen(!bannerMenuOpen)}
                className="p-1 hover:bg-red-200/60 rounded-md text-red-700 transition-colors"
                title="Options"
              >
                <span className="text-base font-black leading-none px-1 tracking-widest">...</span>
              </button>

              {bannerMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-xs text-slate-800 animate-in fade-in duration-100">
                  <button
                    onClick={() => {
                      onSelectRequisition(primaryBreachedDemand);
                      setBannerMenuOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-slate-100 rounded-lg flex items-center gap-2 font-medium"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>मांग व डिफ़ॉल्टर सूची देखें</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onCreateRequisition) onCreateRequisition();
                      setBannerMenuOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-slate-100 rounded-lg flex items-center gap-2 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>नई सूचना मांग जारी करें</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS WITH SEVERITY COLOR-CODING (4 Across) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: Directorate cells */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400"></div>
          <div className="text-xs sm:text-sm font-bold text-slate-600">
            Directorate cells
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {totalCells}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            25 मुख्यालय प्रकोष्ठ
          </div>
        </div>

        {/* Card 2: Active demands */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
          <div className="text-xs sm:text-sm font-bold text-slate-600">
            Active demands
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 mt-2 tracking-tight">
            {activeDemands.length}
          </div>
          <div className="text-[11px] text-blue-700/70 font-medium mt-1">
            सक्रिय सूचना मांग आदेश
          </div>
        </div>

        {/* Card 3: Verified and accepted */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
          <div className="text-xs sm:text-sm font-bold text-slate-600">
            Verified and accepted
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 mt-2 tracking-tight">
            {verifiedAndAccepted}
          </div>
          <div className="text-[11px] text-emerald-700/70 font-medium mt-1">
            सत्यापित व स्वीकृत आख्याएं
          </div>
        </div>

        {/* Card 4: Defaulters / pending (Flagged in Soft Red) */}
        <div className="bg-red-50/80 rounded-2xl border border-red-200 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
          <div className="flex items-center justify-between">
            <div className="text-xs sm:text-sm font-bold text-red-900">
              Defaulters / pending
            </div>
            {onSendDefaulterNotice && primaryBreachedDemand && (
              <button
                onClick={() => {
                  const pendingUnits = fieldUnits.filter(u => {
                    const isTarget = primaryBreachedDemand.targetScope === 'ALL_FIELD_UNITS' ||
                      (primaryBreachedDemand.targetUnitIds && primaryBreachedDemand.targetUnitIds.includes(u.id));
                    const isSubmitted = submissions.some(s => s.requisitionId === primaryBreachedDemand.id && s.fieldUnitId === u.id);
                    return isTarget && !isSubmitted;
                  });
                  if (pendingUnits.length === 0) {
                    alert('सभी इकाइयों द्वारा डेटा प्रस्तुत किया जा चुका है।');
                    return;
                  }
                  onSendDefaulterNotice(
                    pendingUnits.map(u => u.id),
                    `[अति-महत्वपूर्ण अनुपालन] डेटा मांग आदेश: ${primaryBreachedDemand.requisitionNumber}`,
                    `महोदय, पत्र संख्या ${primaryBreachedDemand.requisitionNumber} के क्रम में अविलंब डेटा अपलोड करें। समय-सीमा समाप्त होने पर अनुशासनात्मक कार्यवाही की जाएगी।`,
                    primaryBreachedDemand.id
                  );
                }}
                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="सभी डिफ़ॉल्टरों को ईमेल (@vppup.in) व पोर्टल नोटिस भेजें"
              >
                <Send className="w-2.5 h-2.5" />
                <span>ईमेल व नोटिस भेजें</span>
              </button>
            )}
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-red-700 mt-2 tracking-tight">
            {defaultersCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-red-600/80 font-medium mt-1">
            अप्राप्त / डिफ़ॉल्टर आख्याएं
          </div>
        </div>

      </div>

      {/* 4. SECTION-WISE COMPLIANCE (SORTED LOWEST FIRST) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Section-wise compliance, sorted lowest first
            </h2>
            <p className="text-xs text-slate-500">
              प्रकोष्ठवार अनुपालन प्रतिशत • न्यूनतम अनुपालन वाले प्रकोष्ठ प्राथमिकता पर प्रदर्शित
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View mode toggle */}
            <button
              onClick={() => setSectionViewMode(sectionViewMode === 'PRIORITY' ? 'ALL' : 'PRIORITY')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            >
              {sectionViewMode === 'PRIORITY' ? `Show all ${desks.length} cells` : 'Show top priority only'}
            </button>

            {/* Search if in all mode */}
            {sectionViewMode === 'ALL' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="खोजें..."
                  value={sectionSearch}
                  onChange={(e) => setSectionSearch(e.target.value)}
                  className="pl-8 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-indigo-500 w-28 sm:w-36"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAndSortedSections.map(s => {
            const isRedOutlier = s.rate < 20 && s.expected > 0;
            const isFullGreen = s.rate >= 80;

            return (
              <div
                key={s.desk.id}
                onClick={() => onSelectDesk(s.desk)}
                className={`p-4 sm:p-5 rounded-2xl bg-white transition-all cursor-pointer group relative flex flex-col justify-between ${
                  isRedOutlier
                    ? 'border-2 border-red-300 ring-1 ring-red-100 shadow-xs hover:border-red-400'
                    : 'border border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top Bar: Code Pill & Compliance % */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
                      {s.code}
                    </span>
                    <span className={`text-base font-extrabold ${
                      isRedOutlier 
                        ? 'text-red-600' 
                        : isFullGreen 
                          ? 'text-emerald-600' 
                          : 'text-amber-600'
                    }`}>
                      {s.rate}%
                    </span>
                  </div>

                  {/* Section Title */}
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-2.5 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                    {s.label}
                  </h3>
                </div>

                {/* Bottom: Progress Bar */}
                <div className="mt-4 pt-2">
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isRedOutlier 
                          ? 'bg-red-600' 
                          : isFullGreen 
                            ? 'bg-emerald-600' 
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(2, s.rate)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-2">
                    <span>{s.received} / {s.expected} प्राप्त</span>
                    {s.defaulters > 0 ? (
                      <span className="text-red-500 font-semibold">{s.defaulters} लंबित</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">100% पूर्ण</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. DISTRICT COMPLIANCE (HEAT-SHADED, SORTED HIGH TO LOW) */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              District compliance, heat-shaded, sorted high to low
            </h2>
            <p className="text-xs text-slate-500">
              क्षेत्रीय मंडलीय एवं जनपदीय अनुपालन • उच्चतम से न्यूनतम क्रम में व्यवस्थित
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Mandals vs Districts */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setDistrictViewMode('MANDALS')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  districtViewMode === 'MANDALS'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                18 Mandals
              </button>
              <button
                onClick={() => setDistrictViewMode('DISTRICTS')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  districtViewMode === 'DISTRICTS'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Districts
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="मंडल/जनपद खोजें..."
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                className="pl-8 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-indigo-500 w-32 sm:w-40"
              />
            </div>
          </div>
        </div>

        {/* Heat-Shaded Tiles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredDistricts.map(d => {
            const style = getHeatStyle(d.rate);

            return (
              <div
                key={d.name}
                onClick={() => setSelectedDistrictDetail(d)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-center space-y-1.5 flex flex-col justify-between ${style.bg}`}
              >
                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={d.fullName}>
                  {d.name}
                </div>
                
                <div className={`text-2xl sm:text-3xl font-black ${style.textBadge}`}>
                  {d.rate}%
                </div>

                <div className="text-[10px] text-slate-500 font-medium">
                  {d.received} / {d.expected} प्राप्त
                </div>
              </div>
            );
          })}
        </div>

        {/* Heat scale key */}
        <div className="flex items-center justify-end gap-3 text-[11px] text-slate-500 pt-1">
          <span className="font-semibold">Heat Legend:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> ≥3% High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> 1-2% Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> 0% Pending
          </span>
        </div>
      </div>

      {/* DISTRICT DETAIL DRILLDOWN MODAL */}
      {selectedDistrictDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedDistrictDetail.fullName} अनुपालन विवरण
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  कुल {selectedDistrictDetail.unitCount} संस्थान • {selectedDistrictDetail.rate}% अनुपालन दर
                </p>
              </div>

              <button
                onClick={() => setSelectedDistrictDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">अपेक्षित आख्याएं</div>
                <div className="text-lg font-black text-slate-900">{selectedDistrictDetail.expected}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div className="text-xs text-emerald-700 font-medium">प्राप्त आख्याएं</div>
                <div className="text-lg font-black text-emerald-700">{selectedDistrictDetail.received}</div>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <div className="text-xs text-rose-700 font-medium">लंबित डिफ़ॉल्टर</div>
                <div className="text-lg font-black text-rose-700">{selectedDistrictDetail.defaulters}</div>
              </div>
            </div>

            {/* Units List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">क्षेत्राधिकार के संस्थान (Institutions):</div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {selectedDistrictDetail.units.map(unit => (
                  <div key={unit.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{unit.name}</div>
                      <div className="text-[11px] text-slate-500">{unit.designation} • {unit.phone}</div>
                    </div>
                    <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                      {unit.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                onClick={() => setSelectedDistrictDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

