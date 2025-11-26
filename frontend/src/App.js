import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { PlanDesigner } from './pages/PlanDesigner';
import { ApprovalCenter } from './pages/ApprovalCenter';
import { Analytics } from './pages/Analytics';
import { Tickets } from './pages/Tickets';
import { UserManagement } from './pages/UserManagement';
import { PartnerRegister } from './pages/PartnerRegister';
import { Partners } from './pages/Partners';
import { Transactions } from './pages/Transactions';
import { SpiffCenter } from './pages/SpiffCenter';
import { Payouts } from './pages/Payouts';
import { Strategic } from './pages/Strategic';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-slate-200" data-testid="main-navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="nav-logo">
              SPM/PPM
            </Link>
            <div className="flex space-x-4">
              <Link to="/dashboard" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-dashboard">
                Dashboard
              </Link>
              {(user.role === 'admin' || user.role === 'finance') && (
                <>
                  <Link to="/products" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-products">
                    Products
                  </Link>
                  <Link to="/plan-designer" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-plan-designer">
                    Plans
                  </Link>
                </>
              )}
              <Link to="/partners" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-partners">
                Partners
              </Link>
              {(user.role === 'admin' || user.role === 'manager' || user.role === 'finance') && (
                <Link to="/approval-center" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-approval-center">
                  Approvals
                </Link>
              )}
              <Link to="/analytics" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-analytics">
                Analytics
              </Link>
              <Link to="/tickets" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-tickets">
                Support
              </Link>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link to="/users" className="text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-users">
                  Users
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600" data-testid="nav-user-name">{user.full_name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="btn-logout">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const AppContent = () => {
  return (
    <div className="App">
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/partner-register" element={<PartnerRegister />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan-designer"
          element={
            <ProtectedRoute>
              <PlanDesigner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partners"
          element={
            <ProtectedRoute>
              <Partners />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approval-center"
          element={
            <ProtectedRoute>
              <ApprovalCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <Tickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="top-right" data-testid="toast-container" />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <AppContent />
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
