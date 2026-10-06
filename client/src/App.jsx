import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import { Loading } from './components/ui';
import { homeFor } from './utils/format';
import Landing from './pages/Landing';
import { Login, Register } from './pages/Auth';
import StudentDashboard from './pages/student/StudentDashboard';
import ReportComplaint from './pages/student/ReportComplaint';
import MyComplaints from './pages/student/MyComplaints';
import StaffDashboard from './pages/staff/StaffDashboard';
import AssignedComplaints from './pages/staff/AssignedComplaints';
import AdminDashboard from './pages/admin/AdminDashboard';
import AllComplaints from './pages/admin/AllComplaints';
import Analytics from './pages/admin/Analytics';
import StaffManagement from './pages/admin/StaffManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import LocationManagement from './pages/admin/LocationManagement';
import ComplaintDetails from './pages/ComplaintDetails';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to={homeFor(user.role)} replace /> : children;
}

export default function App() {
  const only = (roles, el) => <Protected roles={roles}>{el}</Protected>;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/student" element={only(['STUDENT'], <StudentDashboard />)} />
        <Route path="/student/report" element={only(['STUDENT'], <ReportComplaint />)} />
        <Route path="/student/complaints" element={only(['STUDENT'], <MyComplaints />)} />

        <Route path="/staff" element={only(['STAFF'], <StaffDashboard />)} />
        <Route path="/staff/complaints" element={only(['STAFF'], <AssignedComplaints />)} />

        <Route path="/admin" element={only(['ADMIN'], <AdminDashboard />)} />
        <Route path="/admin/complaints" element={only(['ADMIN'], <AllComplaints />)} />
        <Route path="/admin/analytics" element={only(['ADMIN'], <Analytics />)} />
        <Route path="/admin/staff" element={only(['ADMIN'], <StaffManagement />)} />
        <Route path="/admin/categories" element={only(['ADMIN'], <CategoryManagement />)} />
        <Route path="/admin/locations" element={only(['ADMIN'], <LocationManagement />)} />

        <Route path="/complaints/:id" element={<ComplaintDetails />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
