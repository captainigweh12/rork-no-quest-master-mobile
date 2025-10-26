import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Friend,
  FriendInvite,
  Quest,
  QuestInvite,
  QuestProgress,
  PlaceQueueItem,
  ChatMessage,
  Notification,
} from '@/types';

interface LocalUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalPoints: number;
  totalRejections: number;
  streak: number;
  emailVerified: boolean;
  verificationCode?: string;
  createdAt: string;
  relationshipStatus?: 'single' | 'married';
}

interface LocalSession {
  userId: string;
  email: string;
  expiresAt: string;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'local_current_user',
  SESSION: 'local_session',
  USERS: 'local_users',
  FRIENDS: 'local_friends',
  FRIEND_REQUESTS: 'local_friend_requests',
  FRIEND_INVITES: 'local_friend_invites',
  QUESTS: 'local_quests',
  QUEST_INVITES: 'local_quest_invites',
  QUEST_PROGRESS: 'local_quest_progress',
  PLACE_QUEUE: 'local_place_queue',
  CHAT_MESSAGES: 'local_chat_messages',
  NOTIFICATIONS: 'local_notifications',
  PENDING_VERIFICATION: 'local_pending_verification',
};

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const item = await AsyncStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return null;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
  }
}

export const localStorageService = {
  async signUp(email: string, password: string, fullName: string) {
    console.log('[localStorage] Signing up:', email);
    const users = await getItem<LocalUser[]>(STORAGE_KEYS.USERS) || [];
    
    if (users.find(u => u.email === email)) {
      throw new Error('User with this email already exists');
    }

    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newUser: LocalUser = {
      id: Date.now().toString(),
      email,
      password,
      fullName,
      username: email.split('@')[0],
      level: 1,
      currentXp: 0,
      xpToNextLevel: 100,
      totalPoints: 0,
      totalRejections: 0,
      streak: 0,
      emailVerified: false,
      verificationCode,
      createdAt: new Date().toISOString(),
      relationshipStatus: 'single',
    };

    users.push(newUser);
    await setItem(STORAGE_KEYS.USERS, users);
    await setItem(STORAGE_KEYS.PENDING_VERIFICATION, { email, verificationCode });

    console.log(`[localStorage] Verification code for ${email}: ${verificationCode}`);

    return { user: newUser, verificationCode };
  },

  async signIn(email: string, password: string) {
    console.log('[localStorage] Signing in:', email);
    const users = await getItem<LocalUser[]>(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw new Error('Please verify your email before signing in. Check your email for the verification code.');
    }

    const session: LocalSession = {
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await setItem(STORAGE_KEYS.SESSION, session);
    await setItem(STORAGE_KEYS.CURRENT_USER, user);

    return { user, session };
  },

  async signOut() {
    console.log('[localStorage] Signing out');
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  async getSession() {
    const session = await getItem<LocalSession>(STORAGE_KEYS.SESSION);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      await this.signOut();
      return null;
    }

    const user = await getItem<LocalUser>(STORAGE_KEYS.CURRENT_USER);
    return { session, user };
  },

  async getCurrentUser() {
    return await getItem<LocalUser>(STORAGE_KEYS.CURRENT_USER);
  },

  async searchUsers(query: string): Promise<Friend[]> {
    const users = await getItem<LocalUser[]>(STORAGE_KEYS.USERS) || [];
    const currentUser = await this.getCurrentUser();
    
    return users
      .filter(u => 
        u.id !== currentUser?.id &&
        (u.username?.toLowerCase().includes(query.toLowerCase()) || 
         u.fullName?.toLowerCase().includes(query.toLowerCase()) ||
         u.email?.toLowerCase().includes(query.toLowerCase()))
      )
      .map(u => ({
        id: u.id,
        username: u.username || u.email,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        level: u.level,
        currentXp: u.currentXp,
        xpToNextLevel: u.xpToNextLevel,
        totalPoints: u.totalPoints,
        totalRejections: u.totalRejections,
        streak: u.streak,
      }));
  },

  async getFriends(userId: string): Promise<Friend[]> {
    const friends = await getItem<Record<string, string[]>>(STORAGE_KEYS.FRIENDS) || {};
    const friendIds = friends[userId] || [];
    const users = await getItem<LocalUser[]>(STORAGE_KEYS.USERS) || [];

    return users
      .filter(u => friendIds.includes(u.id))
      .map(u => ({
        id: u.id,
        username: u.username || u.email,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        level: u.level,
        currentXp: u.currentXp,
        xpToNextLevel: u.xpToNextLevel,
        totalPoints: u.totalPoints,
        totalRejections: u.totalRejections,
        streak: u.streak,
        friendshipStatus: 'accepted' as const,
      }));
  },

  async sendFriendRequest(userId: string, friendId: string) {
    const requests = await getItem<Record<string, string[]>>(STORAGE_KEYS.FRIEND_REQUESTS) || {};
    if (!requests[friendId]) requests[friendId] = [];
    if (!requests[friendId].includes(userId)) {
      requests[friendId].push(userId);
      await setItem(STORAGE_KEYS.FRIEND_REQUESTS, requests);

      await this.createNotification(friendId, {
        type: 'friend_request',
        title: 'New Friend Request',
        message: 'You have a new friend request!',
        relatedId: userId,
      });
    }
  },

  async acceptFriendRequest(userId: string, friendId: string) {
    const friends = await getItem<Record<string, string[]>>(STORAGE_KEYS.FRIENDS) || {};
    if (!friends[userId]) friends[userId] = [];
    if (!friends[friendId]) friends[friendId] = [];
    
    if (!friends[userId].includes(friendId)) {
      friends[userId].push(friendId);
    }
    if (!friends[friendId].includes(userId)) {
      friends[friendId].push(userId);
    }
    
    await setItem(STORAGE_KEYS.FRIENDS, friends);

    const requests = await getItem<Record<string, string[]>>(STORAGE_KEYS.FRIEND_REQUESTS) || {};
    if (requests[userId]) {
      requests[userId] = requests[userId].filter(id => id !== friendId);
      await setItem(STORAGE_KEYS.FRIEND_REQUESTS, requests);
    }
  },

  async createFriendInvite(userId: string, email?: string): Promise<FriendInvite> {
    const invites = await getItem<FriendInvite[]>(STORAGE_KEYS.FRIEND_INVITES) || [];
    const inviteCode = Math.random().toString(36).substring(2, 15);
    
    const invite: FriendInvite = {
      id: Date.now().toString(),
      inviterId: userId,
      inviteCode,
      email,
      used: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    invites.push(invite);
    await setItem(STORAGE_KEYS.FRIEND_INVITES, invites);
    return invite;
  },

  async acceptFriendInvite(inviteCode: string, userId: string) {
    const invites = await getItem<FriendInvite[]>(STORAGE_KEYS.FRIEND_INVITES) || [];
    const invite = invites.find(i => i.inviteCode === inviteCode && !i.used);

    if (!invite) {
      throw new Error('Invalid or expired invite code');
    }

    invite.used = true;
    invite.usedBy = userId;
    await setItem(STORAGE_KEYS.FRIEND_INVITES, invites);
    await this.acceptFriendRequest(userId, invite.inviterId);
  },

  async getUserQuests(userId: string): Promise<Quest[]> {
    const allQuests = await getItem<Record<string, Quest[]>>(STORAGE_KEYS.QUESTS) || {};
    return allQuests[userId] || [];
  },

  async createQuest(userId: string, quest: Partial<Quest>): Promise<Quest> {
    const allQuests = await getItem<Record<string, Quest[]>>(STORAGE_KEYS.QUESTS) || {};
    if (!allQuests[userId]) allQuests[userId] = [];

    const newQuest: Quest = {
      id: Date.now().toString(),
      title: quest.title || 'New Quest',
      description: quest.description || '',
      type: quest.type || 'daily',
      difficulty: quest.difficulty || 'medium',
      points: quest.points || 100,
      xp: quest.xp || 50,
      completed: false,
      icon: quest.icon || 'target',
      minNoRequired: quest.minNoRequired || 3,
      durationMinutes: quest.durationMinutes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    allQuests[userId].push(newQuest);
    await setItem(STORAGE_KEYS.QUESTS, allQuests);
    return newQuest;
  },

  async sendQuestToFriend(senderId: string, receiverId: string, questId: string, message?: string): Promise<QuestInvite> {
    const invites = await getItem<QuestInvite[]>(STORAGE_KEYS.QUEST_INVITES) || [];
    
    const invite: QuestInvite = {
      id: Date.now().toString(),
      questId,
      senderId,
      receiverId,
      status: 'pending',
      message,
      createdAt: new Date(),
    };

    invites.push(invite);
    await setItem(STORAGE_KEYS.QUEST_INVITES, invites);

    await this.createNotification(receiverId, {
      type: 'quest_invite',
      title: 'New Quest Received',
      message: 'You received a new quest from a friend!',
      relatedId: invite.id,
    });

    return invite;
  },

  async getQuestInvites(userId: string): Promise<QuestInvite[]> {
    const invites = await getItem<QuestInvite[]>(STORAGE_KEYS.QUEST_INVITES) || [];
    return invites.filter(i => i.receiverId === userId && i.status === 'pending');
  },

  async acceptQuestInvite(inviteId: string, userId: string): Promise<Quest> {
    const invites = await getItem<QuestInvite[]>(STORAGE_KEYS.QUEST_INVITES) || [];
    const invite = invites.find(i => i.id === inviteId);

    if (!invite) {
      throw new Error('Invite not found');
    }

    const allQuests = await getItem<Record<string, Quest[]>>(STORAGE_KEYS.QUESTS) || {};
    const senderQuests = allQuests[invite.senderId] || [];
    const originalQuest = senderQuests.find(q => q.id === invite.questId);

    if (!originalQuest) {
      throw new Error('Original quest not found');
    }

    if (!allQuests[userId]) allQuests[userId] = [];
    
    const newQuest: Quest = {
      ...originalQuest,
      id: Date.now().toString(),
      completed: false,
      isFromFriend: true,
      senderId: invite.senderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    allQuests[userId].push(newQuest);
    await setItem(STORAGE_KEYS.QUESTS, allQuests);

    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await setItem(STORAGE_KEYS.QUEST_INVITES, invites);

    return newQuest;
  },

  async rejectQuestInvite(inviteId: string) {
    const invites = await getItem<QuestInvite[]>(STORAGE_KEYS.QUEST_INVITES) || [];
    const invite = invites.find(i => i.id === inviteId);

    if (invite) {
      invite.status = 'rejected';
      invite.respondedAt = new Date();
      await setItem(STORAGE_KEYS.QUEST_INVITES, invites);
    }
  },

  async updateQuestProgress(questId: string, userId: string, noCount: number, yesCount: number): Promise<QuestProgress> {
    const allProgress = await getItem<Record<string, QuestProgress[]>>(STORAGE_KEYS.QUEST_PROGRESS) || {};
    if (!allProgress[userId]) allProgress[userId] = [];

    let progress = allProgress[userId].find(p => p.questId === questId);
    
    if (!progress) {
      progress = {
        id: Date.now().toString(),
        questId,
        userId,
        noCount,
        yesCount,
        startedAt: new Date(),
      };
      allProgress[userId].push(progress);
    } else {
      progress.noCount = noCount;
      progress.yesCount = yesCount;
    }

    await setItem(STORAGE_KEYS.QUEST_PROGRESS, allProgress);
    return progress;
  },

  async getQuestProgress(questId: string, userId: string): Promise<QuestProgress | null> {
    const allProgress = await getItem<Record<string, QuestProgress[]>>(STORAGE_KEYS.QUEST_PROGRESS) || {};
    const userProgress = allProgress[userId] || [];
    return userProgress.find(p => p.questId === questId) || null;
  },

  async addPlaceToQueue(
    userId: string,
    questId: string,
    placeName: string,
    placeAddress: string | undefined,
    latitude: number,
    longitude: number,
    notes?: string
  ): Promise<PlaceQueueItem> {
    const allQueue = await getItem<Record<string, PlaceQueueItem[]>>(STORAGE_KEYS.PLACE_QUEUE) || {};
    if (!allQueue[userId]) allQueue[userId] = [];

    const item: PlaceQueueItem = {
      id: Date.now().toString(),
      userId,
      questId,
      placeName,
      placeAddress,
      latitude,
      longitude,
      completed: false,
      notes,
      createdAt: new Date(),
    };

    allQueue[userId].push(item);
    await setItem(STORAGE_KEYS.PLACE_QUEUE, allQueue);
    return item;
  },

  async getPlaceQueue(userId: string): Promise<PlaceQueueItem[]> {
    const allQueue = await getItem<Record<string, PlaceQueueItem[]>>(STORAGE_KEYS.PLACE_QUEUE) || {};
    return (allQueue[userId] || []).filter(item => !item.completed);
  },

  async markPlaceAsCompleted(placeId: string, userId: string) {
    const allQueue = await getItem<Record<string, PlaceQueueItem[]>>(STORAGE_KEYS.PLACE_QUEUE) || {};
    const userQueue = allQueue[userId] || [];
    const item = userQueue.find(i => i.id === placeId);

    if (item) {
      item.completed = true;
      item.completedAt = new Date();
      await setItem(STORAGE_KEYS.PLACE_QUEUE, allQueue);
    }
  },

  async removePlaceFromQueue(placeId: string, userId: string) {
    const allQueue = await getItem<Record<string, PlaceQueueItem[]>>(STORAGE_KEYS.PLACE_QUEUE) || {};
    if (allQueue[userId]) {
      allQueue[userId] = allQueue[userId].filter(i => i.id !== placeId);
      await setItem(STORAGE_KEYS.PLACE_QUEUE, allQueue);
    }
  },

  async sendMessage(senderId: string, receiverId: string, message: string): Promise<ChatMessage> {
    const messages = await getItem<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES) || [];
    
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId,
      receiverId,
      message,
      read: false,
      createdAt: new Date(),
    };

    messages.push(chatMessage);
    await setItem(STORAGE_KEYS.CHAT_MESSAGES, messages);

    await this.createNotification(receiverId, {
      type: 'chat_message',
      title: 'New Message',
      message: 'You have a new message!',
      relatedId: chatMessage.id,
    });

    return chatMessage;
  },

  async getMessages(userId: string, friendId: string): Promise<ChatMessage[]> {
    const messages = await getItem<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES) || [];
    return messages.filter(
      m => 
        (m.senderId === userId && m.receiverId === friendId) ||
        (m.senderId === friendId && m.receiverId === userId)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async markMessagesAsRead(userId: string, friendId: string) {
    const messages = await getItem<ChatMessage[]>(STORAGE_KEYS.CHAT_MESSAGES) || [];
    messages.forEach(m => {
      if (m.senderId === friendId && m.receiverId === userId && !m.read) {
        m.read = true;
      }
    });
    await setItem(STORAGE_KEYS.CHAT_MESSAGES, messages);
  },

  async createNotification(userId: string, notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>) {
    const notifications = await getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS) || [];
    
    const newNotification: Notification = {
      id: Date.now().toString(),
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: false,
      relatedId: notification.relatedId,
      createdAt: new Date(),
    };

    notifications.push(newNotification);
    await setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    const notifications = await getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS) || [];
    return notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
  },

  async markNotificationAsRead(notificationId: string) {
    const notifications = await getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS) || [];
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    }
  },

  async markAllNotificationsAsRead(userId: string) {
    const notifications = await getItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS) || [];
    notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    await setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },

  async verifyEmail(email: string, code: string) {
    console.log('[localStorage] Verifying email:', email);
    const users = await getItem<LocalUser[]>(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.email === email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    if (user.verificationCode !== code.toUpperCase()) {
      throw new Error('Invalid verification code');
    }

    user.emailVerified = true;
    user.verificationCode = undefined;
    await setItem(STORAGE_KEYS.USERS, users);
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_VERIFICATION);

    console.log('[localStorage] Email verified successfully');
    return { success: true };
  },

  async resendVerificationCode(email: string) {
    console.log('[localStorage] Resending verification code for:', email);
    const users = await getItem<LocalUser[]>(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.email === email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email already verified');
    }

    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    user.verificationCode = verificationCode;
    await setItem(STORAGE_KEYS.USERS, users);
    await setItem(STORAGE_KEYS.PENDING_VERIFICATION, { email, verificationCode });

    console.log(`[localStorage] New verification code for ${email}: ${verificationCode}`);
    return { verificationCode };
  },

  async getPendingVerification() {
    return await getItem<{ email: string; verificationCode: string }>(STORAGE_KEYS.PENDING_VERIFICATION);
  },

  async updateRelationshipStatus(userId: string, relationshipStatus: 'single' | 'married') {
    console.log('[localStorage] Updating relationship status:', userId, relationshipStatus);
    const users = await getItem<LocalUser[]>(STORAGE_KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    user.relationshipStatus = relationshipStatus;
    await setItem(STORAGE_KEYS.USERS, users);

    const currentUser = await getItem<LocalUser>(STORAGE_KEYS.CURRENT_USER);
    if (currentUser && currentUser.id === userId) {
      currentUser.relationshipStatus = relationshipStatus;
      await setItem(STORAGE_KEYS.CURRENT_USER, currentUser);
    }

    return user;
  },
};
