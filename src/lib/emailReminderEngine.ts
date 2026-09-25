// Automatic Email Notification & Reminder Engine for @vppup.in Domain

import { Requisition, FieldUnit, DirectorateDesk, SubmissionRecord } from '../types/portal';
import { apiClient as supabase } from './apiClient';

// Base URL of the public compliance portal. Included in every outgoing
// email so recipients always have a direct link back to the site.
const PORTAL_URL = 'https://compliance-dteup.in';

export interface EmailDispatchLog {
  id: string;
  type: 'NEW_REQUISITION' | 'AUTO_REMINDER_48H' | 'AUTO_REMINDER_24H' | 'OVERDUE_ALERT' | 'DEFAULTER_NOTICE' | 'MANUAL_REMINDER';
  requisitionId: string;
  requisitionNumber: string;
  requisitionTitle: string;
  recipientUnitId: string;
  recipientName: string;
  recipientEmail: string;
  recipientType: 'JD_OFFICE' | 'ITI';
  recipientDistrict: string;
  senderDeskName: string;
  senderEmail: string;
  subject: string;
  bodySnippet: string;
  dispatchedAt: string;
  status: 'DELIVERED' | 'QUEUED' | 'FAILED';
  hoursRemaining?: number;
  error?: string;
}

const EMAIL_LOGS_STORAGE_KEY = 'dte_auto_email_dispatch_logs_v1';
const AUTO_DISPATCH_SETTINGS_KEY = 'dte_auto_email_settings_v1';

export interface AutoEmailSettings {
  auto48HourEnabled: boolean;
  auto24HourEnabled: boolean;
  autoOverdueEnabled: boolean;
  notifyOnNewRequisition: boolean;
  domainSuffix: string; // e.g. "@vppup.in"
  senderEmail: string;
}

export const getAutoEmailSettings = (): AutoEmailSettings => {
  try {
    const raw = localStorage.getItem(AUTO_DISPATCH_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {
    auto48HourEnabled: true,
    auto24HourEnabled: true,
    autoOverdueEnabled: true,
    notifyOnNewRequisition: true,
    domainSuffix: '@vppup.in',
    senderEmail: 'noreply.dte@vppup.in'
  };
};

export const saveAutoEmailSettings = (settings: AutoEmailSettings) => {
  try {
    localStorage.setItem(AUTO_DISPATCH_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save email settings', e);
  }
};

export const getStoredEmailLogs = (): EmailDispatchLog[] => {
  try {
    const raw = localStorage.getItem(EMAIL_LOGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return [];
};

export const saveStoredEmailLogs = (logs: EmailDispatchLog[]) => {
  try {
    localStorage.setItem(EMAIL_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save email logs', e);
  }
};

interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Send a whole batch of emails in ONE request instead of one fetch per
// recipient. Previously each caller did Promise.all(units.map(fetch)),
// which meant 286 simultaneous HTTP requests from the browser for a
// single "Send Reminder Notice" click — that's what was triggering 403s
// partway through the burst. Now the browser makes exactly one request;
// the server (routes/functions.js: send-email-batch) fans the emails out
// itself with bounded concurrency.
async function sendReminderEmailBatch(
  messages: OutgoingEmail[]
): Promise<{ success: boolean; error?: string }[]> {
  if (messages.length === 0) return [];

  try {
    const { data, error } = await supabase.functions.invoke('send-email-batch', {
      body: { messages }
    });
    if (error) {
      console.error('Batch reminder email send failed', error);
      // Whole request failed (e.g. network/auth) — report every message
      // in the batch as failed rather than silently dropping them.
      return messages.map(() => ({ success: false, error: error.message || 'Failed to send email.' }));
    }
    const results = data?.results;
    if (!Array.isArray(results) || results.length !== messages.length) {
      console.error('Unexpected batch send-email response shape', data);
      return messages.map(() => ({ success: false, error: 'Unexpected response from email service.' }));
    }
    return results.map((r: any) => ({ success: !!r?.success, error: r?.error }));
  } catch (err) {
    console.error('Batch reminder email send failed', err);
    return messages.map(() => ({ success: false, error: 'Could not reach the email service.' }));
  }
}

// Evaluate requisitions and automatically trigger deadline reminders to pending ITIs & JDs.
// NOTE: this still only builds and stores log entries — it does not send email itself.
// Wire it up to dispatchManualEmailReminder-style sending if you want the automatic
// 48h/24h/overdue cycle to actually deliver mail too.
export const runAutomaticEmailReminderCycle = (
  requisitions: Requisition[],
  fieldUnits: FieldUnit[],
  submissions: SubmissionRecord[],
  desks: DirectorateDesk[]
): {
  newLogsCount: number;
  generatedLogs: EmailDispatchLog[];
} => {
  const settings = getAutoEmailSettings();
  const existingLogs = getStoredEmailLogs();
  const newLogs: EmailDispatchLog[] = [];
  const now = Date.now();

  requisitions.forEach(req => {
    if (req.status !== 'ACTIVE') return;

    const deadlineTime = new Date(req.deadline).getTime();
    const diffHours = (deadlineTime - now) / (1000 * 60 * 60);

    const desk = desks.find(d => d.id === req.deskId);
    const senderDeskName = desk?.name || req.deskName || 'प्रशिक्षण निदेशालय, उ.प्र.';
    const senderEmail = desk?.email || settings.senderEmail;

    // Identify target field units
    const targetUnits = fieldUnits.filter(u => {
      if (req.targetScope === 'ALL_FIELD_UNITS') return true;
      if (req.targetScope === 'ALL_JD_OFFICES') return u.type === 'JD_OFFICE';
      if (req.targetScope === 'ALL_ITIS') return u.type === 'ITI';
      if (req.targetUnitIds && req.targetUnitIds.length > 0) {
        return req.targetUnitIds.includes(u.id);
      }
      return true;
    });

    targetUnits.forEach(unit => {
      // Check if unit has already submitted. Matches the "still pending"
      // definition used everywhere else in the app (FieldDashboard,
      // SubmissionsReportView, RequisitionDetailView): a submission sitting
      // in UNDER_REVIEW or LATE_SUBMITTED is done from the unit's side, not
      // something they still need a reminder for. Only REVISION_REQUESTED
      // (and no submission at all) still counts as pending.
      const isSubmitted = submissions.some(
        s => s.requisitionId === req.id && s.fieldUnitId === unit.id &&
          (s.status === 'SUBMITTED' || s.status === 'LATE_SUBMITTED' || s.status === 'UNDER_REVIEW' || s.status === 'APPROVED')
      );

      if (isSubmitted) return; // No reminder needed if already submitted

      // 1. Check 48-Hour Reminder (Between 24 and 48 hours remaining)
      if (settings.auto48HourEnabled && diffHours > 24 && diffHours <= 48) {
        const logId = `rem48_${req.id}_${unit.id}`;
        const alreadySent = existingLogs.some(l => l.id === logId) || newLogs.some(l => l.id === logId);

        if (!alreadySent) {
          const email = unit.email.includes('@') ? unit.email : `${unit.code.toLowerCase()}@vppup.in`;
          newLogs.push({
            id: logId,
            type: 'AUTO_REMINDER_48H',
            requisitionId: req.id,
            requisitionNumber: req.requisitionNumber,
            requisitionTitle: req.title,
            recipientUnitId: unit.id,
            recipientName: unit.name,
            recipientEmail: email,
            recipientType: unit.type,
            recipientDistrict: unit.district,
            senderDeskName,
            senderEmail,
            subject: `[48 घंटे शेष - रिमाइंडर] ${req.title} (${req.requisitionNumber})`,
            bodySnippet: `महोदय, संदर्भ पत्र सं. ${req.requisitionNumber} के क्रम में डेटा/सूचना प्रेषण की अंतिम तिथि ${new Date(req.deadline).toLocaleDateString('hi-IN')} है। कृपया समय-सीमा में पोर्टल पर विवरण अपलोड करें।\n\nपोर्टल लिंक: ${PORTAL_URL}`,
            dispatchedAt: new Date().toISOString(),
            status: 'DELIVERED',
            hoursRemaining: Math.round(diffHours)
          });
        }
      }

      // 2. Check 24-Hour Urgent Reminder (Between 0 and 24 hours remaining)
      if (settings.auto24HourEnabled && diffHours > 0 && diffHours <= 24) {
        const logId = `rem24_${req.id}_${unit.id}`;
        const alreadySent = existingLogs.some(l => l.id === logId) || newLogs.some(l => l.id === logId);

        if (!alreadySent) {
          const email = unit.email.includes('@') ? unit.email : `${unit.code.toLowerCase()}@vppup.in`;
          newLogs.push({
            id: logId,
            type: 'AUTO_REMINDER_24H',
            requisitionId: req.id,
            requisitionNumber: req.requisitionNumber,
            requisitionTitle: req.title,
            recipientUnitId: unit.id,
            recipientName: unit.name,
            recipientEmail: email,
            recipientType: unit.type,
            recipientDistrict: unit.district,
            senderDeskName,
            senderEmail,
            subject: `[अति-महत्वपूर्ण 24 घंटे शेष] समय-सीमा अनुपालन रिमाइंडर: ${req.title}`,
            bodySnippet: `अति-आवश्यक: डेटा संकलन पत्र संख्या ${req.requisitionNumber} हेतु केवल ${Math.max(1, Math.round(diffHours))} घंटे शेष हैं। कट-ऑफ लागू होने से पूर्व पोर्टल पर डेटा सबमिट करें।\n\nपोर्टल लिंक: ${PORTAL_URL}`,
            dispatchedAt: new Date().toISOString(),
            status: 'DELIVERED',
            hoursRemaining: Math.round(diffHours)
          });
        }
      }

      // 3. Check Overdue Defaulter Alert (Past deadline)
      if (settings.autoOverdueEnabled && diffHours < 0 && diffHours >= -72) {
        const logId = `rem_overdue_${req.id}_${unit.id}`;
        const alreadySent = existingLogs.some(l => l.id === logId) || newLogs.some(l => l.id === logId);

        if (!alreadySent) {
          const email = unit.email.includes('@') ? unit.email : `${unit.code.toLowerCase()}@vppup.in`;
          newLogs.push({
            id: logId,
            type: 'OVERDUE_ALERT',
            requisitionId: req.id,
            requisitionNumber: req.requisitionNumber,
            requisitionTitle: req.title,
            recipientUnitId: unit.id,
            recipientName: unit.name,
            recipientEmail: email,
            recipientType: unit.type,
            recipientDistrict: unit.district,
            senderDeskName,
            senderEmail,
            subject: `[डिफाल्टर चेतावनी] समय-सीमा समाप्त - तत्काल डेटा प्रेषण नोटिस (${req.requisitionNumber})`,
            bodySnippet: `चेतावनी: पत्र सं. ${req.requisitionNumber} हेतु निर्धारित समय-सीमा समाप्त हो चुकी है। आपकी इकाई द्वारा अभी तक अनुपालन नहीं किया गया है।\n\nपोर्टल लिंक: ${PORTAL_URL}`,
            dispatchedAt: new Date().toISOString(),
            status: 'DELIVERED',
            hoursRemaining: 0
          });
        }
      }
    });
  });

  if (newLogs.length > 0) {
    const combined = [...newLogs, ...existingLogs].slice(0, 500);
    saveStoredEmailLogs(combined);
  }

  return {
    newLogsCount: newLogs.length,
    generatedLogs: newLogs
  };
};

// Dispatch "new requisition" notification emails to every field unit targeted
// by a freshly created requisition. Called once, right after a desk creates
// a new demand — separate from the 48h/24h/overdue reminder cycle above.
export const dispatchNewRequisitionEmails = async (
  req: Requisition,
  fieldUnits: FieldUnit[],
  senderDesk?: DirectorateDesk,
  // When set, email exactly these units instead of re-deriving targets from
  // req.targetScope. Needed when a JD forwards to specific ITIs: the
  // requisition's targetScope often stays 'ALL_JD_OFFICES' even after ITI
  // ids are added to targetUnitIds, which would otherwise cause the
  // scope-based filter below to wrongly exclude those ITIs (an ITI doesn't
  // match "type === JD_OFFICE").
  explicitTargetUnits?: FieldUnit[]
): Promise<{ success: boolean; sentCount: number; failedCount: number; logs: EmailDispatchLog[] }> => {
  const settings = getAutoEmailSettings();
  if (!settings.notifyOnNewRequisition) {
    return { success: true, sentCount: 0, failedCount: 0, logs: [] };
  }

  const existingLogs = getStoredEmailLogs();
  const senderEmail = senderDesk?.email || settings.senderEmail;
  const senderDeskName = senderDesk?.name || req.deskName || 'प्रशिक्षण निदेशालय, उ.प्र.';

  // Same target resolution used across the app (userScope.ts / the reminder cycle above):
  // exact scope match first, then zones, then explicit unit id list.
  const targetUnits = explicitTargetUnits ?? fieldUnits.filter((u) => {
    if (req.targetScope === 'ALL_FIELD_UNITS') return true;
    if (req.targetScope === 'ALL_JD_OFFICES') return u.type === 'JD_OFFICE';
    if (req.targetScope === 'ALL_ITIS') return u.type === 'ITI';
    if (req.targetZones && req.targetZones.length > 0 && req.targetZones.includes(u.zone)) return true;
    if (req.targetUnitIds && req.targetUnitIds.length > 0) return req.targetUnitIds.includes(u.id);
    return false;
  });

  const subject = `[नई मांग जारी] ${req.title} (${req.requisitionNumber})`;
  const deadlineStr = new Date(req.deadline).toLocaleString('hi-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const message = `सादर, ${senderDeskName} द्वारा एक नई डेटा मांग जारी की गई है।\n\nविषय: ${req.title}\nसंदर्भ संख्या: ${req.requisitionNumber}\nअंतिम तिथि: ${deadlineStr}\n\nकृपया पोर्टल पर लॉगिन कर निर्धारित समय-सीमा में विवरण प्रस्तुत करें।\n\nपोर्टल लिंक: ${PORTAL_URL}`;

  // Resolve each unit's email address once, up front, so the outgoing
  // batch and the log entries stay in the same order and can be zipped
  // back together by index after the single batch request resolves.
  const recipients = targetUnits.map((unit) => ({
    unit,
    email: unit.email.includes('@') ? unit.email : `${unit.code.toLowerCase()}@vppup.in`
  }));

  const outgoing: OutgoingEmail[] = recipients.map(({ email }) => ({
    to: email,
    subject,
    text: message,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h3 style="margin-bottom: 4px;">नई डेटा मांग / New Data Requisition</h3>
          <p><strong>${req.title}</strong></p>
          <p>संदर्भ संख्या: ${req.requisitionNumber}<br/>
             अंतिम तिथि: ${deadlineStr}</p>
          <p>${req.description || ''}</p>
          <p><a href="${PORTAL_URL}" style="color: #2563eb;">पोर्टल पर जाएं / Visit Portal</a></p>
          <p style="font-size: 12px; color: #64748b;">प्रेषक: ${senderDeskName}</p>
        </div>
      `
  }));

  const sendResults = await sendReminderEmailBatch(outgoing);

  const results: EmailDispatchLog[] = recipients.map(({ unit, email }, i) => {
    const emailResult = sendResults[i] || { success: false, error: 'No result returned for this recipient.' };
    return {
      id: `new_req_${req.id}_${unit.id}`,
      type: 'NEW_REQUISITION',
      requisitionId: req.id,
      requisitionNumber: req.requisitionNumber,
      requisitionTitle: req.title,
      recipientUnitId: unit.id,
      recipientName: unit.name,
      recipientEmail: email,
      recipientType: unit.type,
      recipientDistrict: unit.district,
      senderDeskName,
      senderEmail,
      subject,
      bodySnippet: message,
      dispatchedAt: new Date().toISOString(),
      status: emailResult.success ? 'DELIVERED' : 'FAILED',
      error: emailResult.success ? undefined : emailResult.error
    };
  });

  const combined = [...results, ...existingLogs].slice(0, 500);
  saveStoredEmailLogs(combined);

  const sentCount = results.filter((l) => l.status === 'DELIVERED').length;
  const failedCount = results.filter((l) => l.status === 'FAILED').length;

  return { success: failedCount === 0, sentCount, failedCount, logs: results };
};
// Now actually sends each email via the send-email edge function and
// records the real per-recipient result instead of assuming success.
export const dispatchManualEmailReminder = async (
  req: Requisition,
  pendingUnits: FieldUnit[],
  customSubject?: string,
  customMessage?: string,
  senderDesk?: DirectorateDesk
): Promise<{ success: boolean; sentCount: number; failedCount: number; logs: EmailDispatchLog[] }> => {
  const existingLogs = getStoredEmailLogs();
  const senderEmail = senderDesk?.email || 'training.dte-up@gov.in';
  const senderDeskName = senderDesk?.name || req.deskName || 'प्रशिक्षण निदेशालय, उ.प्र.';

  const subject = customSubject || `[अनुस्मारक] ${req.title} (${req.requisitionNumber}) - डेटा प्रेषण अनुरोध`;
  const message = customMessage || `सादर, निदेशालय पत्र संख्या ${req.requisitionNumber} के अंतर्गत डेटा अपलोड की अंतिम तिथि निकट है। कृपया समय से पोर्टल पर सबमिशन पूर्ण करें।\n\nपोर्टल लिंक: ${PORTAL_URL}`;

  // Same batching approach as dispatchNewRequisitionEmails: resolve
  // recipients up front, send everything in ONE request (this is the
  // path "Send Reminder Notice" hits for all 286 pending ITIs at once),
  // then zip the per-recipient results back into log entries by index.
  const recipients = pendingUnits.map((unit) => ({
    unit,
    email: unit.email.includes('@') ? unit.email : `${unit.code.toLowerCase()}@vppup.in`
  }));

  const outgoing: OutgoingEmail[] = recipients.map(({ email }) => ({
    to: email,
    subject,
    text: message,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <p>${message}</p>
          <p><a href="${PORTAL_URL}" style="color: #2563eb;">पोर्टल पर जाएं / Visit Portal</a></p>
          <p style="font-size: 12px; color: #64748b;">Reference: ${req.requisitionNumber} • ${senderDeskName}</p>
        </div>
      `
  }));

  const sendResults = await sendReminderEmailBatch(outgoing);

  const results: EmailDispatchLog[] = recipients.map(({ unit, email }, i) => {
    const emailResult = sendResults[i] || { success: false, error: 'No result returned for this recipient.' };
    return {
      id: `manual_rem_${Date.now()}_${unit.id}`,
      type: 'MANUAL_REMINDER',
      requisitionId: req.id,
      requisitionNumber: req.requisitionNumber,
      requisitionTitle: req.title,
      recipientUnitId: unit.id,
      recipientName: unit.name,
      recipientEmail: email,
      recipientType: unit.type,
      recipientDistrict: unit.district,
      senderDeskName,
      senderEmail,
      subject,
      bodySnippet: message,
      dispatchedAt: new Date().toISOString(),
      status: emailResult.success ? 'DELIVERED' : 'FAILED',
      error: emailResult.success ? undefined : emailResult.error
    };
  });

  const combined = [...results, ...existingLogs].slice(0, 500);
  saveStoredEmailLogs(combined);

  const sentCount = results.filter(l => l.status === 'DELIVERED').length;
  const failedCount = results.filter(l => l.status === 'FAILED').length;

  return {
    success: failedCount === 0,
    sentCount,
    failedCount,
    logs: results
  };
};
