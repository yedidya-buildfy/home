import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthContainer } from './components/auth/AuthContainer';
import { DebugFirebase } from './components/DebugFirebase';
import { Settings } from './pages/Settings';
import { Home as HomePage } from './pages/Home';
import { Groceries } from './pages/Groceries';
import { InviteHandler } from './components/InviteHandler';
import { EmailDebug } from './components/EmailDebug';
import { Home, Settings as SettingsIcon, ShoppingCart } from 'lucide-react';

type Page = 'home' | 'groceries' | 'settings';

function AppContent() {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('home');

  // Check for invitation in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('code');
    const inviteEmail = urlParams.get('email');
    
    if (inviteCode && inviteEmail) {
      // Store invitation for handling
      sessionStorage.setItem('activeInvite', JSON.stringify({ code: inviteCode, email: inviteEmail }));
    }
  }, []);

  // Handle invitation route
  if (window.location.pathname === '/invite') {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const email = urlParams.get('email');
    
    if (code && email) {
      return <InviteHandler code={code} email={email} />;
    }
  }

  // Debug email route (for troubleshooting)
  if (window.location.pathname === '/debug-email') {
    return <EmailDebug />;
  }

  if (!currentUser) {
    return <AuthContainer />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return <Settings />;
      case 'groceries':
        return <Groceries />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPage()}
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="flex justify-around items-center py-2" dir="rtl">
          <button
            onClick={() => setCurrentPage('home')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              currentPage === 'home'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Home size={24} />
            <span className="text-xs mt-1">בית</span>
          </button>
          
          <button
            onClick={() => setCurrentPage('groceries')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              currentPage === 'groceries'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart size={24} />
            <span className="text-xs mt-1">קניות</span>
          </button>
          
          <button
            onClick={() => setCurrentPage('settings')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              currentPage === 'settings'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <SettingsIcon size={24} />
            <span className="text-xs mt-1">הגדרות</span>
          </button>
        </div>
      </div>
      
      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      { import.meta.env.VITE_SHOW_FIREBASE_DEBUG === '1' && (
        <DebugFirebase />
      )}
    </AuthProvider>
  );
}

export default App;
