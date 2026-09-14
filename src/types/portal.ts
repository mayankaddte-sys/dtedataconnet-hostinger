export type UserRole = 'DIRECTORATE_ADMIN' | 'DIRECTORATE_DESK' | 'FIELD_JD' | 'FIELD_ITI';

export type PortalNavMenu = 
  | 'DASHBOARD' 
  | 'REQUISITIONS' 
  | 'SUBMISSIONS_REPORT' 
  | 'EXTENSIONS' 
  | 'NOTICES' 
  | 'DIRECTORY' 
  | 'DIRECTOR_VIEW';

export type PriorityLevel = 'URGENT' | 'HIGH' | 'NORMAL' | 'ROUTINE';

export type RequisitionMode = 'CUSTOM_FORM' | 'GOOGLE_SHEET' | 'GOOGLE_FORM' | 'HYBRID';

export type SubmissionStatus = 'PENDING' | 'SUBMITTED' | 'LATE_SUBMITTED' | 'OVERDUE' | 'UNDER_REVIEW' | 'APPROVED' | 'REVISION_REQUESTED';

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
  options?: string[]; // for select/radio
  min?: number;
  max?: number;
  unit?: string; // e.g. "₹ in Lakhs", "Students", "Percent %"
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
  | 'SPECIFIC_UNITS';

export interface Requisition {
  id: string;
  requisitionNumber: string; // e.g., "DTE/EXAM/2026/08-114"
  title: string;
  description: string;
  deskId: string;
  deskName: string;
  priority: PriorityLevel;
  priorityLabel?: string; // e.g. "Assembly Question - Immediate", "Audit Observation"
  isAssemblyQuestion?: boolean;
  mode: RequisitionMode;
  
  // Timing & Cutoff restriction
  createdAt: string; // ISO string
  deadline: string; // ISO string with time
  isStrictCutoff: boolean; // if true, form blocks submissions past deadline
  allowLateSubmissionWithReason: boolean;
  
  // Target units
  targetScope: TargetScopeType;
  targetZones?: string[];
  targetDistricts?: string[];
  targetUnitIds: string[]; // list of field unit IDs targeted
  
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
  orderReferenceNumber?: string; // e.g. "शासनादेश सं. 142/2026/88-व्या.शि."
  orderDate?: string; // Date of the Government Order
  
  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
}

export interface TableRowData {
  [columnId: string]: string | number;
}

export interface FieldSubmissionData {
  [fieldId: string]: string | number | boolean | string[] | TableRowData[];
}

export interface SubmissionRecord {
  id: string;
  requisitionId: string;
  fieldUnitId: string;
  fieldUnitName: string;
  fieldUnitType: 'JD_OFFICE' | 'ITI';
  fieldUnitZone: string;
  fieldUnitDistrict: string;
  
  submittedAt: string; // ISO string
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
