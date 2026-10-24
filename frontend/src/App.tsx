import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ManageChannelsPage } from './pages/ManageChannelsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Base Route */}
          <Route path="/" element={<HomePage />} />

          {/* Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Manage Channels Route (Admin Only) */}
          <Route path="/manage-channels" element={<ManageChannelsPage />} />
          <Route path="/admin/channels" element={<ManageChannelsPage />} />

          {/* Channel Deep-link Route */}
          <Route path="/:channelId" element={<HomePage />} />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
