import ComplaintsListPage from '../../components/ComplaintsListPage';

export default function AllComplaints() {
  return (
    <ComplaintsListPage title="All complaints" subtitle="Search, filter and manage every complaint."
      fields={['q', 'status', 'category_id', 'priority', 'building', 'department_id', 'date', 'overdue']} showStudent showStaff />
  );
}
