import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Crown, Users, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const { tier, getTierBenefits, getPricing } = useSubscription();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const styles = createStyles(theme.colors);

  const handleSubscribe = (selectedTier: 'pro' | 'hero' | 'team') => {
    console.log(`Subscribing to ${selectedTier} - ${billingPeriod}`);
  };

  const tiers = [
    {
      id: 'pro' as const,
      name: 'Pro',
      icon: Zap,
      color: theme.colors.warning,
      description: 'Perfect for individuals',
      popular: false,
    },
    {
      id: 'hero' as const,
      name: 'Hero Mode',
      icon: Crown,
      color: theme.colors.error,
      description: 'For serious growth',
      popular: true,
    },
    {
      id: 'team' as const,
      name: 'Team',
      icon: Users,
      color: theme.colors.primary,
      description: 'For groups & organizations',
      popular: false,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Upgrade</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.billingToggle}>
        <Pressable
          onPress={() => setBillingPeriod('monthly')}
          style={[
            styles.billingButton,
            billingPeriod === 'monthly'
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.backgroundSecondary },
          ]}
        >
          <Text
            style={[
              styles.billingButtonText,
              billingPeriod === 'monthly'
                ? { color: '#FFFFFF' }
                : { color: theme.colors.textSecondary },
            ]}
          >
            Monthly
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setBillingPeriod('yearly')}
          style={[
            styles.billingButton,
            billingPeriod === 'yearly'
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.backgroundSecondary },
          ]}
        >
          <Text
            style={[
              styles.billingButtonText,
              billingPeriod === 'yearly'
                ? { color: '#FFFFFF' }
                : { color: theme.colors.textSecondary },
            ]}
          >
            Yearly
          </Text>
          {billingPeriod === 'yearly' && (
            <View style={[styles.saveBadge, { backgroundColor: theme.colors.success }]}>
              <Text style={styles.saveBadgeText}>Save 16%</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={[styles.currentTierCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.currentTierLabel, { color: theme.colors.textSecondary }]}>
            Current Plan
          </Text>
          <Text style={[styles.currentTierName, { color: theme.colors.text }]}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Text>
        </View>

        {tiers.map((tierOption) => {
          const pricing = getPricing(tierOption.id);
          const price = billingPeriod === 'monthly' ? pricing.monthly : pricing.yearly;
          const benefits = getTierBenefits(tierOption.id);
          const Icon = tierOption.icon;

          return (
            <View key={tierOption.id} style={[styles.tierCard, { backgroundColor: theme.colors.card }]}>
              {tierOption.popular && (
                <View style={[styles.popularBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.tierHeader}>
                <View style={[styles.tierIconContainer, { backgroundColor: tierOption.color + '20' }]}>
                  <Icon size={32} color={tierOption.color} />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, { color: theme.colors.text }]}>{tierOption.name}</Text>
                  <Text style={[styles.tierDescription, { color: theme.colors.textSecondary }]}>
                    {tierOption.description}
                  </Text>
                </View>
              </View>

              <View style={styles.priceContainer}>
                <Text style={[styles.priceAmount, { color: theme.colors.text }]}>
                  ${price}
                </Text>
                <Text style={[styles.pricePeriod, { color: theme.colors.textSecondary }]}>
                  /{billingPeriod === 'monthly' ? 'month' : 'year'}
                </Text>
              </View>

              <View style={styles.benefitsList}>
                {benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <View style={[styles.checkIcon, { backgroundColor: theme.colors.success + '20' }]}>
                      <Check size={16} color={theme.colors.success} />
                    </View>
                    <Text style={[styles.benefitText, { color: theme.colors.text }]}>{benefit}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => handleSubscribe(tierOption.id)}
                style={[
                  styles.subscribeButton,
                  tierOption.popular
                    ? { backgroundColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.backgroundSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.subscribeButtonText,
                    tierOption.popular
                      ? { color: '#FFFFFF' }
                      : { color: theme.colors.text },
                  ]}
                >
                  {tier === tierOption.id ? 'Current Plan' : 'Upgrade'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        <Text style={[styles.disclaimer, { color: theme.colors.textSecondary }]}>
          All subscriptions auto-renew. Cancel anytime.
        </Text>
      </ScrollView>
    </View>
  );
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
    billingToggle: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 20,
    },
    billingButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    billingButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    saveBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    saveBadgeText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      gap: 20,
    },
    currentTierCard: {
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
    },
    currentTierLabel: {
      fontSize: 14,
      marginBottom: 8,
    },
    currentTierName: {
      fontSize: 24,
      fontWeight: '700' as const,
    },
    tierCard: {
      padding: 24,
      borderRadius: 24,
      position: 'relative',
    },
    popularBadge: {
      position: 'absolute',
      top: -12,
      left: 24,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 12,
    },
    popularBadgeText: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    tierHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
      marginTop: 12,
    },
    tierIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tierInfo: {
      flex: 1,
    },
    tierName: {
      fontSize: 24,
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    tierDescription: {
      fontSize: 14,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 20,
    },
    priceAmount: {
      fontSize: 40,
      fontWeight: '800' as const,
    },
    pricePeriod: {
      fontSize: 16,
      marginLeft: 4,
    },
    benefitsList: {
      gap: 12,
      marginBottom: 24,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    benefitText: {
      fontSize: 16,
      flex: 1,
    },
    subscribeButton: {
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subscribeButtonText: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    disclaimer: {
      fontSize: 12,
      textAlign: 'center',
      paddingVertical: 16,
    },
  });
}
