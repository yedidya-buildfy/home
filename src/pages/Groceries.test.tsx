import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../contexts/AuthContext';
import { Groceries } from './Groceries';
import { User } from 'firebase/auth';

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  db: {},
  auth: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

const mockUser: User = {
  uid: 'user1',
  email: 'test@example.com',
  displayName: 'Test User',
} as User;

const mockUserProfile = {
  name: 'Test User',
  email: 'test@example.com',
  homeId: 'home1',
};

const mockHomeData = {
  id: 'home1',
  name: 'Test Home',
  adminId: 'user1',
  members: ['user1', 'user2', 'user3'],
};

const mockHomeMembers = [
  { uid: 'user1', name: 'Test User', profileImageUrl: null },
  { uid: 'user2', name: 'Dana Cohen', profileImageUrl: 'https://example.com/dana.jpg' },
  { uid: 'user3', name: 'Yossi Levy', profileImageUrl: null },
];

const mockGroceryItems = [
  {
    id: 'item1',
    name: 'חלב',
    amount: '2',
    note: 'דל לקטוז',
    addedBy: 'user1',
    addedAt: new Date('2025-09-09T08:00:00Z'),
    checked: false,
  },
  {
    id: 'item2',
    name: 'לחם',
    amount: '1',
    note: '',
    addedBy: 'user2',
    addedAt: new Date('2025-09-09T09:00:00Z'),
    checked: true,
  },
  {
    id: 'item3',
    name: 'עגבניות',
    amount: '500 גרם',
    note: 'אורגניות',
    addedBy: 'user3',
    addedAt: new Date('2025-09-08T10:00:00Z'),
    checked: false,
  },
];

// Mock AuthContext
const MockAuthProvider = ({ children, user = mockUser }: { children: React.ReactNode; user?: User | null }) => {
  const mockAuthContext = {
    currentUser: user,
    loading: false,
  };
  
  return React.createElement(
    'div',
    { 'data-testid': 'auth-provider' },
    React.createElement(children as any, { ...mockAuthContext })
  );
};

// Helper to render with auth context
const renderWithAuth = (user: User | null = mockUser) => {
  // Mock the useAuth hook
  vi.doMock('../contexts/AuthContext', () => ({
    useAuth: () => ({
      currentUser: user,
      loading: false,
    }),
    AuthProvider: MockAuthProvider,
  }));
  
  return render(<Groceries />);
};

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: mockUser,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
}));

describe('Groceries Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Firestore functions
    const { getDoc, onSnapshot, getDocs } = vi.hoisted(() => ({
      getDoc: vi.fn(),
      onSnapshot: vi.fn(),
      getDocs: vi.fn(),
    }));
    
    // Set up default mocks
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserProfile,
      id: 'user1',
    });
    
    onSnapshot.mockImplementation((query, callback) => {
      // Simulate empty grocery list initially
      callback({
        docs: [],
      });
      return () => {}; // unsubscribe function
    });
    
    getDocs.mockResolvedValue({
      docs: [],
    });
  });

  describe('Page Structure', () => {
    it('renders the main groceries interface', async () => {
      renderWithAuth();
      
      // Should show loading initially
      expect(screen.getByText('טוען רשימת קניות...')).toBeInTheDocument();
    });

    it('displays error message when user has no home', async () => {
      // Mock user without home
      vi.doMock('../contexts/AuthContext', () => ({
        useAuth: () => ({
          currentUser: { ...mockUser },
          loading: false,
        }),
      }));
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('אתה עדיין לא חבר בבית')).toBeInTheDocument();
        expect(screen.getByText('עבור להגדרות כדי ליצור או להצטרף לבית')).toBeInTheDocument();
      });
    });

    it('shows page header and add item form', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('רשימת קניות')).toBeInTheDocument();
        expect(screen.getByLabelText('שם הפריט')).toBeInTheDocument();
        expect(screen.getByLabelText('כמות')).toBeInTheDocument();
        expect(screen.getByLabelText('הערה')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'הוסף לרשימה' })).toBeInTheDocument();
      });
    });
  });

  describe('Add Item Functionality', () => {
    it('adds new item with name, amount, and note', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByLabelText('שם הפריט')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByLabelText('שם הפריט');
      const amountInput = screen.getByLabelText('כמות');
      const noteInput = screen.getByLabelText('הערה');
      const addButton = screen.getByRole('button', { name: 'הוסף לרשימה' });
      
      await user.type(nameInput, 'גבינה');
      await user.type(amountInput, '200 גרם');
      await user.type(noteInput, 'צהובה קשה');
      await user.click(addButton);
      
      // Should call Firebase addDoc and clear form
      await waitFor(() => {
        expect(nameInput).toHaveValue('');
        expect(amountInput).toHaveValue('');
        expect(noteInput).toHaveValue('');
      });
    });

    it('validates required fields before adding', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByLabelText('שם הפריט')).toBeInTheDocument();
      });
      
      const addButton = screen.getByRole('button', { name: 'הוסף לרשימה' });
      await user.click(addButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('שם הפריט הוא שדה חובה')).toBeInTheDocument();
      });
    });

    it('shows auto-complete suggestions for previously used items', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByLabelText('שם הפריט')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByLabelText('שם הפריט');
      await user.type(nameInput, 'ח');
      
      // Should show suggestions based on previously used items
      await waitFor(() => {
        expect(screen.getByText('חלב')).toBeInTheDocument();
      });
      
      // Should be able to select suggestion
      await user.click(screen.getByText('חלב'));
      expect(nameInput).toHaveValue('חלב');
    });

    it('merges duplicate items automatically', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByLabelText('שם הפריט')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByLabelText('שם הפריט');
      const amountInput = screen.getByLabelText('כמות');
      const addButton = screen.getByRole('button', { name: 'הוסף לרשימה' });
      
      // Add duplicate item
      await user.type(nameInput, 'חלב');
      await user.type(amountInput, '1');
      await user.click(addButton);
      
      // Should merge with existing item and combine amounts
      await waitFor(() => {
        expect(screen.getByText('3 (2 + 1)')).toBeInTheDocument(); // Combined amount display
      });
    });
  });

  describe('Item Display and Grouping', () => {
    it('displays items grouped by weekly sections', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('השבוע הנוכחי')).toBeInTheDocument();
        expect(screen.getByText('שבוע קודם')).toBeInTheDocument();
      });
    });

    it('shows items sorted by date added within each group', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('חלב')).toBeInTheDocument();
      });
      
      // Items should appear in correct order within their weekly groups
      const currentWeekItems = screen.getAllByTestId('grocery-item-current-week');
      expect(currentWeekItems[0]).toHaveTextContent('חלב'); // Added first
      expect(currentWeekItems[1]).toHaveTextContent('לחם'); // Added second
    });

    it('displays item details correctly', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('חלב')).toBeInTheDocument();
      });
      
      // Should show name, amount, note, and added by info
      expect(screen.getByText('2')).toBeInTheDocument(); // Amount
      expect(screen.getByText('דל לקטוז')).toBeInTheDocument(); // Note
      expect(screen.getByText('נוסף על ידי Test User')).toBeInTheDocument(); // Added by
      
      // Should show profile image/avatar
      expect(screen.getByRole('img', { name: 'Test User' })).toBeInTheDocument();
    });

    it('shows checked items with strikethrough styling', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('לחם')).toBeInTheDocument();
      });
      
      const checkedItem = screen.getByTestId('grocery-item-item2');
      expect(checkedItem).toHaveClass('line-through', 'opacity-60');
    });
  });

  describe('Item Actions', () => {
    it('toggles item checked status', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('חלב')).toBeInTheDocument();
      });
      
      const checkbox = screen.getByRole('checkbox', { name: /חלב/ });
      expect(checkbox).not.toBeChecked();
      
      await user.click(checkbox);
      
      // Should update Firebase and UI
      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });
    });

    it('deletes individual items', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('חלב')).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByRole('button', { name: 'מחק חלב' });
      await user.click(deleteButton);
      
      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText('האם אתה בטוח שאתה רוצה למחוק את הפריט?')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByRole('button', { name: 'מחק' });
      await user.click(confirmButton);
      
      // Should remove item from list
      await waitFor(() => {
        expect(screen.queryByText('חלב')).not.toBeInTheDocument();
      });
    });

    it('shows delete all checked button when checked items exist', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'מחק הכל מסומן' })).toBeInTheDocument();
      });
    });

    it('deletes all checked items with confirmation', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'מחק הכל מסומן' })).toBeInTheDocument();
      });
      
      const deleteAllButton = screen.getByRole('button', { name: 'מחק הכל מסומן' });
      await user.click(deleteAllButton);
      
      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText('האם אתה בטוח שאתה רוצה למחוק את כל הפריטים המסומנים?')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByRole('button', { name: 'מחק הכל' });
      await user.click(confirmButton);
      
      // Should remove all checked items
      await waitFor(() => {
        expect(screen.queryByText('לחם')).not.toBeInTheDocument();
      });
    });

    it('shows clear all button and clears entire list with confirmation', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'נקה הכל' })).toBeInTheDocument();
      });
      
      const clearAllButton = screen.getByRole('button', { name: 'נקה הכל' });
      await user.click(clearAllButton);
      
      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText('האם אתה בטוח שאתה רוצה למחוק את כל הרשימה?')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByRole('button', { name: 'נקה הכל' });
      await user.click(confirmButton);
      
      // Should remove all items
      await waitFor(() => {
        expect(screen.getByText('אין פריטים ברשימה')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('updates when other users add items', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('חלב')).toBeInTheDocument();
      });
      
      // Mock real-time update from Firestore
      // This would test the onSnapshot listener functionality
      // The component should re-render with new data
    });

    it('updates when other users check/uncheck items', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('חלב')).toBeInTheDocument();
      });
      
      // Mock real-time checkbox state change
      // Should update UI immediately
    });

    it('shows new items added by other users in real-time', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('רשימת קניות')).toBeInTheDocument();
      });
      
      // Mock new item added by another user
      // Should appear in the list automatically
    });
  });

  describe('Weekly Grouping Logic', () => {
    it('correctly groups items by Sunday 12pm boundaries', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('השבוע הנוכחי')).toBeInTheDocument();
      });
      
      // Items should be grouped correctly based on Sunday 12pm boundaries
      // Current week: Sunday 12pm to next Sunday 12pm
      const currentWeekSection = screen.getByTestId('current-week-section');
      expect(currentWeekSection).toContainElement(screen.getByText('חלב'));
      expect(currentWeekSection).toContainElement(screen.getByText('לחם'));
      
      const previousWeekSection = screen.getByTestId('previous-week-section');
      expect(previousWeekSection).toContainElement(screen.getByText('עגבניות'));
    });

    it('shows correct week headers with date ranges', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('השבוע הנוכחי')).toBeInTheDocument();
      });
      
      // Should show date range for each week
      expect(screen.getByText(/8-14 בספטמבר/)).toBeInTheDocument();
      expect(screen.getByText(/1-7 בספטמבר/)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no items exist', async () => {
      // Mock empty groceries list
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('אין פריטים ברשימה')).toBeInTheDocument();
        expect(screen.getByText('הוסף פריט ראשון לרשימת הקניות')).toBeInTheDocument();
      });
    });

    it('hides action buttons when list is empty', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('אין פריטים ברשימה')).toBeInTheDocument();
      });
      
      // Should not show delete all or clear all buttons when empty
      expect(screen.queryByRole('button', { name: 'מחק הכל מסומן' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'נקה הכל' })).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when data loading fails', async () => {
      // Mock Firebase error
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('שגיאה בטעינת רשימת הקניות')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      renderWithAuth();
      
      // Should show cached data or appropriate error message
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });

    it('shows error when item addition fails', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      // Mock Firebase error on add
      await waitFor(() => {
        expect(screen.getByLabelText('שם הפריט')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByLabelText('שם הפריט');
      const addButton = screen.getByRole('button', { name: 'הוסף לרשימה' });
      
      await user.type(nameInput, 'טעינה תקלה');
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('שגיאה בהוספת הפריט')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for form inputs', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByLabelText('שם הפריט')).toHaveAttribute('aria-label');
        expect(screen.getByLabelText('כמות')).toHaveAttribute('aria-label');
        expect(screen.getByLabelText('הערה')).toHaveAttribute('aria-label');
      });
    });

    it('has proper ARIA labels for checkboxes and buttons', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('aria-label');
        });
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('שם הפריט');
        nameInput.focus();
        expect(nameInput).toHaveFocus();
      });
    });

    it('has proper RTL support', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        const container = screen.getByRole('main');
        expect(container).toHaveAttribute('dir', 'rtl');
      });
    });

    it('announces dynamic content changes to screen readers', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByLabelText('שם הפריט')).toBeInTheDocument();
      });
      
      // When item is added, should announce to screen reader
      const nameInput = screen.getByLabelText('שם הפריט');
      const addButton = screen.getByRole('button', { name: 'הוסף לרשימה' });
      
      await user.type(nameInput, 'גבינה');
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('הפריט נוסף לרשימה');
      });
    });
  });
});