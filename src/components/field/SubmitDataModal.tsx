import React, { useState, useRef } from 'react';
import { 
  Requisition, 
  FieldUnit, 
  SubmissionRecord, 
  FieldSubmissionData 
} from '../../types/portal';
import { PriorityBadge } from '../common/PriorityBadge';
import { CountdownTimer } from '../common/CountdownTimer';
import { formatDateTime, calculateCountdown } from '../../utils/dateUtils';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import { useBlobPreviewUrl } from '../../utils/fileUtils';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  FileSpreadsheet, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Send,
  Printer,
  FileCheck,
  Trash2,
  Eye,
  FileUp,
  Stamp,
  Paperclip,
  PenTool,
  Fingerprint,
  Check,
  BookOpen,
  Download
} from 'lucide-react';

interface SubmitDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: Requisition;
  fieldUnit: FieldUnit;
  existingSubmission?: SubmissionRecord;
  onSubmit: (data: Partial<SubmissionRecord>) => void;
  onRequestExtension: (requisitionId: string, reason: string) => void;
}

export const SubmitDataModal: React.FC<SubmitDataModalProps> = ({
  isOpen,
  onClose,
  requisition,
  fieldUnit,
  existingSubmission,
  onSubmit,
  onRequestExtension
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Whether the directorate marked a signed letter / digital signature as
  // mandatory for this specific requisition. Uses the existing
  // requireOfficialSealUpload flag on the Requisition type — if the desk
  // didn't ask for a sealed/signed letter, it isn't mandatory here either.
  const signedLetterRequired = Boolean(requisition.requireOfficialSealUpload);

  // Form State
  const [formData, setFormData] = useState<FieldSubmissionData>(() => {
    return existingSubmission?.data || {};
  });

  // CUSTOM_PERFORMA mode: the filled template the ITI uploads back.
  const [performaSubmissionFileName, setPerformaSubmissionFileName] = useState<string>(() => {
    return existingSubmission?.performaSubmissionFileName || '';
  });
  const [performaSubmissionFileUrl, setPerformaSubmissionFileUrl] = useState<string>(() => {
    return existingSubmission?.performaSubmissionFileUrl || '';
  });
  const performaSubmissionFileInputRef = useRef<HTMLInputElement>(null);

  const handlePerformaSubmissionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPerformaSubmissionFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPerformaSubmissionFileUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const [googleSheetSubmittedUrl, setGoogleSheetSubmittedUrl] = useState<string>(() => {
    return existingSubmission?.googleSheetSubmittedUrl || '';
  });

  const [googleFormResponseId, setGoogleFormResponseId] = useState<string>(() => {
    return existingSubmission?.googleFormResponseId || '';
  });

  const [officerName, setOfficerName] = useState<string>(() => {
    return existingSubmission?.submittedByOfficer || fieldUnit.headOfficer || '';
  });

  const [officerDesignation, setOfficerDesignation] = useState<string>(() => {
    return existingSubmission?.officerDesignation || fieldUnit.designation || '';
  });

  const [officerContact, setOfficerContact] = useState<string>(() => {
    return existingSubmission?.officerContact || fieldUnit.phone || '';
  });

  // Signature & Verification Mode ('FINGER' or 'UPLOAD')
  // Defaults to whichever mode this submission actually used, so reopening
  // an existing submission shows the letter that's really there. Uses the
  // authoritative signatureType flag rather than just checking for an
  // uploadedDocumentUrl — that field is also populated as a fallback copy
  // of the finger signature when no separate file was uploaded, so relying
  // on its mere presence would wrongly default every finger-only
  // submission to the Upload tab too.
  const [signatureMode, setSignatureMode] = useState<'FINGER' | 'UPLOAD'>(() => {
    if (existingSubmission?.signatureType === 'UPLOADED_DOCUMENT' || existingSubmission?.signatureType === 'BOTH') return 'UPLOAD';
    if (existingSubmission?.signatureType === 'FINGER_DRAWN') return 'FINGER';
    // Older records saved before signatureType existed: fall back to
    // checking whether the uploaded doc is genuinely different from the
    // signature (i.e. a real separate file was attached).
    if (existingSubmission && existingSubmission.uploadedDocumentUrl && existingSubmission.uploadedDocumentUrl !== existingSubmission.digitalSignatureDataUrl) return 'UPLOAD';
    return 'FINGER';
  });

  // Digital Signature State (Drawn by Finger / Touch / Mouse)
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState<string>(() => {
    return existingSubmission?.digitalSignatureDataUrl || '';
  });

  // Signed Letter Upload State — only seeded from the existing submission
  // when it was a genuine separate upload, not the finger-signature copy
  // that gets stored as a fallback in uploadedDocumentUrl/Name when no
  // separate file was attached (see signatureMode init above for why).
  const existingHasGenuineUpload =
    existingSubmission?.signatureType === 'UPLOADED_DOCUMENT' ||
    existingSubmission?.signatureType === 'BOTH' ||
    (!!existingSubmission?.uploadedDocumentUrl && existingSubmission.uploadedDocumentUrl !== existingSubmission.digitalSignatureDataUrl);

  const [uploadedFileName, setUploadedFileName] = useState<string>(() => {
    return existingHasGenuineUpload ? (existingSubmission?.uploadedDocumentName || '') : '';
  });

  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>(() => {
    return existingHasGenuineUpload ? (existingSubmission?.uploadedDocumentUrl || '') : '';
  });

  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [dispatchNumber, setDispatchNumber] = useState<string>(() => {
    return existingSubmission?.signedLetterDispatchNumber || `${fieldUnit.code}/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;
  });
  const [dispatchDate, setDispatchDate] = useState<string>(() => {
    return existingSubmission?.signedLetterDate || new Date().toISOString().split('T')[0];
  });

  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [previewingDocument, setPreviewingDocument] = useState<boolean>(false);
  const [previewingAttachedOrder, setPreviewingAttachedOrder] = useState<boolean>(false);
  const [showPrintDraft, setShowPrintDraft] = useState<boolean>(false);

  const [lateJustification, setLateJustification] = useState<string>(() => {
    return existingSubmission?.lateJustification || '';
  });

  const [declarationChecked, setDeclarationChecked] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [extensionReason, setExtensionReason] = useState<string>('');
  const orderPdfBlobUrl = useBlobPreviewUrl(requisition.orderDocumentUrl);
  const signedLetterPdfBlobUrl = useBlobPreviewUrl(uploadedFileUrl);
  const [showExtensionInput, setShowExtensionInput] = useState<boolean>(false);

  if (!isOpen) return null;

  const countdown = calculateCountdown(requisition.deadline);
  const isExpired = countdown.isOverdue;
  const isLocked = isExpired && requisition.isStrictCutoff && !existingSubmission;

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Handle file selection (both browse and drag-and-drop)
  const processUploadedFile = (file: File) => {
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedFileUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFileName('');
    setUploadedFileUrl('');
    setUploadedFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      alert('समय-सीमा समाप्त होने के कारण यह डेटा अनुरोध लॉक हो चुका है। कृपया निदेशालय से समय-विस्तार का अनुरोध करें।');
      return;
    }

    if (requisition.requireOfficerDeclaration && !declarationChecked && !existingSubmission) {
      alert('कृपया डेटा की सत्यता प्रमाणित करने हेतु घोषणा बॉक्स (Declaration Checkbox) को चेक करें।');
      return;
    }

    if (requisition.mode === 'CUSTOM_PERFORMA' && !performaSubmissionFileUrl) {
      alert('कृपया भरा हुआ प्रपत्र (Filled Performa) अपलोड करें।');
      return;
    }

    // Signature / signed-letter is only mandatory when the directorate
    // explicitly asked for one on this requisition (requiresSignedLetter).
    // If the desk didn't request it, field units may submit without either.
    if (signedLetterRequired && !digitalSignatureUrl && !uploadedFileName && !existingSubmission) {
      alert('कृपया सबमिशन पूर्ण करने हेतु डिजिटल हस्ताक्षर (Digital Signature) करें अथवा हस्ताक्षरित शासकीय पत्र संलग्न करें।');
      return;
    }

    if (isExpired && requisition.allowLateSubmissionWithReason && !lateJustification.trim()) {
      alert('समय-सीमा समाप्त हो चुकी है। कृपया विलंब से सबमिट करने का वैध कारण दर्ज करें।');
      return;
    }

    let finalSignatureType: 'UPLOADED_DOCUMENT' | 'FINGER_DRAWN' | 'BOTH' | undefined;
    if (digitalSignatureUrl && uploadedFileName) {
      finalSignatureType = 'BOTH';
    } else if (digitalSignatureUrl) {
      finalSignatureType = 'FINGER_DRAWN';
    } else if (uploadedFileName) {
      finalSignatureType = 'UPLOADED_DOCUMENT';
    } else {
      // Neither a finger signature nor an uploaded letter was provided.
      // Only reachable when signedLetterRequired is false (the mandatory
      // check above would otherwise have blocked submission).
      finalSignatureType = undefined;
    }

    const finalDocName = uploadedFileName || (digitalSignatureUrl ? `${fieldUnit.code}_Digital_Sign_Report.pdf` : undefined);

    const payload: Partial<SubmissionRecord> = {
      id: existingSubmission?.id || `sub-${Date.now()}-${fieldUnit.id}`,
      requisitionId: requisition.id,
      fieldUnitId: fieldUnit.id,
      fieldUnitName: fieldUnit.name,
      fieldUnitType: fieldUnit.type,
      fieldUnitZone: fieldUnit.zone,
      fieldUnitDistrict: fieldUnit.district,
      submittedAt: new Date().toISOString(),
      submittedByOfficer: officerName.trim(),
      officerDesignation: officerDesignation.trim(),
      officerContact: officerContact.trim(),
      status: 'SUBMITTED',
      isLate: isExpired,
      lateJustification: isExpired ? lateJustification.trim() : undefined,
      data: formData,
      googleSheetSubmittedUrl: googleSheetSubmittedUrl.trim() || undefined,
      googleFormResponseId: googleFormResponseId.trim() || undefined,
      uploadedDocumentName: finalDocName,
      uploadedDocumentUrl: uploadedFileUrl || digitalSignatureUrl || undefined,
      signedLetterDispatchNumber: dispatchNumber.trim() || undefined,
      signedLetterDate: dispatchDate || undefined,
      digitalSignatureDataUrl: digitalSignatureUrl || undefined,
      signatureType: finalSignatureType,
      performaSubmissionFileName: performaSubmissionFileName.trim() || undefined,
      performaSubmissionFileUrl: performaSubmissionFileUrl || undefined
    };

    onSubmit(payload);
    setIsSubmittedSuccess(true);
  };

  const handleExtensionSubmit = () => {
    if (!extensionReason.trim()) {
      alert('कृपया समय-विस्तार का वैध कारण दर्ज करें।');
      return;
    }
    onRequestExtension(requisition.id, extensionReason.trim());
    alert('समय-विस्तार अनुरोध निदेशालय प्रकोष्ठ को प्रेषित कर दिया गया है।');
    setShowExtensionInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
                {requisition.requisitionNumber}
              </span>
              <PriorityBadge priority={requisition.priority} isAssemblyQuestion={requisition.isAssemblyQuestion} size="sm" />
            </div>
            <h2 className="text-base font-bold text-white mt-1 line-clamp-1">
              {requisition.title}
            </h2>
            <div className="text-xs text-slate-300 mt-0.5">
              प्रकोष्ठ: <strong className="text-white">{requisition.deskName}</strong> • सबमिशन इकाई: <strong className="text-amber-300">{fieldUnit.name}</strong>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {isSubmittedSuccess ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              आख्या एवं डिजिटल हस्ताक्षर सफलतापूर्वक प्रेषित!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              डेटा एवं हस्ताक्षरित शासकीय पत्र निदेशालय प्रकोष्ठ (<strong className="text-slate-800">{requisition.deskName}</strong>) को वास्तविक समय (Real-time) में प्रस्तुत कर दिया गया है।
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {digitalSignatureUrl && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-800">
                  <Fingerprint className="w-4 h-4 text-blue-600" />
                  <span>डिजिटल फिंगरप्रिंट / ई-हस्ताक्षर सत्यापित</span>
                </div>
              )}
              {uploadedFileName && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>हस्ताक्षरित पत्र: {uploadedFileName}</span>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-md transition-colors"
              >
                डैशबोर्ड पर वापस जाएं
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50 text-xs">
            
            {/* Cutoff & Deadline Alert Banner */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isExpired 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-indigo-50/60 border-indigo-200 text-indigo-900'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  {isExpired ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <Clock className="w-4 h-4 text-indigo-600 shrink-0" />}
                  <span>अंतिम तिथि / सबमिशन समय-सीमा: {formatDateTime(requisition.deadline)}</span>
                </div>
                <p className="text-[11px] opacity-90 leading-tight">
                  {requisition.isStrictCutoff 
                    ? '⚠️ सख्त समय-सीमा (Strict Cutoff) प्रभावी है।' 
                    : 'समय पर आख्या प्रस्तुत करना अनिवार्य है।'}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <CountdownTimer deadline={requisition.deadline} isStrictCutoff={requisition.isStrictCutoff} />
                {isExpired && (
                  <button
                    type="button"
                    onClick={() => setShowExtensionInput(!showExtensionInput)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] transition-colors"
                  >
                    समय-विस्तार मांगें
                  </button>
                )}
              </div>
            </div>

            {/* Extension Request Input Area (if triggered) */}
            {showExtensionInput && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 space-y-3 animate-in fade-in">
                <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>निदेशालय से समय-सीमा विस्तार (Deadline Extension) का अनुरोध</span>
                </h4>
                <textarea
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="समय-विस्तार का वैध कारण एवं अपेक्षित समय दर्ज करें..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-hidden"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExtensionInput(false)}
                    className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 font-bold"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={handleExtensionSubmit}
                    className="px-3 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700"
                  >
                    अनुरोध प्रेषित करें
                  </button>
                </div>
              </div>
            )}

            {/* Requisition Instructions Note */}
            {requisition.description && (
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  निदेशालय निर्देश / विवरण (Instructions):
                </span>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {requisition.description}
                </p>
              </div>
            )}

            {/* Attached Official Government Orders & Guidelines Card */}
            {(requisition.orderDocumentName || requisition.orderReferenceNumber || requisition.orderDocumentUrl || requisition.attachmentNoticeDocUrl) && (
              <div className="p-4 bg-linear-to-r from-indigo-50 via-blue-50/60 to-slate-50 rounded-xl border border-indigo-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-2xs shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">
                        शासनादेश / विभागीय मार्गदर्शिका संलग्न (Official Order Attached)
                      </span>
                      {requisition.orderDate && (
                        <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                          दिनांक: {requisition.orderDate}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap font-mono">
                      <span>पत्रांक: <strong className="text-slate-800">{requisition.orderReferenceNumber || requisition.requisitionNumber}</strong></span>
                      {requisition.orderDocumentName && (
                        <span className="text-indigo-700 font-sans truncate">• {requisition.orderDocumentName}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewingAttachedOrder(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>शासनादेश देखें (View Order)</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTION: Google Sheet Integration (if applicable) */}
            {(requisition.mode === 'GOOGLE_SHEET' || requisition.mode === 'HYBRID') && requisition.googleSheetConfig && (
              <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Google Spreadsheet Integration</span>
                  </div>
                  <a
                    href={requisition.googleSheetConfig.sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <span>Google Sheet खोलें (Open Master Sheet)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-slate-600">
                  {requisition.googleSheetConfig.sheetInstructions || 'कृपया मास्टर शीट में अपनी इकाई की पंक्ति में विवरण भरें तथा सबमिशन पुष्टि लिंक नीचे दर्ज करें।'}
                </p>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Your Filled Sheet / Tab Link (Google Sheet URL) *
                  </label>
                  <input
                    type="url"
                    disabled={isLocked}
                    value={googleSheetSubmittedUrl}
                    onChange={(e) => setGoogleSheetSubmittedUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=123"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                    required={requisition.mode === 'GOOGLE_SHEET'}
                  />
                </div>
              </div>
            )}

            {/* SECTION: Google Form Integration (if applicable) */}
            {requisition.mode === 'GOOGLE_FORM' && requisition.googleFormConfig && (
              <div className="bg-white p-5 rounded-xl border border-purple-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                  <div className="flex items-center gap-2 text-purple-900 font-bold">
                    <ExternalLink className="w-4 h-4 text-purple-700" />
                    <span>Google Form Entry</span>
                  </div>
                  <a
                    href={requisition.googleFormConfig.formUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <span>Google Form खोलें (Open Google Form)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Google Form Response ID / Confirmation Token *
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={googleFormResponseId}
                    onChange={(e) => setGoogleFormResponseId(e.target.value)}
                    placeholder="e.g. RESP-2026-9941"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden disabled:bg-slate-100"
                    required
                  />
                </div>
              </div>
            )}

            {/* SECTION: Custom Performa (download template, upload filled) */}
            {requisition.mode === 'CUSTOM_PERFORMA' && (
              <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-100">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    अनुकूलित प्रपत्र (Custom Performa)
                  </h3>
                </div>

                {requisition.performaFileUrl && (
                  <a
                    href={requisition.performaFileUrl}
                    download={requisition.performaFileName || 'template'}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>टेम्पलेट डाउनलोड करें ({requisition.performaFileName})</span>
                  </a>
                )}

                <p className="text-[11px] text-slate-500">
                  उपरोक्त टेम्पलेट डाउनलोड करें, ऑफ़लाइन भरें, और भरी हुई फ़ाइल यहां अपलोड करें।
                </p>

                <input
                  ref={performaSubmissionFileInputRef}
                  type="file"
                  accept=".pdf,.xls,.xlsx,.doc,.docx"
                  onChange={handlePerformaSubmissionFileChange}
                  disabled={isLocked}
                  className="hidden"
                />

                {performaSubmissionFileName ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">{performaSubmissionFileName}</span>
                    </div>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setPerformaSubmissionFileName('');
                          setPerformaSubmissionFileUrl('');
                          if (performaSubmissionFileInputRef.current) performaSubmissionFileInputRef.current.value = '';
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => performaSubmissionFileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-slate-300 rounded-lg text-center hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <FileUp className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                    <div className="text-xs font-bold text-slate-700">भरी हुई फ़ाइल अपलोड करें</div>
                  </button>
                )}
              </div>
            )}

            {/* SECTION: Custom Dynamic Form Fields */}
            {(requisition.mode === 'CUSTOM_FORM' || requisition.mode === 'HYBRID') && requisition.customFields && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Required Data Fields ({requisition.customFields.length} Fields)
                  </h3>
                </div>

                <div className="space-y-4">
                  {requisition.customFields.map((field) => {
                    const value = formData[field.id] !== undefined ? formData[field.id] : '';

                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block font-bold text-slate-800">
                          {field.label} {field.unit ? <span className="font-normal text-slate-500">({field.unit})</span> : ''}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {field.helpText && (
                          <p className="text-[11px] text-slate-500 mb-1">{field.helpText}</p>
                        )}

                        {/* Render by field type */}
                        {field.type === 'textarea' ? (
                          <textarea
                            disabled={isLocked}
                            value={String(value)}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder || 'विवरण दर्ज करें (Enter details)...'}
                            rows={3}
                            required={field.required}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                          />
                        ) : field.type === 'select' ? (
                          <select
                            disabled={isLocked}
                            value={String(value)}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            required={field.required}
                            className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                          >
                            <option value="">-- विकल्प चुनें (Select Option) --</option>
                            {(field.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'radio' ? (
                          <div className="space-y-1.5 pt-1">
                            {(field.options || []).map(opt => (
                              <label key={opt} className="flex items-center gap-2 p-2 rounded border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                                <input
                                  type="radio"
                                  disabled={isLocked}
                                  name={field.id}
                                  value={opt}
                                  checked={value === opt}
                                  onChange={() => handleFieldChange(field.id, opt)}
                                  required={field.required}
                                  className="text-indigo-600"
                                />
                                <span className="text-xs text-slate-800 font-medium">{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            disabled={isLocked}
                            value={String(value)}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            required={field.required}
                            className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                          />
                        ) : field.type === 'checkbox' ? (
                          <div className="space-y-1.5 pt-1">
                            {(field.options || []).map(opt => {
                              const selected: string[] = Array.isArray(value) ? value as string[] : [];
                              const isChecked = selected.includes(opt);
                              return (
                                <label key={opt} className="flex items-center gap-2 p-2 rounded border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                                  <input
                                    type="checkbox"
                                    disabled={isLocked}
                                    checked={isChecked}
                                    onChange={() => {
                                      const next = isChecked
                                        ? selected.filter(o => o !== opt)
                                        : [...selected, opt];
                                      handleFieldChange(field.id, next);
                                    }}
                                    className="rounded text-indigo-600"
                                  />
                                  <span className="text-xs text-slate-800 font-medium">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            disabled={isLocked}
                            value={String(value)}
                            onChange={(e) => handleFieldChange(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                            placeholder={field.placeholder || ''}
                            required={field.required}
                            min={field.min}
                            max={field.max}
                            step="any"
                            className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION: FINGER DIGITAL SIGNATURE & OFFICIAL LETTER AUTHENTICATION */}
            <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-indigo-950 font-bold">
                  <Stamp className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs uppercase tracking-wider font-extrabold">
                    Official Verification & Digital Authentication (शासकीय प्रमाणीकरण)
                  </h3>
                  {signedLetterRequired ? (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      अनिवार्य / Required
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      वैकल्पिक / Optional
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintDraft(true)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors border border-indigo-200"
                  title="हस्ताक्षर हेतु आधिकारिक आवरण पत्र का प्रारूप देखें / प्रिंट करें"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Generate Covering Draft (प्रारूप)</span>
                </button>
              </div>

              {/* Dispatch Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Dispatch / Letter No. (पत्रांक संख्या)
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={dispatchNumber}
                    onChange={(e) => setDispatchNumber(e.target.value)}
                    placeholder="e.g. रा.आ./2026/142"
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Letter Date (पत्र दिनांक)
                  </label>
                  <input
                    type="date"
                    disabled={isLocked}
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>

              {/* Mode Selector Tabs: Finger Digital Sign vs Scanned Letter Upload */}
              <div className="flex border-b border-slate-200 pt-1">
                <button
                  type="button"
                  onClick={() => setSignatureMode('FINGER')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                    signatureMode === 'FINGER'
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Fingerprint className="w-4 h-4 text-blue-600" />
                  <span>उंगली से डिजिटल हस्ताक्षर (Finger Sign)</span>
                  {digitalSignatureUrl && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSignatureMode('UPLOAD')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                    signatureMode === 'UPLOAD'
                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  <span>हस्ताक्षरित पत्र अपलोड (Upload Doc)</span>
                  {uploadedFileName && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  )}
                </button>
              </div>

              {/* TAB 1: FINGER / TOUCH DIGITAL SIGNATURE CANVAS */}
              {signatureMode === 'FINGER' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <DigitalSignaturePad
                    initialSignature={digitalSignatureUrl}
                    officerName={officerName}
                    officerDesignation={officerDesignation}
                    onSaveSignature={(dataUrl) => setDigitalSignatureUrl(dataUrl)}
                    onClear={() => setDigitalSignatureUrl('')}
                    required={signedLetterRequired}
                  />

                  {digitalSignatureUrl && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-9 bg-white border border-blue-200 rounded p-0.5 flex items-center justify-center shadow-2xs">
                          <img src={digitalSignatureUrl} alt="Digital Sign" className="max-h-full object-contain" />
                        </div>
                        <div>
                          <div className="font-bold text-blue-900 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ई-हस्ताक्षर सक्रिय (Digital Signature Attached)</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            प्रमाणित: {officerName || 'कार्यालय प्रमुख'} • दिनांक: {dispatchDate}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewingDocument(true)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Letter</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SCANNED LETTER FILE UPLOAD */}
              {signatureMode === 'UPLOAD' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    className="hidden"
                    disabled={isLocked}
                  />

                  {uploadedFileName ? (
                    <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-lg shrink-0 shadow-2xs">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {uploadedFileName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Signed & Attached
                            </span>
                            {uploadedFileSize && <span>• {uploadedFileSize}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewingDocument(true)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                          title="हस्ताक्षरित पत्र देखें"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View</span>
                        </button>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                            title="हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => !isLocked && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        isDragOver 
                          ? 'border-indigo-500 bg-indigo-50/80 scale-99' 
                          : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 bg-slate-50/40'
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-2xs">
                        <FileUp className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-slate-800 text-xs">
                        कार्यालय प्रमुख द्वारा हस्ताक्षरित एवं मुहरयुक्त पत्र यहां अपलोड करें
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Click to browse or Drag & Drop signed letter (PDF, JPG, PNG up to 15MB)
                      </p>
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 shadow-2xs">
                          <Paperclip className="w-3 h-3 text-indigo-600" /> Choose Signed Letter (फाइल चुनें)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Late submission justification textarea if required */}
            {isExpired && !isLocked && (
              <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 space-y-2">
                <label className="block font-bold text-amber-950">
                  Late Submission Justification Note *
                </label>
                <textarea
                  value={lateJustification}
                  onChange={(e) => setLateJustification(e.target.value)}
                  placeholder="कृपया बताएं कि निर्धारित समय-सीमा के उपरांत डेटा सबमिट करने का क्या कारण है (Enter reason for late submission)..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900"
                  required
                />
              </div>
            )}

            {/* SECTION: Head of Office Officer Declaration */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Officer Verification & Self-Declaration
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Officer Name *</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="अधिकारी का नाम दर्ज करें (Officer Name)"
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={officerDesignation}
                    onChange={(e) => setOfficerDesignation(e.target.value)}
                    placeholder="e.g. Principal / Nodal Officer"
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile / Contact No. *</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={officerContact}
                    onChange={(e) => setOfficerContact(e.target.value)}
                    placeholder="e.g. +91 94XXXXXXXX"
                    className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Declaration Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors">
                <input
                  type="checkbox"
                  disabled={isLocked}
                  checked={declarationChecked}
                  onChange={(e) => setDeclarationChecked(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  required
                />
                <span className="text-[11px] text-slate-700 leading-relaxed font-medium select-none">
                  मैं प्रमाणित करता/करती हूँ कि उपर्युक्त दिया गया डेटा संस्थान के मूल अभिलेखों, उपस्थिति पंजिकाओं एवं प्रयोगशाला लॉग से सत्यापित है। यह आख्या कार्यालय प्रमुख के अनुमोदनोपरांत प्रस्तुत की जा रही है।
                </span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                Cancel (रद्द करें)
              </button>
              <button
                type="submit"
                disabled={isLocked}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>Submit Official Report</span>
              </button>
            </div>

          </form>
        )}

      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewingDocument && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Stamp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  हस्ताक्षरित शासकीय पत्र पूर्वावलोकन (Signed Letter Preview)
                </h3>
              </div>
              <button onClick={() => setPreviewingDocument(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2 text-slate-600">
                <span>पत्रांक: <strong className="text-slate-900">{dispatchNumber}</strong></span>
                <span>दिनांक: <strong className="text-slate-900">{dispatchDate}</strong></span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">इकाई / संस्थान:</span>
                <span className="font-bold text-slate-900 text-sm">{fieldUnit.name} ({fieldUnit.code})</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">प्रमाणित करने वाले अधिकारी:</span>
                <span className="font-bold text-slate-800">{officerName} • {officerDesignation} ({officerContact})</span>
              </div>

              {/* Digital Signature rendering */}
              {digitalSignatureUrl && (
                <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-blue-600" />
                    <span>उंगली द्वारा डिजिटल हस्ताक्षर (Finger / Touch Signature)</span>
                  </span>
                  <div className="border border-dashed border-blue-300 rounded-lg p-3 bg-blue-50/20 flex items-center justify-center">
                    <img src={digitalSignatureUrl} alt="Digital Signature" className="max-h-24 object-contain" />
                  </div>
                </div>
              )}

              {/* If a separately uploaded file exists — i.e. it isn't just the
                  finger-signature reused as a placeholder — show it here.
                  Without this check, a finger-signed-only submission would
                  render the same signature image twice. */}
              {uploadedFileUrl && uploadedFileUrl !== digitalSignatureUrl && (
                uploadedFileUrl.startsWith('data:image') ? (
                  <div className="border rounded-lg overflow-hidden max-h-80 flex items-center justify-center bg-slate-100">
                    <img src={uploadedFileUrl} alt="Signed letter" className="max-h-80 object-contain" />
                  </div>
                ) : uploadedFileUrl.startsWith('data:application/pdf') ? (
                  <div className="border rounded-lg overflow-hidden bg-slate-100">
                    <iframe
                       src={signedLetterPdfBlobUrl || uploadedFileUrl}
                      title="Signed letter"
                      className="w-full h-96"
                    />
                  </div>
                ) : (
                  uploadedFileName && (
                    <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-2">
                      <FileCheck className="w-10 h-10 text-indigo-600 mx-auto" />
                      <div className="font-bold text-slate-900 text-sm">{uploadedFileName}</div>
                      <p className="text-slate-500 text-[11px]">
                        हस्ताक्षरित एवं मुहरयुक्त आधिकारिक पत्र संलग्न है। सबमिशन के पश्चात निदेशालय प्रकोष्ठ द्वारा इसका परीक्षण किया जाएगा।
                      </p>
                    </div>
                  )
                )
              )}

              {uploadedFileUrl && uploadedFileUrl !== digitalSignatureUrl && (
                <div className="flex justify-end">
                  <a
                    href={uploadedFileUrl}
                    download={uploadedFileName || 'signed-letter'}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>डाउनलोड करें (Download)</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setPreviewingDocument(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE OFFICIAL COVERING DRAFT MODAL */}
      {showPrintDraft && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  आधिकारिक आवरण पत्र प्रारूप (Official Covering Letter Draft)
                </h3>
              </div>
              <button onClick={() => setShowPrintDraft(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Letterhead Draft */}
            <div className="bg-white p-6 rounded-xl border border-slate-300 space-y-4 text-xs font-serif text-slate-900 leading-relaxed shadow-sm">
              <div className="text-center border-b pb-3 space-y-1">
                <div className="font-bold text-sm tracking-wide uppercase">कार्यालय: {fieldUnit.name}</div>
                <div className="text-[11px] text-slate-600">क्षेत्रीय मंडल: {fieldUnit.zone} • जनपद: {fieldUnit.district} (उ.प्र.)</div>
                <div className="text-[11px] text-slate-500 font-mono">इकाई कोड: {fieldUnit.code} • दूरभाष: {fieldUnit.phone}</div>
              </div>

              <div className="flex justify-between font-sans text-[11px] font-bold text-slate-700">
                <span>पत्रांक: {dispatchNumber}</span>
                <span>दिनांक: {dispatchDate}</span>
              </div>

              <div className="space-y-1">
                <div>सेवा में,</div>
                <div className="font-bold pl-4">प्रभारी अधिकारी / निदेशक,</div>
                <div className="pl-4">{requisition.deskName},</div>
                <div className="pl-4">प्रशिक्षण निदेशालय, उत्तर प्रदेश, लखनऊ।</div>
              </div>

              <div className="font-bold text-slate-900 bg-slate-100 p-2 rounded text-[11px] font-sans">
                विषय: {requisition.title} (मांग सं.: {requisition.requisitionNumber}) के संबंध में वांछित सूचना प्रेषण।
              </div>

              <p>महोदय,</p>
              <p className="indent-4">
                उपर्युक्त संदर्भित विषयक निदेशालय के मांग आदेश के अनुपालन में संस्थान का वांछित प्रमाणित डेटा एवं आख्या विभागीय पोर्टल पर ऑनलाइन सबमिट कर दी गई है।
              </p>

              {/* Signature & Seal Block */}
              <div className="pt-8 flex justify-end">
                <div className="text-center space-y-1 min-w-44">
                  {digitalSignatureUrl ? (
                    <div className="mb-1 flex flex-col items-center">
                      <img src={digitalSignatureUrl} alt="Officer Signature" className="h-12 object-contain" />
                      <div className="text-[9px] text-blue-800 font-mono font-bold">[Digitally Signed via Touch Pad]</div>
                    </div>
                  ) : (
                    <div className="w-32 border-b border-dashed border-slate-400 mb-1 mx-auto"></div>
                  )}
                  <div className="font-bold font-sans">({officerName || 'हस्ताक्षर'})</div>
                  <div className="text-[11px] text-slate-600 font-sans">{officerDesignation || 'प्रधानाचार्य / नोडल अधिकारी'}</div>
                  <div className="text-[10px] text-slate-400 font-sans">[कार्यालय मुहर / Official Seal]</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>प्रिंट / PDF सेव करें (Print Letter)</span>
              </button>

              <button
                onClick={() => setShowPrintDraft(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW ATTACHED GOVERNMENT ORDER MODAL */}
      {previewingAttachedOrder && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  संलग्न शासकीय आदेश / मार्गदर्शिका (Official Order / Guidelines)
                </h3>
              </div>
              <button onClick={() => setPreviewingAttachedOrder(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b pb-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">शासनादेश / पत्रांक संख्या:</span>
                  <span className="font-bold font-mono text-slate-900">{requisition.orderReferenceNumber || requisition.requisitionNumber}</span>
                </div>
                {requisition.orderDate && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">आदेश दिनांक:</span>
                    <span className="font-bold text-slate-900">{requisition.orderDate}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">मांग आदेश शीर्षक:</span>
                <span className="font-bold text-slate-900 text-xs">{requisition.title}</span>
              </div>

              {requisition.orderDocumentName && (
                <div>
                  <span className="text-slate-500 block text-[11px]">संलग्नक फाइल नाम:</span>
                  <span className="font-bold text-indigo-700">{requisition.orderDocumentName}</span>
                </div>
              )}

              {requisition.orderDocumentUrl && requisition.orderDocumentUrl.startsWith('data:image') ? (
                <div className="border rounded-lg overflow-hidden max-h-80 flex items-center justify-center bg-slate-100">
                  <img src={requisition.orderDocumentUrl} alt="Attached Order Document" className="max-h-80 object-contain" />
                </div>
              ) : requisition.orderDocumentUrl && requisition.orderDocumentUrl.startsWith('data:application/pdf') ? (
                <div className="border rounded-lg overflow-hidden bg-slate-100">
                  <iframe
                   src={orderPdfBlobUrl || requisition.orderDocumentUrl}
                    title="Attached Order Document"
                    className="w-full h-96"
                  />
                </div>
              ) : (
                <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-2">
                  <FileCheck className="w-12 h-12 text-indigo-600 mx-auto" />
                  <div className="font-bold text-slate-900 text-sm">
                    {requisition.orderDocumentName || 'निदेशालय आधिकारिक आदेश पत्र (Official Document Attached)'}
                  </div>
                  <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                    निदेशालय द्वारा जारी यह शासनादेश/परिपत्र इस मांग पत्र के संबंध में दिशा-निर्देश प्रदान करता है।
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              {requisition.orderDocumentUrl && !requisition.orderDocumentUrl.startsWith('data:') ? (
                <a
                  href={requisition.orderDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>वेब पोर्टल पर आदेश खोलें</span>
                </a>
              ) : requisition.orderDocumentUrl ? (
                <a
                  href={requisition.orderDocumentUrl}
                  download={requisition.orderDocumentName || 'order-document'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>डाउनलोड करें (Download)</span>
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">कोई फाइल संलग्न नहीं</span>
              )}

              <button
                type="button"
                onClick={() => setPreviewingAttachedOrder(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
