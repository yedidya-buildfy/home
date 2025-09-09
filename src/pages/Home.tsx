import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { Calendar, Users, User, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  homeId?: string;
}

interface HomeData {
  id: string;
  name: string;
  adminId: string;
  members: string[];
}

interface AttendanceDay {
  coming: boolean;
  guests: number;
  note: string;
}

interface DayAttendance {
  [userId: string]: AttendanceDay;
}

interface WeeklyAttendance {
  [date: string]: DayAttendance;
}

interface AttendanceData {
  weekId: string;
  days: WeeklyAttendance;
}

// Hebrew day names
const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'
];

// Helper functions
const formatHebrewDate = (date: Date): string => {
  const dayName = HEBREW_DAYS[date.getDay()];
  const day = date.getDate();
  const month = HEBREW_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `יום ${dayName}, ${day} ${month} ${year}`;
};

const getWeekId = (date: Date): string => {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

const getWeekDates = (date: Date): Date[] => {
  const current = new Date(date);
  const first = current.getDate() - current.getDay(); // First day is Sunday
  const dates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(current.setDate(first + i));
    dates.push(new Date(day));
  }
  
  return dates;
};

const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getWeekRange = (dates: Date[]): string => {
  const start = dates[0];
  const end = dates[6];
  return `${start.getDate()}-${end.getDate()} ${HEBREW_MONTHS[start.getMonth()]}`;
};

export function Home() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [homeMembers, setHomeMembers] = useState<UserProfile[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const todayKey = formatDateKey(today);
  const weekDates = getWeekDates(today);
  const weekId = getWeekId(today);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (homeData) {
      loadHomeMembers();
      setupAttendanceListener();
    }
  }, [homeData, weekId]);

  const loadUserData = async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profile: UserProfile = {
          uid: currentUser.uid,
          name: userData.name || '',
          email: userData.email || currentUser.email || '',
          profileImageUrl: userData.profileImageUrl,
          homeId: userData.homeId,
        };
        setUserProfile(profile);

        if (userData.homeId) {
          await loadHomeData(userData.homeId);
        }
      }
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

  const loadHomeMembers = async () => {
    if (!homeData) return;

    try {
      const memberProfiles: UserProfile[] = [];
      for (const memberId of homeData.members) {
        const memberDoc = await getDoc(doc(db, 'users', memberId));
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          memberProfiles.push({
            uid: memberId,
            name: memberData.name || memberData.email || 'משתמש',
            email: memberData.email || '',
            profileImageUrl: memberData.profileImageUrl,
            homeId: memberData.homeId,
          });
        }
      }
      setHomeMembers(memberProfiles);
    } catch (error) {
      console.error('Error loading home members:', error);
    }
  };

  const setupAttendanceListener = () => {
    if (!homeData) return;

    const attendanceDocRef = doc(db, 'attendance', homeData.id, 'weeks', weekId);
    
    const unsubscribe = onSnapshot(attendanceDocRef, (doc) => {
      if (doc.exists()) {
        setAttendanceData({
          weekId,
          days: doc.data().days || {}
        });
      } else {
        setAttendanceData({
          weekId,
          days: {}
        });
      }
    }, (error) => {
      console.error('Error listening to attendance:', error);
      setError('שגיאה בטעינת נתוני נוכחות');
    });

    return unsubscribe;
  };

  const updateAttendance = async (date: string, attendance: AttendanceDay) => {
    if (!currentUser || !homeData) return;

    setSaving(true);
    setError('');

    try {
      const attendanceDocRef = doc(db, 'attendance', homeData.id, 'weeks', weekId);
      
      const currentData = attendanceData?.days || {};
      const dayData = currentData[date] || {};
      
      const updatedData = {
        ...currentData,
        [date]: {
          ...dayData,
          [currentUser.uid]: attendance
        }
      };

      await setDoc(attendanceDocRef, {
        weekId,
        days: updatedData,
        updatedAt: new Date(),
      });

    } catch (error) {
      console.error('Error updating attendance:', error);
      setError('שגיאה בעדכון נוכחות');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentUserAttendance = (date: string): AttendanceDay => {
    if (!currentUser || !attendanceData) {
      return { coming: false, guests: 0, note: '' };
    }
    
    const dayData = attendanceData.days[date];
    return dayData?.[currentUser.uid] || { coming: false, guests: 0, note: '' };
  };

  const getTodayAttenders = (): UserProfile[] => {
    if (!attendanceData || !homeMembers) return [];
    
    const todayData = attendanceData.days[todayKey] || {};
    return homeMembers.filter(member => todayData[member.uid]?.coming === true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני נוכחות...</p>
        </div>
      </div>
    );
  }

  if (!userProfile?.homeId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md mx-auto p-6">
          <Settings className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">אתה עדיין לא חבר בבית</h2>
          <p className="text-gray-600 mb-4">עבור להגדרות כדי ליצור או להצטרף לבית</p>
          <Button onClick={() => window.location.hash = '#settings'}>
            עבור להגדרות
          </Button>
        </div>
      </div>
    );
  }

  const todayAttendance = getCurrentUserAttendance(todayKey);
  const todayAttenders = getTodayAttenders();

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <main role="main" className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Quick Toggle Section (Today) */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">האם אתה מגיע היום?</h1>
            <p className="text-gray-600">{formatHebrewDate(today)}</p>
          </div>

          <div className="flex justify-center mb-6">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                role="switch"
                aria-label="מגיע היום"
                checked={todayAttendance.coming}
                onChange={(e) => updateAttendance(todayKey, {
                  ...todayAttendance,
                  coming: e.target.checked
                })}
                disabled={saving}
                className="sr-only peer"
              />
              <div className="relative w-20 h-10 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-9 after:w-9 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="mr-3 text-lg font-medium">
                {todayAttendance.coming ? 'מגיע' : 'לא מגיע'}
              </span>
            </label>
          </div>

          {todayAttendance.coming && (
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label htmlFor="guests-today" className="block text-sm font-medium text-gray-700 mb-2">
                  מספר אורחים
                </label>
                <input
                  type="number"
                  id="guests-today"
                  min="0"
                  max="20"
                  value={todayAttendance.guests}
                  onChange={(e) => updateAttendance(todayKey, {
                    ...todayAttendance,
                    guests: parseInt(e.target.value) || 0
                  })}
                  onBlur={() => {/* Save automatically */}}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="note-today" className="block text-sm font-medium text-gray-700 mb-2">
                  הערה
                </label>
                <input
                  type="text"
                  id="note-today"
                  value={todayAttendance.note}
                  onChange={(e) => updateAttendance(todayKey, {
                    ...todayAttendance,
                    note: e.target.value
                  })}
                  onBlur={() => {/* Save automatically */}}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הערה אופציונלית..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Who's Coming Today Banner */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl shadow-sm text-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-white" size={24} />
            <h2 className="text-xl font-bold">מי מגיע היום</h2>
          </div>

          {todayAttenders.length === 0 ? (
            <p className="text-green-100 text-center py-4">אף אחד לא מגיע היום</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayAttenders.map(member => {
                const attendance = attendanceData?.days[todayKey]?.[member.uid];
                return (
                  <div key={member.uid} className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold overflow-hidden">
                      {member.profileImageUrl ? (
                        <img
                          src={member.profileImageUrl}
                          alt={`${member.name} profile`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        member.name.charAt(0) || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{member.name}</p>
                      {attendance && attendance.guests > 0 && (
                        <p className="text-sm text-green-100">+{attendance.guests} אורחים</p>
                      )}
                      {attendance?.note && (
                        <p className="text-sm text-green-100 truncate">{attendance.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Summary */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">סיכום שבועי</h2>
              </div>
              <div className="text-sm text-gray-600">
                <p>שבוע {weekId.split('-W')[1]}, {weekId.split('-W')[0]}</p>
                <p>{getWeekRange(weekDates)}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 min-w-[120px]">
                    חבר
                  </th>
                  {weekDates.map((date, index) => {
                    const isToday = formatDateKey(date) === todayKey;
                    return (
                      <th 
                        key={formatDateKey(date)}
                        data-testid={isToday ? "today-column" : `day-column-${index}`}
                        className={`px-3 py-3 text-center text-sm font-medium min-w-[100px] ${
                          isToday ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div>{HEBREW_DAYS[date.getDay()]}</div>
                        <div className="text-xs font-normal">{date.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {homeMembers.map(member => (
                  <tr key={member.uid} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                          {member.profileImageUrl ? (
                            <img
                              src={member.profileImageUrl}
                              alt={`${member.name} profile`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            member.name.charAt(0) || '?'
                          )}
                        </div>
                        <span className="font-medium text-sm">{member.name}</span>
                      </div>
                    </td>
                    {weekDates.map(date => {
                      const dateKey = formatDateKey(date);
                      const isToday = dateKey === todayKey;
                      const attendance = attendanceData?.days[dateKey]?.[member.uid] || 
                                       { coming: false, guests: 0, note: '' };
                      const isCurrentUser = member.uid === currentUser?.uid;

                      return (
                        <td key={dateKey} className={`px-3 py-4 text-center ${isToday ? 'bg-blue-50' : ''}`}>
                          {isCurrentUser ? (
                            <div className="space-y-2">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  role="switch"
                                  data-testid={isToday ? "weekly-today-toggle" : `weekly-${HEBREW_DAYS[date.getDay()]}-toggle`}
                                  checked={attendance.coming}
                                  onChange={(e) => updateAttendance(dateKey, {
                                    ...attendance,
                                    coming: e.target.checked
                                  })}
                                  disabled={saving}
                                  className="sr-only peer"
                                />
                                <div className="relative w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                              {attendance.coming && (
                                <div className="space-y-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={attendance.guests}
                                    onChange={(e) => updateAttendance(dateKey, {
                                      ...attendance,
                                      guests: parseInt(e.target.value) || 0
                                    })}
                                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                  />
                                  <input
                                    type="text"
                                    value={attendance.note}
                                    onChange={(e) => updateAttendance(dateKey, {
                                      ...attendance,
                                      note: e.target.value
                                    })}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="הערה"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs ${
                                attendance.coming ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                                {attendance.coming ? '✓' : '✗'}
                              </div>
                              {attendance.coming && (
                                <div className="text-xs text-gray-600">
                                  {attendance.guests > 0 && <div>+{attendance.guests}</div>}
                                  {attendance.note && <div className="truncate max-w-[80px]" title={attendance.note}>{attendance.note}</div>}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom padding for navigation */}
        <div className="h-20"></div>
      </main>
    </div>
  );
}