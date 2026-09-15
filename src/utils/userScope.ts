import { 
  UserSession, 
  FieldUnit, 
  Requisition, 
  SubmissionRecord, 
  ExtensionRequest, 
  DefaulterNotice 
} from '../types/portal';

/**
 * Returns the FieldUnit associated with the current user, or undefined.
 */
export function getCurrentUserFieldUnit(
  currentUser: UserSession | null, 
  fieldUnits: FieldUnit[]
): FieldUnit | undefined {
  if (!currentUser || !currentUser.fieldUnitId) return undefined;
  return fieldUnits.find(u => u.id === currentUser.fieldUnitId);
}

/**
 * Returns the zone (mandal) of the current JD or ITI, or null.
 */
export function getUserZone(
  currentUser: UserSession | null, 
  fieldUnits: FieldUnit[]
): string | null {
  const unit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  return unit ? unit.zone : null;
}

/**
 * Returns all FieldUnit IDs that are in the user's jurisdiction:
 * - No session: none
 * - DIRECTORATE: All field units
 * - FIELD_JD: The JD's own office + all ITIs in the districts of his Mandal (zone)
 * - FIELD_ITI: Only this ITI's unit ID
 */
export function getJurisdictionUnitIds(
  currentUser: UserSession | null, 
  fieldUnits: FieldUnit[]
): string[] {
  if (!currentUser) return [];

  if (currentUser.role === 'DIRECTORATE_ADMIN' || currentUser.role === 'DIRECTORATE_DESK') {
    return fieldUnits.map(u => u.id);
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    // JD can see his own office AND all ITIs in his mandal (zone)
    return fieldUnits
      .filter(u => u.zone === userUnit.zone || u.id === userUnit.id)
      .map(u => u.id);
  }

  if (currentUser.role === 'FIELD_ITI') {
    // ITI can only see data pertaining to itself
    return [userUnit.id];
  }

  return [];
}

/**
 * Returns FieldUnits scoped to the user:
 * - No session: none
 * - DIRECTORATE: All units
 * - FIELD_JD: JD's office + all ITIs in his mandal
 * - FIELD_ITI: Only this ITI
 */
export function getScopedFieldUnits(
  currentUser: UserSession | null, 
  fieldUnits: FieldUnit[]
): FieldUnit[] {
  if (!currentUser) return [];

  if (currentUser.role === 'DIRECTORATE_ADMIN' || currentUser.role === 'DIRECTORATE_DESK') {
    return fieldUnits;
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    return fieldUnits.filter(u => u.zone === userUnit.zone || u.id === userUnit.id);
  }

  if (currentUser.role === 'FIELD_ITI') {
    return fieldUnits.filter(u => u.id === userUnit.id);
  }

  return [];
}

/**
 * Returns ITI units specifically under a JD's mandal (excluding the JD office itself)
 */
export function getMandalItiUnits(
  currentUser: UserSession | null, 
  fieldUnits: FieldUnit[]
): FieldUnit[] {
  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  return fieldUnits.filter(u => u.zone === userUnit.zone && u.type === 'ITI');
}

/**
 * True if a requisition was issued to this JD's office (not directly to any
 * ITI in their mandal yet) and can therefore be relayed to mandal ITIs.
 * Once at least one mandal ITI is already targeted (whether by the original
 * directorate order or a previous forward), this returns false — there's
 * nothing new to forward.
 */
export function isForwardableByJd(
  requisition: Requisition,
  jdUnit: FieldUnit,
  fieldUnits: FieldUnit[]
): boolean {
  if (jdUnit.type !== 'JD_OFFICE') return false;
  if (!requisition.targetUnitIds.includes(jdUnit.id)) return false;

  const mandalItiIds = new Set(
    fieldUnits.filter(u => u.zone === jdUnit.zone && u.type === 'ITI').map(u => u.id)
  );
  const alreadyTargetsAnyMandalIti = requisition.targetUnitIds.some(id => mandalItiIds.has(id));
  return !alreadyTargetsAnyMandalIti;
}

/**
 * Mandal ITIs not yet forwarded this specific requisition (i.e. not already
 * in its targetUnitIds) — the selectable list for the "Forward to ITIs" modal.
 */
export function getUnforwardedMandalItis(
  requisition: Requisition,
  jdUnit: FieldUnit,
  fieldUnits: FieldUnit[]
): FieldUnit[] {
  return fieldUnits.filter(
    u => u.zone === jdUnit.zone && u.type === 'ITI' && !requisition.targetUnitIds.includes(u.id)
  );
}

/**
 * Units targeted by a requisition that have NOT yet submitted (or whose
 * submission was sent back for revision) — the actual "defaulters" for
 * that specific demand. Used to scope bulk reminder notices to real
 * non-submitters instead of every field unit statewide.
 */
export function getNonSubmittedTargetUnits(
  requisition: Requisition,
  submissions: SubmissionRecord[],
  fieldUnits: FieldUnit[]
): FieldUnit[] {
  const targetIds = new Set(requisition.targetUnitIds);
  const compliedIds = new Set(
    submissions
      .filter(s => s.requisitionId === requisition.id && s.status !== 'REVISION_REQUESTED')
      .map(s => s.fieldUnitId)
  );
  return fieldUnits.filter(u => targetIds.has(u.id) && !compliedIds.has(u.id));
}

/**
 * Returns Requisitions visible to the user:
 * - No session: none
 * - DIRECTORATE_ADMIN: All requisitions
 * - DIRECTORATE_DESK: Requisitions created by/for their desk
 * - FIELD_JD: Requisitions targeting his JD office OR targeting ITIs in his mandal
 * - FIELD_ITI: Requisitions targeting this specific ITI
 */
export function getScopedRequisitions(
  currentUser: UserSession | null, 
  requisitions: Requisition[], 
  fieldUnits: FieldUnit[]
): Requisition[] {
  if (!currentUser) return [];

  if (currentUser.role === 'DIRECTORATE_ADMIN') {
    return requisitions;
  }

  if (currentUser.role === 'DIRECTORATE_DESK') {
    if (!currentUser.deskId) return requisitions;
    return requisitions.filter(r => r.deskId === currentUser.deskId);
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    const mandalUnitIds = new Set(
      fieldUnits.filter(u => u.zone === userUnit.zone || u.id === userUnit.id).map(u => u.id)
    );

    return requisitions.filter(r => {
      // If targeted to all field units or all JD offices
      if (r.targetScope === 'ALL_FIELD_UNITS' || r.targetScope === 'ALL_JD_OFFICES') return true;
      // If target zones include JD's zone
      if (r.targetZones && r.targetZones.includes(userUnit.zone)) return true;
      // If any unit in JD's mandal is in targetUnitIds
      return r.targetUnitIds.some(id => mandalUnitIds.has(id));
    });
  }

  if (currentUser.role === 'FIELD_ITI') {
    return requisitions.filter(r => {
      if (r.targetScope === 'ALL_FIELD_UNITS' || r.targetScope === 'ALL_ITIS') return true;
      if (r.targetZones && r.targetZones.includes(userUnit.zone)) return true;
      return r.targetUnitIds.includes(userUnit.id);
    });
  }

  return [];
}

/**
 * Returns Submissions visible to the user:
 * - No session: none
 * - DIRECTORATE_ADMIN: All submissions
 * - DIRECTORATE_DESK: Submissions for this desk's requisitions
 * - FIELD_JD: Submissions made by JD office AND submissions by ITIs in his mandal
 * - FIELD_ITI: Only submissions made by this ITI
 */
export function getScopedSubmissions(
  currentUser: UserSession | null, 
  submissions: SubmissionRecord[], 
  requisitions: Requisition[], 
  fieldUnits: FieldUnit[]
): SubmissionRecord[] {
  if (!currentUser) return [];

  if (currentUser.role === 'DIRECTORATE_ADMIN') {
    return submissions;
  }

  if (currentUser.role === 'DIRECTORATE_DESK') {
    if (!currentUser.deskId) return submissions;
    const deskReqIds = new Set(
      requisitions.filter(r => r.deskId === currentUser.deskId).map(r => r.id)
    );
    return submissions.filter(s => deskReqIds.has(s.requisitionId));
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    const mandalUnitIds = new Set(
      fieldUnits.filter(u => u.zone === userUnit.zone || u.id === userUnit.id).map(u => u.id)
    );
    return submissions.filter(s => 
      mandalUnitIds.has(s.fieldUnitId) || (s.fieldUnitZone && s.fieldUnitZone === userUnit.zone)
    );
  }

  if (currentUser.role === 'FIELD_ITI') {
    return submissions.filter(s => s.fieldUnitId === userUnit.id);
  }

  return [];
}

/**
 * Returns Extension Requests visible to the user:
 * - No session: none
 * - DIRECTORATE_ADMIN: All extension requests
 * - DIRECTORATE_DESK: Requests for this desk's requisitions
 * - FIELD_JD: Requests by JD office AND by ITIs in his mandal
 * - FIELD_ITI: Only requests by this ITI
 */
export function getScopedExtensions(
  currentUser: UserSession | null, 
  extensions: ExtensionRequest[], 
  requisitions: Requisition[], 
  fieldUnits: FieldUnit[]
): ExtensionRequest[] {
  if (!currentUser) return [];

  if (currentUser.role === 'DIRECTORATE_ADMIN') {
    return extensions;
  }

  if (currentUser.role === 'DIRECTORATE_DESK') {
    if (!currentUser.deskId) return extensions;
    const deskReqIds = new Set(
      requisitions.filter(r => r.deskId === currentUser.deskId).map(r => r.id)
    );
    return extensions.filter(e => deskReqIds.has(e.requisitionId));
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    const mandalUnitIds = new Set(
      fieldUnits.filter(u => u.zone === userUnit.zone || u.id === userUnit.id).map(u => u.id)
    );
    return extensions.filter(e => mandalUnitIds.has(e.fieldUnitId));
  }

  if (currentUser.role === 'FIELD_ITI') {
    return extensions.filter(e => e.fieldUnitId === userUnit.id);
  }

  return [];
}

/**
 * Returns Defaulter Notices visible to the user:
 * - No session: none
 * - DIRECTORATE_ADMIN: All notices
 * - DIRECTORATE_DESK: Notices sent by this desk or for its requisitions
 * - FIELD_JD: Notices received by JD office AND by ITIs in his mandal
 * - FIELD_ITI: Only notices received by this ITI
 */
export function getScopedNotices(
  currentUser: UserSession | null, 
  notices: DefaulterNotice[], 
  requisitions: Requisition[], 
  fieldUnits: FieldUnit[]
): DefaulterNotice[] {
  if (!currentUser) return [];

  if (currentUser.role === 'DIRECTORATE_ADMIN') {
    return notices;
  }

  if (currentUser.role === 'DIRECTORATE_DESK') {
    if (!currentUser.deskId) return notices;
    const deskReqIds = new Set(
      requisitions.filter(r => r.deskId === currentUser.deskId).map(r => r.id)
    );
    return notices.filter(n => n.sentByDeskId === currentUser.deskId || deskReqIds.has(n.requisitionId));
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    const mandalUnitIds = new Set(
      fieldUnits.filter(u => u.zone === userUnit.zone || u.id === userUnit.id).map(u => u.id)
    );
    return notices.filter(n => mandalUnitIds.has(n.fieldUnitId));
  }

  if (currentUser.role === 'FIELD_ITI') {
    return notices.filter(n => n.fieldUnitId === userUnit.id);
  }

  return [];
}
