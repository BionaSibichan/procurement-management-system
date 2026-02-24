import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Not logged in
  if (!user || !user.username) {
    return <Navigate to="/" replace />;
  }
  
  // Check if user role is allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their correct dashboard
    if (user.role === 'admin') {
      return <Navigate to="/admin-dashboard" replace />;
    } else if (user.role === 'employee') {
      return <Navigate to="/employee-dashboard" replace />;
    } else if (user.role === 'vendor') {
      return <Navigate to="/vendor-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return children;
}