import { Requisition, SubmissionRecord, FieldUnit, DirectorateDesk } from '../types/portal';
import { formatDateTime } from './dateUtils';

/**
 * Escapes a string cell value according to RFC 4180 CSV standard
 */
function escapeCSV(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }
  let str: string;
  if (typeof val === 'object') {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports data compliance table for a specific requisition
 */
export function exportRequisitionDataToCSV(
  requisition: Requisition,
  submissions: SubmissionRecord[],
  targetUnits: FieldUnit[]
) {
  const customFieldHeaders = (requisition.customFields || []).map(f => 
    escapeCSV(`${f.label}${f.unit ? ` (${f.unit})` : ''}`)
  );
  
  const headers = [
    'Sl No',
    'Field Unit Code',
    'Field Unit Name',
    'Unit Type',
    'Zone / Division',
    'District',
    'Submission Status',
    'Submission Date & Time',
    'Submitted By (Officer)',
    'Officer Designation',
    'Officer Contact',
    ...customFieldHeaders,
    'Attached Document',
    'Google Sheet / Form Link',
    'Desk Review Status',
    'Desk Remarks'
  ];

  const rows = targetUnits.map((unit, index) => {
    const sub = submissions.find(s => s.fieldUnitId === unit.id && s.requisitionId === requisition.id);
    
    const customValues = (requisition.customFields || []).map(f => {
      if (!sub || !sub.data || sub.data[f.id] === undefined) {
        return '""';
      }
      return escapeCSV(sub.data[f.id]);
    });

    const statusText = sub 
      ? (sub.status === 'APPROVED' ? 'Approved' : sub.status === 'REVISION_REQUESTED' ? 'Revision Requested' : sub.status === 'UNDER_REVIEW' ? 'Under Review' : 'Submitted')
      : 'PENDING / DEFAULTER';

    return [
      index + 1,
      escapeCSV(unit.code),
      escapeCSV(unit.name),
      escapeCSV(unit.type === 'JD_OFFICE' ? 'JD Regional Office' : 'Government ITI'),
      escapeCSV(unit.zone),
      escapeCSV(unit.district),
      escapeCSV(statusText),
      sub ? escapeCSV(formatDateTime(sub.submittedAt)) : escapeCSV('Not Submitted'),
      sub ? escapeCSV(sub.submittedByOfficer || '') : '""',
      sub ? escapeCSV(sub.officerDesignation || '') : '""',
      sub ? escapeCSV(sub.officerContact || '') : '""',
      ...customValues,
      sub?.uploadedDocumentName ? escapeCSV(sub.uploadedDocumentName) : '""',
      sub?.googleSheetSubmittedUrl ? escapeCSV(sub.googleSheetSubmittedUrl) : '""',
      sub?.deskReviewedBy ? escapeCSV(`${sub.status} by ${sub.deskReviewedBy}`) : '""',
      sub?.deskComments ? escapeCSV(sub.deskComments) : '""'
    ].join(',');
  });

  const csvContent = '\uFEFF' + [
    `"UTTAR PRADESH DIRECTORATE OF TRAINING - DATA COMPLIANCE REPORT"`,
    `"Requisition No:","${requisition.requisitionNumber}"`,
    `"Requisition Title:",${escapeCSV(requisition.title)}`,
    `"Desk:",${escapeCSV(requisition.deskName)}`,
    `"Priority:",${escapeCSV(requisition.priority)}`,
    `"Deadline:",${escapeCSV(formatDateTime(requisition.deadline))}`,
    `"Generated On:",${escapeCSV(formatDateTime(new Date().toISOString()))}`,
    `"Total Target Units:",${targetUnits.length}`,
    `"Submitted Count:",${submissions.filter(s => s.requisitionId === requisition.id).length}`,
    '',
    headers.join(','),
    ...rows
  ].join('\n');

  downloadCSVFile(csvContent, `DTE_Data_Return_${requisition.requisitionNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
}

export interface ExportSubmissionsOptions {
  submissions: SubmissionRecord[];
  requisitions: Requisition[];
  fieldUnits?: FieldUnit[];
  desks?: DirectorateDesk[];
  filterInfo?: {
    searchQuery?: string;
    statusFilter?: string;
    requisitionFilter?: string;
    districtFilter?: string;
    zoneFilter?: string;
  };
  customFileName?: string;
}

/**
 * Comprehensive export of submissions in SubmissionsReportView for administrative users
 */
export function exportSubmissionsToCSV({
  submissions,
  requisitions,
  fieldUnits = [],
  desks = [],
  filterInfo,
  customFileName
}: ExportSubmissionsOptions) {
  if (!submissions || submissions.length === 0) {
    return false;
  }

  // Determine if all submissions belong to a single requisition
  const uniqueReqIds = Array.from(new Set(submissions.map(s => s.requisitionId)));
  const isSingleRequisition = uniqueReqIds.length === 1;
  const targetReq = isSingleRequisition ? requisitions.find(r => r.id === uniqueReqIds[0]) : null;

  // Gather all unique custom fields present across the selected submissions or requisitions
  const customFieldMap = new Map<string, { label: string; unit?: string }>();

  if (targetReq && targetReq.customFields && targetReq.customFields.length > 0) {
    targetReq.customFields.forEach(f => {
      customFieldMap.set(f.id, { label: f.label, unit: f.unit });
    });
  } else {
    // Collect from relevant requisitions
    uniqueReqIds.forEach(reqId => {
      const req = requisitions.find(r => r.id === reqId);
      if (req && req.customFields) {
        req.customFields.forEach(f => {
          if (!customFieldMap.has(f.id)) {
            customFieldMap.set(f.id, { label: f.label, unit: f.unit });
          }
        });
      }
    });

    // Also collect any keys present in submission.data
    submissions.forEach(sub => {
      if (sub.data) {
        Object.keys(sub.data).forEach(key => {
          if (!customFieldMap.has(key)) {
            // Convert snake_case or camelCase key to readable label
            const readable = key
              .replace(/_/g, ' ')
              .replace(/([A-Z])/g, ' $1')
              .replace(/^\w/, c => c.toUpperCase());
            customFieldMap.set(key, { label: readable });
          }
        });
      }
    });
  }

  const customFieldKeys = Array.from(customFieldMap.keys());
  const customFieldHeaders = customFieldKeys.map(key => {
    const info = customFieldMap.get(key);
    const labelWithUnit = info?.unit ? `${info.label} (${info.unit})` : info?.label || key;
    return escapeCSV(`[Data] ${labelWithUnit}`);
  });

  const baseHeaders = [
    'S.No (क्रमांक)',
    'Field Unit Code (इकाई कोड)',
    'Field Unit Name (संस्थान / कार्यालय का नाम)',
    'Unit Type (प्रकार)',
    'Zone / Division (मंडल)',
    'District (जनपद)',
    'Requisition Order No. (मांग आदेश संख्या)',
    'Requisition Title (मांग आदेश विषय)',
    'Desk Name (निदेशालय प्रकोष्ठ)',
    'Priority (प्राथमिकता)',
    'Assembly Question (विधानसभा प्रश्न)',
    'Submission Date & Time (सबमिशन समय)',
    'Status (स्थिति)',
    'Timeliness (समयबद्धता)',
    'Late Justification (विलंब का कारण)',
    'Nodal / Submitting Officer (प्रभारी अधिकारी)',
    'Officer Designation (पदनाम)',
    'Officer Contact (संपर्क मोबाइल)',
    'Attached Seal Document (हस्ताक्षरित दस्तावेज)',
    'Google Sheet / Form Link (गूगल शीट / फॉर्म लिंक)',
    'Desk Review Status (समीक्षा स्थिति)',
    'Desk Reviewer (समीक्षक)',
    'Desk Comments / Revision Notes (निदेशालय टिप्पणी)',
    ...customFieldHeaders
  ];

  const rows = submissions.map((sub, idx) => {
    const req = requisitions.find(r => r.id === sub.requisitionId);
    const unit = fieldUnits.find(u => u.id === sub.fieldUnitId);
    const desk = desks.find(d => d.id === req?.deskId);

    const unitCode = unit?.code || (sub.fieldUnitType === 'JD_OFFICE' ? 'JD-OFFICE' : 'ITI');
    const deskName = req?.deskName || desk?.name || 'Directorate Desk';
    const isLateText = sub.isLate ? 'विलंबित (Late Submission)' : 'समय पर (On Time)';
    const isAssemblyText = req?.isAssemblyQuestion ? 'हाँ (Yes - Assembly/Urgent)' : 'नहीं (No)';
    
    let statusFormatted: string = sub.status;
    if (sub.status === 'APPROVED') statusFormatted = 'Approved (स्वीकृत व सत्यापित)';
    else if (sub.status === 'UNDER_REVIEW') statusFormatted = 'Under Review (समीक्षाधीन)';
    else if (sub.status === 'REVISION_REQUESTED') statusFormatted = 'Revision Requested (सुधार अपेक्षित)';
    else if (sub.status === 'SUBMITTED') statusFormatted = 'Submitted (प्रस्तुत)';

    const customFieldValues = customFieldKeys.map(key => {
      if (!sub.data || sub.data[key] === undefined || sub.data[key] === null) {
        return '""';
      }
      return escapeCSV(sub.data[key]);
    });

    return [
      idx + 1,
      escapeCSV(unitCode),
      escapeCSV(sub.fieldUnitName),
      escapeCSV(sub.fieldUnitType === 'JD_OFFICE' ? 'संयुक्त निदेशक क्षेत्रीय कार्यालय (JD Office)' : 'राजकीय औद्योगिक प्रशिक्षण संस्थान (Govt ITI)'),
      escapeCSV(sub.fieldUnitZone),
      escapeCSV(sub.fieldUnitDistrict),
      escapeCSV(req?.requisitionNumber || sub.requisitionId),
      escapeCSV(req?.title || 'Data Requisition'),
      escapeCSV(deskName),
      escapeCSV(req?.priority || 'NORMAL'),
      escapeCSV(isAssemblyText),
      escapeCSV(formatDateTime(sub.submittedAt)),
      escapeCSV(statusFormatted),
      escapeCSV(isLateText),
      escapeCSV(sub.lateJustification || ''),
      escapeCSV(sub.submittedByOfficer || ''),
      escapeCSV(sub.officerDesignation || ''),
      escapeCSV(sub.officerContact || ''),
      escapeCSV(sub.uploadedDocumentName || ''),
      escapeCSV(sub.googleSheetSubmittedUrl || sub.googleFormResponseId || ''),
      escapeCSV(sub.deskReviewedAt ? `Reviewed on ${formatDateTime(sub.deskReviewedAt)}` : 'Pending Review'),
      escapeCSV(sub.deskReviewedBy || ''),
      escapeCSV(sub.deskComments || sub.revisionNotes || ''),
      ...customFieldValues
    ].join(',');
  });

  // Metadata block for the top of the CSV
  const filterDesc = [
    filterInfo?.statusFilter && filterInfo.statusFilter !== 'ALL' ? `Status: ${filterInfo.statusFilter}` : '',
    filterInfo?.districtFilter && filterInfo.districtFilter !== 'ALL' ? `District: ${filterInfo.districtFilter}` : '',
    filterInfo?.searchQuery ? `Search: "${filterInfo.searchQuery}"` : '',
    targetReq ? `Requisition: ${targetReq.requisitionNumber} - ${targetReq.title}` : 'Requisitions: All Relevant'
  ].filter(Boolean).join(' | ') || 'All Submissions';

  const metadataLines = [
    `"DIRECTORATE OF TRAINING & EMPLOYMENT, UTTAR PRADESH"`,
    `"SUBMISSIONS & VERIFICATION MASTER REPORT (सबमिशन डेटा आख्या)"`,
    `"Generated On:",${escapeCSV(formatDateTime(new Date().toISOString()))}`,
    `"Total Records Exported:",${submissions.length}`,
    `"Applied Filters:",${escapeCSV(filterDesc)}`,
    ...(targetReq ? [
      `"Requisition Number:",${escapeCSV(targetReq.requisitionNumber)}`,
      `"Requisition Title:",${escapeCSV(targetReq.title)}`,
      `"Issuing Desk:",${escapeCSV(targetReq.deskName)}`,
      `"Submission Deadline:",${escapeCSV(formatDateTime(targetReq.deadline))}`
    ] : []),
    ''
  ];

  const csvString = '\uFEFF' + [
    ...metadataLines,
    baseHeaders.join(','),
    ...rows
  ].join('\n');

  const fileName = customFileName || (
    targetReq 
      ? `UP_DTE_Submissions_${targetReq.requisitionNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
      : `UP_DTE_All_Submissions_Report_${new Date().toISOString().slice(0, 10)}.csv`
  );

  downloadCSVFile(csvString, fileName);
  return true;
}

/**
 * Exports a single submission record as a detailed CSV file
 */
export function exportSingleSubmissionToCSV(
  submission: SubmissionRecord,
  requisition?: Requisition,
  fieldUnit?: FieldUnit
) {
  const rows = [
    `"DIRECTORATE OF TRAINING & EMPLOYMENT, UTTAR PRADESH"`,
    `"INDIVIDUAL FIELD SUBMISSION RECORD AUDIT REPORT"`,
    `"Export Timestamp:",${escapeCSV(formatDateTime(new Date().toISOString()))}`,
    '',
    `"--- INSTITUTIONAL & REQUISITION METADATA ---"`,
    `"Field Unit Name:",${escapeCSV(submission.fieldUnitName)}`,
    `"Field Unit Code:",${escapeCSV(fieldUnit?.code || (submission.fieldUnitType === 'JD_OFFICE' ? 'JD-OFFICE' : 'ITI'))}`,
    `"Unit Type:",${escapeCSV(submission.fieldUnitType === 'JD_OFFICE' ? 'JD Regional Office' : 'Government ITI')}`,
    `"Zone / Mandal:",${escapeCSV(submission.fieldUnitZone)}`,
    `"District:",${escapeCSV(submission.fieldUnitDistrict)}`,
    `"Requisition Number:",${escapeCSV(requisition?.requisitionNumber || submission.requisitionId)}`,
    `"Requisition Title:",${escapeCSV(requisition?.title || 'Data Requisition')}`,
    `"Issuing Desk:",${escapeCSV(requisition?.deskName || 'Directorate Desk')}`,
    `"Submission Timestamp:",${escapeCSV(formatDateTime(submission.submittedAt))}`,
    `"Submission Status:",${escapeCSV(submission.status)}`,
    `"Timeliness:",${escapeCSV(submission.isLate ? 'Late Submission' : 'On Time')}`,
    `"Late Justification:",${escapeCSV(submission.lateJustification || 'N/A')}`,
    `"Submitting Nodal Officer:",${escapeCSV(submission.submittedByOfficer || 'N/A')}`,
    `"Officer Designation:",${escapeCSV(submission.officerDesignation || 'कार्यालय प्रमुख')}`,
    `"Officer Contact Mobile:",${escapeCSV(submission.officerContact || 'N/A')}`,
    `"Official Seal / Signed Document:",${escapeCSV(submission.uploadedDocumentName || 'None')}`,
    `"Google Sheet URL:",${escapeCSV(submission.googleSheetSubmittedUrl || 'N/A')}`,
    `"Google Form Response ID:",${escapeCSV(submission.googleFormResponseId || 'N/A')}`,
    `"Desk Reviewed By:",${escapeCSV(submission.deskReviewedBy || 'Pending Review')}`,
    `"Desk Reviewed At:",${escapeCSV(submission.deskReviewedAt ? formatDateTime(submission.deskReviewedAt) : 'Pending')}`,
    `"Desk Comments / Remarks:",${escapeCSV(submission.deskComments || submission.revisionNotes || 'None')}`,
    '',
    `"--- SUBMITTED DATA VALUES (दर्ज आंकड़े) ---"`,
    `"Field Identifier / Question","Submitted Value"`
  ];

  if (submission.data) {
    Object.entries(submission.data).forEach(([key, val]) => {
      // Find custom field label if defined in requisition
      const fieldDef = requisition?.customFields?.find(f => f.id === key);
      const label = fieldDef ? `${fieldDef.label}${fieldDef.unit ? ` (${fieldDef.unit})` : ''}` : key;
      rows.push(`${escapeCSV(label)},${escapeCSV(val)}`);
    });
  }

  const csvContent = '\uFEFF' + rows.join('\n');
  const safeUnitName = submission.fieldUnitName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  downloadCSVFile(csvContent, `Submission_${safeUnitName}_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Triggers browser download of CSV text content with UTF-8 BOM
 */
function downloadCSVFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

