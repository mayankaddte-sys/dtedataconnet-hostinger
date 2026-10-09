import React, { useState } from 'react';
import { Requisition, DirectorateDesk, SubmissionRecord, UserSession, FieldUnit } from '../../types/portal';
import { receivedFromTargets } from '../../utils/demandStats';
import { PriorityBadge } from '../common/PriorityBadge';
import { CountdownTimer } from '../common/CountdownTimer';
import { formatDateTime } from '../../utils/dateUtils';
import { getScopedRequisitions, getUserZone, getCurrentUserFieldUnit } from '../../utils/userScope';
import { 
  FileText, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  ArrowRight,
  Send,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Calendar,
  Trash2,
  AlertTriangle,
  MapPin,
  ShieldCheck
} from 'lucide-react';

interface RequisitionsListViewProps {
  requisitions: Requisition[];
  desks: DirectorateDesk[];
  submissions: SubmissionRecord[];
  fieldUnits?: FieldUnit[];
  currentUser: UserSession;
  onSelectRequisition: (req: Requisition) => void;
  onOpenSubmitModal?: (req: Requisition, existingSub?: SubmissionRecord) => void;
  onCreateRequisition?: () => void;
  onDeleteRequisition?: (requisitionId: string) => void;
}

export const RequisitionsListView: React.FC<RequisitionsListViewProps> = ({
  requisitions,
  desks,
  submissions,
  fieldUnits = [],
  currentUser,
  onSelectRequisition,
  onOpenSubmitModal,
  onCreateRequisition,
  onDeleteRequisition
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeskFilter, setSelectedDeskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'URGENT' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [deletingReq, setDeletingReq] = useState<Requisition | null>(null);

  const isField = currentUser.role === 'FIELD_JD' || currentUser.role === 'FIELD_ITI';
  const isJD = currentUser.role === 'FIELD_JD';
  const isITI = currentUser.role === 'FIELD_ITI';
  const isDirectorate = currentUser.role === 'DIRECTORATE_DESK' || currentUser.role === 'DIRECTORATE_ADMIN';

  const userUnit = getCurrentUserFieldUnit(currentUser, fieldUnits);
  const userZone = getUserZone(currentUser, fieldUnits);

  // Scoped requisitions based on role:
  // - Admin: all
  // - Desk: desk requisitions
  // - JD: requisitions targeting JD office OR ITIs in his mandal
  // - ITI: requisitions targeting this ITI
  const relevantRequisitions = getScopedRequisitions(currentUser, requisitions, fieldUnits);

  const filteredRequisitions = relevantRequisitions.filter(req => {
    const matchesSearch = 
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requisitionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.deskName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDesk = selectedDeskFilter === 'ALL' || req.deskId === selectedDeskFilter;

    // Determine status
    const isUrgent = req.priority === 'URGENT' || req.isAssemblyQuestion;
    const isOverdue = new Date(req.deadline).getTime() < Date.now();
    
    let matchesStatus = true;
    if (statusFilter === 'URGENT') {
      matchesStatus = isUrgent;
    } else if (statusFilter === 'OVERDUE') {
      matchesStatus = isOverdue;
    } else if (statusFilter === 'ACTIVE') {
      matchesStatus = !isOverdue;
    }

    return matchesSearch && matchesDesk && matchesStatus;
  });

  return (
    <div className="space-y-5">
