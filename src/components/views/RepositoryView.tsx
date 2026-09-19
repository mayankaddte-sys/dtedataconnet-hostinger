import React, { useRef, useState } from 'react';
import { DirectorateDesk, FieldUnit, RepositoryFile, UserSession } from '../../types/portal';
import {
  FolderOpen,
  Folder,
  Search,
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  FileImage,
  Download,
  Eye,
  Trash2,
  Plus,
  Building2,
  Calendar,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';

interface RepositoryViewProps {
  repositoryFiles: RepositoryFile[];
  desks: DirectorateDesk[];
  fieldUnits: FieldUnit[];
  currentUser: UserSession;
  onSaveFile: (file: RepositoryFile) => void;
  onDeleteFile: (fileId: string) => void;
}

const formatSize = (bytes: number): string => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const iconForFile = (fileType?: string) => {
  if (fileType?.startsWith('image/')) return FileImage;
  if (fileType?.includes('sheet') || fileType?.includes('excel')) return FileSpreadsheet;
  return FileText;
};

export const RepositoryView: React.FC<RepositoryViewProps> = ({
  repositoryFiles,
  desks,
  fieldUnits,
  currentUser,
  onSaveFile,
  onDeleteFile
}) => {
  const canUpload = currentUser.role === 'DIRECTORATE_ADMIN' || currentUser.role === 'DIRECTORATE_DESK';
  const uploadingDesk = desks.find(d => d.id === currentUser.deskId);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deskFilter, setDeskFilter] = useState<string>('ALL');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [previewingFile, setPreviewingFile] = useState<RepositoryFile | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Upload form state
  const [uploadDeskId, setUploadDeskId] = useState<string>(currentUser.deskId || desks[0]?.id || '');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [pendingFileName, setPendingFileName] = useState('');
  const [pendingFileUrl, setPendingFileUrl] = useState('');
  const [pendingFileSize, setPendingFileSize] = useState(0);
  const [pendingFileType, setPendingFileType] = useState('');
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = Array.from(new Set(repositoryFiles.map(f => f.category))).sort();

  const canManage = (file: RepositoryFile) =>
    currentUser.role === 'DIRECTORATE_ADMIN' ||
    (currentUser.role === 'DIRECTORATE_DESK' && currentUser.deskId === file.deskId);

  const filteredFiles = repositoryFiles.filter(f => {
    if (selectedCategory && f.category !== selectedCategory) return false;
    if (deskFilter !== 'ALL' && f.deskId !== deskFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.title.toLowerCase().includes(q) ||
           (f.description || '').toLowerCase().includes(q) ||
           f.fileName.toLowerCase().includes(q) ||
           (f.deskName || '').toLowerCase().includes(q);
  });

  const categoryCounts = categories.map(cat => ({
    name: cat,
    count: repositoryFiles.filter(f => f.category === cat && (deskFilter === 'ALL' || f.deskId === deskFilter)).length
  }));

  const resetUploadForm = () => {
    setUploadDeskId(currentUser.deskId || desks[0]?.id || '');
    setUploadCategory('');
    setUploadTitle('');
    setUploadDescription('');
    setPendingFileName('');
    setPendingFileUrl('');
    setPendingFileSize(0);
    setPendingFileType('');
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFileName(file.name);
    setPendingFileSize(file.size);
    setPendingFileType(file.type);
    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPendingFileUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCategory.trim()) { setFormError('कृपया श्रेणी (folder) चुनें या नई श्रेणी टाइप करें।'); return; }
    if (!uploadTitle.trim()) { setFormError('कृपया फाइल का शीर्षक दर्ज करें।'); return; }
    if (!pendingFileUrl) { setFormError('कृपया फ़ाइल चुनें, या अपलोड पूर्ण होने की प्रतीक्षा करें।'); return; }

    const desk = desks.find(d => d.id === uploadDeskId);
    const newFile: RepositoryFile = {
      id: `repo-${Date.now()}`,
      deskId: uploadDeskId,
      deskName: desk?.name,
      category: uploadCategory.trim(),
      title: uploadTitle.trim(),
      description: uploadDescription.trim() || undefined,
      fileName: pendingFileName,
      fileUrl: pendingFileUrl,
      fileSize: pendingFileSize,
      fileType: pendingFileType,
      uploadedByName: currentUser.displayName,
      uploadedAt: new Date().toISOString()
    };

    onSaveFile(newFile);
    resetUploadForm();
    setShowUploadForm(false);
    setSelectedCategory(newFile.category);
  };

  return (
    <div className="space-y-6">
      {/* Header / Search / Upload trigger */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200">
            <FolderOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">निदेशालय दस्तावेज़ भंडार (Repository)</h2>
            <p className="text-[11px] text-slate-500">प्रत्येक प्रकोष्ठ के महत्वपूर्ण दस्तावेज़ — परिपत्र, प्रारूप, शासनादेश</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="फाइल खोजें..."
              className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs w-48 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
          <select
            value={deskFilter}
            onChange={(e) => setDeskFilter(e.target.value)}
            className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">समस्त प्रकोष्ठ (All Desks)</option>
            {desks.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {canUpload && (
            <button
              type="button"
              onClick={() => { resetUploadForm(); setShowUploadForm(true); }}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> नई फाइल अपलोड करें
            </button>
          )}
        </div>
      </div>

      {/* Category "folders" grid — shown when nothing is searched/selected */}
      {!selectedCategory && !searchQuery.trim() && (
        categories.length === 0 ? (
          <div className="p-10 text-center bg-white border border-dashed border-slate-300 rounded-xl">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">अभी तक कोई फाइल अपलोड नहीं की गई है।</p>
            {canUpload && (
              <button
                type="button"
                onClick={() => { resetUploadForm(); setShowUploadForm(true); }}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
              >
                पहली फाइल अपलोड करें
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoryCounts.map(cat => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all text-left flex flex-col gap-2"
              >
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg w-fit">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 truncate">{cat.name}</div>
                  <div className="text-[11px] text-slate-500">{cat.count} फाइलें</div>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {/* File list — shown once a category is picked, or a search is active */}
      {(selectedCategory || searchQuery.trim()) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                  title="सभी श्रेणियां"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <h3 className="text-xs font-bold text-slate-800">
                {selectedCategory ? selectedCategory : 'खोज परिणाम'}
                <span className="text-slate-400 font-normal ml-1.5">({filteredFiles.length})</span>
              </h3>
            </div>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">कोई फाइल नहीं मिली।</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredFiles.map(file => {
                const Icon = iconForFile(file.fileType);
                return (
                  <div key={file.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-100 text-slate-500 rounded-lg shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{file.title}</div>
                        {file.description && (
                          <div className="text-[11px] text-slate-500 truncate">{file.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium flex-wrap">
                          <span className="inline-flex items-center gap-1"><Building2 className="w-2.5 h-2.5" /> {file.deskName || '—'}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {new Date(file.uploadedAt).toLocaleDateString('hi-IN')}</span>
                          {file.fileSize > 0 && (<><span>•</span><span>{formatSize(file.fileSize)}</span></>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewingFile(file)}
                        className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> देखें
                      </button>
                      {canManage(file) && (
                        confirmDeleteId === file.id ? (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => { onDeleteFile(file.id); setConfirmDeleteId(null); }} className="px-2 py-1.5 text-[11px] font-bold bg-rose-600 text-white rounded-lg">पुष्टि</button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)} className="px-2 py-1.5 text-[11px] font-bold bg-white border border-slate-300 text-slate-600 rounded-lg">रद्द</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(file.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                            title="हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* UPLOAD FORM MODAL */}
      {showUploadForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2"><Upload className="w-4 h-4 text-indigo-400" /> नई फाइल अपलोड करें</h3>
              <button onClick={() => { setShowUploadForm(false); resetUploadForm(); }} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-3">
              {currentUser.role === 'DIRECTORATE_ADMIN' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">प्रकोष्ठ (Desk) *</label>
                  <select
                    value={uploadDeskId}
                    onChange={(e) => setUploadDeskId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  >
                    {desks.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">श्रेणी / फोल्डर (Category) *</label>
                <input
                  type="text"
                  list="repo-category-suggestions"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  placeholder="उदा. परिपत्र (Circulars), प्रारूप (Formats)"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
                <datalist id="repo-category-suggestions">
                  {categories.map(c => (<option key={c} value={c} />))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">शीर्षक (Title) *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">विवरण <span className="text-slate-400 font-normal">(ऐच्छिक)</span></label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">फ़ाइल चुनें (PDF/Excel/Word/Image) *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full text-xs"
                />
                {pendingFileName && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">✓ {pendingFileName} ({formatSize(pendingFileSize)})</p>
                )}
              </div>

              {formError && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" /> {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowUploadForm(false); resetUploadForm(); }} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold">रद्द करें</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">सहेजें (Save)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewingFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">{previewingFile.title}</h3>
              <button onClick={() => setPreviewingFile(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {previewingFile.fileUrl.startsWith('data:image') ? (
              <div className="border rounded-lg overflow-hidden max-h-96 flex items-center justify-center bg-slate-100">
                <img src={previewingFile.fileUrl} alt={previewingFile.title} className="max-h-96 object-contain" />
              </div>
            ) : previewingFile.fileUrl.startsWith('data:application/pdf') ? (
              <iframe src={previewingFile.fileUrl} className="w-full h-96 border rounded-lg" title={previewingFile.title} />
            ) : (
              <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-2">
                <FileText className="w-12 h-12 text-indigo-600 mx-auto" />
                <div className="font-bold text-slate-900 text-sm">{previewingFile.fileName}</div>
                <p className="text-slate-500 text-[11px]">इस फ़ाइल प्रकार का इनलाइन पूर्वावलोकन उपलब्ध नहीं है — डाउनलोड कर देखें।</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <a
                href={previewingFile.fileUrl}
                download={previewingFile.fileName}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> डाउनलोड करें
              </a>
              <button type="button" onClick={() => setPreviewingFile(null)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800">बंद करें</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
