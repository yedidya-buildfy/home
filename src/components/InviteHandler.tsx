import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Button } from './ui/Button';
import { Loader2, CheckCircle, XCircle, LogIn, UserPlus } from 'lucide-react';

interface InviteHandlerProps {
  code: string;
  email: string;
}

export function InviteHandler({ code, email }: InviteHandlerProps) {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'found' | 'not_found' | 'joining' | 'success' | 'error'>('loading');
  const [inviteData, setInviteData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkInvitation();
  }, [code, email]);

  useEffect(() => {
    if (currentUser && inviteData && status === 'found') {
      // Auto-join if user is logged in and invitation is valid
      handleJoinHome();
    }
  }, [currentUser, inviteData, status]);

  const checkInvitation = async () => {
    try {
      // Find invitation by code and email
      const invitesQuery = query(
        collection(db, 'invites'),
        where('code', '==', code.toUpperCase()),
        where('email', '==', email),
        where('status', '==', 'pending')
      );
      
      const invitesSnapshot = await getDocs(invitesQuery);
      
      if (!invitesSnapshot.empty) {
        const inviteDoc = invitesSnapshot.docs[0];
        const invite = { id: inviteDoc.id, ...inviteDoc.data() };
        
        // Get home details
        const homeDoc = await getDoc(doc(db, 'homes', invite.homeId));
        if (homeDoc.exists()) {
          setInviteData({
            ...invite,
            homeName: homeDoc.data().name
          });
          setStatus('found');
          
          // If user is already logged in, auto-join
          if (currentUser) {
            handleJoinHome();
          }
        } else {
          setStatus('not_found');
          setErrorMessage('הבית אליו הוזמנת לא נמצא');
        }
      } else {
        setStatus('not_found');
        setErrorMessage('ההזמנה לא נמצאה או שכבר נוצלה');
      }
    } catch (error) {
      console.error('Error checking invitation:', error);
      setStatus('error');
      setErrorMessage('שגיאה בבדיקת ההזמנה');
    }
  };

  const handleJoinHome = async () => {
    if (!currentUser || !inviteData) return;
    
    setStatus('joining');
    
    try {
      // Update user's homeId
      await setDoc(doc(db, 'users', currentUser.uid), {
        homeId: inviteData.homeId,
        email: currentUser.email,
        updatedAt: new Date(),
      }, { merge: true });

      // Add user to home members
      const homeRef = doc(db, 'homes', inviteData.homeId);
      const homeDoc = await getDoc(homeRef);
      
      if (homeDoc.exists()) {
        const homeData = homeDoc.data();
        const updatedMembers = [...(homeData.members || [])];
        if (!updatedMembers.includes(currentUser.uid)) {
          updatedMembers.push(currentUser.uid);
        }
        
        await updateDoc(homeRef, {
          members: updatedMembers,
          updatedAt: new Date(),
        });
      }

      // Mark invite as accepted
      await updateDoc(doc(db, 'invites', inviteData.id), {
        status: 'accepted',
        acceptedBy: currentUser.uid,
        acceptedAt: new Date(),
      });

      setStatus('success');
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Error joining home:', error);
      setStatus('error');
      setErrorMessage('שגיאה בהצטרפות לבית');
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">בודק הזמנה...</p>
        </div>
      </div>
    );
  }

  // Invitation not found
  if (status === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ההזמנה לא נמצאה</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <Button onClick={() => window.location.href = '/'}>
            חזור לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  // Invitation found but user not logged in
  if (status === 'found' && !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">הוזמנת להצטרף!</h2>
            <p className="text-gray-600 mt-2">
              הוזמנת להצטרף לבית <strong>{inviteData.homeName}</strong>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              כדי להצטרף לבית, עליך להתחבר או ליצור חשבון חדש עם האימייל:
            </p>
            <p className="font-mono text-blue-900 font-semibold mt-2">{email}</p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => {
                sessionStorage.setItem('pendingInvite', JSON.stringify({ code, email }));
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              כבר יש לי חשבון - התחבר
            </Button>
            
            <Button 
              onClick={() => {
                sessionStorage.setItem('pendingInvite', JSON.stringify({ code, email }));
                window.location.href = '/signup';
              }}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              חדש פה? צור חשבון
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Joining home
  if (status === 'joining') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">מצטרף לבית...</p>
        </div>
      </div>
    );
  }

  // Success
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">הצטרפת בהצלחה!</h2>
          <p className="text-gray-600 mb-4">
            הצטרפת לבית <strong>{inviteData.homeName}</strong>
          </p>
          <p className="text-sm text-gray-500">מעביר אותך לדף הבית...</p>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h2>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <Button onClick={() => window.location.href = '/'}>
          חזור לדף הבית
        </Button>
      </div>
    </div>
  );
}