import { Link } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import ComplaintsListPage from '../../components/ComplaintsListPage';
import { Button, EmptyState } from '../../components/ui';

export default function MyComplaints() {
  return (
    <ComplaintsListPage title="My complaints" subtitle="Everything you have reported, newest first."
      fields={['q', 'status', 'category_id', 'priority']}
      action={<Link to="/student/report"><Button><FilePlus2 className="h-4 w-4" /> New complaint</Button></Link>}
      empty={<EmptyState title="No complaints yet" text="Your reported issues will show up here." action={<Link to="/student/report"><Button>Report an issue</Button></Link>} />} />
  );
}
