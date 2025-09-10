import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { User, Settings as SettingsIcon, Camera, UserPlus, Users, Home, Smartphone, LogOut, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { sendInvitationEmailEnhanced, isEmailServiceConfigured } from '../lib/emailService';

interface UserProfile {
  name: string;
  email: string;
  profileImageUrl?: string;
  homeId?: string;
  createdAt?: Date;
}

interface HomeData {
  id: string;
  name: string;
  adminId: string;
  members: string[];
  invites: Array<{
    id: string;
    email: string;
    invitedBy: string;
    status: 'pending';
    code: string;
    createdAt: Date;
  }>;
}

interface HomeInvite {
  id: string;
  homeId: string;
  homeName: string;
  invitedBy: string;
  invitedByName: string;
  code: string;
  status: 'pending';
}

export function Settings() {
  const { currentUser, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: ''
  });
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [availableInvites, setAvailableInvites] = useState<HomeInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;
    
    try {
      // Load user profile
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile({
          name: userData.name || '',
          email: userData.email || currentUser.email || '',
          profileImageUrl: userData.profileImageUrl,
          homeId: userData.homeId,
          createdAt: userData.createdAt
        });

        if (userData.homeId) {
          await loadHomeData(userData.homeId);
        }
      } else {
        // Create user profile if doesn't exist
        const newProfile = {
          name: '',
          email: currentUser.email || '',
          createdAt: new Date()
        };
        await setDoc(doc(db, 'users', currentUser.uid), newProfile);
        setProfile(newProfile);
      }

      // Load available invitations
      await loadAvailableInvites();
      
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const loadHomeData = async (homeId: string) => {
    try {
      const homeDoc = await getDoc(doc(db, 'homes', homeId));
      if (homeDoc.exists()) {
        setHomeData({ id: homeDoc.id, ...homeDoc.data() } as HomeData);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    }
  };

  const loadAvailableInvites = async () => {
    if (!currentUser?.email) return;

    try {
      const invitesQuery = query(
        collection(db, 'invites'),
        where('email', '==', currentUser.email),
        where('status', '==', 'pending')
      );
      const invitesSnapshot = await getDocs(invitesQuery);
      const invites: HomeInvite[] = [];

      for (const inviteDoc of invitesSnapshot.docs) {
        const inviteData = inviteDoc.data();
        const homeDoc = await getDoc(doc(db, 'homes', inviteData.homeId));
        const inviterDoc = await getDoc(doc(db, 'users', inviteData.invitedBy));
        
        if (homeDoc.exists() && inviterDoc.exists()) {
          invites.push({
            id: inviteDoc.id,
            homeId: inviteData.homeId,
            homeName: homeDoc.data().name,
            invitedBy: inviteData.invitedBy,
            invitedByName: inviterDoc.data().name,
            code: inviteData.code,
            status: 'pending'
          });
        }
      }

      setAvailableInvites(invites);
    } catch (error) {
      console.error('Error loading invites:', error);
    }
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    setError('');
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...profile,
        updatedAt: new Date(),
      }, { merge: true });
      setSuccess('פרופיל נשמר בהצלחה');
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('שגיאה בשמירת הפרופיל');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setSaving(true);
    setError('');
    try {
      // Delete old image if exists
      if (profile.profileImageUrl) {
        const oldRef = ref(storage, `profile-images/${currentUser.uid}`);
        await deleteObject(oldRef).catch(() => {}); // Ignore if doesn't exist
      }

      // Upload new image
      const imageRef = ref(storage, `profile-images/${currentUser.uid}_${Date.now()}`);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      
      const newProfile = { ...profile, profileImageUrl: downloadURL };
      setProfile(newProfile);
      
      await setDoc(doc(db, 'users', currentUser.uid), {
        profileImageUrl: downloadURL,
        updatedAt: new Date(),
      }, { merge: true });

      setSuccess('תמונה הועלתה בהצלחה');
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('שגיאה בהעלאת התמונה');
    } finally {
      setSaving(false);
    }
  };

  const createHome = async () => {
    if (!currentUser || !profile.name.trim()) {
      setError('אנא הכנס את שמך תחילה');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const homeRef = await addDoc(collection(db, 'homes'), {
        name: `הבית של ${profile.name}`,
        adminId: currentUser.uid,
        members: [currentUser.uid],
        createdAt: new Date(),
      });

      await setDoc(doc(db, 'users', currentUser.uid), {
        homeId: homeRef.id,
        updatedAt: new Date(),
      }, { merge: true });

      setProfile(prev => ({ ...prev, homeId: homeRef.id }));
      await loadHomeData(homeRef.id);
      setSuccess('בית נוצר בהצלחה!');
    } catch (error) {
      console.error('Error creating home:', error);
      setError('שגיאה ביצירת הבית');
    } finally {
      setSaving(false);
    }
  };

  const generateInvite = async () => {
    console.log('🚀 SETTINGS: generateInvite called');
    console.log('📋 SETTINGS: Input validation:', {
      inviteEmail,
      hasHomeData: !!homeData,
      hasCurrentUser: !!currentUser,
      profileName: profile.name
    });

    if (!inviteEmail || !homeData || !currentUser) {
      console.error('❌ SETTINGS: Validation failed');
      setError('אנא הזן אימייל תקין');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('💾 SETTINGS: Creating invitation in database...');
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Save invitation to database
      await addDoc(collection(db, 'invites'), {
        email: inviteEmail,
        homeId: homeData.id,
        invitedBy: currentUser.uid,
        code,
        status: 'pending',
        createdAt: new Date(),
      });
      console.log('✅ SETTINGS: Database invitation created with code:', code);

      // Prepare email data
      const emailData = {
        to_email: inviteEmail,
        to_name: inviteEmail.split('@')[0],
        home_name: homeData.name,
        inviter_name: profile.name || 'המזמין',
        invitation_code: code,
        app_url: window.location.origin
      };
      
      console.log('📧 SETTINGS: Preparing to send email with data:', emailData);

      // Send invitation email with enhanced method (includes fallback)
      console.log('🎯 SETTINGS: Starting email invitation process...');
      const emailSent = await sendInvitationEmailEnhanced(emailData);

      setGeneratedCode(code);
      setInviteEmail('');
      
      console.log('📬 SETTINGS: Email sending result:', emailSent);
      
      if (emailSent) {
        setSuccess(`✅ הזמנה נשלחה בהצלחה לאימייל: ${inviteEmail} | קוד: ${code}`);
        console.log('🎉 SETTINGS: Invitation process completed successfully!');
      } else {
        setError(`❌ נכשל בשליחת האימייל ל-${inviteEmail}. קוד ההזמנה נוצר: ${code} (בדוק את הקונסול למידע נוסף)`);
        console.log('💥 SETTINGS: Email sending failed - check the logs above for details');
      }
    } catch (error) {
      console.error('❌ SETTINGS: Error in generateInvite:', error);
      setError(`שגיאה ביצירת הזמנה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      console.log('🏁 SETTINGS: generateInvite process finished');
      setSaving(false);
    }
  };

  const joinHome = async (inviteId: string, homeId: string) => {
    if (!currentUser) return;

    setSaving(true);
    setError('');
    try {
      // Update user's homeId
      await setDoc(doc(db, 'users', currentUser.uid), {
        homeId,
        updatedAt: new Date(),
      }, { merge: true });

      // Add user to home members
      const homeDoc = await getDoc(doc(db, 'homes', homeId));
      if (homeDoc.exists()) {
        const homeData = homeDoc.data();
        await updateDoc(doc(db, 'homes', homeId), {
          members: [...(homeData.members || []), currentUser.uid],
          updatedAt: new Date(),
        });
      }

      // Mark invite as accepted
      await updateDoc(doc(db, 'invites', inviteId), {
        status: 'accepted',
        acceptedAt: new Date(),
      });

      // Reload data
      await loadUserData();
      setSuccess('הצטרפת לבית בהצלחה!');
    } catch (error) {
      console.error('Error joining home:', error);
      setError('שגיאה בהצטרפות לבית');
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = homeData && currentUser && homeData.adminId === currentUser.uid;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען הגדרות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {success}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold">פרופיל אישי</h2>
          </div>

          <div className="space-y-4">
            {/* Profile Image */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {profile.profileImageUrl ? (
                    <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile.name.charAt(0) || profile.email.charAt(0) || '?'
                  )}
                </div>
                <label className="absolute -bottom-1 -left-1 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-gray-600">תמונת פרופיל</p>
                <p className="text-xs text-gray-500">לחץ על המצלמה להעלות תמונה</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">שם</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="השם שלך"
                onBlur={saveProfile}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">אימייל</label>
              <Input
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Available Invitations */}
        {availableInvites.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <UserPlus className="text-green-600" size={20} />
              <h2 className="text-lg font-semibold">הזמנות שקיבלת</h2>
            </div>

            <div className="space-y-3">
              {availableInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="font-medium">{invite.homeName}</p>
                    <p className="text-sm text-gray-600">הזמנה מ{invite.invitedByName}</p>
                  </div>
                  <Button 
                    onClick={() => joinHome(invite.id, invite.homeId)}
                    disabled={saving}
                    size="sm"
                  >
                    הצטרף
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Home Management */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Home className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold">ניהול בית</h2>
          </div>

          {!homeData ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">אתה עדיין לא חבר בבית</p>
              <Button onClick={createHome} disabled={saving || !profile.name.trim()}>
                צור בית חדש
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">שם הבית</p>
                <p className="font-semibold">{homeData.name}</p>
                <p className="text-sm text-gray-500">
                  {homeData.members?.length || 0} חברים • {isAdmin ? 'אתה המנהל' : 'חבר'}
                </p>
              </div>

              {/* Invite Users */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus size={16} className="text-blue-600" />
                  <span className="font-medium">הזמן חברים חדשים</span>
                  {isEmailServiceConfigured() ? (
                    <Mail size={14} className="text-green-600" title="שליחת אימייל מופעלת" />
                  ) : (
                    <Mail size={14} className="text-gray-400" title="שליחת אימייל במצב בדיקה" />
                  )}
                </div>
                
                <div className="flex gap-2 mb-3">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="אימייל להזמנה"
                    type="email"
                  />
                  <Button 
                    onClick={generateInvite}
                    disabled={!inviteEmail.trim() || saving}
                  >
                    {saving ? 'שולח...' : 'הזמן'}
                  </Button>
                </div>


                {generatedCode && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      קוד הזמנה נוצר: <strong className="font-mono">{generatedCode}</strong>
                    </p>
                    <p className="text-xs text-blue-600">שתף את הקוד עם המוזמן</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>


        {/* Logout */}
        <div className="pt-4 border-t">
          <Button 
            onClick={logout}
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            התנתק
          </Button>
        </div>
      </div>
    </div>
  );
}