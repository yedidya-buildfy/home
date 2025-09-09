import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { User, Settings as SettingsIcon, Camera, UserPlus, Users, Home, Smartphone } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface UserProfile {
  name: string;
  profileImageUrl?: string;
  homeId?: string;
  defaultScreen: 'home' | 'groceries';
}

interface HomeData {
  id: string;
  name: string;
  adminId: string;
  members: string[];
  invites: Array<{
    email: string;
    invitedBy: string;
    status: 'pending';
    code: string;
  }>;
}

export function Settings() {
  const { currentUser, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    defaultScreen: 'home'
  });
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinHomeCode, setJoinHomeCode] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
    }
  }, [currentUser]);

  const loadUserProfile = async () => {
    if (!currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile({
          name: userData.name || '',
          profileImageUrl: userData.profileImageUrl,
          homeId: userData.homeId,
          defaultScreen: userData.defaultScreen || 'home'
        });

        if (userData.homeId) {
          await loadHomeData(userData.homeId);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
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

  const saveProfile = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        name: profile.name,
        profileImageUrl: profile.profileImageUrl,
        homeId: profile.homeId,
        defaultScreen: profile.defaultScreen,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setSaving(true);
    try {
      // Delete old image if exists
      if (profile.profileImageUrl) {
        const oldRef = ref(storage, `profile-images/${currentUser.uid}`);
        await deleteObject(oldRef).catch(() => {}); // Ignore if doesn't exist
      }

      // Upload new image
      const imageRef = ref(storage, `profile-images/${currentUser.uid}`);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      
      const newProfile = { ...profile, profileImageUrl: downloadURL };
      setProfile(newProfile);
      
      await setDoc(doc(db, 'users', currentUser.uid), {
        profileImageUrl: downloadURL,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setSaving(false);
    }
  };

  const createHome = async () => {
    if (!currentUser || !profile.name.trim()) {
      alert('אנא הכנס את שמך תחילה');
      return;
    }

    setSaving(true);
    try {
      const homeId = `home_${Date.now()}`;
      await setDoc(doc(db, 'homes', homeId), {
        name: `הבית של ${profile.name}`,
        adminId: currentUser.uid,
        members: [currentUser.uid],
        invites: [],
        createdAt: new Date(),
      });

      await setDoc(doc(db, 'users', currentUser.uid), {
        homeId,
      }, { merge: true });

      setProfile(prev => ({ ...prev, homeId }));
      await loadHomeData(homeId);
    } catch (error) {
      console.error('Error creating home:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateInvite = async () => {
    if (!inviteEmail || !homeData || !currentUser) return;

    setSaving(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newInvite = {
        email: inviteEmail,
        invitedBy: currentUser.uid,
        status: 'pending' as const,
        code,
      };

      await updateDoc(doc(db, 'homes', homeData.id), {
        invites: [...(homeData.invites || []), newInvite],
      });

      setHomeData(prev => prev ? {
        ...prev,
        invites: [...(prev.invites || []), newInvite]
      } : null);

      setInviteCode(code);
      setInviteEmail('');
    } catch (error) {
      console.error('Error generating invite:', error);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = homeData && currentUser && homeData.adminId === currentUser.uid;

  if (loading) {
    return <div className="p-4 text-center">טוען...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">הגדרות</h1>
      </div>

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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile.name.charAt(0) || currentUser?.email?.charAt(0) || '?'
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
              value={currentUser?.email || ''}
              disabled
              className="bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Home Management */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Home className="text-blue-600" size={20} />
          <h2 className="text-lg font-semibold">ניהול בית</h2>
        </div>

        {!homeData ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">אתה עדיין לא חבר בבית</p>
            <div className="space-y-4">
              <Button onClick={createHome} disabled={saving}>
                צור בית חדש
              </Button>
              <div className="text-sm text-gray-500">או</div>
              <div className="flex gap-2">
                <Input
                  value={joinHomeCode}
                  onChange={(e) => setJoinHomeCode(e.target.value)}
                  placeholder="קוד הזמנה"
                />
                <Button variant="outline" disabled={!joinHomeCode.trim() || saving}>
                  הצטרף לבית
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">שם הבית</p>
              <p className="font-semibold">{homeData.name}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">חברים ({homeData.members?.length || 0})</p>
            </div>

            {/* Invite Users */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus size={16} className="text-blue-600" />
                <span className="font-medium">הזמן חברים</span>
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
                  הזמן
                </Button>
              </div>

              {inviteCode && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    קוד הזמנה נוצר: <strong>{inviteCode}</strong>
                  </p>
                  <p className="text-xs text-green-600">שתף את הקוד עם המוזמן</p>
                </div>
              )}
            </div>

            {/* Pending Invites */}
            {homeData.invites && homeData.invites.length > 0 && (
              <div className="border-t pt-4">
                <p className="font-medium mb-2">הזמנות ממתינות</p>
                {homeData.invites.map((invite, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{invite.email}</span>
                    <span className="text-xs text-gray-500">קוד: {invite.code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* App Preferences */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="text-blue-600" size={20} />
          <h2 className="text-lg font-semibold">העדפות אפליקציה</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">מסך ברירת מחדל</label>
          <div className="flex gap-2">
            <Button
              variant={profile.defaultScreen === 'home' ? 'primary' : 'outline'}
              onClick={() => {
                setProfile(prev => ({ ...prev, defaultScreen: 'home' }));
                saveProfile();
              }}
            >
              בית
            </Button>
            <Button
              variant={profile.defaultScreen === 'groceries' ? 'primary' : 'outline'}
              onClick={() => {
                setProfile(prev => ({ ...prev, defaultScreen: 'groceries' }));
                saveProfile();
              }}
            >
              קניות
            </Button>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="pt-4 border-t">
        <Button 
          onClick={logout}
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
        >
          התנתק
        </Button>
      </div>
    </div>
  );
}