import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Send } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as chatService from '@/services/supabase/chat';
import type { ChatMessage } from '@/types';
import { Avatar } from '@/components/SafeImage';

export default function ChatScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  
  const friendId = params.friendId as string;
  const friendName = params.friendName as string;
  const friendAvatar = params.friendAvatar as string;

  const [message, setMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const styles = createStyles(theme.colors);

  const messagesQuery = useQuery({
    queryKey: ['messages', user?.id, friendId],
    queryFn: async () => {
      if (!user?.id || !friendId) return [];
      return await chatService.getMessages(user.id, friendId);
    },
    enabled: !!user?.id && !!friendId,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!user?.id || !friendId) throw new Error('Missing user or friend ID');
      return await chatService.sendMessage(user.id, friendId, messageText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', user?.id, friendId] });
      setMessage('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
  });

  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    if (user?.id && friendId) {
      chatService.markMessagesAsRead(user.id, friendId);
    }
  }, [user?.id, friendId]);

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={[theme.colors.backgroundTertiary, theme.colors.background]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={friendName} imageUrl={friendAvatar} size={40} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{friendName}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 80 }]}
        >
          {messagesQuery.data?.map((msg: ChatMessage) => {
            const isOwnMessage = msg.senderId === user?.id;
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isOwnMessage ? styles.messageRowOwn : styles.messageRowOther,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isOwnMessage
                      ? { ...styles.messageBubbleOwn, backgroundColor: theme.colors.primary }
                      : { ...styles.messageBubbleOther, backgroundColor: theme.colors.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isOwnMessage ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {msg.message}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      { color: isOwnMessage ? '#FFFFFF99' : theme.colors.textSecondary },
                    ]}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.backgroundSecondary }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, { backgroundColor: theme.colors.primary, opacity: message.trim() ? 1 : 0.5 }]}
            onPress={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            <Send size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatMessageTime(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return messageDate.toLocaleDateString();
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '20',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    messageRow: {
      marginBottom: 12,
      maxWidth: '80%',
    },
    messageRowOwn: {
      alignSelf: 'flex-end',
    },
    messageRowOther: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
    },
    messageBubbleOwn: {
      borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 4,
    },
    messageTime: {
      fontSize: 11,
    },
    inputContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 12,
      alignItems: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: colors.border + '20',
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 100,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 22,
      fontSize: 16,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
