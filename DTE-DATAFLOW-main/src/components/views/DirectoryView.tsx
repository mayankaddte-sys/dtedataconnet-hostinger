import React, { useState } from 'react';
import { DirectorateDesk, FieldUnit } from '../../types/portal';
import { 
  Building2, 
  GraduationCap, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Layers,
  ExternalLink,
  Shield,
  Crown
} from 'lucide-react';

interface DirectoryViewProps {
  desks: DirectorateDesk[];
  fieldUnits: FieldUnit[];
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  desks,
  fieldUnits
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'DESKS' | 'JD_OFFICES' | 'ITIS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const jdOffices = fieldUnits.filter(u => u.type === 'JD_OFFICE');
  const itis = fieldUnits.filter(u => u.type === 'ITI' || u.type === 'GOVT_ITI' || u.type === 'PVT_ITI');

  // Filter desks
  const filteredDesks = desks.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter JD offices
  const filteredJDs = jdOffices.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter ITIs
  const filteredITIs = itis.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="प्रकोष्ठ, संयुक्त निदेशक कार्यालय, आईटीआई या जनपद द्वारा खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
              activeTab === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            सभी ({desks.length + fieldUnits.length})
          </button>
          <button
            onClick={() => setActiveTab('DESKS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
              activeTab === 'DESKS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            मुख्यालय प्रकोष्ठ ({desks.length})
          </button>
          <button
            onClick={() => setActiveTab('JD_OFFICES')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
              activeTab === 'JD_OFFICES' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            संयुक्त निदेशक कार्यालय ({jdOffices.length})
          </button>
          <button
            onClick={() => setActiveTab('ITIS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
              activeTab === 'ITIS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            आईटीआई संस्थान ({itis.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: Headquarter Desks */}
      {(activeTab === 'ALL' || activeTab === 'DESKS') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-700" />
              <h2 className="text-base font-bold text-slate-900">
                प्रशिक्षण निदेशालय मुख्यालय (Headquarters & Desks)
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              शीर्ष सचिवालय एवं {filteredDesks.length} प्रकोष्ठ
            </span>
          </div>

          {/* Director Apex Secretariat Card */}
          {(!searchQuery || 'निदेशक प्रशिक्षण director info.dte@gmail.com dte-director'.toLowerCase().includes(searchQuery.toLowerCase())) && (
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 p-5 rounded-2xl border-2 border-amber-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-500 text-slate-950 rounded-xl shadow-xs shrink-0">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 rounded">
                      राज्य शीर्ष सचिवालय (Apex Secretariat)
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">DTE-DIRECTOR</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    निदेशक, प्रशिक्षण (Director of Training)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    प्रशिक्षण निदेशालय, गुरु गोबिंद सिंह मार्ग, चारबाग, लखनऊ, उत्तर प्रदेश
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700 border-t md:border-t-0 md:border-l border-amber-200/80 pt-3 md:pt-0 md:pl-6 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-slate-900">info.dte@gmail.com</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-amber-700" />
                  <span>+91 522 262 8800</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDesks.map(desk => (
              <div key={desk.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                      {desk.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">मुख्यालय</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {desk.name}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    {desk.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="text-indigo-900 font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>पदभार: {desk.designation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{desk.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{desk.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Joint Director Regional Offices */}
      {(activeTab === 'ALL' || activeTab === 'JD_OFFICES') && filteredJDs.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 px-1">
            <Building2 className="w-5 h-5 text-amber-700" />
            <h2 className="text-base font-bold text-slate-900">
              क्षेत्रीय संयुक्त निदेशक कार्यालय (Regional Joint Director Offices)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJDs.map(jd => (
              <div key={jd.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
                      {jd.code}
                    </span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                      {jd.zone}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {jd.name}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>जनपद: {jd.district}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="text-slate-800 font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>{jd.designation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{jd.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{jd.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: ITI Institutes */}
      {(activeTab === 'ALL' || activeTab === 'ITIS') && filteredITIs.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 px-1">
            <GraduationCap className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              औद्योगिक प्रशिक्षण संस्थान (Industrial Training Institutes - ITIs)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredITIs.map(iti => (
              <div key={iti.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                      {iti.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                      {iti.zone}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {iti.name}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>जनपद: {iti.district}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="text-slate-800 font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{iti.designation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{iti.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{iti.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
