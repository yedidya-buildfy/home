export interface User {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string;
  homeId: string;
  createdAt: Date;
}

export interface Home {
  id: string;
  name: string;
  adminId: string;
  createdAt: Date;
  members: string[];
  invites: Invite[];
}

export interface Invite {
  email: string;
  invitedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AttendanceDay {
  coming: boolean;
  guests: number;
  note: string;
}

export interface AttendanceWeek {
  id: string;
  days: Record<string, Record<string, AttendanceDay>>;
}

export interface GroceryItem {
  id: string;
  name: string;
  amount: string;
  note: string;
  addedBy: string;
  addedAt: Date;
  checked: boolean;
}