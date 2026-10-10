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
 * Returns all FieldUnit IDs in the user's jurisdiction.
 */
export function getJurisdictionUnitIds(
  currentUser: UserSession | null,
  fieldUnits: FieldUnit[]
): string[] {
  if (!currentUser) return [];

  if (
    currentUser.role === 'DIRECTORATE_ADMIN' ||
    currentUser.role === 'DIRECTORATE_DESK'
  ) {
    return fieldUnits.map(u => u.id);
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    return fieldUnits
      .filter(u => u.zone === userUnit.zone || u.id === userUnit.id)
      .map(u => u.id);
  }

  if (currentUser.role === 'FIELD_ITI') {
    return [userUnit.id];
  }

  return [];
}

/**
 * Returns FieldUnits scoped to the user.
 */
export function getScopedFieldUnits(
  currentUser: UserSession | null,
  fieldUnits: FieldUnit[]
): FieldUnit[] {
  if (!currentUser) return [];

  if (
    currentUser.role === 'DIRECTORATE_ADMIN' ||
    currentUser.role === 'DIRECTORATE_DESK'
  ) {
    return fieldUnits;
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    return fieldUnits.filter(
      u => u.zone === userUnit.zone || u.id === userUnit.id
    );
  }

  if (currentUser.role === 'FIELD_ITI') {
    return fieldUnits.filter(u => u.id === userUnit.id);
  }

  return [];
}

/**
 * Returns ITI units under a JD's mandal.
 */
export function getMandalItiUnits(
  currentUser: UserSession | null,
  fieldUnits: FieldUnit[]
): FieldUnit[] {
  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  return fieldUnits.filter(
    u => u.zone === userUnit.zone && u.type === 'ITI'
  );
}

/**
 * Checks whether a JD can forward a requisition to mandal ITIs.
 */
export function isForwardableByJd(
  requisition: Requisition,
  jdUnit: FieldUnit,
  fieldUnits: FieldUnit[]
): boolean {
  if (jdUnit.type !== 'JD_OFFICE') return false;
  if (!requisition.targetUnitIds.includes(jdUnit.id)) return false;
  if (requisition.allowJdForward === false) return false;

  const mandalItiIds = new Set(
    fieldUnits
      .filter(u => u.zone === jdUnit.zone && u.type === 'ITI')
      .map(u => u.id)
  );

  const alreadyTargetsAnyMandalIti =
    requisition.targetUnitIds.some(id => mandalItiIds.has(id));

  return !alreadyTargetsAnyMandalIti;
}

/**
 * Checks whether Directorate has blocked forwarding by a JD.
 */
export function isForwardBlockedByDirectorate(
  requisition: Requisition,
  jdUnit: FieldUnit,
  fieldUnits: FieldUnit[]
): boolean {
  if (jdUnit.type !== 'JD_OFFICE') return false;
  if (requisition.allowJdForward !== false) return false;
  if (!requisition.targetUnitIds.includes(jdUnit.id)) return false;

  const mandalItiIds = new Set(
    fieldUnits
      .filter(u => u.zone === jdUnit.zone && u.type === 'ITI')
      .map(u => u.id)
  );

  return !requisition.targetUnitIds.some(id => mandalItiIds.has(id));
}

/**
 * Returns mandal ITIs not already targeted by a requisition.
 */
export function getUnforwardedMandalItis(
  requisition: Requisition,
  jdUnit: FieldUnit,
  fieldUnits: FieldUnit[]
): FieldUnit[] {
  return fieldUnits.filter(
    u =>
      u.zone === jdUnit.zone &&
      u.type === 'ITI' &&
      !requisition.targetUnitIds.includes(u.id)
  );
}

/**
 * Returns targeted units that have not submitted, or whose submission
 * was sent back for revision.
 */
export function getNonSubmittedTargetUnits(
  requisition: Requisition,
  submissions: SubmissionRecord[],
  fieldUnits: FieldUnit[]
): FieldUnit[] {
  const targetIds = new Set(requisition.targetUnitIds);

  const compliedIds = new Set(
    submissions
      .filter(
        s =>
          s.requisitionId === requisition.id &&
          s.status !== 'REVISION_REQUESTED'
      )
      .map(s => s.fieldUnitId)
  );

  return fieldUnits.filter(
    u => targetIds.has(u.id) && !compliedIds.has(u.id)
  );
}

/**
 * Returns requisitions visible to the user.
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
      fieldUnits
        .filter(u => u.zone === userUnit.zone || u.id === userUnit.id)
        .map(u => u.id)
    );

    return requisitions.filter(r => {
      if (
        r.targetScope === 'ALL_FIELD_UNITS' ||
        r.targetScope === 'ALL_JD_OFFICES'
      ) {
        return true;
      }

      if (r.targetZones?.includes(userUnit.zone)) return true;

      return r.targetUnitIds.some(id => mandalUnitIds.has(id));
    });
  }

  if (currentUser.role === 'FIELD_ITI') {
    return requisitions.filter(r => {
      if (
        r.targetScope === 'ALL_FIELD_UNITS' ||
        r.targetScope === 'ALL_ITIS'
      ) {
        return true;
      }

      if (r.targetZones?.includes(userUnit.zone)) return true;

      return r.targetUnitIds.includes(userUnit.id);
    });
  }

  return [];
}

/**
 * Returns submissions visible to the user.
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
      requisitions
        .filter(r => r.deskId === currentUser.deskId)
        .map(r => r.id)
    );

    return submissions.filter(s => deskReqIds.has(s.requisitionId));
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    const mandalUnitIds = new Set(
      fieldUnits
        .filter(u => u.zone === userUnit.zone || u.id === userUnit.id)
        .map(u => u.id)
    );

    return submissions.filter(
      s =>
        mandalUnitIds.has(s.fieldUnitId) ||
        (s.fieldUnitZone && s.fieldUnitZone === userUnit.zone)
    );
  }

  if (currentUser.role === 'FIELD_ITI') {
    return submissions.filter(s => s.fieldUnitId === userUnit.id);
  }

  return [];
}

/**
 * Returns extension requests visible to the user.
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
      requisitions
        .filter(r => r.deskId === currentUser.deskId)
        .map(r => r.id)
    );

    return extensions.filter(e => deskReqIds.has(e.requisitionId));
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    const mandalUnitIds = new Set(
      fieldUnits
        .filter(u => u.zone === userUnit.zone || u.id === userUnit.id)
        .map(u => u.id)
    );

    return extensions.filter(e => mandalUnitIds.has(e.fieldUnitId));
  }

  if (currentUser.role === 'FIELD_ITI') {
    return extensions.filter(e => e.fieldUnitId === userUnit.id);
  }

  return [];
}

/**
 * Returns defaulter notices visible to the user.
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
      requisitions
        .filter(r => r.deskId === currentUser.deskId)
        .map(r => r.id)
    );

    return notices.filter(
      n =>
        n.sentByDeskId === currentUser.deskId ||
        deskReqIds.has(n.requisitionId)
    );
  }

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  if (!userUnit) return [];

  if (currentUser.role === 'FIELD_JD') {
    const mandalUnitIds = new Set(
      fieldUnits
        .filter(u => u.zone === userUnit.zone || u.id === userUnit.id)
        .map(u => u.id)
    );

    return notices.filter(n => mandalUnitIds.has(n.fieldUnitId));
  }

  if (currentUser.role === 'FIELD_ITI') {
    return notices.filter(n => n.fieldUnitId === userUnit.id);
  }

  return [];
}
