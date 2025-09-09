# PRD: Family Home & Groceries PWA

## 1. Overview
A Progressive Web App (PWA) for households to coordinate meals and grocery shopping.  
Key goals:
- Keep it **simple** and fast.  
- Support multiple users under one “Home.”  
- Manage **attendance for meals** and a **shared grocery list**.  
- Hebrew-first UI.  
- Built with React (TypeScript), Tailwind, shadcn/ui.  
- Firebase for backend (Auth, Firestore, Storage, Hosting).

---

## 2. Core Features

### 2.1 Authentication
- Method: **Email + password**.  
- Each user has:
  - Name (string)  
  - Profile image (stored in Firebase Storage, resized minimal for profile pics)  
  - Belongs to **one Home** only.  

### 2.2 Home (Group)
- **Admin**: creator of the home.  
  - Can invite/remove users.  
  - Can rename/delete the home.  
- **Members**: all users in the home.  
- **Invites**: manual approval by admin or members.  
  - Flow: generate simple code → new user enters → any member/admin can approve.  
- **Removal**: admin only.  

### 2.3 Settings Screen
- Profile:
  - Name (editable).  
  - Profile picture (upload → Firebase Storage).  
- Home management:
  - Invite users.  
  - Approve/reject invitations.  
  - Admin: remove members.  
- App preference:
  - Toggle: “Default screen on open = Home or Groceries.”  

### 2.4 Home Screen (Attendance)
The Home screen is composed of three stacked sections, in this order:

1. **Quick Toggle Section (Today)**  
   - Large, intuitive **switch toggle** (sliding left/right, not just button color) to mark *Coming / Not Coming today*.  
   - Options for current user to add **guest count** and **note** (shared note).  
   - Bright design with clear icons (no emojis).  

2. **Banner: Who’s Coming Today**  
   - Displays list of users who marked “Coming today.”  
   - Shows their profile image, name, and guest count if added.  
   - Styled as a nice highlighted banner.

3. **Weekly Summary (Bottom)**  
   - Shows a **read-only** summary of attendance for the week for all users.  
   - Each user row includes status, guests, and notes for each day.  
   - Only the **current user** can interact with their own week view: toggles for each day, guest count, and notes.  
   - Other users’ data is displayed read-only.  

### 2.5 Groceries Screen
- One **global list** per home.  
- Item fields:
  - Name (string).  
  - Amount (string, e.g., “2”).  
  - Optional note (string).  
  - Added by: user name + image.  
- Features:
  - **Auto-complete**: suggest previously used items.  
  - **Merge duplicates**: same item name auto-combines amounts.  
  - Sorted: by **date added**, grouped into **weekly sections** (Sunday 12pm → next Sunday 12pm).  
  - Items can be:
    - **Checked** (bought).  
    - **Deleted** (individually or via “Delete all checked”).  
  - **Clear all**: deletes all items (anyone can trigger). Requires confirmation modal.  
- No archive, no notifications for MVP.  

---

## 3. Data Model (Firestore)

### Collections
```
homes (collection)
  homeId (doc)
    name: string
    adminId: userId
    createdAt: timestamp
    members: [userId]
    invites: [ { email, invitedBy, status } ]
    
users (collection)
  userId (doc)
    email: string
    name: string
    profileImageUrl: string
    homeId: string
    createdAt: timestamp

attendance (collection)
  homeId (doc)
    weeks (subcollection)
      weekId (doc: e.g., 2025-W37)
        days: {
          "2025-09-08": {
            userId: { coming: boolean, guests: number, note: string }
          }
        }

groceries (collection)
  homeId (doc)
    items (subcollection)
      itemId (doc)
        name: string
        amount: string
        note: string
        addedBy: userId
        addedAt: timestamp
        checked: boolean
```

---

## 4. Security Rules (MVP)
- **Users**: can only read/write their own profile.  
- **Attendance**: only members of a home can read/write attendance for that home.  
- **Groceries**: only members of a home can read/write groceries for that home.  
- **Invites**: only admin can remove users; any member can approve.  

---

## 5. UI / UX

### Global
- Bright, minimal theme.  
- **shadcn + Tailwind** for UI components.  
- Hebrew-first (RTL).  
- **Icons only (Lucide icons)**, **no emojis**.  
- Toggles must be **sliders** (switch style) to be intuitive.  

### Screens
1. **Settings**  
   - Profile (name, image).  
   - Invite/approve users.  
   - Admin-only: remove members.  
   - Toggle: default screen = Home/Groceries.  

2. **Home (Attendance)**  
   - Top: Quick toggle section (today).  
   - Middle: Banner (who’s coming today).  
   - Bottom: Weekly summary (read-only for others, editable only for current user).  

3. **Groceries**  
   - Add new item (name, amount, note).  
   - Show added-by (avatar + name).  
   - Check off items.  
   - Delete checked / clear all (confirmation).  

---

## 6. Non-Functional
- **Realtime**: Firestore listeners for instant updates.  
- **Offline-first**: Firestore cache, last-write-wins.  
- **Error handling**: snackbars for failed writes / conflicts.  
- **Retention**: attendance kept 30 days, groceries persist until deleted.  
- **No notifications** in MVP.  
- **Hosting**: Firebase Hosting.  
- **PWA**: manifest + service worker. Installable on Android/iOS.  

---

## 7. Admin & Logs
- Admin can:
  - Invite/remove members.  
  - Rename/delete home.  
- Activity log (lightweight):
  - “Dana added Milk (x2)”  
  - “Yossi checked ‘Bread’.”  
- Keep logs for 30 days.  

---

## 8. Out of Scope (for MVP)
- Multi-homes.  
- Templates or recurring lists.  
- Push/email notifications.  
- Dietary preferences.  
- Analytics dashboards.  
