import { Image, View, Text, type ImageStyle, type StyleProp } from 'react-native';
import React from "react";

interface SafeImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  fallback?: React.ReactNode;
}

export function SafeImage({ uri, style, fallback }: SafeImageProps) {
  const clean = uri?.trim();
  if (!clean) {
    return (fallback ?? null) as any;
  }
  return <Image source={{ uri: clean }} style={style} />;
}

interface AvatarProps {
  name?: string;
  imageUrl?: string | null;
  size?: number;
}

export function Avatar({ name = '', imageUrl, size = 40 }: AvatarProps) {
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
