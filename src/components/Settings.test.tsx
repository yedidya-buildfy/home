import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from './Settings';

// Mock Firebase completely
vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-uid', email: 'test@test.com' } },
  db: {},
  storage: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-uid', email: 'test@test.com' },
    logout: vi.fn(),
  }),
}));

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user profile section', () => {
    render(<Settings />);

    expect(screen.getByText('הגדרות')).toBeInTheDocument();
    expect(screen.getByText('פרופיל אישי')).toBeInTheDocument();
  });

  it('allows editing user name', async () => {
    const user = userEvent.setup();
    render(<Settings />);

    const nameInput = screen.getByPlaceholderText('השם שלך');
    await user.clear(nameInput);
    await user.type(nameInput, 'שם חדש');

    expect(nameInput).toHaveValue('שם חדש');
  });

  it('shows home management section', () => {
    render(<Settings />);

    expect(screen.getByText('ניהול בית')).toBeInTheDocument();
  });

  it('shows app preferences', () => {
    render(<Settings />);

    expect(screen.getByText('העדפות אפליקציה')).toBeInTheDocument();
    expect(screen.getByText('מסך ברירת מחדל')).toBeInTheDocument();
  });
});