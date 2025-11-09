import { View, Text, type ImageStyle, type StyleProp } from 'react-native';
import React, { useState } from 'react';
import { Image as ExpoImage } from 'expo-image';

interface SafeImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  fallback?: React.ReactNode;
  testID?: string;
}

export function SafeImage({ uri, style, fallback, testID }: SafeImageProps) {
  const [loadError, setLoadError] = useState(false);
  
  // Extremely defensive URI validation
  if (!uri || typeof uri !== 'string') {
    return (fallback ?? null) as any;
  }
  
  const clean = uri.trim();
  
  // Check for empty or invalid URI
  if (clean.length === 0 || loadError) {
    return (fallback ?? null) as any;
  }
  
  // Additional validation: check if it looks like a valid URL
  const isValidUrl = clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('file://');
  if (!isValidUrl) {
    // Silently return fallback for invalid URIs (don't spam console)
    return (fallback ?? null) as any;
  }
  
  return (
    <ExpoImage
      testID={testID}
      source={{ uri: clean }}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={200}
      onError={() => {
        setLoadError(true);
      }}
      placeholder={{ blurhash: 'L6PZfSjE.AyE_3t7t7R**0o#DgR4' }}
    />
  );
}

interface AvatarProps {
  name?: string;
  imageUrl?: string | null;
  size?: number;
  testID?: string;
}

export function Avatar({ name = '', imageUrl, size = 40, testID }: AvatarProps) {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || '🙂';

  return (
    <SafeImage
      uri={imageUrl}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      testID={testID}
      fallback={
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
          }}
        >
          <Text style={{ fontWeight: '600', fontSize: size * 0.4 }}>{initials}</Text>
        </View>
      }
    />
  );
}
