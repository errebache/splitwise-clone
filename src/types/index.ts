export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  subscription_status: 'free' | 'premium' | 'trial';
  trial_ends_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  currency: string;
  total_expenses: number;
  member_count: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: User;
}

export interface Expense {
  id: string;
  group_id: string;
  created_by: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  created_at: string;
  is_settled: boolean;
  split_type: 'equal' | 'custom';
  paid_by: string;
  participants: ExpenseParticipant[];
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_paid: boolean;
  user?: User;
}

export interface Balance {
  user_id: string;
  amount: number;
  user?: User;
}

export interface Settlement {
  from_user: string;
  to_user: string;
  amount: number;
  from_user_data?: User;
  to_user_data?: User;
}

export interface Participant {
  id: string;
  group_id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'pending' | 'registered' | 'declined';
  invitation_token: string;
  invited_by: string;
  user_id?: string;
  created_at: string;
  registered_name?: string;
  registered_email?: string;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invitation_code: string;
  invitation_link: string;
  created_by: string;
  expires_at: string;
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

export interface InvitationInfo {
  type: 'group' | 'participant';
  group?: {
    id: string;
    name: string;
    description?: string;
    invitedBy: string;
  };
  participant?: {
    id: string;
    name: string;
    email?: string;
    groupId: string;
    groupName: string;
    groupDescription?: string;
    invitedBy: string;
  };
}
export type Language = 'en' | 'fr' | 'es';

export interface AppContextType {
  user: User | null;
  groups: Group[];
  currentGroup: Group | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  setCurrentGroup: (group: Group | null) => void;
}