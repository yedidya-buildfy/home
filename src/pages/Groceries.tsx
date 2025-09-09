import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { Plus, Trash2, Check, User, X } from 'lucide-react';

interface GroceryItem {
  id: string;
  name: string;
  amount: string;
  note: string;
  addedBy: string;
  addedAt: Date;
  checked: boolean;
}

interface UserProfile {
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

interface HomeMember {
  uid: string;
  name: string;
  profileImageUrl?: string;
}

interface WeeklyGroup {
  title: string;
  dateRange: string;
  items: GroceryItem[];
  weekStart: Date;
}

// Helper function to get week start (Sunday at 12:00 PM)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(12, 0, 0, 0);
  return weekStart;
};

// Helper function to format Hebrew date range
const formatHebrewDateRange = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  
  const monthNames = [
    'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
    'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר'
  ];
  
  const month = monthNames[weekStart.getMonth()];
  
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay}-${endDay} ${month}`;
  } else {
    const endMonth = monthNames[weekEnd.getMonth()];
    return `${startDay} ${month} - ${endDay} ${endMonth}`;
  }
};

// Helper function to check if two dates are in the same week
const isSameWeek = (date1: Date, date2: Date): boolean => {
  const week1 = getWeekStart(date1);
  const week2 = getWeekStart(date2);
  return week1.getTime() === week2.getTime();
};

export function Groceries() {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [homeMembers, setHomeMembers] = useState<HomeMember[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Confirmation modals
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'item' | 'checked' | 'all'; itemId?: string } | null>(null);
  
  // Inline editing state
  const [editingAmount, setEditingAmount] = useState<{ itemId: string; value: string } | null>(null);

  // Load user profile and home data
  useEffect(() => {
    if (!currentUser) return;

    const loadUserData = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as UserProfile;
          setUserProfile(userData);
          
          if (userData.homeId) {
            const homeDocRef = doc(db, 'homes', userData.homeId);
            const homeDocSnap = await getDoc(homeDocRef);
            
            if (homeDocSnap.exists()) {
              const homeData = { id: homeDocSnap.id, ...homeDocSnap.data() } as HomeData;
              setHomeData(homeData);
              
              // Load home members
              const memberProfiles = await Promise.all(
                homeData.members.map(async (memberId) => {
                  const memberDocRef = doc(db, 'users', memberId);
                  const memberDocSnap = await getDoc(memberDocRef);
                  if (memberDocSnap.exists()) {
                    const memberData = memberDocSnap.data();
                    return {
                      uid: memberId,
                      name: memberData.name,
                      profileImageUrl: memberData.profileImageUrl,
                    };
                  }
                  return null;
                })
              );
              
              setHomeMembers(memberProfiles.filter(Boolean) as HomeMember[]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('שגיאה בטעינת נתוני המשתמש');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  // Load grocery items and set up real-time listener
  useEffect(() => {
    if (!homeData) return;

    const itemsCollectionRef = collection(db, 'groceries', homeData.id, 'items');
    const itemsQuery = query(itemsCollectionRef, orderBy('addedAt', 'desc'));

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          addedAt: doc.data().addedAt?.toDate() || new Date(),
        })) as GroceryItem[];
        
        setGroceryItems(items);
        setError(null);
      },
      (error) => {
        console.error('Error listening to grocery items:', error);
        setError('שגיאה בטעינת רשימת הקניות');
      }
    );

    return () => unsubscribe();
  }, [homeData]);

  // Load auto-complete suggestions
  useEffect(() => {
    if (!homeData) return;

    const loadSuggestions = async () => {
      try {
        const itemsCollectionRef = collection(db, 'groceries', homeData.id, 'items');
        const snapshot = await getDocs(itemsCollectionRef);
        
        const allItemNames = snapshot.docs.map(doc => doc.data().name);
        const uniqueNames = Array.from(new Set(allItemNames));
        setSuggestions(uniqueNames);
      } catch (error) {
        console.error('Error loading suggestions:', error);
      }
    };

    loadSuggestions();
  }, [homeData]);

  // Group items by weekly sections
  const weeklyGroups = useMemo(() => {
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    
    const groups: WeeklyGroup[] = [];
    const groupedItems: { [key: string]: GroceryItem[] } = {};
    
    // Group items by week
    groceryItems.forEach(item => {
      const itemWeekStart = getWeekStart(item.addedAt);
      const weekKey = itemWeekStart.toISOString();
      
      if (!groupedItems[weekKey]) {
        groupedItems[weekKey] = [];
      }
      groupedItems[weekKey].push(item);
    });
    
    // Sort weeks and create groups
    const sortedWeekKeys = Object.keys(groupedItems).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    sortedWeekKeys.forEach((weekKey, index) => {
      const weekStart = new Date(weekKey);
      const isCurrentWeek = isSameWeek(weekStart, today);
      
      let title: string;
      if (isCurrentWeek) {
        title = 'השבוע הנוכחי';
      } else if (index === 1) {
        title = 'שבוע קודם';
      } else {
        title = `לפני ${index} שבועות`;
      }
      
      groups.push({
        title,
        dateRange: formatHebrewDateRange(weekStart),
        items: groupedItems[weekKey].sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime()),
        weekStart,
      });
    });
    
    return groups;
  }, [groceryItems]);

  // Get filtered suggestions
  const filteredSuggestions = useMemo(() => {
    if (!newItemName || newItemName.length < 1) return [];
    
    return suggestions
      .filter(name => 
        name.toLowerCase().includes(newItemName.toLowerCase()) && 
        name.toLowerCase() !== newItemName.toLowerCase()
      )
      .slice(0, 5);
  }, [suggestions, newItemName]);

  // Get member by ID
  const getMemberById = (memberId: string): HomeMember | null => {
    return homeMembers.find(member => member.uid === memberId) || null;
  };

  // Helper to parse and sum amounts
  const parseAmount = (amount: string): number => {
    // Handle cases like "1+1+2" or "2 + 1" or just "3"
    const cleanAmount = amount.replace(/\s/g, ''); // Remove spaces
    if (cleanAmount.includes('+')) {
      return cleanAmount.split('+').reduce((sum, part) => {
        const num = parseFloat(part) || 0;
        return sum + num;
      }, 0);
    }
    return parseFloat(amount) || 0;
  };

  // Helper to format amount display
  const formatAmount = (amount: string | number): string => {
    if (typeof amount === 'number') {
      return amount.toString();
    }
    const parsed = parseAmount(amount);
    return parsed.toString();
  };

  // Check if item already exists (for merging duplicates)
  const findExistingItem = (name: string): GroceryItem | null => {
    return groceryItems.find(item => 
      item.name.toLowerCase() === name.toLowerCase() && !item.checked
    ) || null;
  };

  // Add new item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemName.trim()) {
      setError('שם הפריט הוא שדה חובה');
      return;
    }
    
    if (!homeData || !currentUser) return;
    
    setAddingItem(true);
    setError(null);
    
    try {
      const existingItem = findExistingItem(newItemName.trim());
      
      if (existingItem) {
        // Merge with existing item by summing amounts
        const existingAmount = parseAmount(existingItem.amount);
        const newAmount = parseAmount(newItemAmount || '1');
        const totalAmount = existingAmount + newAmount;
        
        const mergedNote = existingItem.note && newItemNote 
          ? `${existingItem.note}, ${newItemNote}`
          : existingItem.note || newItemNote;
        
        const itemDocRef = doc(db, 'groceries', homeData.id, 'items', existingItem.id);
        await updateDoc(itemDocRef, {
          amount: totalAmount.toString(),
          note: mergedNote,
          addedAt: serverTimestamp(),
        });
        
        setStatusMessage('הפריט מוזג עם פריט קיים');
      } else {
        // Add new item
        const itemsCollectionRef = collection(db, 'groceries', homeData.id, 'items');
        await addDoc(itemsCollectionRef, {
          name: newItemName.trim(),
          amount: newItemAmount.trim() || '1',
          note: newItemNote.trim(),
          addedBy: currentUser.uid,
          addedAt: serverTimestamp(),
          checked: false,
        });
        
        setStatusMessage('הפריט נוסף לרשימה');
      }
      
      // Clear form
      setNewItemName('');
      setNewItemAmount('');
      setNewItemNote('');
      setShowSuggestions(false);
      
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMessage(''), 3000);
      
    } catch (error) {
      console.error('Error adding item:', error);
      setError('שגיאה בהוספת הפריט');
    } finally {
      setAddingItem(false);
    }
  };

  // Toggle item checked status
  const toggleItemChecked = async (item: GroceryItem) => {
    if (!homeData) return;
    
    try {
      const itemDocRef = doc(db, 'groceries', homeData.id, 'items', item.id);
      await updateDoc(itemDocRef, {
        checked: !item.checked,
      });
    } catch (error) {
      console.error('Error updating item:', error);
      setError('שגיאה בעדכון הפריט');
    }
  };

  // Update item amount
  const updateItemAmount = async (itemId: string, newAmount: string) => {
    if (!homeData) return;
    
    try {
      const itemDocRef = doc(db, 'groceries', homeData.id, 'items', itemId);
      await updateDoc(itemDocRef, {
        amount: newAmount.trim() || '1',
      });
      setEditingAmount(null);
    } catch (error) {
      console.error('Error updating amount:', error);
      setError('שגיאה בעדכון הכמות');
    }
  };

  // Handle amount edit (double-click)
  const handleAmountEdit = (item: GroceryItem) => {
    setEditingAmount({ itemId: item.id, value: formatAmount(item.amount) });
  };

  // Handle amount save
  const handleAmountSave = (itemId: string) => {
    if (editingAmount && editingAmount.itemId === itemId) {
      updateItemAmount(itemId, editingAmount.value);
    }
  };

  // Handle amount cancel
  const handleAmountCancel = () => {
    setEditingAmount(null);
  };

  // Handle quantity increase
  const increaseQuantity = async (item: GroceryItem) => {
    const currentAmount = parseAmount(item.amount);
    const newAmount = (currentAmount + 1).toString();
    updateItemAmount(item.id, newAmount);
  };

  // Handle quantity decrease
  const decreaseQuantity = async (item: GroceryItem) => {
    const currentAmount = parseAmount(item.amount);
    if (currentAmount > 1) {
      const newAmount = (currentAmount - 1).toString();
      updateItemAmount(item.id, newAmount);
    }
  };

  // Delete single item
  const deleteItem = async (itemId: string) => {
    if (!homeData) return;
    
    try {
      const itemDocRef = doc(db, 'groceries', homeData.id, 'items', itemId);
      await deleteDoc(itemDocRef);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('שגיאה במחיקת הפריט');
    }
  };

  // Delete all checked items
  const deleteAllChecked = async () => {
    if (!homeData) return;
    
    try {
      const checkedItems = groceryItems.filter(item => item.checked);
      
      await Promise.all(
        checkedItems.map(item => {
          const itemDocRef = doc(db, 'groceries', homeData.id, 'items', item.id);
          return deleteDoc(itemDocRef);
        })
      );
      
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting checked items:', error);
      setError('שגיאה במחיקת הפריטים');
    }
  };

  // Clear all items
  const clearAllItems = async () => {
    if (!homeData) return;
    
    try {
      await Promise.all(
        groceryItems.map(item => {
          const itemDocRef = doc(db, 'groceries', homeData.id, 'items', item.id);
          return deleteDoc(itemDocRef);
        })
      );
      
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error clearing all items:', error);
      setError('שגיאה בניקוי הרשימה');
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: string) => {
    setNewItemName(suggestion);
    setShowSuggestions(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען רשימת קניות...</p>
        </div>
      </div>
    );
  }

  if (!userProfile?.homeId) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">אתה עדיין לא חבר בבית</h1>
            <p className="text-gray-600">עבור להגדרות כדי ליצור או להצטרף לבית</p>
          </div>
        </div>
      </div>
    );
  }

  const checkedItemsCount = groceryItems.filter(item => item.checked).length;
  const hasItems = groceryItems.length > 0;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <main role="main" className="max-w-4xl mx-auto p-4 pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">רשימת קניות</h1>
          {homeData && (
            <p className="text-gray-600">בית: {homeData.name}</p>
          )}
        </div>

        {/* Status message */}
        {statusMessage && (
          <div role="status" aria-live="polite" className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {statusMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Add Item Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">הוסף פריט חדש</h2>
          
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="relative">
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                שם הפריט *
              </label>
              <input
                id="itemName"
                type="text"
                value={newItemName}
                onChange={(e) => {
                  setNewItemName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay hiding suggestions to allow clicking
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="לדוגמה: חלב, לחם, עגבניות"
                aria-label="שם הפריט"
                required
              />
              
              {/* Suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full text-right px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none first:rounded-t-md last:rounded-b-md"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="itemAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  כמות
                </label>
                <input
                  id="itemAmount"
                  type="text"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1"
                  aria-label="כמות"
                />
              </div>

              <div>
                <label htmlFor="itemNote" className="block text-sm font-medium text-gray-700 mb-1">
                  הערה
                </label>
                <input
                  id="itemNote"
                  type="text"
                  value={newItemNote}
                  onChange={(e) => setNewItemNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הערה אופציונלית"
                  aria-label="הערה"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={addingItem || !newItemName.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors"
            >
              {addingItem ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  מוסיף...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  הוסף לרשימה
                </>
              )}
            </button>
          </form>
        </div>

        {/* Action buttons */}
        {hasItems && (
          <div className="flex gap-3 mb-6">
            {checkedItemsCount > 0 && (
              <button
                onClick={() => setDeleteConfirm({ type: 'checked' })}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
              >
                <Trash2 size={18} />
                מחק הכל מסומן ({checkedItemsCount})
              </button>
            )}
            
            <button
              onClick={() => setDeleteConfirm({ type: 'all' })}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              <X size={18} />
              נקה הכל
            </button>
          </div>
        )}

        {/* Items List */}
        {weeklyGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">אין פריטים ברשימה</h3>
              <p className="text-gray-600">הוסף פריט ראשון לרשימת הקניות</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {weeklyGroups.map((group, groupIndex) => (
              <div 
                key={groupIndex} 
                className="bg-white rounded-lg shadow-sm overflow-hidden"
                data-testid={groupIndex === 0 ? 'current-week-section' : 'previous-week-section'}
              >
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">{group.title}</h3>
                  <p className="text-sm text-gray-600">{group.dateRange}</p>
                </div>
                
                <div className="divide-y">
                  {group.items.map((item) => {
                    const member = getMemberById(item.addedBy);
                    
                    return (
                      <div
                        key={item.id}
                        data-testid={`grocery-item-${item.id}`}
                        className={`p-4 flex items-center gap-3 ${
                          item.checked ? 'bg-gray-50 line-through opacity-60' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleItemChecked(item)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label={`סמן ${item.name} כנקנה`}
                          />
                        </label>

                        {/* Item details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            {item.amount && (
                              <div className="flex items-center gap-1">
                                {editingAmount?.itemId === item.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editingAmount.value}
                                      onChange={(e) => setEditingAmount({ ...editingAmount, value: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleAmountSave(item.id);
                                        } else if (e.key === 'Escape') {
                                          handleAmountCancel();
                                        }
                                      }}
                                      onBlur={() => handleAmountSave(item.id)}
                                      className="w-16 px-1 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleAmountCancel()}
                                      className="text-gray-400 hover:text-gray-600 text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center bg-gray-100 rounded-md border">
                                    <button
                                      onClick={() => decreaseQuantity(item)}
                                      disabled={parseAmount(item.amount) <= 1}
                                      className="px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-r-none rounded-l-md transition-colors"
                                      title="הקטן כמות"
                                    >
                                      −
                                    </button>
                                    <span
                                      onDoubleClick={() => handleAmountEdit(item)}
                                      className="px-3 py-1 bg-white text-gray-800 text-sm font-medium border-x cursor-pointer select-none min-w-[2rem] text-center"
                                      title="לחץ פעמיים לעריכה ידנית"
                                    >
                                      {formatAmount(item.amount)}
                                    </span>
                                    <button
                                      onClick={() => increaseQuantity(item)}
                                      className="px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-l-none rounded-r-md transition-colors"
                                      title="הגדל כמות"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {item.note && (
                            <p className="text-sm text-gray-600 mb-2">{item.note}</p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {member?.profileImageUrl ? (
                              <img
                                src={member.profileImageUrl}
                                alt={member.name}
                                className="w-5 h-5 rounded-full"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                                <User size={12} />
                              </div>
                            )}
                            <span>נוסף על ידי {member?.name || 'משתמש לא ידוע'}</span>
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => setDeleteConfirm({ type: 'item', itemId: item.id })}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                          aria-label={`מחק ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Modals */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {deleteConfirm.type === 'item' && 'האם אתה בטוח שאתה רוצה למחוק את הפריט?'}
                {deleteConfirm.type === 'checked' && 'האם אתה בטוח שאתה רוצה למחוק את כל הפריטים המסומנים?'}
                {deleteConfirm.type === 'all' && 'האם אתה בטוח שאתה רוצה למחוק את כל הרשימה?'}
              </h3>
              
              <p className="text-gray-600 mb-4">
                פעולה זו לא ניתנת לביטול
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                
                <button
                  onClick={() => {
                    if (deleteConfirm.type === 'item' && deleteConfirm.itemId) {
                      deleteItem(deleteConfirm.itemId);
                    } else if (deleteConfirm.type === 'checked') {
                      deleteAllChecked();
                    } else if (deleteConfirm.type === 'all') {
                      clearAllItems();
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  {deleteConfirm.type === 'checked' && 'מחק הכל'}
                  {deleteConfirm.type === 'all' && 'נקה הכל'}
                  {deleteConfirm.type === 'item' && 'מחק'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}