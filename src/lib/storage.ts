import { apiClient as supabase } from './apiClient';
import {
  Requisition,
  SubmissionRecord,
  DirectorateDesk,
  FieldUnit,
  ExtensionRequest,
  DefaulterNotice,
  UserSession,
  FieldUnitBunch,
  RepositoryFile
} from '../types/portal';

/* =========================================================================
   MAPPERS — convert between DB snake_case rows and app camelCase types
   ========================================================================= */

const toDesk = (r: any): DirectorateDesk => ({
  id: r.id,
  name: r.name,
  code: r.code,
  officerInCharge: r.officer_in_charge,
  designation: r.designation,
  email: r.email,
  phone: r.phone,
  description: r.description,
  iconName: r.icon_name,
  colorScheme: r.color_scheme
});

const toFieldUnit = (r: any): FieldUnit => ({
  id: r.id,
  type: r.type,
  name: r.name,
  code: r.code,
  zone: r.zone,
  district: r.district,
  headOfficer: r.head_officer,
  designation: r.designation,
  email: r.email,
  phone: r.phone,
  address: r.address,
  affiliatedTradesCount: r.affiliated_trades_count ?? undefined,
  totalSeats: r.total_seats ?? undefined
});

const toRequisition = (r: any): Requisition => ({
  id: r.id,
  requisitionNumber: r.requisition_number,
  title: r.title,
  description: r.description,
  deskId: r.desk_id,
  deskName: r.desk_name,
  priority: r.priority,
  priorityLabel: r.priority_label ?? undefined,
  isAssemblyQuestion: r.is_assembly_question ?? undefined,
  mode: r.mode,
  createdAt: r.created_at,
  deadline: r.deadline,
  isStrictCutoff: r.is_strict_cutoff,
  allowLateSubmissionWithReason: r.allow_late_submission_with_reason,
  targetScope: r.target_scope,
  targetZones: r.target_zones ?? undefined,
  targetDistricts: r.target_districts ?? undefined,
  targetUnitIds: r.target_unit_ids ?? [],
  forwardLog: r.forward_log ?? undefined,
  customFields: r.custom_fields ?? undefined,
  googleSheetConfig: r.google_sheet_config ?? undefined,
  googleFormConfig: r.google_form_config ?? undefined,
  requireOfficerDeclaration: r.require_officer_declaration,
  requireOfficialSealUpload: r.require_official_seal_upload,
  attachmentNoticeDocUrl: r.attachment_notice_doc_url ?? undefined,
  orderDocumentName: r.order_document_name ?? undefined,
  orderDocumentUrl: r.order_document_url ?? undefined,
  orderDocumentSize: r.order_document_size ?? undefined,
  orderReferenceNumber: r.order_reference_number ?? undefined,
  orderDate: r.order_date ?? undefined,
  performaFileName: r.performa_file_name ?? undefined,
  performaFileUrl: r.performa_file_url ?? undefined,
  performaFileSize: r.performa_file_size ?? undefined,
  status: r.status
});

const fromRequisition = (req: Requisition) => ({
  id: req.id,
  requisition_number: req.requisitionNumber,
  title: req.title,
  description: req.description,
  desk_id: req.deskId,
  desk_name: req.deskName,
  priority: req.priority,
  priority_label: req.priorityLabel ?? null,
  is_assembly_question: req.isAssemblyQuestion ?? false,
  mode: req.mode,
  deadline: req.deadline,
  is_strict_cutoff: req.isStrictCutoff,
  allow_late_submission_with_reason: req.allowLateSubmissionWithReason,
  target_scope: req.targetScope,
  target_zones: req.targetZones ?? null,
  target_districts: req.targetDistricts ?? null,
  target_unit_ids: req.targetUnitIds ?? [],
  forward_log: req.forwardLog ?? null,
  custom_fields: req.customFields ?? null,
  google_sheet_config: req.googleSheetConfig ?? null,
  google_form_config: req.googleFormConfig ?? null,
  require_officer_declaration: req.requireOfficerDeclaration,
  require_official_seal_upload: req.requireOfficialSealUpload,
  attachment_notice_doc_url: req.attachmentNoticeDocUrl ?? null,
  order_document_name: req.orderDocumentName ?? null,
  order_document_url: req.orderDocumentUrl ?? null,
  order_document_size: req.orderDocumentSize ?? null,
  order_reference_number: req.orderReferenceNumber ?? null,
  order_date: req.orderDate ?? null,
  performa_file_name: req.performaFileName ?? null,
  performa_file_url: req.performaFileUrl ?? null,
  performa_file_size: req.performaFileSize ?? null,
  status: req.status
});

const toSubmission = (r: any): SubmissionRecord => ({
  id: r.id,
  requisitionId: r.requisition_id,
  fieldUnitId: r.field_unit_id,
  fieldUnitName: r.field_unit_name,
  fieldUnitType: r.field_unit_type,
  fieldUnitZone: r.field_unit_zone,
  fieldUnitDistrict: r.field_unit_district,
  submittedAt: r.submitted_at,
  submittedByOfficer: r.submitted_by_officer,
  officerDesignation: r.officer_designation,
  officerContact: r.officer_contact,
  status: r.status,
  isLate: r.is_late,
  lateJustification: r.late_justification ?? undefined,
  data: r.data ?? {},
  googleSheetSubmittedUrl: r.google_sheet_submitted_url ?? undefined,
  googleFormResponseId: r.google_form_response_id ?? undefined,
  uploadedDocumentName: r.uploaded_document_name ?? undefined,
  uploadedDocumentUrl: r.uploaded_document_url ?? undefined,
  signedLetterDispatchNumber: r.signed_letter_dispatch_number ?? undefined,
  signedLetterDate: r.signed_letter_date ?? undefined,
  digitalSignatureDataUrl: r.digital_signature_data_url ?? undefined,
  signatureType: r.signature_type ?? undefined,
  performaSubmissionFileName: r.performa_submission_file_name ?? undefined,
  performaSubmissionFileUrl: r.performa_submission_file_url ?? undefined,
  deskReviewedAt: r.desk_reviewed_at ?? undefined,
  deskReviewedBy: r.desk_reviewed_by ?? undefined,
  deskComments: r.desk_comments ?? undefined,
  revisionNotes: r.revision_notes ?? undefined
});

const fromSubmission = (s: SubmissionRecord) => ({
  id: s.id,
  requisition_id: s.requisitionId,
  field_unit_id: s.fieldUnitId,
  field_unit_name: s.fieldUnitName,
  field_unit_type: s.fieldUnitType,
  field_unit_zone: s.fieldUnitZone,
  field_unit_district: s.fieldUnitDistrict,
  submitted_at: s.submittedAt,
  submitted_by_officer: s.submittedByOfficer,
  officer_designation: s.officerDesignation,
  officer_contact: s.officerContact,
  status: s.status,
  is_late: s.isLate,
  late_justification: s.lateJustification ?? null,
  data: s.data ?? {},
  google_sheet_submitted_url: s.googleSheetSubmittedUrl ?? null,
  google_form_response_id: s.googleFormResponseId ?? null,
  uploaded_document_name: s.uploadedDocumentName ?? null,
  uploaded_document_url: s.uploadedDocumentUrl ?? null,
  signed_letter_dispatch_number: s.signedLetterDispatchNumber ?? null,
  signed_letter_date: s.signedLetterDate ?? null,
  digital_signature_data_url: s.digitalSignatureDataUrl ?? null,
  signature_type: s.signatureType ?? null,
  performa_submission_file_name: s.performaSubmissionFileName ?? null,
  performa_submission_file_url: s.performaSubmissionFileUrl ?? null,
  desk_reviewed_at: s.deskReviewedAt ?? null,
  desk_reviewed_by: s.deskReviewedBy ?? null,
  desk_comments: s.deskComments ?? null,
  revision_notes: s.revisionNotes ?? null
});

const toExtension = (r: any): ExtensionRequest => ({
  id: r.id,
  requisitionId: r.requisition_id,
  fieldUnitId: r.field_unit_id,
  fieldUnitName: r.field_unit_name,
  requestedDeadline: r.requested_deadline,
  reason: r.reason,
  status: r.status,
  createdAt: r.created_at,
  respondedAt: r.responded_at ?? undefined,
  deskResponseComment: r.desk_response_comment ?? undefined
});

const fromExtension = (e: ExtensionRequest) => ({
  id: e.id,
  requisition_id: e.requisitionId,
  field_unit_id: e.fieldUnitId,
  field_unit_name: e.fieldUnitName,
  requested_deadline: e.requestedDeadline,
  reason: e.reason,
  status: e.status,
  responded_at: e.respondedAt ?? null,
  desk_response_comment: e.deskResponseComment ?? null
});

const toNotice = (r: any): DefaulterNotice => ({
  id: r.id,
  requisitionId: r.requisition_id,
  fieldUnitId: r.field_unit_id,
  sentAt: r.sent_at,
  subject: r.subject,
  message: r.message,
  sentByDeskId: r.sent_by_desk_id
});

const fromNotice = (n: DefaulterNotice) => ({
  id: n.id,
  requisition_id: n.requisitionId,
  field_unit_id: n.fieldUnitId,
  sent_at: n.sentAt,
  subject: n.subject,
  message: n.message,
  sent_by_desk_id: n.sentByDeskId
});

const toBunch = (r: any): FieldUnitBunch => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  unitIds: r.unit_ids ?? [],
  createdByDeskId: r.created_by_desk_id ?? undefined,
  createdByDeskName: r.created_by_desk_name ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? undefined
});

const fromBunch = (b: FieldUnitBunch) => ({
  id: b.id,
  name: b.name,
  description: b.description ?? null,
  unit_ids: b.unitIds ?? [],
  created_by_desk_id: b.createdByDeskId ?? null,
  created_by_desk_name: b.createdByDeskName ?? null
});

const toRepositoryFile = (r: any): RepositoryFile => ({
  id: r.id,
  deskId: r.desk_id,
  deskName: r.desk_name ?? undefined,
  category: r.category,
  title: r.title,
  description: r.description ?? undefined,
  fileName: r.file_name,
  fileUrl: r.file_url,
  fileSize: r.file_size ?? 0,
  fileType: r.file_type ?? undefined,
  uploadedByName: r.uploaded_by_name ?? undefined,
  uploadedAt: r.uploaded_at
});

const fromRepositoryFile = (f: RepositoryFile) => ({
  id: f.id,
  desk_id: f.deskId,
  desk_name: f.deskName ?? null,
  category: f.category,
  title: f.title,
  description: f.description ?? null,
  file_name: f.fileName,
  file_url: f.fileUrl,
  file_size: f.fileSize ?? null,
  file_type: f.fileType ?? null,
  uploaded_by_name: f.uploadedByName ?? null
});

/* =========================================================================
   DESKS & FIELD UNITS (reference data — read-mostly)
   ========================================================================= */

export const getStoredDesks = async (): Promise<DirectorateDesk[]> => {
  const { data, error } = await supabase.from('directorate_desks').select('*');
  if (error) {
    console.error('Failed to fetch desks', error);
    throw new Error(error.message || 'Failed to fetch desks');
  }
  return (data ?? []).map(toDesk);
};

export const getStoredFieldUnits = async (): Promise<FieldUnit[]> => {
  const { data, error } = await supabase.from('field_units').select('*');
  if (error) {
    console.error('Failed to fetch field units', error);
    throw new Error(error.message || 'Failed to fetch field units');
  }
  return (data ?? []).map(toFieldUnit);
};

/* =========================================================================
   REQUISITIONS
   ========================================================================= */

export const getStoredRequisitions = async (): Promise<Requisition[]> => {
  const { data, error } = await supabase
    .from('requisitions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch requisitions', error);
    throw new Error(error.message || 'Failed to fetch requisitions');
  }
  return (data ?? []).map(toRequisition);
};

// Upserts the full list passed in (mirrors old "save whole array" behaviour).
export const saveRequisitions = async (requisitions: Requisition[]): Promise<void> => {
  if (requisitions.length === 0) return;
  const rows = requisitions.map(fromRequisition);
  const { error } = await supabase.from('requisitions').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Failed to save requisitions', error);
};

// Prefer this for a single create/update — avoids re-sending the whole table.
export const upsertRequisition = async (requisition: Requisition): Promise<void> => {
  const { error } = await supabase
    .from('requisitions')
    .upsert(fromRequisition(requisition), { onConflict: 'id' });
  if (error) console.error('Failed to upsert requisition', error);
};

// Actually deletes a requisition (and everything hanging off it) from
// Supabase. saveRequisitions() only ever upserts, so it can never remove a
// row that's been filtered out of local state — this is the only path that
// makes a "deleted" requisition disappear for every user, not just the one
// who deleted it locally.
export const deleteRequisition = async (requisitionId: string): Promise<void> => {
  // Children first, in case FKs aren't set to ON DELETE CASCADE.
  const results = await Promise.all([
    supabase.from('submissions').delete().eq('requisition_id', requisitionId),
    supabase.from('extension_requests').delete().eq('requisition_id', requisitionId),
    supabase.from('defaulter_notices').delete().eq('requisition_id', requisitionId)
  ]);
  results.forEach(({ error }) => {
    if (error) console.error('Failed to delete requisition child rows', error);
  });

  const { error } = await supabase.from('requisitions').delete().eq('id', requisitionId);
  if (error) console.error('Failed to delete requisition', error);
};

/* =========================================================================
   SUBMISSIONS
   ========================================================================= */

// Initial dashboard load deliberately excludes the large LONGTEXT file fields.
// The 227 current submissions contain ~110 MB in uploaded_document_url, so
// selecting those fields on every page load can make the API exceed the timeout.
const SUBMISSION_LIST_COLUMNS = [
  'id',
  'requisition_id',
  'field_unit_id',
  'field_unit_name',
  'field_unit_type',
  'field_unit_zone',
  'field_unit_district',
  'submitted_at',
  'submitted_by_officer',
  'officer_designation',
  'officer_contact',
  'status',
  'is_late',
  'late_justification',
  'data',
  'google_sheet_submitted_url',
  'google_form_response_id',
  'uploaded_document_name',
  'signed_letter_dispatch_number',
  'signed_letter_date',
  'signature_type',
  'performa_submission_file_name',
  'desk_reviewed_at',
  'desk_reviewed_by',
  'desk_comments',
  'revision_notes'
].join(',');

export const getStoredSubmissions = async (): Promise<SubmissionRecord[]> => {
  const { data, error } = await supabase
    .from('submissions')
    .select(SUBMISSION_LIST_COLUMNS)
    .order('submitted_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch submissions', error);
    throw new Error(error.message || 'Failed to fetch submissions');
  }
  return (data ?? []).map(toSubmission);
};

// Fetch one complete submission only when a user opens its detail/preview.
// This includes the potentially large document/signature fields.
export const getStoredSubmissionById = async (submissionId: string): Promise<SubmissionRecord | null> => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId);
  if (error) {
    console.error('Failed to fetch submission details', error);
    throw new Error(error.message || 'Failed to fetch submission details');
  }
  const row = Array.isArray(data) ? data[0] : null;
  return row ? toSubmission(row) : null;
};

export const saveSubmissions = async (submissions: SubmissionRecord[]): Promise<void> => {
  if (submissions.length === 0) return;
  const rows = submissions.map(fromSubmission);
  const { error } = await supabase.from('submissions').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Failed to save submissions', error);
};

export const upsertSubmission = async (submission: SubmissionRecord): Promise<void> => {
  const { error } = await supabase
    .from('submissions')
    .upsert(fromSubmission(submission), { onConflict: 'id' });
  if (error) console.error('Failed to upsert submission', error);
};

// Actually deletes a single submission from Supabase (same reasoning as
// deleteRequisition — saveSubmissions() can only add/update, never remove).
export const deleteSubmission = async (submissionId: string): Promise<void> => {
  const { error } = await supabase.from('submissions').delete().eq('id', submissionId);
  if (error) console.error('Failed to delete submission', error);
};

/* =========================================================================
   EXTENSION REQUESTS
   ========================================================================= */

export const getStoredExtensions = async (): Promise<ExtensionRequest[]> => {
  const { data, error } = await supabase
    .from('extension_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch extension requests', error);
    throw new Error(error.message || 'Failed to fetch extension requests');
  }
  return (data ?? []).map(toExtension);
};

export const saveExtensions = async (extensions: ExtensionRequest[]): Promise<void> => {
  if (extensions.length === 0) return;
  const rows = extensions.map(fromExtension);
  const { error } = await supabase.from('extension_requests').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Failed to save extension requests', error);
};

export const upsertExtension = async (extension: ExtensionRequest): Promise<void> => {
  const { error } = await supabase
    .from('extension_requests')
    .upsert(fromExtension(extension), { onConflict: 'id' });
  if (error) console.error('Failed to upsert extension request', error);
};

/* =========================================================================
   DEFAULTER NOTICES
   ========================================================================= */

export const getStoredDefaulterNotices = async (): Promise<DefaulterNotice[]> => {
  const { data, error } = await supabase
    .from('defaulter_notices')
    .select('*')
    .order('sent_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch defaulter notices', error);
    throw new Error(error.message || 'Failed to fetch defaulter notices');
  }
  return (data ?? []).map(toNotice);
};

export const saveDefaulterNotices = async (notices: DefaulterNotice[]): Promise<void> => {
  if (notices.length === 0) return;
  const rows = notices.map(fromNotice);
  const { error } = await supabase.from('defaulter_notices').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Failed to save defaulter notices', error);
};

/* =========================================================================
   FIELD UNIT BUNCHES — reusable named groups of field units, for repeated
   requisition targeting (see FieldUnitBunch in types/portal.ts).
   ========================================================================= */

export const getStoredBunches = async (): Promise<FieldUnitBunch[]> => {
  const { data, error } = await supabase
    .from('field_unit_bunches')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch field unit bunches', error);
    throw new Error(error.message || 'Failed to fetch field unit bunches');
  }
  return (data ?? []).map(toBunch);
};

// Upserts the full list passed in (mirrors saveRequisitions/saveExtensions).
export const saveBunches = async (bunches: FieldUnitBunch[]): Promise<void> => {
  if (bunches.length === 0) return;
  const rows = bunches.map(fromBunch);
  const { error } = await supabase.from('field_unit_bunches').upsert(rows, { onConflict: 'id' });
  if (error) console.error('Failed to save field unit bunches', error);
};

// Prefer this for a single create/update — avoids re-sending the whole table.
export const upsertBunch = async (bunch: FieldUnitBunch): Promise<void> => {
  const { error } = await supabase
    .from('field_unit_bunches')
    .upsert(fromBunch(bunch), { onConflict: 'id' });
  if (error) console.error('Failed to upsert field unit bunch', error);
};

// Actual delete — saveBunches()/the array-sync effect only ever upserts, so
// this is the only path that removes a bunch for every user, not just the
// one who deleted it locally (same reasoning as deleteRequisition above).
export const deleteBunch = async (bunchId: string): Promise<void> => {
  const { error } = await supabase.from('field_unit_bunches').delete().eq('id', bunchId);
  if (error) console.error('Failed to delete field unit bunch', error);
};

/* =========================================================================
   DESK REPOSITORY FILES — each desk's own document repository (circulars,
   formats, policy orders...), organized under a free-text category.
   Deliberately single-record only (get/upsert/delete) — NO whole-array
   save function. A repository file can carry a base64 attachment several
   MB in size; a whole-array sync (as requisitions/submissions used to do)
   would re-send every file's full payload on every single change, and
   that combined payload only grows — see the postmortem in App.tsx's
   comments above the (removed) requisitions/submissions sync effects.
   ========================================================================= */

export const getStoredRepositoryFiles = async (): Promise<RepositoryFile[]> => {
  const { data, error } = await supabase
    .from('desk_repository_files')
    .select('*')
    .order('uploaded_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch repository files', error);
    throw new Error(error.message || 'Failed to fetch repository files');
  }
  return (data ?? []).map(toRepositoryFile);
};

export const upsertRepositoryFile = async (file: RepositoryFile): Promise<void> => {
  const { error } = await supabase
    .from('desk_repository_files')
    .upsert(fromRepositoryFile(file), { onConflict: 'id' });
  if (error) console.error('Failed to upsert repository file', error);
};

export const deleteRepositoryFile = async (fileId: string): Promise<void> => {
  const { error } = await supabase.from('desk_repository_files').delete().eq('id', fileId);
  if (error) console.error('Failed to delete repository file', error);
};

/* =========================================================================
   AUTH / CURRENT USER
   -------------------------------------------------------------------------
   Passwords are verified/hashed entirely inside Postgres via the
   verify_password_any / save_password_any functions (see supabase/001_schema.sql).
   The app_credentials table itself has no client-readable/writable RLS
   policies — it's only reachable through these SECURITY DEFINER functions,
   so raw password hashes never touch the browser.
   ========================================================================= */

const CURRENT_USER_KEY = 'dte_portal_current_user_session'; // session only, not data storage

export const getStoredUser = (): UserSession | null => {
  try {
    const data = sessionStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const saveCurrentUser = (user: UserSession): void => {
  try {
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save current user session', e);
  }
};

export const clearCurrentUser = (): void => {
  try {
    sessionStorage.removeItem(CURRENT_USER_KEY);
  } catch (e) {
    // ignore
  }
};

export const verifyUserCredentials = async (
  identifier: string,
  enteredPassword: string
): Promise<boolean> => {
  if (!identifier || !enteredPassword) return false;

  const { data, error } = await supabase.rpc('verify_password_any', {
    p_identifiers: [identifier],
    p_password: enteredPassword
  });

  if (error) {
    console.error('Failed to verify credentials', error);
    return false;
  }
  return data === true;
};

export const saveUserPassword = async (
  primaryIdentifier: string,
  newPassword: string,
  aliases: string[] = []
): Promise<boolean> => {
  const cleanPass = newPassword.trim();
  if (!cleanPass) return false;

  const allIds = Array.from(
    new Set(
      [primaryIdentifier, ...aliases]
        .filter(Boolean)
        .map((k) => k.trim().toLowerCase())
    )
  );
  if (allIds.length === 0) return false;

  const { data, error } = await supabase.rpc('save_password_any', {
    p_identifiers: allIds,
    p_password: cleanPass
  });

  if (error) {
    console.error('Failed to save user password', error);
    return false;
  }
  return data === true;
};

/* =========================================================================
   RESET (dev/admin utility) — clears transactional tables, NOT reference
   data (desks/field_units stay, since those are the real org directory).
   ========================================================================= */

export const resetToInitialData = async (): Promise<void> => {
  try {
    await supabase.from('requisitions').delete().neq('id', '');
    await supabase.from('submissions').delete().neq('id', '');
    await supabase.from('extension_requests').delete().neq('id', '');
    await supabase.from('defaulter_notices').delete().neq('id', '');
    await supabase.from('app_credentials').delete().neq('identifier', '');
    clearCurrentUser();
  } catch (e) {
    console.error('Failed to reset data', e);
  }
};
