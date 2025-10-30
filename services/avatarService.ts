import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function uploadAvatar(userId: string, imageUri: string): Promise<string> {
  try {
    console.log('📤 Uploading avatar for user:', userId);

    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    let fileData: Blob | ArrayBuffer;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      fileData = await response.blob();
    } else {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      fileData = blob;
    }

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileData, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('✅ Avatar uploaded:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('💥 Upload avatar exception:', error);
    throw error;
  }
}

export async function pickImage(): Promise<string | null> {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      throw new Error('Permission to access media library is required');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('💥 Pick image exception:', error);
    throw error;
  }
}

export async function takePhoto(): Promise<string | null> {
  try {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      throw new Error('Permission to access camera is required');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('💥 Take photo exception:', error);
    throw error;
  }
}

export async function generateAIAvatar(prompt: string): Promise<string> {
  try {
    console.log('🎨 Generating AI avatar with prompt:', prompt);

    const response = await fetch('https://toolkit.rork.com/images/generate/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Professional avatar profile picture: ${prompt}. Centered portrait, clean background, high quality, photorealistic style`,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate AI avatar');
    }

    const data = await response.json();
    const base64Image = `data:${data.image.mimeType};base64,${data.image.base64Data}`;

    console.log('✅ AI avatar generated');
    return base64Image;
  } catch (error) {
    console.error('💥 Generate AI avatar exception:', error);
    throw error;
  }
}
