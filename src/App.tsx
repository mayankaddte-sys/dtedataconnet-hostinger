import React, { useState, useEffect, useRef } from 'react';
import { 
  DirectorateDesk, 
  FieldUnit, 
  Requisition, 
  RequisitionForwardEntry,
  SubmissionRecord, 
  ExtensionRequest, 
  DefaulterNotice, 
  UserSession,
  PortalNavMenu 
} from './types/portal';
import { 
  getStoredDesks, 
  getStoredFieldUnits, 
  getStoredRequisitions, 
  saveRequisitions, 
  getStoredSubmissions, 
  saveSubmissions, 
  getStoredExtensions, 
  saveExtensions, 
  getStoredDefaulterNotices, 
  saveDefaulterNotices, 
  getStoredUser, 
  saveCurrentUser, 
  deleteRequisition,
  deleteSubmission
} from './lib/storage';

import { Header } from './components/layout/Header';
import { LoginModal } from './components/auth/LoginModal';
import { DeskDashboard } from './components/desk/DeskDashboard';
import { CreateRequisitionModal } from './components/desk/CreateRequisitionModal';
import { RequisitionDetailView } from './components/desk/RequisitionDetailView';
import { FieldDashboard } from './components/field/FieldDashboard';
import { SubmitDataModal } from './components/field/SubmitDataModal';
import { DirectorOverview } from './components/admin/DirectorOverview';

import { RequisitionsListView } from './components/views/RequisitionsListView';
import { SubmissionsReportView } from './components/views/SubmissionsReportView';
import { ExtensionsView } from './components/views/ExtensionsView';
import { NoticesView } from './components/views/NoticesView';
import { DirectoryView } from './components/views/DirectoryView';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { AutoEmailMonitorModal } from './components/modals/AutoEmailMonitorModal';
import { ReminderDispatchSuccessModal } from './components/modals/ReminderDispatchSuccessModal';
import { runAutomaticEmailReminderCycle, dispatchManualEmailReminder, dispatchNewRequisitionEmails, EmailDispatchLog } from './lib/emailReminderEngine';

export default function App() {
  // Data state — starts empty, populated by the effect below.
  const [desks, setDesks] = useState<DirectorateDesk[]>([]);
  const [fieldUnits, setFieldUnits] = useState<FieldUnit[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [defaulterNotices, setDefaulterNotices] = useState<DefaulterNotice[]>([]);
  // No auto-login default anymore — null means "show the login page/modal".
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => getStoredUser());
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Menu-based navigation state
  const [activeMenu, setActiveMenu] = useState<PortalNavMenu>('DASHBOARD');
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  
  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginTargetForChallenge, setLoginTargetForChallenge] = useState<{
    type: 'DIRECTOR' | 'DESK' | 'JD' | 'ITI';
    data?: DirectorateDesk | FieldUnit;
  } | null>(null);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const [isEmailMonitorOpen, setIsEmailMonitorOpen] = useState<boolean>(false);
  const [isCreateReqModalOpen, setIsCreateReqModalOpen] = useState<boolean>(false);
  const [dispatchedEmailSuccessData, setDispatchedEmailSuccessData] = useState<{
    logs: EmailDispatchLog[];
    subject: string;
  } | null>(null);
  
  // Field submission modal state
  const [submittingRequisition, setSubmittingRequisition] = useState<Requisition | null>(null);
  const [submittingExistingRecord, setSubmittingExistingRecord] = useState<SubmissionRecord | undefined>(undefined);

  /* ===================================================================
     INITIAL LOAD — fetch everything from Supabase once on mount.
     =================================================================== */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [d, fu, req, sub, ext, notices] = await Promise.all([
          getStoredDesks(),
          getStoredFieldUnits(),
          getStoredRequisitions(),
          getStoredSubmissions(),
          getStoredExtensions(),
          getStoredDefaulterNotices()
        ]);

        if (cancelled) return;

        setDesks(d);
        setFieldUnits(fu);
        setRequisitions(req);
        setSubmissions(sub);
        setExtensions(ext);
        setDefaulterNotices(notices);
        setIsDataLoaded(true);
      } catch (e) {
        console.error('Failed to load initial data from Supabase', e);
        if (!cancelled) {
          setLoadError('डेटा लोड करने में समस्या हुई। कृपया पुनः प्रयास करें।');
          setIsDataLoaded(true); // allow UI to render even on failure
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // If nobody is logged in once data has loaded, open the login modal
  // so the person lands on a login prompt instead of a live dashboard.
  useEffect(() => {
    if (isDataLoaded && !currentUser) {
      setIsLoginModalOpen(true);
    }
  }, [isDataLoaded, currentUser]);

  // Run automatic email reminder cycle periodically (on load and when requisitions change)
  useEffect(() => {
    if (!isDataLoaded) return;
    try {
      runAutomaticEmailReminderCycle(requisitions, fieldUnits, submissions, desks);
    } catch (e) {
      console.error('Error running automatic email cycle', e);
    }
  }, [isDataLoaded, requisitions.length, submissions.length]);

  /* ===================================================================
     SYNC STATE -> SUPABASE ON CHANGE
     Guarded by isDataLoaded so we never overwrite real remote data with
     the empty arrays the state starts as before the initial fetch
     resolves.
     =================================================================== */
  const didMountRequisitions = useRef(false);
  useEffect(() => {
    if (!isDataLoaded) return;
    if (!didMountRequisitions.current) { didMountRequisitions.current = true; return; }
    saveRequisitions(requisitions).catch(e => console.error(e));
  }, [requisitions, isDataLoaded]);

  const didMountSubmissions = useRef(false);
  useEffect(() => {
    if (!isDataLoaded) return;
    if (!didMountSubmissions.current) { didMountSubmissions.current = true; return; }
    saveSubmissions(submissions).catch(e => console.error(e));
  }, [submissions, isDataLoaded]);

  const didMountExtensions = useRef(false);
  useEffect(() => {
    if (!isDataLoaded) return;
    if (!didMountExtensions.current) { didMountExtensions.current = true; return; }
    saveExtensions(extensions).catch(e => console.error(e));
  }, [extensions, isDataLoaded]);

  const didMountNotices = useRef(false);
  useEffect(() => {
    if (!isDataLoaded) return;
    if (!didMountNotices.current) { didMountNotices.current = true; return; }
    saveDefaulterNotices(defaulterNotices).catch(e => console.error(e));
  }, [defaulterNotices, isDataLoaded]);

  // Current user session — this stays a lightweight local/session value
  // (see storage.ts), not a Supabase table, so this can remain synchronous.
  useEffect(() => {
    if (currentUser) {
      saveCurrentUser(currentUser);
    }
  }, [currentUser]);

  // Urgent Assembly/Time-bound count
  const urgentCount = requisitions.filter(r => r.isAssemblyQuestion || r.priority === 'URGENT').length;

  // Active desk (if user is Desk role or Admin selected desk)
  const currentDesk = desks.find(d => d.id === currentUser?.deskId) || desks[0];

  // Active field unit (if user is JD or ITI)
  const currentFieldUnit = fieldUnits.find(u => u.id === currentUser?.fieldUnitId) || fieldUnits[0];

  // Handlers
  const handleSelectUser = (user: UserSession) => {
    setCurrentUser(user);
    setSelectedRequisition(null);
    setLoginTargetForChallenge(null);
    if (user.role === 'DIRECTORATE_ADMIN') {
      setActiveMenu('DIRECTOR_VIEW');
    } else {
      setActiveMenu('DASHBOARD');
    }
  };

  const handleRequireLoginTarget = (target: {
    type: 'DIRECTOR' | 'DESK' | 'JD' | 'ITI';
    data?: DirectorateDesk | FieldUnit;
  }) => {
    setLoginTargetForChallenge(target);
    setIsLoginModalOpen(true);
  };

  const handleLogout = () => {
    if (window.confirm('क्या आप वर्तमान सत्र से लॉगआउट करना चाहते हैं?')) {
      setCurrentUser(null);
      setSelectedRequisition(null);
      setActiveMenu('DASHBOARD');
      setLoginTargetForChallenge(null);
      setIsLoginModalOpen(true);
    }
  };

  const handleSaveRequisition = (newReq: Requisition) => {
    const updated = [newReq, ...requisitions];
    setRequisitions(updated);
    setSelectedRequisition(newReq);
    setActiveMenu('REQUISITIONS');

    // Fire-and-forget: notify every targeted field unit by email that a new
    // demand has been issued. Doesn't block the UI on email delivery.
    const senderDesk = desks.find(d => d.id === newReq.deskId);
    dispatchNewRequisitionEmails(newReq, fieldUnits, senderDesk).then(result => {
      if (result.failedCount > 0) {
        console.error(`New requisition email: ${result.failedCount} of ${result.sentCount + result.failedCount} failed to send`);
      }
    }).catch(e => console.error('Failed to dispatch new requisition emails', e));
  };

  // A JD office relays a requisition it received (targeted at the JD, not
  // directly at ITIs) down to selected/all ITIs in its mandal. Adds those
  // ITI ids to the SAME requisition's targetUnitIds — reusing all the
  // existing visibility/submission plumbing rather than creating a
  // duplicate child requisition — and logs who forwarded it and when.
  const handleForwardRequisitionToItis = (requisitionId: string, unitIds: string[]) => {
    if (currentUser?.role !== 'FIELD_JD' || !currentFieldUnit) return;

    const req = requisitions.find(r => r.id === requisitionId);
    if (!req) return;

    const newUnitIds = unitIds.filter(id => !req.targetUnitIds.includes(id));
    if (newUnitIds.length === 0) return;

    const forwardedAt = new Date().toISOString();
    const forwardEntries: RequisitionForwardEntry[] = newUnitIds.map(unitId => {
      const unit = fieldUnits.find(u => u.id === unitId);
      return {
        unitId,
        unitName: unit?.name || unitId,
        forwardedByJdId: currentFieldUnit.id,
        forwardedByJdName: currentFieldUnit.name,
        forwardedAt
      };
    });

    const updatedReq: Requisition = {
      ...req,
      targetUnitIds: [...req.targetUnitIds, ...newUnitIds],
      forwardLog: [...(req.forwardLog || []), ...forwardEntries]
    };

    setRequisitions(requisitions.map(r => (r.id === requisitionId ? updatedReq : r)));
    if (selectedRequisition?.id === requisitionId) {
      setSelectedRequisition(updatedReq);
    }

    // Notify exactly the newly forwarded ITIs (not re-derived from scope —
    // see the comment on dispatchNewRequisitionEmails for why that matters).
    const newlyTargetedUnits = fieldUnits.filter(u => newUnitIds.includes(u.id));
    const senderDesk = desks.find(d => d.id === updatedReq.deskId);
    dispatchNewRequisitionEmails(updatedReq, fieldUnits, senderDesk, newlyTargetedUnits).catch(e =>
      console.error('Failed to notify forwarded ITIs', e)
    );
  };

  const handleUpdateSubmissionStatus = (
    submissionId: string, 
    status: 'APPROVED' | 'REVISION_REQUESTED', 
    comments?: string
  ) => {
    const updated = submissions.map(sub => {
      if (sub.id === submissionId) {
        return {
          ...sub,
          status,
          deskComments: comments || sub.deskComments,
          deskReviewedAt: new Date().toISOString(),
          deskReviewedBy: currentUser?.displayName || ''
        };
      }
      return sub;
    });
    setSubmissions(updated);
  };

  const handleFieldSubmit = (subData: Partial<SubmissionRecord>) => {
    const existingIndex = submissions.findIndex(
      s => s.requisitionId === subData.requisitionId && s.fieldUnitId === subData.fieldUnitId
    );

    let updated: SubmissionRecord[];
    if (existingIndex >= 0) {
      updated = [...submissions];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...subData,
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED'
      } as SubmissionRecord;
    } else {
      updated = [subData as SubmissionRecord, ...submissions];
    }

    setSubmissions(updated);
  };

  const handleSendDefaulterNotice = async (unitIds: string[], subject: string, message: string, reqId?: string) => {
    const targetReq = requisitions.find(r => r.id === (reqId || selectedRequisition?.id)) || requisitions[0];
    const targetDesk = desks.find(d => d.id === targetReq?.deskId);

    const newNotices: DefaulterNotice[] = unitIds.map(unitId => ({
      id: `notice-${Date.now()}-${unitId}`,
      requisitionId: targetReq?.id || '',
      fieldUnitId: unitId,
      sentAt: new Date().toISOString(),
      subject,
      message,
      sentByDeskId: currentUser?.deskId || targetReq?.deskId || 'desk-coord'
    }));

    // 1. SAVE FIRST, independent of email outcome. The notice record and
    // the requisition's autoRemindersSent count are the "demand" being
    // saved — this must never be blocked, delayed, or rolled back by
    // however long (or how badly) the outgoing email batch goes. Both
    // setters below trigger their own persistence useEffect
    // (saveDefaulterNotices / saveRequisitions) immediately, with no
    // dependency on email delivery at all.
    setDefaulterNotices([...newNotices, ...defaulterNotices]);

    if (targetReq) {
      const updatedReqs = requisitions.map(r => {
        if (r.id === targetReq.id) {
          return {
            ...r,
            autoRemindersSent: (r.autoRemindersSent || 0) + 1
          };
        }
        return r;
      });
      setRequisitions(updatedReqs);
    }

    // 2. Email delivery is now a pure best-effort side effect. It runs
    // after the save, and nothing about its outcome (success, partial
    // failure, or a thrown error) can affect step 1 above — the demand
    // is already saved by the time this starts. The try/catch here only
    // protects the confirmation modal from an unexpected exception; it
    // never re-touches defaulterNotices or requisitions state.
    const targetUnits = fieldUnits.filter(u => unitIds.includes(u.id));
    if (targetReq && targetUnits.length > 0) {
      try {
        const emailResult = await dispatchManualEmailReminder(targetReq, targetUnits, subject, message, targetDesk);
        setDispatchedEmailSuccessData({
          logs: emailResult.logs,
          subject
        });
      } catch (e) {
        console.error('Email dispatch failed after notice was already saved', e);
        setDispatchedEmailSuccessData({
          logs: [],
          subject
        });
      }
    }
  };

  const handleGrantExtension = (requisitionId: string, unitId: string | 'ALL', newDeadline: string) => {
    const updatedReqs = requisitions.map(r => {
      if (r.id === requisitionId) {
        return {
          ...r,
          deadline: newDeadline
        };
      }
      return r;
    });
    setRequisitions(updatedReqs);
    if (selectedRequisition && selectedRequisition.id === requisitionId) {
      setSelectedRequisition({ ...selectedRequisition, deadline: newDeadline });
    }
  };

  const handleRequestExtensionFromField = (requisitionId: string, reason: string) => {
    const newExt: ExtensionRequest = {
      id: `ext-${Date.now()}`,
      requisitionId,
      fieldUnitId: currentFieldUnit.id,
      fieldUnitName: currentFieldUnit.name,
      requestedDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      reason,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    setExtensions([newExt, ...extensions]);
  };

  const handleRespondExtension = (extensionId: string, status: 'APPROVED' | 'REJECTED', comments: string) => {
    const updated = extensions.map(e => {
      if (e.id === extensionId) {
        return {
          ...e,
          status,
          respondedAt: new Date().toISOString(),
          deskResponseComment: comments
        };
      }
      return e;
    });
    setExtensions(updated);
  };

  const handleDeleteRequisition = (requisitionId: string) => {
    const updatedReqs = requisitions.filter(r => r.id !== requisitionId);
    setRequisitions(updatedReqs);

    const updatedSubs = submissions.filter(s => s.requisitionId !== requisitionId);
    setSubmissions(updatedSubs);

    const updatedExts = extensions.filter(e => e.requisitionId !== requisitionId);
    setExtensions(updatedExts);

    const updatedNotices = defaulterNotices.filter(n => n.requisitionId !== requisitionId);
    setDefaulterNotices(updatedNotices);

    if (selectedRequisition?.id === requisitionId) {
      setSelectedRequisition(null);
    }

    // Local state above only updates this browser's view. The requisitions/
    // submissions "sync" effects only ever upsert, so without this explicit
    // call the row (and its submissions) would stay in Supabase forever and
    // keep showing up for every other user. This is the actual delete.
    deleteRequisition(requisitionId).catch(e =>
      console.error('Failed to delete requisition from Supabase', e)
    );
  };

  const handleDeleteSubmission = (submissionId: string) => {
    const updatedSubs = submissions.filter(s => s.id !== submissionId);
    setSubmissions(updatedSubs);

    // Same reasoning as above — saveSubmissions() can't remove rows, so we
    // must delete this one explicitly or it reappears for other users.
    deleteSubmission(submissionId).catch(e =>
      console.error('Failed to delete submission from Supabase', e)
    );
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-600 text-lg font-medium">लोड हो रहा है...</div>
      </div>
    );
  }

  // No active session — show a minimal shell with the login modal open,
  // instead of falling back into a live dashboard.
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {loadError && (
          <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm text-center py-2 px-4">
            {loadError}
          </div>
        )}

        <Header
          currentUser={null}
          onOpenLoginModal={() => {
            setLoginTargetForChallenge(null);
            setIsLoginModalOpen(true);
          }}
          onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
          onOpenEmailMonitor={() => setIsEmailMonitorOpen(true)}
          onCreateRequisition={() => {}}
          activeRequisitions={[]}
          urgentCount={0}
          extensions={[]}
          defaulterNotices={[]}
          activeMenu={activeMenu}
          onChangeMenu={() => {}}
          desks={desks}
          fieldUnits={fieldUnits}
          onSelectUser={handleSelectUser}
          onRequireLoginTarget={handleRequireLoginTarget}
          onLogout={undefined}
        />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-6">
          <img
            src="/dte-badge.png"
            alt="प्रशिक्षण निदेशालय, उत्तर प्रदेश — DTE DataFlow"
            className="w-40 h-40 sm:w-48 sm:h-48 drop-shadow-lg"
          />
          <div className="text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              DTE DataFlow — Compliance & Repository Portal
            </h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              कृपया पोर्टल में कार्य करने हेतु लॉगिन करें। (Please log in to continue.)
            </p>
          </div>
        </main>

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => {
            setIsLoginModalOpen(false);
            setLoginTargetForChallenge(null);
          }}
          desks={desks}
          fieldUnits={fieldUnits}
          currentUser={null}
          onSelectUser={handleSelectUser}
          preSelectedTarget={loginTargetForChallenge}
          onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        />

        <ChangePasswordModal
          isOpen={isChangePasswordModalOpen}
          onClose={() => setIsChangePasswordModalOpen(false)}
          currentUser={null}
          desks={desks}
          fieldUnits={fieldUnits}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">

      {loadError && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm text-center py-2 px-4">
          {loadError}
        </div>
      )}
      
      {/* Institutional Global Navigation Header & Menu Bar */}
      <Header
        currentUser={currentUser}
        onOpenLoginModal={() => {
          setLoginTargetForChallenge(null);
          setIsLoginModalOpen(true);
        }}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        onOpenEmailMonitor={() => setIsEmailMonitorOpen(true)}
        onCreateRequisition={() => setIsCreateReqModalOpen(true)}
        activeRequisitions={requisitions}
        urgentCount={urgentCount}
        extensions={extensions}
        defaulterNotices={defaulterNotices}
        activeMenu={activeMenu}
        onChangeMenu={(menu) => {
          setActiveMenu(menu);
          setSelectedRequisition(null);
        }}
        desks={desks}
        fieldUnits={fieldUnits}
        onSelectUser={handleSelectUser}
        onRequireLoginTarget={handleRequireLoginTarget}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* If a requisition is selected in detail view */}
        {selectedRequisition ? (
          <RequisitionDetailView
            requisition={selectedRequisition}
            onBack={() => setSelectedRequisition(null)}
            submissions={submissions}
            fieldUnits={fieldUnits}
            desk={desks.find(d => d.id === selectedRequisition.deskId) || currentDesk}
            extensions={extensions}
            onUpdateSubmissionStatus={handleUpdateSubmissionStatus}
            onSendDefaulterNotice={handleSendDefaulterNotice}
            onGrantExtension={handleGrantExtension}
            onDeleteRequisition={
              currentUser.role === 'DIRECTORATE_ADMIN' || currentUser.role === 'DIRECTORATE_DESK'
                ? handleDeleteRequisition
                : undefined
            }
            onDeleteSubmission={
              currentUser.role === 'DIRECTORATE_ADMIN' || currentUser.role === 'DIRECTORATE_DESK'
                ? handleDeleteSubmission
                : undefined
            }
          />
        ) : (
          <>
            {/* MENU TAB 1: DASHBOARD */}
            {activeMenu === 'DASHBOARD' && (
              <>
                {currentUser.role === 'DIRECTORATE_ADMIN' && (
                  <DirectorOverview
                    desks={desks}
                    requisitions={requisitions}
                    submissions={submissions}
                    fieldUnits={fieldUnits}
                    currentUser={currentUser}
                    onCreateRequisition={() => setIsCreateReqModalOpen(true)}
                    onOpenLoginModal={() => setIsLoginModalOpen(true)}
                    onSendDefaulterNotice={handleSendDefaulterNotice}
                    onSelectDesk={(desk) => {
                      setCurrentUser({
                        ...currentUser,
                        deskId: desk.id,
                        displayName: `निदेशक (समीक्षाधीन: ${desk.name})`
                      });
                      setSelectedRequisition(null);
                    }}
                    onSelectRequisition={(req) => {
                      setSelectedRequisition(req);
                    }}
                  />
                )}

                {currentUser.role === 'DIRECTORATE_DESK' && (
                  <DeskDashboard
                    desk={currentDesk}
                    requisitions={requisitions}
                    submissions={submissions}
                    extensions={extensions}
                    fieldUnits={fieldUnits}
                    onSelectRequisition={setSelectedRequisition}
                    onCreateRequisition={() => setIsCreateReqModalOpen(true)}
                    onRespondExtension={handleRespondExtension}
                  />
                )}

                {(currentUser.role === 'FIELD_JD' || currentUser.role === 'FIELD_ITI') && (
                  <FieldDashboard
                    fieldUnit={currentFieldUnit}
                    allFieldUnits={fieldUnits}
                    currentUser={currentUser}
                    requisitions={requisitions}
                    submissions={submissions}
                    extensions={extensions}
                    defaulterNotices={defaulterNotices}
                    desks={desks}
                    onOpenSubmitModal={(req, existingSub) => {
                      setSubmittingRequisition(req);
                      setSubmittingExistingRecord(existingSub);
                    }}
                    onRequestExtension={handleRequestExtensionFromField}
                    onSelectRequisition={setSelectedRequisition}
                    onForwardToItis={handleForwardRequisitionToItis}
                  />
                )}
              </>
            )}

            {/* MENU TAB 2: DATA REQUISITIONS */}
            {activeMenu === 'REQUISITIONS' && (
              <RequisitionsListView
                requisitions={requisitions}
                desks={desks}
                submissions={submissions}
                currentUser={currentUser}
                onSelectRequisition={setSelectedRequisition}
                onOpenSubmitModal={(req, existingSub) => {
                  setSubmittingRequisition(req);
                  setSubmittingExistingRecord(existingSub);
                }}
                onCreateRequisition={() => setIsCreateReqModalOpen(true)}
                onDeleteRequisition={
                  currentUser.role === 'DIRECTORATE_ADMIN' || currentUser.role === 'DIRECTORATE_DESK'
                    ? handleDeleteRequisition
                    : undefined
                }
              />
            )}

            {/* MENU TAB 3: SUBMISSIONS & REPORTS */}
            {activeMenu === 'SUBMISSIONS_REPORT' && (
              <SubmissionsReportView
                submissions={submissions}
                requisitions={requisitions}
                fieldUnits={fieldUnits}
                desks={desks}
                currentUser={currentUser}
                onSelectRequisition={setSelectedRequisition}
                onDeleteSubmission={
                  currentUser.role === 'DIRECTORATE_ADMIN' || currentUser.role === 'DIRECTORATE_DESK'
                    ? handleDeleteSubmission
                    : undefined
                }
              />
            )}

            {/* MENU TAB 4: EXTENSIONS & DEADLINES */}
            {activeMenu === 'EXTENSIONS' && (
              <ExtensionsView
                extensions={extensions}
                requisitions={requisitions}
                fieldUnits={fieldUnits}
                desks={desks}
                currentUser={currentUser}
                onRespondExtension={handleRespondExtension}
                onRequestExtension={handleRequestExtensionFromField}
              />
            )}

            {/* MENU TAB 5: NOTICES & DEFAULTERS */}
            {activeMenu === 'NOTICES' && (
              <NoticesView
                defaulterNotices={defaulterNotices}
                requisitions={requisitions}
                fieldUnits={fieldUnits}
                desks={desks}
                currentUser={currentUser}
                submissions={submissions}
                onSendDefaulterNotice={handleSendDefaulterNotice}
                onOpenEmailMonitor={() => setIsEmailMonitorOpen(true)}
              />
            )}

            {/* MENU TAB 6: DIRECTORY */}
            {activeMenu === 'DIRECTORY' && (
              <DirectoryView
                desks={desks}
                fieldUnits={fieldUnits}
              />
            )}

            {/* MENU TAB 7: DIRECTORATE APEX VIEW */}
            {activeMenu === 'DIRECTOR_VIEW' && (
              <DirectorOverview
                desks={desks}
                requisitions={requisitions}
                submissions={submissions}
                fieldUnits={fieldUnits}
                currentUser={currentUser}
                onCreateRequisition={() => setIsCreateReqModalOpen(true)}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
                onSelectDesk={(desk) => {
                  setCurrentUser({
                    ...currentUser,
                    deskId: desk.id,
                    displayName: `निदेशक (समीक्षाधीन: ${desk.name})`
                  });
                  setSelectedRequisition(null);
                  setActiveMenu('DASHBOARD');
                }}
                onSelectRequisition={(req) => {
                  setSelectedRequisition(req);
                }}
              />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-1 sm:gap-2 text-center sm:text-left">
            <img src="/dte-badge.png" alt="Official Portal Seal" className="w-8 h-8 shrink-0 hidden sm:block" />
            <span className="font-semibold text-slate-700">प्रशिक्षण निदेशालय, उत्तर प्रदेश शासन</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="text-slate-600">राज्य स्तरीय डेटा संकलन एवं अनुपालन पोर्टल</span>
          </div>

          <div className="text-center md:text-right flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px] shadow-2xs">
              Developed by <strong className="text-indigo-900 font-bold">Mayank Mishra</strong> (Assistant Director O/o DTE, Lucknow, Uttar Pradesh)
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="text-indigo-600 font-bold hover:underline"
              >
                🔐 पासवर्ड बदलें
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="text-slate-700 font-bold hover:underline"
              >
                खाता बदलें
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Multi-role Login & Credentials Switcher */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setLoginTargetForChallenge(null);
        }}
        desks={desks}
        fieldUnits={fieldUnits}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        preSelectedTarget={loginTargetForChallenge}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
      />

      {/* 2. User Password Change Facility Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        currentUser={currentUser}
        desks={desks}
        fieldUnits={fieldUnits}
      />

      {/* 3. Create Requisition Modal */}
      <CreateRequisitionModal
        isOpen={isCreateReqModalOpen}
        onClose={() => setIsCreateReqModalOpen(false)}
        desks={desks}
        fieldUnits={fieldUnits}
        activeDeskId={currentUser.deskId}
        onSaveRequisition={handleSaveRequisition}
      />

      {/* 4. Field Unit Data Submission Modal */}
      {submittingRequisition && (
        <SubmitDataModal
          isOpen={!!submittingRequisition}
          onClose={() => {
            setSubmittingRequisition(null);
            setSubmittingExistingRecord(undefined);
          }}
          requisition={submittingRequisition}
          fieldUnit={currentFieldUnit}
          existingSubmission={submittingExistingRecord}
          onSubmit={handleFieldSubmit}
          onRequestExtension={handleRequestExtensionFromField}
        />
      )}

      {/* 5. Automatic Email Reminders Monitor Modal */}
      <AutoEmailMonitorModal
        isOpen={isEmailMonitorOpen}
        onClose={() => setIsEmailMonitorOpen(false)}
        requisitions={requisitions}
        fieldUnits={fieldUnits}
        submissions={submissions}
        desks={desks}
      />

      {/* 6. Live Email Dispatch Success Confirmation Modal */}
      {dispatchedEmailSuccessData && (
        <ReminderDispatchSuccessModal
          isOpen={!!dispatchedEmailSuccessData}
          onClose={() => setDispatchedEmailSuccessData(null)}
          dispatchedLogs={dispatchedEmailSuccessData.logs}
          subject={dispatchedEmailSuccessData.subject}
          onOpenFullMonitor={() => setIsEmailMonitorOpen(true)}
        />
      )}

    </div>
  );
}
