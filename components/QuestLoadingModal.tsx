import { View, Text, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Sparkles, Zap, Flame, Star } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

interface QuestLoadingModalProps {
  visible: boolean;
}

export function QuestLoadingModal({ visible }: QuestLoadingModalProps) {
  const { theme } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 0.7,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(progressAnim, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      spinAnim.setValue(0);
      pulseAnim.setValue(1);
      floatAnim.setValue(0);
      progressAnim.setValue(0.3);
    }
  }, [visible, spinAnim, pulseAnim, floatAnim, progressAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const styles = createStyles(theme.colors);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={[`${theme.colors.primary}15`, `${theme.colors.secondary}15`]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <Animated.View
            style={[
              styles.iconContainer,
              { 
                backgroundColor: `${theme.colors.primary}20`,
                transform: [{ rotate: spin }, { scale: pulseAnim }],
              },
            ]}
          >
            <Sparkles size={48} color={theme.colors.primary} />
          </Animated.View>

          <View style={styles.orbitsContainer}>
            <Animated.View
              style={[
                styles.orbitIcon,
                styles.orbit1,
                { transform: [{ translateY: floatAnim }] },
              ]}
            >
              <Zap size={20} color={theme.colors.secondary} />
            </Animated.View>

            <Animated.View
              style={[
                styles.orbitIcon,
                styles.orbit2,
                { 
                  transform: [
                    { rotate: spin },
                    { translateX: 60 },
                    { rotate: spinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-360deg'],
                    }) },
                  ],
                },
              ]}
            >
              <Flame size={20} color="#FF6B35" />
            </Animated.View>

            <Animated.View
              style={[
                styles.orbitIcon,
                styles.orbit3,
                { 
                  transform: [
                    { rotate: spinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-360deg'],
                    }) },
                    { translateX: 60 },
                    { rotate: spin },
                  ],
                },
              ]}
            >
              <Star size={20} color="#F59E0B" />
            </Animated.View>
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Generating Quest
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Ben is crafting your challenge...
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                { 
                  backgroundColor: theme.colors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0.3, 0.7],
                    outputRange: ['30%', '70%'],
                  }),
                },
              ]}
            />
          </View>

          <View style={styles.tipsContainer}>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              💡 Every &ldquo;no&rdquo; builds your resilience
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    content: {
      borderRadius: 32,
      padding: 32,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      overflow: 'hidden',
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    orbitsContainer: {
      position: 'absolute' as const,
      top: '30%',
      width: 200,
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    orbitIcon: {
      position: 'absolute' as const,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    orbit1: {
      top: -10,
    },
    orbit2: {
      right: -30,
    },
    orbit3: {
      left: -30,
    },
    textContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '800' as const,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
    },
    progressContainer: {
      width: '100%',
      height: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 20,
    },
    progressBar: {
      height: '100%',
      borderRadius: 3,
    },
    tipsContainer: {
      alignItems: 'center',
    },
    tipText: {
      fontSize: 14,
      textAlign: 'center',
      fontStyle: 'italic' as const,
    },
  });
}
