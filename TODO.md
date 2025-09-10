# Home Management PWA - Development TODO

## Test-Driven Development Approach
Each page MUST start with writing tests before implementation. Do not proceed until all tests pass.

---

## Phase 1: Testing Infrastructure Setup
- [x] **Write Tests**: Set up Vitest + React Testing Library + Firebase emulators
- [x] **Implementation**: Install testing dependencies and configure
- [x] **Verify**: Test environment working

---

## Phase 2: Settings Page
- [x] **Write Tests**: Complete Settings page functionality
  - [x] User profile editing (name, image upload)
  - [x] Home management (invite/remove users, approve invitations)
  - [x] Admin-only features (visible only to admin)
  - [x] Form validation and error handling
- [x] **Implementation**: Build complete Settings page
- [x] **Verify**: All Settings tests pass

---

## Phase 3: Home Page (Attendance)
- [x] **Write Tests**: Complete Home page functionality
  - [x] Quick toggle for today (coming/not coming + guests + notes)
  - [x] "Who's Coming Today" banner with profiles
  - [x] Weekly summary view (editable for current user only)
  - [x] Real-time updates across users
  - [x] Date calculations and week boundaries
- [x] **Implementation**: Build complete Home page
- [x] **Verify**: All Home tests pass

---

## Phase 4: Groceries Page
- [x] **Write Tests**: Complete Groceries page functionality
  - [x] Add items (name, amount, note) with auto-complete
  - [x] Display items grouped by weekly sections
  - [x] Check/uncheck items, delete items
  - [x] "Delete all checked" and "Clear all" with confirmation
  - [x] Real-time updates and merge duplicates
- [x] **Implementation**: Build complete Groceries page
- [x] **Verify**: All Groceries tests pass

---

## Phase 5: Integration & Full App Testing
- [x] **Write Tests**: App-wide functionality
  - [x] Navigation between pages
  - [x] Real-time sync across all pages
  - [x] Email invitation system (send invitation to yedidyadan33@gmail.com)
  - [x] End-to-end user flows (sign up, join home, use all features)
  - [x] PWA features (manifest, service worker)
  - [ ] Offline support and conflict resolution (nice-to-have)
- [x] **Implementation**: Final integration and PWA setup
- [x] **Manual Testing**: Complete app functionality verification
  - [x] Test email invitation flow (working in test mode)
  - [x] Verify all pages work correctly
  - [x] Test real-time updates across multiple users
  - [x] Confirm mobile responsiveness
- [x] **Verify**: Core functionality ready for production (email invitations implemented)

---

## Quality Standards for Each Phase:
- All tests must pass ✅
- No TypeScript errors
- Hebrew RTL support
- Mobile-first design
- Real-time updates
- Production-ready code