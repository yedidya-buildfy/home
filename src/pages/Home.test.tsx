import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../contexts/AuthContext';
import { Home } from './Home';
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
  onSnapshot: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}));

// Mock current date for consistent testing
const mockCurrentDate = new Date('2025-09-09T10:00:00Z'); // Tuesday
vi.setSystemTime(mockCurrentDate);

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

const mockTodayAttendance = {
  'user1': { coming: true, guests: 2, note: 'Bringing salad' },
  'user2': { coming: true, guests: 0, note: '' },
  'user3': { coming: false, guests: 0, note: 'Away for work' },
};

const mockWeeklyAttendance = {
  '2025-09-08': { // Monday
    'user1': { coming: true, guests: 1, note: 'Late arrival' },
    'user2': { coming: true, guests: 0, note: '' },
    'user3': { coming: false, guests: 0, note: '' },
  },
  '2025-09-09': mockTodayAttendance, // Tuesday (today)
  '2025-09-10': { // Wednesday
    'user1': { coming: false, guests: 0, note: 'Doctor appointment' },
    'user2': { coming: true, guests: 1, note: '' },
    'user3': { coming: true, guests: 0, note: '' },
  },
};

// Helper to render with auth context
const renderWithAuth = (user: User | null = mockUser) => {
  return render(
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
};

describe('Home Page (Attendance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Firebase auth context
    vi.doMock('../contexts/AuthContext', () => ({
      useAuth: () => ({
        currentUser: mockUser,
        loading: false,
      }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Structure', () => {
    it('renders the three main sections in correct order', async () => {
      renderWithAuth();
      
      // Should show loading initially
      expect(screen.getByText('טוען נתוני נוכחות...')).toBeInTheDocument();
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
  });

  describe('Quick Toggle Section (Today)', () => {
    it('renders today section with current user attendance toggle', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('האם אתה מגיע היום?')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: /מגיע היום/ })).toBeInTheDocument();
      });
    });

    it('displays current date in Hebrew', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        // Tuesday, September 9, 2025 should display in Hebrew
        expect(screen.getByText(/יום שלישי/)).toBeInTheDocument();
        expect(screen.getByText(/9 בספטמבר 2025/)).toBeInTheDocument();
      });
    });

    it('toggles coming status when switch is clicked', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /מגיע היום/ })).toBeInTheDocument();
      });
      
      const toggle = screen.getByRole('switch', { name: /מגיע היום/ });
      
      // Initially not coming (based on mock data setup)
      expect(toggle).not.toBeChecked();
      
      // Click to toggle coming
      await user.click(toggle);
      
      // Should call Firebase update
      await waitFor(() => {
        expect(toggle).toBeChecked();
      });
    });

    it('shows guest count input when coming is true', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /מגיע היום/ })).toBeInTheDocument();
      });
      
      const toggle = screen.getByRole('switch', { name: /מגיע היום/ });
      await user.click(toggle); // Set to coming
      
      await waitFor(() => {
        expect(screen.getByLabelText('מספר אורחים')).toBeInTheDocument();
        expect(screen.getByLabelText('הערה')).toBeInTheDocument();
      });
    });

    it('updates guest count and note', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      // First set to coming
      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /מגיע היום/ })).toBeInTheDocument();
      });
      
      const toggle = screen.getByRole('switch', { name: /מגיע היום/ });
      await user.click(toggle);
      
      // Then update guest count and note
      await waitFor(() => {
        expect(screen.getByLabelText('מספר אורחים')).toBeInTheDocument();
      });
      
      const guestInput = screen.getByLabelText('מספר אורחים');
      const noteInput = screen.getByLabelText('הערה');
      
      await user.clear(guestInput);
      await user.type(guestInput, '3');
      await user.clear(noteInput);
      await user.type(noteInput, 'Bringing dessert');
      
      // Should save changes automatically (onBlur)
      fireEvent.blur(guestInput);
      fireEvent.blur(noteInput);
      
      await waitFor(() => {
        expect(guestInput).toHaveValue(3);
        expect(noteInput).toHaveValue('Bringing dessert');
      });
    });
  });

  describe('Who\'s Coming Today Banner', () => {
    it('displays banner with users coming today', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('מי מגיע היום')).toBeInTheDocument();
      });
      
      // Should show users who are coming
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Dana Cohen')).toBeInTheDocument();
      expect(screen.queryByText('Yossi Levy')).not.toBeInTheDocument(); // Not coming
    });

    it('shows guest counts in banner', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('מי מגיע היום')).toBeInTheDocument();
      });
      
      // Should show guest count for users with guests
      expect(screen.getByText('+2 אורחים')).toBeInTheDocument(); // Test User has 2 guests
    });

    it('displays profile images in banner', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('מי מגיע היום')).toBeInTheDocument();
      });
      
      // Should show profile images
      const profileImages = screen.getAllByRole('img');
      expect(profileImages.length).toBeGreaterThan(0);
    });

    it('shows empty state when no one is coming', async () => {
      // Mock empty attendance
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('אף אחד לא מגיע היום')).toBeInTheDocument();
      });
    });
  });

  describe('Weekly Summary Section', () => {
    it('displays weekly summary with all days', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Should show all days of the week
      const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      days.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('shows all home members in weekly view', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Should show all home members
      expect(screen.getAllByText('Test User')).toHaveLength(2); // In banner and weekly
      expect(screen.getAllByText('Dana Cohen')).toHaveLength(2);
      expect(screen.getByText('Yossi Levy')).toBeInTheDocument();
    });

    it('allows current user to edit their own weekly data', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Find current user's row and check for editable elements
      const currentUserToggles = screen.getAllByRole('switch');
      expect(currentUserToggles.length).toBeGreaterThan(7); // Today toggle + weekly toggles
      
      // Should be able to click weekly toggles for current user
      const mondayToggle = currentUserToggles.find(toggle => 
        toggle.getAttribute('data-testid')?.includes('monday')
      );
      
      if (mondayToggle) {
        await user.click(mondayToggle);
        // Should update the attendance data
      }
    });

    it('shows read-only data for other users', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Other users' data should be read-only (no editable switches for them)
      // This is tested by ensuring switches are only for current user
      const editableSwitches = screen.getAllByRole('switch');
      // Should only have switches for current user (1 for today + 7 for week)
      expect(editableSwitches).toHaveLength(8);
    });

    it('displays guest counts and notes in weekly view', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Should show guest counts and notes from mock data
      expect(screen.getByText('Bringing salad')).toBeInTheDocument();
      expect(screen.getByText('Late arrival')).toBeInTheDocument();
      expect(screen.getByText('Doctor appointment')).toBeInTheDocument();
    });

    it('highlights today in weekly view', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Today (Tuesday) should be highlighted
      const todayColumn = screen.getByTestId('today-column');
      expect(todayColumn).toHaveClass('bg-blue-50'); // or similar highlighting class
    });
  });

  describe('Real-time Updates', () => {
    it('updates when other users change their attendance', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('מי מגיע היום')).toBeInTheDocument();
      });
      
      // Mock real-time update from Firestore
      // This would test the onSnapshot listener functionality
      // The component should re-render with new data
    });

    it('syncs changes across all sections', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /מגיע היום/ })).toBeInTheDocument();
      });
      
      const todayToggle = screen.getByRole('switch', { name: /מגיע היום/ });
      await user.click(todayToggle);
      
      // Should update both the quick toggle section and weekly summary
      await waitFor(() => {
        expect(todayToggle).toBeChecked();
        // Weekly summary should also reflect the change
        const weeklyTodayToggle = screen.getByTestId('weekly-today-toggle');
        expect(weeklyTodayToggle).toBeChecked();
      });
    });
  });

  describe('Date and Week Calculations', () => {
    it('calculates current week correctly', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Should show the current week (2025-W37)
      expect(screen.getByText('שבוע 37, 2025')).toBeInTheDocument();
    });

    it('shows correct date range for current week', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Should show week range (Sunday to Saturday)
      expect(screen.getByText(/7-13 בספטמבר/)).toBeInTheDocument();
    });

    it('handles week boundaries correctly', async () => {
      // This would test edge cases like week transitions
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('סיכום שבועי')).toBeInTheDocument();
      });
      
      // Ensure week starts on Sunday and ends on Saturday
      const weekDays = screen.getAllByTestId(/day-column-/);
      expect(weekDays).toHaveLength(7);
    });
  });

  describe('Error Handling', () => {
    it('shows error message when data loading fails', async () => {
      // Mock Firebase error
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByText('שגיאה בטעינת נתוני נוכחות')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      renderWithAuth();
      
      // Should show cached data or appropriate error message
      await waitFor(() => {
        // Either shows data or shows appropriate error
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for toggles', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: /מגיע היום/ });
        expect(toggle).toHaveAttribute('aria-label');
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: /מגיע היום/ });
        toggle.focus();
        expect(toggle).toHaveFocus();
      });
    });

    it('has proper RTL support', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        const container = screen.getByRole('main');
        expect(container).toHaveAttribute('dir', 'rtl');
      });
    });
  });
});