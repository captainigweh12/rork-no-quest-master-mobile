export type QuestType = 'daily' | 'weekly' | 'special';

export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  points: number;
  xp: number;
  completed: boolean;
  completedAt?: Date;
  expiresAt?: Date;
  icon: string;
  minNoRequired?: number;
  durationMinutes?: number;
  timerEndAt?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  isFromFriend?: boolean;
  senderId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  source?: 'user' | 'ai' | 'initial';
  category?: string;
}

export interface UserProfile {
  name: string;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalPoints: number;
  totalRejections: number;
  streak: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

export interface Friend {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalPoints: number;
  totalRejections: number;
  streak: number;
  activeQuest?: string;
  friendshipStatus?: 'pending' | 'accepted' | 'rejected';
}

export interface RejectionLocation {
  id: string;
  latitude: number;
  longitude: number;
  questId: string;
  questTitle: string;
  completedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'quest_invite' | 'friend_request' | 'quest_completed' | 'chat_message';
  title: string;
  message: string;
  read: boolean;
  relatedId?: string;
  createdAt: Date;
}

export interface QuestInvite {
  id: string;
  questId: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: Date;
  respondedAt?: Date;
  quest?: Quest;
  sender?: Friend;
}

export interface QuestProgress {
  id: string;
  questId: string;
  userId: string;
  noCount: number;
  yesCount: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface PlaceQueueItem {
  id: string;
  userId: string;
  questId: string;
  placeName: string;
  placeAddress?: string;
  latitude: number;
  longitude: number;
  completed: boolean;
  notes?: string;
  createdAt: Date;
  completedAt?: Date;
  quest?: Quest;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface FriendInvite {
  id: string;
  inviterId: string;
  inviteCode: string;
  email?: string;
  used: boolean;
  usedBy?: string;
  createdAt: Date;
  expiresAt: Date;
}

export type CommunityPostType = 'journal' | 'quest';

export interface CommunityPostJournal {
  type: 'journal';
  journalId: string;
  title: string;
  notes?: string;
  skills?: string[];
  privacy: 'friends' | 'public';
}

export interface CommunityPostQuest {
  type: 'quest';
  questId: string;
  title: string;
  description?: string;
}

export type CommunityPostContent = CommunityPostJournal | CommunityPostQuest;

export interface CommunityPost {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  createdAt: Date;
  content: CommunityPostContent;
  likes?: number;
  comments?: number;
}

export type ThemeMode = 'light' | 'dark';
