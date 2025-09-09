import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';

export function DebugFirebase() {
  const [status, setStatus] = useState<string>('Checking Firebase connection...');

  useEffect(() => {
    const testFirebase = async () => {
      try {
        // Test Firebase app initialization
        if (!auth.app) {
          setStatus('❌ Firebase app not initialized');
          return;
        }
        
        setStatus('✅ Firebase app initialized');
        
        // Test Auth connection
        auth.onAuthStateChanged((user) => {
          if (user) {
            setStatus(prev => prev + '\n✅ Auth state listener working - User signed in');
          } else {
            setStatus(prev => prev + '\n✅ Auth state listener working - No user');
          }
        });

        // Test Firestore connection
        console.log('Firebase config:', {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...',
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        });
        
      } catch (error) {
        setStatus(`❌ Firebase error: ${error}`);
        console.error('Firebase error:', error);
      }
    };

    testFirebase();
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-black text-white p-4 rounded-lg text-sm font-mono max-w-md z-50">
      <h3 className="font-bold mb-2">Firebase Debug</h3>
      <pre className="whitespace-pre-wrap">{status}</pre>
    </div>
  );
}