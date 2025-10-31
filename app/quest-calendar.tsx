import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { Calendar, ArrowLeft, X, Plus, MapPin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import * as Location from 'expo-location';

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  hasQuest: boolean;
  questCount: number;
  isToday: boolean;
  plannedQuests: PlannedQuest[];
};

type PlannedQuest = {
  id: string;
  title: string;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  plannedDate: Date;
};

export default function QuestCalendarScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { quests, addCustomQuest } = useGame();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannedQuests, setPlannedQuests] = useState<PlannedQuest[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [questTitle, setQuestTitle] = useState('');
  const [questDescription, setQuestDescription] = useState('');
  const [questLocation, setQuestLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);
  const [showDateQuests, setShowDateQuests] = useState(false);

  const completedQuestsByDate = useMemo(() => {
    const questMap: Record<string, number> = {};
    
    quests
      .filter(q => q.completed && q.completedAt)
      .forEach(quest => {
        const dateKey = new Date(quest.completedAt!).toLocaleDateString('en-CA');
        questMap[dateKey] = (questMap[dateKey] || 0) + 1;
      });
    
    return questMap;
  }, [quests]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < startDay; i++) {
      const date = new Date(year, month, -startDay + i + 1);
      const dateKey = date.toLocaleDateString('en-CA');
      const datePlannedQuests = plannedQuests.filter(pq => 
        pq.plannedDate.toLocaleDateString('en-CA') === dateKey
      );
      days.push({
        date,
        isCurrentMonth: false,
        hasQuest: !!completedQuestsByDate[dateKey],
        questCount: completedQuestsByDate[dateKey] || 0,
        isToday: false,
        plannedQuests: datePlannedQuests,
      });
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toLocaleDateString('en-CA');
      const isToday = date.getTime() === today.getTime();
      const datePlannedQuests = plannedQuests.filter(pq => 
        pq.plannedDate.toLocaleDateString('en-CA') === dateKey
      );
      
      days.push({
        date,
        isCurrentMonth: true,
        hasQuest: !!completedQuestsByDate[dateKey],
        questCount: completedQuestsByDate[dateKey] || 0,
        isToday,
        plannedQuests: datePlannedQuests,
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateKey = date.toLocaleDateString('en-CA');
      const datePlannedQuests = plannedQuests.filter(pq => 
        pq.plannedDate.toLocaleDateString('en-CA') === dateKey
      );
      days.push({
        date,
        isCurrentMonth: false,
        hasQuest: !!completedQuestsByDate[dateKey],
        questCount: completedQuestsByDate[dateKey] || 0,
        isToday: false,
        plannedQuests: datePlannedQuests,
      });
    }
    
    return days;
  }, [currentDate, completedQuestsByDate, plannedQuests]);

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDayPress = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.date);
      if (day.plannedQuests.length > 0) {
        setShowDateQuests(true);
      } else {
        setModalVisible(true);
      }
    }
  };

  const handleAddLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to add quest locations');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setQuestLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0] ? `${address[0].street}, ${address[0].city}` : undefined,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location');
    }
  };

  const handleSaveQuest = () => {
    if (!questTitle.trim() || !selectedDate) {
      Alert.alert('Error', 'Please enter a quest title');
      return;
    }

    const newPlannedQuest: PlannedQuest = {
      id: Date.now().toString(),
      title: questTitle,
      description: questDescription,
      location: questLocation || undefined,
      plannedDate: selectedDate,
    };

    setPlannedQuests([...plannedQuests, newPlannedQuest]);
    setModalVisible(false);
    setQuestTitle('');
    setQuestDescription('');
    setQuestLocation(null);
  };

  const handleCreateQuest = (plannedQuest: PlannedQuest) => {
    try {
      addCustomQuest({
        title: plannedQuest.title,
        description: plannedQuest.description,
        minNoRequired: 3,
      });

      setPlannedQuests(plannedQuests.filter(pq => pq.id !== plannedQuest.id));
      setShowDateQuests(false);
      Alert.alert('Success', 'Quest added to your quest list!');
    } catch (error) {
      console.error('Error creating quest:', error);
      Alert.alert('Error', 'Failed to create quest');
    }
  };

  const handleDeletePlannedQuest = (id: string) => {
    setPlannedQuests(plannedQuests.filter(pq => pq.id !== id));
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const totalCompletedQuests = Object.values(completedQuestsByDate).reduce((sum, count) => sum + count, 0);
  const currentMonthQuests = calendarDays
    .filter(day => day.isCurrentMonth && day.hasQuest)
    .reduce((sum, day) => sum + day.questCount, 0);
  const currentStreak = quests.filter(q => q.completed).length > 0 ? 
    Math.max(...quests.filter(q => q.completed).map(q => 1)) : 0;

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Quest Calendar',
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700' as const,
          },
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ([
                { padding: 8, opacity: pressed ? 0.6 : 1 }
              ])}
            >
              <ArrowLeft size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Calendar size={40} color={theme.colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Quest History Calendar</Text>
          <Text style={styles.subtitle}>Track your conquest journey</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCompletedQuests}</Text>
            <Text style={styles.statLabel}>Total Quests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{currentMonthQuests}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() => changeMonth('prev')}
              style={({ pressed }) => [
                styles.monthButton,
                pressed && styles.monthButtonPressed
              ]}
            >
              <Text style={styles.monthButtonText}>←</Text>
            </Pressable>
            
            <Text style={styles.monthName}>{monthName}</Text>
            
            <Pressable
              onPress={() => changeMonth('next')}
              style={({ pressed }) => [
                styles.monthButton,
                pressed && styles.monthButtonPressed
              ]}
            >
              <Text style={styles.monthButtonText}>→</Text>
            </Pressable>
          </View>

          <View style={styles.weekDaysContainer}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <View key={index} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((day, index) => (
              <Pressable
                key={index}
                onPress={() => handleDayPress(day)}
                style={({ pressed }) => [
                  styles.dayCell,
                  !day.isCurrentMonth && styles.dayCellInactive,
                  day.isToday && styles.dayCellToday,
                  day.hasQuest && styles.dayCellWithQuest,
                  day.plannedQuests.length > 0 && styles.dayCellWithPlanned,
                  pressed && styles.dayCellPressed,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.dayTextInactive,
                    day.isToday && styles.dayTextToday,
                    day.hasQuest && styles.dayTextWithQuest,
                    day.plannedQuests.length > 0 && styles.dayTextWithPlanned,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {day.hasQuest && (
                  <View style={styles.questIndicator}>
                    <Text style={styles.questCount}>{day.questCount}</Text>
                  </View>
                )}
                {day.plannedQuests.length > 0 && (
                  <View style={styles.plannedIndicator}>
                    <Text style={styles.plannedCount}>{day.plannedQuests.length}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#9333ea' }]} />
              <Text style={styles.legendText}>Planned</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Pro Tip</Text>
          <Text style={styles.tipsText}>
            Keep your quest streak alive! Complete at least one quest every day to build momentum and unlock special achievements.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plan Quest for {selectedDate?.toLocaleDateString()}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Quest Title *</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={questTitle}
                onChangeText={setQuestTitle}
                placeholder="Enter quest title"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={questDescription}
                onChangeText={setQuestDescription}
                placeholder="Enter quest description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.locationButton,
                  { backgroundColor: questLocation ? theme.colors.success + '20' : theme.colors.primary + '20' },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleAddLocation}
              >
                <MapPin size={20} color={questLocation ? theme.colors.success : theme.colors.primary} />
                <Text style={[styles.locationButtonText, { color: questLocation ? theme.colors.success : theme.colors.primary }]}>
                  {questLocation ? `Location Added: ${questLocation.address || 'Coordinates saved'}` : 'Add Location'}
                </Text>
              </Pressable>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.button, styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveQuest}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>Save Quest</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDateQuests}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDateQuests(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Planned Quests - {selectedDate?.toLocaleDateString()}</Text>
              <Pressable onPress={() => setShowDateQuests(false)}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedDate && calendarDays
                .find(d => d.date.toLocaleDateString('en-CA') === selectedDate.toLocaleDateString('en-CA'))
                ?.plannedQuests.map((pq) => (
                  <View key={pq.id} style={[styles.questCard, { borderColor: theme.colors.border }]}>
                    <View style={styles.questCardHeader}>
                      <Text style={styles.questCardTitle}>{pq.title}</Text>
                      <Pressable onPress={() => handleDeletePlannedQuest(pq.id)}>
                        <X size={20} color={theme.colors.error} />
                      </Pressable>
                    </View>
                    {pq.description && (
                      <Text style={styles.questCardDescription}>{pq.description}</Text>
                    )}
                    {pq.location && (
                      <View style={styles.questCardLocation}>
                        <MapPin size={14} color={theme.colors.success} />
                        <Text style={styles.questCardLocationText}>
                          {pq.location.address || `${pq.location.latitude.toFixed(4)}, ${pq.location.longitude.toFixed(4)}`}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      style={[styles.createQuestButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => handleCreateQuest(pq)}
                    >
                      <Plus size={16} color="#fff" />
                      <Text style={styles.createQuestButtonText}>Create Quest Now</Text>
                    </Pressable>
                  </View>
                ))}
              <Pressable
                style={[styles.addMoreButton, { borderColor: theme.colors.primary }]}
                onPress={() => {
                  setShowDateQuests(false);
                  setModalVisible(true);
                }}
              >
                <Plus size={20} color={theme.colors.primary} />
                <Text style={[styles.addMoreButtonText, { color: theme.colors.primary }]}>Add Another Quest</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 26,
      fontWeight: '800' as const,
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: theme.colors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600' as const,
      textAlign: 'center',
    },
    calendarCard: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 20,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    monthButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    monthButtonPressed: {
      backgroundColor: theme.colors.primary + '20',
    },
    monthButtonText: {
      fontSize: 20,
      color: theme.colors.text,
      fontWeight: '700' as const,
    },
    monthName: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: theme.colors.text,
    },
    weekDaysContainer: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    weekDayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
    },
    weekDayText: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: theme.colors.textSecondary,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
      position: 'relative',
    },
    dayCellInactive: {
      opacity: 0.3,
    },
    dayCellToday: {
      backgroundColor: theme.colors.success + '20',
      borderRadius: 12,
    },
    dayCellWithQuest: {
      backgroundColor: theme.colors.primary + '20',
      borderRadius: 12,
    },
    dayCellPressed: {
      opacity: 0.6,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: theme.colors.text,
    },
    dayTextInactive: {
      color: theme.colors.textSecondary,
    },
    dayTextToday: {
      color: theme.colors.success,
      fontWeight: '800' as const,
    },
    dayTextWithQuest: {
      color: theme.colors.primary,
      fontWeight: '800' as const,
    },
    questIndicator: {
      position: 'absolute',
      bottom: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    questCount: {
      fontSize: 10,
      fontWeight: '800' as const,
      color: '#fff',
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 24,
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    legendText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '600' as const,
    },
    dayCellWithPlanned: {
      backgroundColor: '#9333ea20',
      borderRadius: 12,
    },
    dayTextWithPlanned: {
      color: '#9333ea',
      fontWeight: '800' as const,
    },
    plannedIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: '#9333ea',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    plannedCount: {
      fontSize: 10,
      fontWeight: '800' as const,
      color: '#fff',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: theme.colors.text,
      flex: 1,
    },
    modalBody: {
      padding: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: theme.colors.text,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      backgroundColor: theme.colors.background,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 12,
      marginTop: 16,
    },
    locationButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    button: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    saveButton: {},
    buttonText: {
      fontSize: 14,
      fontWeight: '700' as const,
    },
    questCard: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    questCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    questCardTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: theme.colors.text,
      flex: 1,
    },
    questCardDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    questCardLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    questCardLocationText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: '600' as const,
    },
    createQuestButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 10,
      borderRadius: 10,
    },
    createQuestButtonText: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: '#fff',
    },
    addMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      marginTop: 8,
    },
    addMoreButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    tipsCard: {
      backgroundColor: theme.colors.primary + '10',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    tipsTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: theme.colors.text,
      marginBottom: 8,
    },
    tipsText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
  });
}
