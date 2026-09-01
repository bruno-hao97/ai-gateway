import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { ImageStudioPage } from '@/pages/ImageStudioPage';
import { WalletPage } from '@/pages/WalletPage';
import { ChatPage } from '@/pages/ChatPage';
import { VideoStudioPage } from '@/pages/VideoStudioPage';
import { AudioStudioPage } from '@/pages/AudioStudioPage';
import { isLoggedIn } from '@/lib/authStore';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={isLoggedIn() ? <Navigate to="/app" replace /> : <LoginPage />}
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="image" element={<ImageStudioPage />} />
          <Route path="video" element={<VideoStudioPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="audio" element={<AudioStudioPage />} />
          <Route path="wallet" element={<WalletPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
