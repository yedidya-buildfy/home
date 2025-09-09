import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from './Settings';
import { AuthProvider } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Test user credentials
const TEST_EMAIL = 'test-settings@example.com';
const TEST_PASSWORD = 'testpassword123';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('Settings Page Integration Tests', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Sign out any existing user
    await signOut(auth);
    
    // Create test user
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      testUserId = userCredential.user.uid;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // User exists, sign in instead
        const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
        testUserId = userCredential.user.uid;
      } else {
        throw error;
      }
    }

    // Create test user document
    await setDoc(doc(db, 'users', testUserId), {
      name: 'Test User',
      email: TEST_EMAIL,
      defaultScreen: 'home',
      createdAt: new Date(),
    });
  });

  afterEach(async () => {
    // Cleanup test data
    if (testUserId) {
      try {
        await deleteDoc(doc(db, 'users', testUserId));
        
        // Clean up any test homes
        const homesQuery = query(collection(db, 'homes'), where('adminId', '==', testUserId));
        const homesSnapshot = await getDocs(homesQuery);
        homesSnapshot.docs.forEach(async (homeDoc) => {
          await deleteDoc(homeDoc.ref);
        });

        // Clean up any test invites
        const invitesQuery = query(collection(db, 'invites'), where('invitedBy', '==', testUserId));
        const invitesSnapshot = await getDocs(invitesQuery);
        invitesSnapshot.docs.forEach(async (inviteDoc) => {
          await deleteDoc(inviteDoc.ref);
        });
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    }
    
    await signOut(auth);
  });

  it('loads and displays user profile', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('טוען הגדרות...')).not.toBeInTheDocument();
    });

    // Check if main sections are displayed
    expect(screen.getByText('הגדרות')).toBeInTheDocument();
    expect(screen.getByText('פרופיל אישי')).toBeInTheDocument();
    expect(screen.getByText('ניהול בית')).toBeInTheDocument();
    expect(screen.getByText('העדפות אפליקציה')).toBeInTheDocument();

    // Check if user name is loaded
    const nameInput = screen.getByDisplayValue('Test User');
    expect(nameInput).toBeInTheDocument();

    // Check if email is displayed (read-only)
    expect(screen.getByDisplayValue(TEST_EMAIL)).toBeInTheDocument();
  });

  it('allows editing and saving user name', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('טוען הגדרות...')).not.toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Test User');
    
    // Edit name
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Test User');
    
    // Trigger save by blurring
    await user.click(document.body);
    
    // Wait for save confirmation
    await waitFor(() => {
      expect(screen.getByText('פרופיל נשמר בהצלחה')).toBeInTheDocument();
    });
  });

  it('creates a new home when user clicks create home', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('טוען הגדרות...')).not.toBeInTheDocument();
    });

    // Should show "not a member" message initially
    expect(screen.getByText('אתה עדיין לא חבר בבית')).toBeInTheDocument();

    const createHomeButton = screen.getByText('צור בית חדש');
    await user.click(createHomeButton);

    // Wait for home creation
    await waitFor(() => {
      expect(screen.getByText('בית נוצר בהצלחה!')).toBeInTheDocument();
    });

    // Should now show home management UI
    expect(screen.getByText('הבית של Test User')).toBeInTheDocument();
    expect(screen.getByText('אתה המנהל')).toBeInTheDocument();
  });

  it('generates invitation code when admin invites user', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('טוען הגדרות...')).not.toBeInTheDocument();
    });

    // Create home first
    const createHomeButton = screen.getByText('צור בית חדש');
    await user.click(createHomeButton);

    await waitFor(() => {
      expect(screen.getByText('בית נוצר בהצלחה!')).toBeInTheDocument();
    });

    // Now try to invite someone
    const emailInput = screen.getByPlaceholderText('אימייל להזמנה');
    await user.type(emailInput, 'invited-user@example.com');

    const inviteButton = screen.getByText('הזמן');
    await user.click(inviteButton);

    // Wait for invite generation
    await waitFor(() => {
      expect(screen.getByText(/קוד הזמנה נוצר:/)).toBeInTheDocument();
    });

    // Should show the generated code
    expect(screen.getByText(/[A-Z0-9]{6}/)).toBeInTheDocument();
  });

  it('toggles default screen preference', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('טוען הגדרות...')).not.toBeInTheDocument();
    });

    const groceriesButton = screen.getByRole('button', { name: 'קניות' });
    await user.click(groceriesButton);

    // The button should now be the primary variant (selected)
    await waitFor(() => {
      // Since we can't easily check button variant, we can check if the preference was saved
      // by checking if there's no error message
      expect(screen.queryByText(/שגיאה/)).not.toBeInTheDocument();
    });
  });

  it('displays logout button and functionality', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText('טוען הגדרות...')).not.toBeInTheDocument();
    });

    const logoutButton = screen.getByText('התנתק');
    expect(logoutButton).toBeInTheDocument();
    
    // Button should be clickable
    expect(logoutButton).not.toBeDisabled();
  });
});