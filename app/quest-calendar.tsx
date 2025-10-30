import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { Calendar } from 'lucide-react-native';
import { useMemo, useState } from 'react';

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  hasQuest: boolean;
  questCount: number;
  isToday: boolean;
};

export default function QuestCalendarScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { quests } = useGame();
  const [currentDate, setCurrentDate] = useState(new Date());

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
      days.push({
        date,
        isCurrentMonth: false,
        hasQuest: !!completedQuestsByDate[dateKey],
        questCount: completedQuestsByDate[dateKey] || 0,
        isToday: false,
      });
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toLocaleDateString('en-CA');
      const isToday = date.getTime() === today.getTime();
      
      days.push({
        date,
        isCurrentMonth: true,
        hasQuest: !!completedQuestsByDate[dateKey],
        questCount: completedQuestsByDate[dateKey] || 0,
        isToday,
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateKey = date.toLocaleDateString('en-CA');
      days.push({
        date,
        isCurrentMonth: false,
        hasQuest: !!completedQuestsByDate[dateKey],
        questCount: completedQuestsByDate[dateKey] || 0,
        isToday: false,
      });
    }
    
    return days;
  }, [currentDate, completedQuestsByDate]);

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
                style={({ pressed }) => [
                  styles.dayCell,
                  !day.isCurrentMonth && styles.dayCellInactive,
                  day.isToday && styles.dayCellToday,
                  day.hasQuest && styles.dayCellWithQuest,
                  pressed && styles.dayCellPressed,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.dayTextInactive,
                    day.isToday && styles.dayTextToday,
                    day.hasQuest && styles.dayTextWithQuest,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {day.hasQuest && (
                  <View style={styles.questIndicator}>
                    <Text style={styles.questCount}>{day.questCount}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={styles.legendText}>Quest Completed</Text>
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
      fontSize: 12,
      color: theme.colors.textSecondary,
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
