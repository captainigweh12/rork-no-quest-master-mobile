import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Users, Plus, UserPlus, Crown, Shield, ChevronRight, ClipboardCheck, TrendingUp, Play, Check, XCircle, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserTeams, createTeam, getTeamMembers, getTeamTasks, getTeamAssignments, createTeamTask, createTeamInvite, assignTaskToMember, updateTeamTaskAssignment } from '@/services/supabase/teams';
import type { Team } from '@/services/supabase/teams';

export default function TeamsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { hasFeature } = useSubscription();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [teamDescription, setTeamDescription] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [taskDifficulty, setTaskDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
  const [requiredNoCount, setRequiredNoCount] = useState<number>(5);

  const styles = createStyles(theme.colors);

  const hasTeamFeature = hasFeature('teamDashboard');

  const teamsQuery = useQuery({
    queryKey: ['teams', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('No user');
      return getUserTeams();
    },
    enabled: !!user?.id && hasTeamFeature,
  });

  const selectedTeamMembersQuery = useQuery({
    queryKey: ['team-members', selectedTeam?.id],
    queryFn: () => {
      if (!selectedTeam?.id) throw new Error('No team selected');
      return getTeamMembers(selectedTeam.id);
    },
    enabled: !!selectedTeam?.id,
  });

  const selectedTeamTasksQuery = useQuery({
    queryKey: ['team-tasks', selectedTeam?.id],
    queryFn: () => {
      if (!selectedTeam?.id) throw new Error('No team selected');
      return getTeamTasks(selectedTeam.id);
    },
    enabled: !!selectedTeam?.id,
  });

  const selectedTeamAssignmentsQuery = useQuery({
    queryKey: ['team-assignments', selectedTeam?.id],
    queryFn: () => {
      if (!selectedTeam?.id) throw new Error('No team selected');
      return getTeamAssignments(selectedTeam.id);
    },
    enabled: !!selectedTeam?.id,
  });

  const createTeamMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string | null }) =>
      createTeam(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreateModal(false);
      setTeamName('');
      setTeamDescription('');
      Alert.alert('Success', 'Team created successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create team');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: () => {
      if (!selectedTeam?.id) throw new Error('No team selected');
      return createTeamTask(selectedTeam.id, {
        title: taskTitle,
        description: taskDescription || null,
        difficulty: taskDifficulty,
        points: taskDifficulty === 'easy' ? 10 : taskDifficulty === 'medium' ? 20 : taskDifficulty === 'hard' ? 30 : 50,
        xp: taskDifficulty === 'easy' ? 10 : taskDifficulty === 'medium' ? 20 : taskDifficulty === 'hard' ? 30 : 50,
        min_no_required: requiredNoCount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
      setShowCreateTaskModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDifficulty('medium');
      setRequiredNoCount(5);
      Alert.alert('Success', 'Task created successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create task');
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: (teamId: string) => createTeamInvite(teamId),
    onSuccess: (data) => {
      Alert.alert(
        'Invite Created',
        `Share this code: ${data.invite_code}`,
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create invite');
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      const code = inviteCode.trim();
      if (!code) throw new Error('Enter invite code');
      const { acceptTeamInvite } = await import('@/services/supabase/teams');
      return acceptTeamInvite(code);
    },
    onSuccess: () => {
      setShowJoinModal(false);
      setInviteCode('');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      Alert.alert('Joined', 'You have joined the group.');
    },
    onError: (e: any) => {
      Alert.alert('Join failed', e?.message || 'Could not join group');
    }
  });

  if (!hasTeamFeature) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={[theme.colors.backgroundTertiary, theme.colors.background]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Groups</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.lockedContainer}>
          <Crown size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.lockedTitle, { color: theme.colors.text }]}>Team Feature Locked</Text>
          <Text style={[styles.lockedDescription, { color: theme.colors.textSecondary }]}>
            Upgrade to Team or Business subscription to access team management features
          </Text>
          <Pressable
            style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/subscription' as any)}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const teams = teamsQuery.data || [];
  const members = selectedTeamMembersQuery.data || [];
  const tasks = selectedTeamTasksQuery.data || [];
  const assignments = selectedTeamAssignmentsQuery.data || [];

  const isOwnerOrManager = (team: Team | null) => {
    if (!team || !user?.id) return false;
    if (team.owner_id === user.id) return true;
    const member = members.find(m => m.user_id === user.id);
    return member?.role === 'manager';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Groups</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => setShowJoinModal(true)}
            style={[styles.iconButton, { backgroundColor: theme.colors.backgroundSecondary, borderWidth: 1, borderColor: theme.colors.border }]}
          >
            <UserPlus size={20} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setShowCreateModal(true)}
            style={[styles.iconButton, { backgroundColor: theme.colors.primary }]}
          >
            <Plus size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {!selectedTeam ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        >
          {teamsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading groups...</Text>
            </View>
          ) : teams.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Groups Yet</Text>
              <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
                Create your first group to start collaborating
              </Text>
            </View>
          ) : (
            teams.map((team) => (
              <Pressable
                key={team.id}
                onPress={() => setSelectedTeam(team)}
                style={({ pressed }) => [
                  styles.teamCard,
                  { backgroundColor: theme.colors.card, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <View style={styles.teamCardContent}>
                  <View style={[styles.teamAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Users size={24} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.teamName, { color: theme.colors.text }]}>{team.name}</Text>
                    {team.description && (
                      <Text style={[styles.teamDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                        {team.description}
                      </Text>
                    )}
                    {team.owner_id === user?.id && (
                      <View style={[styles.ownerBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                        <Crown size={12} color={theme.colors.warning} />
                        <Text style={[styles.ownerBadgeText, { color: theme.colors.warning }]}>Owner</Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={20} color={theme.colors.textSecondary} />
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.teamHeader, { backgroundColor: theme.colors.card }]}>
            <Pressable onPress={() => setSelectedTeam(null)} style={styles.backButton}>
              <Text style={[styles.backText, { color: theme.colors.primary }]}>← Back</Text>
            </Pressable>
            <Text style={[styles.selectedTeamName, { color: theme.colors.text }]}>{selectedTeam.name}</Text>
            {isOwnerOrManager(selectedTeam) && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => createInviteMutation.mutate(selectedTeam.id)}
                  style={[styles.smallIconButton, { backgroundColor: theme.colors.success + '20' }]}
                >
                  <UserPlus size={16} color={theme.colors.success} />
                </Pressable>
                <Pressable
                  onPress={() => setShowCreateTaskModal(true)}
                  style={[styles.smallIconButton, { backgroundColor: theme.colors.primary + '20' }]}
                >
                  <Plus size={16} color={theme.colors.primary} />
                </Pressable>
              </View>
            )}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
              <View style={styles.sectionHeader}>
                <Users size={20} color={theme.colors.text} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Members ({members.length})</Text>
              </View>
              {selectedTeamMembersQuery.isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                members.map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Text style={[styles.memberAvatarText, { color: theme.colors.primary }]}>
                          {member.user_profile?.username?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.memberName, { color: theme.colors.text }]}>
                          {member.user_profile?.username || 'Unknown'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          {member.role === 'owner' && (
                            <View style={[styles.roleBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                              <Crown size={10} color={theme.colors.warning} />
                              <Text style={[styles.roleBadgeText, { color: theme.colors.warning }]}>Owner</Text>
                            </View>
                          )}
                          {member.role === 'manager' && (
                            <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                              <Shield size={10} color={theme.colors.primary} />
                              <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>Manager</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
              <View style={styles.sectionHeader}>
                <ClipboardCheck size={20} color={theme.colors.text} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>No Tasks ({tasks.length})</Text>
              </View>
              {selectedTeamTasksQuery.isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : tasks.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No tasks yet</Text>
              ) : (
                tasks.map((task) => {
                  const taskAssignments = assignments.filter(a => a.team_task_id === task.id);
                  const myAssignment = taskAssignments.find(a => a.user_id === user?.id);
                  const completedMembers = taskAssignments.filter(a => a.status === 'completed');
                  const inProgressMembers = taskAssignments.filter(a => a.status === 'in_progress');
                  const failedMembers = taskAssignments.filter(a => a.status === 'failed');
                  
                  return (
                    <View key={task.id} style={[styles.taskCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.taskTitle, { color: theme.colors.text }]}>{task.title}</Text>
                            {task.description && (
                              <Text style={[styles.taskDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                                {task.description}
                              </Text>
                            )}
                          </View>
                          {!myAssignment && (
                            <Pressable
                              onPress={async () => {
                                try {
                                  await assignTaskToMember(task.id, user?.id || '');
                                  queryClient.invalidateQueries({ queryKey: ['team-assignments'] });
                                  Alert.alert('Success', 'Task started!');
                                } catch (err: any) {
                                  Alert.alert('Error', err.message || 'Failed to start task');
                                }
                              }}
                              style={[styles.startButton, { backgroundColor: theme.colors.primary }]}
                            >
                              <Play size={14} color="#FFFFFF" />
                              <Text style={styles.startButtonText}>Start</Text>
                            </Pressable>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <View style={[styles.taskBadge, { backgroundColor: getDifficultyColor(task.difficulty) + '20' }]}>
                            <Text style={[styles.taskBadgeText, { color: getDifficultyColor(task.difficulty) }]}>
                              {task.difficulty.toUpperCase()}
                            </Text>
                          </View>
                          <View style={[styles.taskBadge, { backgroundColor: theme.colors.success + '20' }]}>
                            <Text style={[styles.taskBadgeText, { color: theme.colors.success }]}>
                              {task.points} pts
                            </Text>
                          </View>
                          <View style={[styles.taskBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                            <Text style={[styles.taskBadgeText, { color: theme.colors.warning }]}>
                              {task.min_no_required} No&apos;s Required
                            </Text>
                          </View>
                        </View>

                        {myAssignment && (
                          <View style={[styles.myProgressCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                            <Text style={[styles.myProgressTitle, { color: theme.colors.text }]}>Your Progress</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>No&apos;s</Text>
                                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                                  {myAssignment.no_count} / {task.min_no_required}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Yes&apos;s</Text>
                                <Text style={[styles.statValue, { color: theme.colors.error }]}>{myAssignment.yes_count}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Status</Text>
                                <View style={[styles.inlineStatusBadge, { backgroundColor: getStatusColor(myAssignment.status) + '20' }]}>
                                  <Text style={[styles.inlineStatusText, { color: getStatusColor(myAssignment.status) }]}>
                                    {myAssignment.status === 'in_progress' ? 'Active' : myAssignment.status}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            {myAssignment.status === 'assigned' && (
                              <Pressable
                                onPress={async () => {
                                  try {
                                    await updateTeamTaskAssignment(myAssignment.id, {
                                      status: 'in_progress',
                                      started_at: new Date().toISOString(),
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['team-assignments'] });
                                  } catch (err: any) {
                                    Alert.alert('Error', err.message);
                                  }
                                }}
                                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                              >
                                <Text style={styles.actionButtonText}>Start Task</Text>
                              </Pressable>
                            )}
                            {myAssignment.status === 'in_progress' && (
                              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                <Pressable
                                  onPress={async () => {
                                    try {
                                      const newNoCount = myAssignment.no_count + 1;
                                      const updates: any = { no_count: newNoCount };
                                      if (newNoCount >= task.min_no_required) {
                                        updates.status = 'completed';
                                        updates.completed_at = new Date().toISOString();
                                      }
                                      await updateTeamTaskAssignment(myAssignment.id, updates);
                                      queryClient.invalidateQueries({ queryKey: ['team-assignments'] });
                                      if (newNoCount >= task.min_no_required) {
                                        Alert.alert('Completed!', `You earned ${task.points} points!`);
                                      }
                                    } catch (err: any) {
                                      Alert.alert('Error', err.message);
                                    }
                                  }}
                                  style={[styles.countButton, { backgroundColor: theme.colors.success }]}
                                >
                                  <Text style={styles.countButtonText}>Got No</Text>
                                </Pressable>
                                <Pressable
                                  onPress={async () => {
                                    try {
                                      await updateTeamTaskAssignment(myAssignment.id, {
                                        yes_count: myAssignment.yes_count + 1,
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['team-assignments'] });
                                    } catch (err: any) {
                                      Alert.alert('Error', err.message);
                                    }
                                  }}
                                  style={[styles.countButton, { backgroundColor: theme.colors.error }]}
                                >
                                  <Text style={styles.countButtonText}>Got Yes</Text>
                                </Pressable>
                                <Pressable
                                  onPress={async () => {
                                    try {
                                      await updateTeamTaskAssignment(myAssignment.id, {
                                        status: 'failed',
                                        completed_at: new Date().toISOString(),
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['team-assignments'] });
                                    } catch (err: any) {
                                      Alert.alert('Error', err.message);
                                    }
                                  }}
                                  style={[styles.countButton, { backgroundColor: theme.colors.textSecondary }]}
                                >
                                  <Text style={styles.countButtonText}>Give Up</Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                        )}

                        {taskAssignments.length > 0 && (
                          <View style={{ marginTop: 12 }}>
                            <Text style={[styles.memberProgressTitle, { color: theme.colors.text }]}>Team Progress</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                              {completedMembers.length > 0 && (
                                <View style={[styles.progressBadge, { backgroundColor: theme.colors.success + '20' }]}>
                                  <Check size={12} color={theme.colors.success} />
                                  <Text style={[styles.progressBadgeText, { color: theme.colors.success }]}>
                                    {completedMembers.length} Completed
                                  </Text>
                                </View>
                              )}
                              {inProgressMembers.length > 0 && (
                                <View style={[styles.progressBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                                  <Clock size={12} color={theme.colors.warning} />
                                  <Text style={[styles.progressBadgeText, { color: theme.colors.warning }]}>
                                    {inProgressMembers.length} Active
                                  </Text>
                                </View>
                              )}
                              {failedMembers.length > 0 && (
                                <View style={[styles.progressBadge, { backgroundColor: theme.colors.error + '20' }]}>
                                  <XCircle size={12} color={theme.colors.error} />
                                  <Text style={[styles.progressBadgeText, { color: theme.colors.error }]}>
                                    {failedMembers.length} Failed
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color={theme.colors.text} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Progress ({assignments.length})</Text>
              </View>
              {selectedTeamAssignmentsQuery.isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : assignments.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No assignments yet</Text>
              ) : (
                assignments.map((assignment) => (
                  <View key={assignment.id} style={styles.assignmentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.assignmentUser, { color: theme.colors.text }]}>
                        {assignment.user_profile?.username || 'Unknown'}
                      </Text>
                      <Text style={[styles.assignmentTask, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {assignment.team_task?.title || 'Unknown Task'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Text style={[styles.assignmentStat, { color: theme.colors.success }]}>
                          NOs: {assignment.no_count}
                        </Text>
                        <Text style={[styles.assignmentStat, { color: theme.colors.error }]}>
                          YESs: {assignment.yes_count}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(assignment.status) }]}>
                        {assignment.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCreateModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Group</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Group Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text }]}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Enter group name"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text }]}
                value={teamDescription}
                onChangeText={setTeamDescription}
                placeholder="Enter group description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
              />

              <Pressable
                style={[styles.createButton, { backgroundColor: theme.colors.primary, opacity: !teamName ? 0.5 : 1 }]}
                onPress={() => {
                  if (teamName) {
                    createTeamMutation.mutate({ name: teamName, description: teamDescription || null });
                  }
                }}
                disabled={!teamName || createTeamMutation.isPending}
              >
                {createTeamMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create Group</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowJoinModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Join Group</Text>
              <Pressable onPress={() => setShowJoinModal(false)}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Invite Code</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text }]}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="e.g., TEAM-ABCD1234"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="characters"
              />
              <Pressable
                style={[styles.createButton, { backgroundColor: theme.colors.primary, opacity: !inviteCode.trim() ? 0.5 : 1 }]}
                onPress={() => acceptInviteMutation.mutate()}
                disabled={!inviteCode.trim() || acceptInviteMutation.isPending}
              >
                {acceptInviteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Join</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showCreateTaskModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateTaskModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCreateTaskModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Group Task</Text>
              <Pressable onPress={() => setShowCreateTaskModal(false)}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Task Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text }]}
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="e.g., Ask for a discount at coffee shop"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text }]}
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="Provide details about the task"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Required No&apos;s</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => setRequiredNoCount(Math.max(1, requiredNoCount - 1))}
                  style={[styles.counterButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                >
                  <Text style={[styles.counterButtonText, { color: theme.colors.text }]}>-</Text>
                </Pressable>
                <Text style={[styles.counterValue, { color: theme.colors.text }]}>{requiredNoCount}</Text>
                <Pressable
                  onPress={() => setRequiredNoCount(requiredNoCount + 1)}
                  style={[styles.counterButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                >
                  <Text style={[styles.counterButtonText, { color: theme.colors.text }]}>+</Text>
                </Pressable>
              </View>

              <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Difficulty</Text>
              <View style={styles.difficultyButtons}>
                {(['easy', 'medium', 'hard', 'extreme'] as const).map((diff) => (
                  <Pressable
                    key={diff}
                    onPress={() => setTaskDifficulty(diff)}
                    style={[
                      styles.difficultyButton,
                      {
                        backgroundColor: taskDifficulty === diff ? getDifficultyColor(diff) : theme.colors.backgroundSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyButtonText,
                        { color: taskDifficulty === diff ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.createButton, { backgroundColor: theme.colors.primary, opacity: !taskTitle ? 0.5 : 1, marginTop: 24 }]}
                onPress={() => {
                  if (taskTitle) {
                    createTaskMutation.mutate();
                  }
                }}
                disabled={!taskTitle || createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create Task</Text>
                )}
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return '#10B981';
    case 'medium':
      return '#F59E0B';
    case 'hard':
      return '#EF4444';
    case 'extreme':
      return '#8B5CF6';
    default:
      return '#6B7280';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'assigned':
      return '#6B7280';
    case 'in_progress':
      return '#F59E0B';
    case 'completed':
      return '#10B981';
    case 'failed':
      return '#EF4444';
    default:
      return '#6B7280';
  }
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
      paddingVertical: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800' as const,
    },
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      gap: 16,
    },
    lockedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      gap: 16,
    },
    lockedTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      textAlign: 'center',
    },
    lockedDescription: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
    },
    upgradeButton: {
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 16,
      marginTop: 16,
    },
    upgradeButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 40,
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 40,
      gap: 16,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
    },
    emptyDescription: {
      fontSize: 16,
      textAlign: 'center',
    },
    teamCard: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    teamCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    teamAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    teamName: {
      fontSize: 18,
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    teamDescription: {
      fontSize: 14,
      marginBottom: 8,
    },
    ownerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    ownerBadgeText: {
      fontSize: 11,
      fontWeight: '700' as const,
    },
    teamHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      paddingVertical: 8,
    },
    backText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    selectedTeamName: {
      fontSize: 20,
      fontWeight: '700' as const,
      flex: 1,
      textAlign: 'center',
    },
    smallIconButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    section: {
      borderRadius: 16,
      padding: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    memberRow: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberAvatarText: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    memberName: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: '700' as const,
    },
    taskCard: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    taskDescription: {
      fontSize: 14,
    },
    taskBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    taskBadgeText: {
      fontSize: 11,
      fontWeight: '700' as const,
    },
    assignmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    assignmentUser: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    assignmentTask: {
      fontSize: 14,
      marginBottom: 4,
    },
    assignmentStat: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700' as const,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    modalBody: {
      paddingTop: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    input: {
      padding: 16,
      borderRadius: 12,
      fontSize: 16,
    },
    textArea: {
      padding: 16,
      borderRadius: 12,
      fontSize: 16,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    createButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 24,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    difficultyButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    difficultyButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    difficultyButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    counterButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    counterButtonText: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    counterValue: {
      fontSize: 24,
      fontWeight: '700' as const,
      minWidth: 40,
      textAlign: 'center',
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    startButtonText: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    myProgressCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    myProgressTitle: {
      fontSize: 14,
      fontWeight: '700' as const,
    },
    statLabel: {
      fontSize: 11,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    inlineStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    inlineStatusText: {
      fontSize: 11,
      fontWeight: '700' as const,
    },
    actionButton: {
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    countButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    countButtonText: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    memberProgressTitle: {
      fontSize: 13,
      fontWeight: '700' as const,
    },
    progressBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    progressBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
  });
}
