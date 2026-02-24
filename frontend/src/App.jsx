import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VendorRegister from './VendorRegister';

// Import your components
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
//import VendorDashboard from './VendorDashboard';  // ← Comment this out
import ProtectedRoute from './ProtectedRoute';

import VendorDashboard from './VendorDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/vendor-register" element={<VendorRegister />} />
        
        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/employee-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/vendor-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['vendor']}>
              <VendorDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;