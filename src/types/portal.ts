export type UserRole =
  | 'DIRECTORATE_ADMIN'
  | 'DIRECTORATE_DESK'
  | 'FIELD_JD'
  | 'FIELD_ITI';

export type PortalNavMenu =
  | 'DASHBOARD'
  | 'REQUISITIONS'
  | 'SUBMISSIONS_REPORT'
  | 'EXTENSIONS'
  | 'NOTICES'
  | 'DIRECTORY'
  | 'REPOSITORY'
  | 'DIRECTOR_VIEW';

export type PriorityLevel =
  | 'URGENT'
  | 'HIGH'
  | 'NORMAL'
  | 'ROUTINE';

export type RequisitionMode =
  | 'CUSTOM_FORM'
  | 'GOOGLE_SHEET'
  | 'GOOGLE_FORM'
  | 'HYBRID';

export type SubmissionStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'LATE_SUBMITTED'
  | 'OVERDUE'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REVISION_REQUESTED';

/* ============================================================
   REQUISITION UPDATE / VERSIONING
   ============================================================ */

/**
 * Defines which existing submissions are affected by
 * a requisition update.
 *
 * ALL
 * ----------------
 * The update applies to all targeted units.
 *
 * PENDING_ONLY
 * ----------------
 * The update applies only to units which have not
 * submitted their response yet.
 *
 * ALL_REQUIRE_RESUBMISSION
 * ----------------
 * The update requires all targeted units to submit
 * a fresh response.
 *
 * IMPORTANT:
 * Existing submissions are never deleted by this mechanism.
 */
export type RequisitionUpdateApplyTo =
  | 'ALL'
  | 'PENDING_ONLY'
  | 'ALL_REQUIRE_RESUBMISSION';

/**
 * Lifecycle state of a requisition update.
 */
export type RequisitionUpdateStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CANCELLED';

export interface DirectorateDesk {
  id: string;
  name: string;
  code: string;
  officerInCharge: string;
  designation: string;
  email: string;
  phone: string;
  description: string;
  iconName: string;
  colorScheme: string;
}

export interface FieldUnit {
  id: string;
  type: 'JD_OFFICE' | 'ITI';
  name: string;
  code: string;
  zone: string;
  district: string;
  headOfficer: string;
  designation: string;
  email: string;
  phone: string;
  address: string;
  affiliatedTradesCount?: number;
  totalSeats?: number;
}

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'table_grid';

export interface TableColumnConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required?: boolean;
}

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  required: boolean;
  helpText?: string;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  tableColumns?: TableColumnConfig[];
}

export interface GoogleSheetConfig {
  sheetUrl: string;
  embedAllowed: boolean;
  sheetInstructions: string;
  expectedColumnsSummary?: string[];
}

export interface GoogleFormConfig {
  formUrl: string;
  requireResponseIdConfirmation: boolean;
  instructions: string;
}

export type TargetScopeType =
  | 'ALL_FIELD_UNITS'
  | 'ALL_JD_OFFICES'
  | 'ALL_ITIS'
  | 'SELECTED_JD_OFFICES'
  | 'SELECTED_ITIS'
  | 'SELECTED_ZONES'
  | 'SAVED_BUNCH'
  | 'SPECIFIC_UNITS';

// A file a directorate desk has uploaded to its own document repository
// (circulars, formats, policy orders, etc.), organized under a free-text
// category so desks can build their own folder-like structure. Visible to
// every desk and every field unit (JD/ITI) for browsing/download; only the
// owning desk (or the Directorate admin) can upload or delete into it.
export interface RepositoryFile {
  id: string;
  deskId: string;
  deskName?: string;
  category: string;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType?: string;
  uploadedByName?: string;
  uploadedAt: string;
}

// A directorate-defined, reusable named group of field units (any mix of
// JD offices and ITIs). Desks create these once via the "Manage Bunches"
// screen and re-apply them as the target scope on future requisitions,
// instead of re-picking units/districts every time a repetitive demand
// goes out.
export interface FieldUnitBunch {
  id: string;
  name: string;
  description?: string;
  unitIds: string[];
  createdByDeskId?: string;
  createdByDeskName?: string;
  createdAt: string;
  updatedAt?: string;
}

// A letter/order/corrigendum a desk attaches to an already-issued demand
// AFTER the original was created (the original letter stays in
// Requisition.orderDocument*). Each one is stored with its own reference
// number/date so field units can see the full letter trail.
export interface RequisitionLetter {
  id: string;
  title: string;
  referenceNumber?: string;
  letterDate?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  addedAt: string;
  addedByName?: string;
}

// An extra Google Sheet / Google Form (or any link) a desk adds to a demand
// after issue. Field units get a response box for each one; their answer is
// stored inside SubmissionRecord.data under `__res_<id>` so no submissions
// table change is needed.
export interface RequisitionResource {
  id: string;
  kind: 'GOOGLE_SHEET' | 'GOOGLE_FORM' | 'OTHER_LINK';
  title: string;
  url: string;
  instructions?: string;
  responseRequired: boolean;
  addedAt: string;
  addedByName?: string;
}

// One line in a demand's amendment history (who changed what, when).
export interface RequisitionEditLogEntry {
  id: string;
  at: string;
  byName: string;
  summary: string[];
}

export interface RequisitionForwardEntry {
  unitId: string;
  unitName: string;
  forwardedByJdId: string;
  forwardedByJdName: string;
  forwardedAt: string;
}

/* ============================================================
   REQUISITION
   ============================================================ */

export interface Requisition {
  id: string;
  requisitionNumber: string;
  title: string;
  description: string;
  deskId: string;
  deskName: string;
  priority: PriorityLevel;
  priorityLabel?: string;
  isAssemblyQuestion?: boolean;
  mode: RequisitionMode;

  // Timing & Cutoff restriction
  createdAt: string;
  deadline: string;
  isStrictCutoff: boolean;
  allowLateSubmissionWithReason: boolean;

  // Target units
  targetScope: TargetScopeType;
  targetZones?: string[];
  targetDistricts?: string[];
  targetUnitIds: string[];
  targetBunchId?: string;
  targetBunchName?: string;

  // Forwarding
  forwardLog?: RequisitionForwardEntry[];

  // Post-issue amendments (added by the desk via "Edit Demand")
  additionalLetters?: RequisitionLetter[];
  additionalResources?: RequisitionResource[];
  editLog?: RequisitionEditLogEntry[];

  // Configuration
  customFields?: CustomFieldDefinition[];
  googleSheetConfig?: GoogleSheetConfig;
  googleFormConfig?: GoogleFormConfig;

  // Requirements
  requireOfficerDeclaration: boolean;
  requireOfficialSealUpload: boolean;
  attachmentNoticeDocUrl?: string;

  // Attached Official Orders / Guidelines / Shasanadesh
  orderDocumentName?: string;
  orderDocumentUrl?: string;
  orderDocumentSize?: string;
  orderReferenceNumber?: string;
  orderDate?: string;

  // Optional attachment within CUSTOM_FORM/HYBRID mode
  performaFileName?: string;
  performaFileUrl?: string;
  performaFileSize?: number;

  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
}

/* ============================================================
   REQUISITION UPDATE / VERSION
   ============================================================ */

/**
 * A non-destructive update/version of an existing requisition.
 *
 * IMPORTANT:
 * This interface does NOT replace or modify the original
 * Requisition record.
 *
 * Every update is stored separately so that:
 *
 * Version 1
 * Version 2
 * Version 3
 * ...
 *
 * can coexist with the original requisition and its
 * historical submissions.
 */
export interface RequisitionUpdate {
  id: string;

  /**
   * Parent requisition.
   */
  requisitionId: string;

  /**
   * Sequential version number for this requisition.
   *
   * Example:
   * 1 = original/update version
   * 2 = first subsequent update
   * 3 = second subsequent update
   */
  versionNumber: number;

  /**
   * Human-readable title of the update.
   *
   * Example:
   * "Deadline Extended"
   * "Revised Performa"
   * "Additional Information Required"
   */
  updateTitle: string;

  /**
   * Detailed explanation of the update.
   */
  updateDescription?: string;

  /**
   * Defines whom the update affects.
   */
  applyTo: RequisitionUpdateApplyTo;

  /**
   * Whether a new submission is required.
   *
   * Existing submissions are NOT deleted.
   */
  requiresResubmission: boolean;

  /**
   * Complete snapshot of the requisition configuration
   * at the time this update was created.
   *
   * Stored as JSON text in the database.
   */
  requisitionSnapshot?: string;

  /**
   * JSON text describing the fields/items changed.
   *
   * Example:
   *
   * [
   *   "Deadline changed",
   *   "Additional field added",
   *   "Revised performa uploaded"
   * ]
   */
  changedFields?: string;

  /**
   * ISO timestamp.
   */
  createdAt: string;

  /**
   * User who created the update.
   */
  createdByUserId?: string;
  createdByName?: string;

  /**
   * Directorate desk responsible for the update.
   */
  createdByDeskId?: string;
  createdByDeskName?: string;

  /**
   * Update lifecycle state.
   */
  status: RequisitionUpdateStatus;
}

/* ============================================================
   TABLE / SUBMISSION DATA
   ============================================================ */

export interface TableRowData {
  [columnId: string]: string | number;
}

export interface FieldSubmissionData {
  [fieldId: string]:
    | string
    | number
    | boolean
    | string[]
    | TableRowData[];
}

/* ============================================================
   SUBMISSION RECORD
   ============================================================ */

export interface SubmissionRecord {
  id: string;

  /**
   * Original requisition to which this submission belongs.
   */
  requisitionId: string;

  /**
   * Optional reference to the requisition update/version
   * against which this submission was made.
   *
   * OPTIONAL intentionally:
   *
   * - Existing submissions continue to work.
   * - Existing database records remain valid.
   * - No migration is required merely to load old submissions.
   */
  submissionUpdateId?: string;

  fieldUnitId: string;
  fieldUnitName: string;
  fieldUnitType: 'JD_OFFICE' | 'ITI';
  fieldUnitZone: string;
  fieldUnitDistrict: string;

  submittedAt: string;
  submittedByOfficer: string;
  officerDesignation: string;
  officerContact: string;

  status: SubmissionStatus;
  isLate: boolean;
  lateJustification?: string;

  // Data payloads
  data: FieldSubmissionData;
  googleSheetSubmittedUrl?: string;
  googleFormResponseId?: string;
  uploadedDocumentName?: string;
  uploadedDocumentUrl?: string;
  signedLetterDispatchNumber?: string;
  signedLetterDate?: string;
  digitalSignatureDataUrl?: string;
  signatureType?: 'UPLOADED_DOCUMENT' | 'FINGER_DRAWN' | 'BOTH';

  // Optional performa attachment
  performaSubmissionFileName?: string;
  performaSubmissionFileUrl?: string;

  // Desk feedback
  deskReviewedAt?: string;
  deskReviewedBy?: string;
  deskComments?: string;
  revisionNotes?: string;
}

export interface ExtensionRequest {
  id: string;
  requisitionId: string;
  fieldUnitId: string;
  fieldUnitName: string;
  requestedDeadline: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  respondedAt?: string;
  deskResponseComment?: string;
}

export interface DefaulterNotice {
  id: string;
  requisitionId: string;
  fieldUnitId: string;
  sentAt: string;
  subject: string;
  message: string;
  sentByDeskId: string;
}

export interface UserSession {
  id: string;
  role: UserRole;
  deskId?: string;
  fieldUnitId?: string;
  displayName: string;
  code: string;
  email: string;
  department: string;
}
