import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Search,
  Layers,
  Building2,
  GraduationCap,
  ArrowLeft,
  Save,
  Package,
  AlertCircle
} from 'lucide-react';
import { FieldUnit, FieldUnitBunch } from '../../types/portal';

interface ManageBunchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldUnits: FieldUnit[];
  bunches: FieldUnitBunch[];
  activeDeskId?: string;
  activeDeskName?: string;
  onSaveBunch: (bunch: FieldUnitBunch) => void;
  onDeleteBunch: (bunchId: string) => void;
  // When opened from CreateRequisitionModal with a selection already made
  // (e.g. user clicked "इस चयन को बंच के रूप में सहेजें"), pre-fill the
  // editor with those unit ids so they can just name it and save.
  prefillUnitIds?: string[];
  // Called after a save that was triggered via prefillUnitIds, so the
  // caller can immediately apply the newly-created bunch as the active
  // target scope without the user having to reopen and pick it.
  onBunchCreatedFromPrefill?: (bunch: FieldUnitBunch) => void;
}

type EditorView = { mode: 'list' } | { mode: 'edit'; bunchId: string | null };

export const ManageBunchesModal: React.FC<ManageBunchesModalProps> = ({
  isOpen,
  onClose,
  fieldUnits,
  bunches,
  activeDeskId,
  activeDeskName,
  onSaveBunch,
  onDeleteBunch,
  prefillUnitIds,
  onBunchCreatedFromPrefill
}) => {
  const [view, setView] = useState<EditorView>(
    prefillUnitIds && prefillUnitIds.length > 0 ? { mode: 'edit', bunchId: null } : { mode: 'list' }
  );
  const [listSearchQuery, setListSearchQuery] = useState<string>('');

  // Editor state
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editUnitIds, setEditUnitIds] = useState<string[]>(prefillUnitIds || []);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');
  const [pickerTypeFilter, setPickerTypeFilter] = useState<'ALL' | 'JD_OFFICE' | 'ITI'>('ALL');
  const [pickerZoneFilter, setPickerZoneFilter] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string>('');

  if (!isOpen) return null;

  const allZones = Array.from(new Set(fieldUnits.map(u => u.zone))).sort();

  const filteredBunches = bunches.filter(b => {
    if (!listSearchQuery.trim()) return true;
    const q = listSearchQuery.toLowerCase();
    return b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q);
  });

  const bunchComposition = (unitIds: string[]) => {
    const units = fieldUnits.filter(u => unitIds.includes(u.id));
    const jdCount = units.filter(u => u.type === 'JD_OFFICE').length;
    const itiCount = units.filter(u => u.type === 'ITI').length;
    return { jdCount, itiCount, total: units.length };
  };

  const openCreateNew = () => {
    setEditName('');
    setEditDescription('');
    setEditUnitIds([]);
    setPickerSearchQuery('');
    setPickerTypeFilter('ALL');
    setPickerZoneFilter('ALL');
    setNameError('');
    setView({ mode: 'edit', bunchId: null });
  };

  const openEdit = (bunch: FieldUnitBunch) => {
    setEditName(bunch.name);
    setEditDescription(bunch.description || '');
    setEditUnitIds(bunch.unitIds);
    setPickerSearchQuery('');
    setPickerTypeFilter('ALL');
    setPickerZoneFilter('ALL');
    setNameError('');
    setView({ mode: 'edit', bunchId: bunch.id });
  };

  const backToList = () => {
    setView({ mode: 'list' });
  };

  const toggleUnit = (unitId: string) => {
    setEditUnitIds(prev => prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]);
  };

  const handleSave = () => {
    if (!editName.trim()) {
      setNameError('कृपया बंच का नाम दर्ज करें।');
      return;
    }
    if (editUnitIds.length === 0) {
      setNameError('कृपया कम से कम एक क्षेत्रीय इकाई चुनें।');
      return;
    }

    const existing = view.mode === 'edit' ? bunches.find(b => b.id === view.bunchId) : undefined;
    const now = new Date().toISOString();

    const bunch: FieldUnitBunch = existing
      ? { ...existing, name: editName.trim(), description: editDescription.trim() || undefined, unitIds: editUnitIds, updatedAt: now }
      : {
          id: `bunch-${Date.now()}`,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          unitIds: editUnitIds,
          createdByDeskId: activeDeskId,
          createdByDeskName: activeDeskName,
          createdAt: now
        };

    onSaveBunch(bunch);

    // Freshly created from a prefilled selection (came from Create
    // Requisition's "save this selection" shortcut) — apply it right away
    // and close, since that's the whole point of that shortcut.
    if (!existing && prefillUnitIds && prefillUnitIds.length > 0 && onBunchCreatedFromPrefill) {
      onBunchCreatedFromPrefill(bunch);
      return;
    }

    backToList();
  };

  const filteredPickerUnits = fieldUnits.filter(u => {
    if (pickerTypeFilter !== 'ALL' && u.type !== pickerTypeFilter) return false;
    if (pickerZoneFilter !== 'ALL' && u.zone !== pickerZoneFilter) return false;
    if (!pickerSearchQuery.trim()) return true;
    const q = pickerSearchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) ||
           u.code.toLowerCase().includes(q) ||
           u.district.toLowerCase().includes(q) ||
           u.zone.toLowerCase().includes(q);
  });

  const selectedComposition = bunchComposition(editUnitIds);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <Package className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {view.mode === 'list' ? 'इकाई बंच प्रबंधन (Manage Field Unit Bunches)' : (view.bunchId ? 'बंच संपादित करें (Edit Bunch)' : 'नया बंच बनाएं (New Bunch)')}
              </h2>
              <p className="text-xs text-slate-300">
                बार-बार उपयोग होने वाली क्षेत्रीय इकाइयों (JD/ITI) के समूह यहां सहेजें, ताकि हर मांग में पुनः चयन न करना पड़े
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LIST VIEW */}
        {view.mode === 'list' && (
          <div className="overflow-y-auto p-6 space-y-4 flex-1 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  placeholder="बंच के नाम से खोजें..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={openCreateNew}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> नया बंच बनाएं
              </button>
            </div>

            {filteredBunches.length === 0 ? (
              <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-xl">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">
                  {bunches.length === 0 ? 'अभी तक कोई बंच नहीं बनाया गया है।' : 'खोज से मेल खाता कोई बंच नहीं मिला।'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  बार-बार एक जैसी इकाइयों को मांग भेजना है? एक बंच बनाकर हर बार समय बचाएं।
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredBunches.map(bunch => {
                  const comp = bunchComposition(bunch.unitIds);
                  return (
                    <div key={bunch.id} className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">{bunch.name}</span>
                        </div>
                        {bunch.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{bunch.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-medium text-slate-600">
                          <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3 text-indigo-500" /> {comp.jdCount} JD</span>
                          <span className="inline-flex items-center gap-1"><GraduationCap className="w-3 h-3 text-indigo-500" /> {comp.itiCount} ITI</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-bold text-indigo-700">कुल {comp.total} इकाइयां</span>
                          {bunch.createdByDeskName && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span>{bunch.createdByDeskName} द्वारा</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(bunch)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200"
                          title="संपादित करें"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === bunch.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => { onDeleteBunch(bunch.id); setConfirmDeleteId(null); }}
                              className="px-2 py-1.5 text-[11px] font-bold bg-rose-600 text-white rounded-lg"
                            >
                              पुष्टि करें
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 text-[11px] font-bold bg-white border border-slate-300 text-slate-600 rounded-lg"
                            >
                              रद्द
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(bunch.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                            title="हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* EDIT / CREATE VIEW */}
        {view.mode === 'edit' && (
          <div className="overflow-y-auto p-6 space-y-4 flex-1 bg-slate-50/50">
            <button
              type="button"
              onClick={backToList}
              className="text-xs font-semibold text-slate-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> सूची पर वापस जाएं
            </button>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">बंच का नाम (Bunch Name) *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); if (nameError) setNameError(''); }}
                    placeholder="उदा. पूर्वांचल के 10 प्रमुख ITI"
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">विवरण (Description) <span className="text-slate-400 font-normal">(ऐच्छिक)</span></label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="इस बंच का उपयोग किस लिए किया जाता है..."
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
              {nameError && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" /> {nameError}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  क्षेत्रीय इकाइयां चुनें (JD कार्यालय एवं ITI दोनों)
                </h4>
                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200/60">
                  चयनित: <strong>{selectedComposition.total}</strong> ({selectedComposition.jdCount} JD + {selectedComposition.itiCount} ITI)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={pickerTypeFilter}
                  onChange={(e) => setPickerTypeFilter(e.target.value as any)}
                  className="text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">सभी प्रकार (JD + ITI)</option>
                  <option value="JD_OFFICE">केवल JD कार्यालय</option>
                  <option value="ITI">केवल ITI</option>
                </select>
                <select
                  value={pickerZoneFilter}
                  onChange={(e) => setPickerZoneFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">समस्त मण्डल (All Zones)</option>
                  {allZones.map(zone => (
                    <option key={zone} value={zone}>{zone} मण्डल</option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={pickerSearchQuery}
                    onChange={(e) => setPickerSearchQuery(e.target.value)}
                    placeholder="नाम, कोड या जनपद खोजें..."
                    className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>दिख रही इकाइयां: {filteredPickerUnits.length}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newIds = new Set([...editUnitIds, ...filteredPickerUnits.map(u => u.id)]);
                      setEditUnitIds(Array.from(newIds));
                    }}
                    className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    दिख रही सभी चुनें
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUnitIds([])}
                    className="px-2.5 py-1 text-xs bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                  >
                    हटाएं (Clear)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                {filteredPickerUnits.map(unit => {
                  const isChecked = editUnitIds.includes(unit.id);
                  return (
                    <label
                      key={unit.id}
                      onClick={(e) => { e.preventDefault(); toggleUnit(unit.id); }}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                      }`}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => {}} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {unit.type === 'JD_OFFICE'
                            ? <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            : <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />}
                          <span className="block font-bold text-slate-900 truncate">{unit.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-mono text-indigo-600">{unit.code}</span>
                          <span>•</span>
                          <span>{unit.district}</span>
                          <span>•</span>
                          <span>{unit.zone}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={backToList}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>बंच सहेजें (Save Bunch)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
