import ComplaintsListPage from '../../components/ComplaintsListPage';
import { EmptyState } from '../../components/ui';

export default function AssignedComplaints() {
  return (
    <ComplaintsListPage title="Assigned complaints" subtitle="Complaints assigned to you."
      fields={['q', 'status', 'priority', 'overdue']} showStudent
      empty={<EmptyState title="No complaints assigned" text="You will be notified when the administration assigns one." />} />
  );
}
