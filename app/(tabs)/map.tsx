import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, TextInput, ScrollView, Modal, Linking, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Menu, Share2, Search, MapPin, Plus, Navigation, X, Sparkles, RefreshCw, List } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { addPlaceToQueue, getPlaceQueue, removePlaceFromQueue } from '@/services/supabase/map';
import { generateText } from '@rork/toolkit-sdk';
import type { Quest } from '@/types';
import OpenAI from 'openai';
import { QuestLoadingModal } from '@/components/QuestLoadingModal';


const GOOGLE_PLACES_API_KEY = 'AIzaSyCHMHlOrPPSRULrUf-FqPWHz0Y6PJoPrRk';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

interface Place {
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
}

interface AIGeneratedQuest extends Quest {
  latitude: number;
  longitude: number;
  placeName: string;
  placeAddress?: string;
}

export default function MapScreen() {
  const { theme } = useTheme();
  const { quests, addCustomQuest } = useGame();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(false);
  const [isGeneratingQuest, setIsGeneratingQuest] = useState<boolean>(false);
  const [aiGeneratedQuests, setAiGeneratedQuests] = useState<AIGeneratedQuest[]>([]);
  const [isGeneratingAIQuests, setIsGeneratingAIQuests] = useState<boolean>(false);
  const [selectedQuest, setSelectedQuest] = useState<AIGeneratedQuest | null>(null);
  const [showQuestQueueModal, setShowQuestQueueModal] = useState<boolean>(false);

  const styles = createStyles(theme.colors);

  const completedQuests = quests.filter((q) => q.completed && q.location);
  const totalRejections = completedQuests.length;
  const activeQuest = quests.find(q => !q.completed && (q.source === 'user' || q.source === 'ai'));

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          setUserLocation({
            latitude: 37.78825,
            longitude: -122.4324,
          });
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Location error:', error);
        setUserLocation({
          latitude: 37.78825,
          longitude: -122.4324,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (userLocation && aiGeneratedQuests.length === 0 && !isGeneratingAIQuests) {
      generateAIQuests();
    }
  }, [userLocation]);

  const loadQueue = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingQueue(true);
      const queue = await getPlaceQueue(user.id);
      const sortedQueue = queue.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setQueueItems(sortedQueue);
      console.log('Loaded queue:', sortedQueue.length, 'items');
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadQueue();
    }
  }, [user?.id, loadQueue]);

  const generateAIQuests = async () => {
    if (!userLocation) return;

    setIsGeneratingAIQuests(true);
    console.log('Generating 20-30 varied AI quests within 10 mile radius...');

    try {
      const radius10mi = 16093;
      const radius20mi = 32186;
      const base = `${userLocation.latitude},${userLocation.longitude}`;

      const typeQueries: { url: string; kind: string }[] = [
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=cafe&key=${GOOGLE_PLACES_API_KEY}`, kind: 'coffee' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=restaurant&key=${GOOGLE_PLACES_API_KEY}`, kind: 'restaurant' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=meal_takeaway&key=${GOOGLE_PLACES_API_KEY}`, kind: 'fast_food' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=bar&key=${GOOGLE_PLACES_API_KEY}`, kind: 'bar' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=convenience_store&key=${GOOGLE_PLACES_API_KEY}`, kind: 'convenience' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=gas_station&key=${GOOGLE_PLACES_API_KEY}`, kind: 'gas' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=supermarket&key=${GOOGLE_PLACES_API_KEY}`, kind: 'supermarket' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=shopping_mall&key=${GOOGLE_PLACES_API_KEY}`, kind: 'mall' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=clothing_store&key=${GOOGLE_PLACES_API_KEY}`, kind: 'clothing' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=gym&key=${GOOGLE_PLACES_API_KEY}`, kind: 'gym' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=yoga%20studio&key=${GOOGLE_PLACES_API_KEY}`, kind: 'yoga' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=park&key=${GOOGLE_PLACES_API_KEY}`, kind: 'park' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=playground&key=${GOOGLE_PLACES_API_KEY}`, kind: 'playground' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=dog%20park&key=${GOOGLE_PLACES_API_KEY}`, kind: 'dog_park' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=beach&key=${GOOGLE_PLACES_API_KEY}`, kind: 'beach' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=lake&key=${GOOGLE_PLACES_API_KEY}`, kind: 'lake' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=riverwalk&key=${GOOGLE_PLACES_API_KEY}`, kind: 'riverwalk' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=community_center&key=${GOOGLE_PLACES_API_KEY}`, kind: 'community_center' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=library&key=${GOOGLE_PLACES_API_KEY}`, kind: 'library' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=book_store&key=${GOOGLE_PLACES_API_KEY}`, kind: 'bookstore' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=university&key=${GOOGLE_PLACES_API_KEY}`, kind: 'campus' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=convention%20center&key=${GOOGLE_PLACES_API_KEY}`, kind: 'events' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=festival&key=${GOOGLE_PLACES_API_KEY}`, kind: 'festival' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=farmers%20market&key=${GOOGLE_PLACES_API_KEY}`, kind: 'farmers_market' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=flea%20market&key=${GOOGLE_PLACES_API_KEY}`, kind: 'flea_market' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=movie_theater&key=${GOOGLE_PLACES_API_KEY}`, kind: 'cinema' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=live%20music&key=${GOOGLE_PLACES_API_KEY}`, kind: 'music' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=open%20mic&key=${GOOGLE_PLACES_API_KEY}`, kind: 'open_mic' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=comedy%20club&key=${GOOGLE_PLACES_API_KEY}`, kind: 'comedy' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=museum&key=${GOOGLE_PLACES_API_KEY}`, kind: 'museum' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=art_gallery&key=${GOOGLE_PLACES_API_KEY}`, kind: 'art' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=food%20truck&key=${GOOGLE_PLACES_API_KEY}`, kind: 'food_truck' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=bakery&key=${GOOGLE_PLACES_API_KEY}`, kind: 'bakery' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=ice%20cream&key=${GOOGLE_PLACES_API_KEY}`, kind: 'ice_cream' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=hair_care&key=${GOOGLE_PLACES_API_KEY}`, kind: 'hair' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=beauty_salon&key=${GOOGLE_PLACES_API_KEY}`, kind: 'salon' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=pharmacy&key=${GOOGLE_PLACES_API_KEY}`, kind: 'pharmacy' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=tourist_attraction&key=${GOOGLE_PLACES_API_KEY}`, kind: 'attraction' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=bus_station&key=${GOOGLE_PLACES_API_KEY}`, kind: 'bus' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=subway_station&key=${GOOGLE_PLACES_API_KEY}`, kind: 'subway' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=train_station&key=${GOOGLE_PLACES_API_KEY}`, kind: 'train' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=basketball%20court&key=${GOOGLE_PLACES_API_KEY}`, kind: 'basketball' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=skatepark&key=${GOOGLE_PLACES_API_KEY}`, kind: 'skatepark' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=pet_store&key=${GOOGLE_PLACES_API_KEY}`, kind: 'pet_store' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=hardware_store&key=${GOOGLE_PLACES_API_KEY}`, kind: 'hardware' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=home_goods_store&key=${GOOGLE_PLACES_API_KEY}`, kind: 'home_goods' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&type=lodging&key=${GOOGLE_PLACES_API_KEY}`, kind: 'hotel' },
        { url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${base}&radius=${radius10mi}&keyword=coworking&key=${GOOGLE_PLACES_API_KEY}`, kind: 'coworking' },
      ];

      const fetchBatch = async (queries: { url: string; kind: string }[]) => {
        const results = await Promise.all(
          queries.map(async (q) => {
            try {
              const res = await fetch(q.url);
              const json = await res.json();
              const items = Array.isArray(json.results) ? json.results : [];
              console.log(`Fetched ${items.length} places for ${q.kind}`);
              return items.map((p: any) => ({ ...p, __kind: q.kind }));
            } catch (e) {
              console.log('Places fetch error for', q.kind, e);
              return [] as any[];
            }
          })
        );
        return results.flat();
      };

      let allPlaces: any[] = await fetchBatch(typeQueries);

      if (allPlaces.length < 20) {
        console.log('Less than 20 places found in 10mi, expanding search to ~20mi...');
        const expandedQueries = typeQueries.map((q) => ({ ...q, url: q.url.replace(`${radius10mi}`, `${radius20mi}`) }));
        const more = await fetchBatch(expandedQueries);
        allPlaces = [...allPlaces, ...more];
      }

      const dedupedMap = new Map<string, any>();
      for (const p of allPlaces) {
        const id = p.place_id as string | undefined;
        if (!id) continue;
        if (!dedupedMap.has(id)) dedupedMap.set(id, p);
      }
      const deduped = Array.from(dedupedMap.values()) as any[];

      if (deduped.length === 0) {
        console.log('No nearby places found');
        setIsGeneratingAIQuests(false);
        return;
      }

      const shuffled = deduped
        .map((p) => ({ p, r: Math.random() }))
        .sort((a, b) => a.r - b.r)
        .map(({ p }) => p);

      const targetCount = Math.min(30, Math.max(20, shuffled.length));
      const chosen = shuffled.slice(0, targetCount);

      const generatedQuests: AIGeneratedQuest[] = [];

      for (let i = 0; i < chosen.length; i++) {
        const place = chosen[i] as any;
        try {
          const primaryType = (place.types && place.types[0]) ? place.types[0] : (place.__kind || 'place');
          const themeHint =
            primaryType.includes('cafe') || primaryType === 'restaurant' ? 'coffee shop vibes'
            : primaryType === 'park' ? 'outdoor, friendly, nature'
            : primaryType === 'museum' || primaryType === 'art_gallery' ? 'culture, exhibits, curiosities'
            : primaryType === 'lodging' ? 'hotel lobby, concierge'
            : ['beach','lake','natural_feature','pier'].some(k => (place.__kind || '').includes(k) || primaryType.includes(k)) ? 'beach or waterfront, playful'
            : primaryType === 'library' ? 'quiet, respectful, low volume'
            : 'public place';

          const questPrompt = `Create a unique rejection-therapy quest at: "${place.name}".
Type: ${primaryType} (${themeHint}).
Constraints:
- Must involve asking strangers or staff something likely to be rejected
- Keep it social, safe, and respectful
- Tailor to this place context
Examples (style guide):
- Ask a barista at a coffee shop for a free refill before buying anything.
- Ask a restaurant server if you can customize the entire menu item (replace the bun with pancakes).
- At a park, ask a stranger if they’d race you to the fountain for fun.
- Ask a store manager if you can announce a motivational quote over the intercom.
- Ask at a gym if you can train one client for 1 minute for confidence practice.
- Ask a museum guide if you can pose dramatically beside an artwork for their Instagram.
- Ask at a food truck if they’ll swap one fry for your high five.
Return in EXACT format:
Title: <catchy title>
Description: <1 actionable sentence with the ask>
MinNo: <integer 3-7>`;

          let aiResponse: string;
          try {
            aiResponse = await generateText(questPrompt);
            console.log(`Quest ${i + 1}: Generated via Rork AI`);
          } catch (error) {
            console.log(`Quest ${i + 1}: Rork AI failed, trying OpenAI fallback...`, error);
            try {
              if (!OPENAI_API_KEY) {
                throw new Error('OpenAI API key not configured');
              }
              const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
              const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: questPrompt }],
                temperature: 0.8,
              });
              aiResponse = completion.choices[0]?.message?.content || '';
              console.log(`Quest ${i + 1}: Generated via OpenAI fallback`);
            } catch (openaiError) {
              console.error(`Quest ${i + 1}: OpenAI fallback also failed`, openaiError);
              throw new Error('Both AI providers failed');
            }
          }

          const titleMatch = aiResponse.match(/Title:\s*(.+?)(?:\n|$)/i);
          const descMatch = aiResponse.match(/Description:\s*(.+?)(?:\n|$)/i);
          const minNoMatch = aiResponse.match(/MinNo:\s*(\d+)/i);

          let questTitle = titleMatch ? titleMatch[1].trim() : `Challenge at ${place.name}`;
          let questDescription = descMatch ? descMatch[1].trim() : `Ask something bold at ${place.name}`;
          const minNoParsed = minNoMatch ? parseInt(minNoMatch[1], 10) : 3;
          const minNo = isNaN(minNoParsed) ? 3 : Math.min(7, Math.max(3, minNoParsed));

          questTitle = questTitle.replace(/^[*#\s]+/, '').replace(/[*#\s]+$/, '');
          questDescription = questDescription.replace(/^[*#\s]+/, '').replace(/[*#\s]+$/, '');

          const difficulties: Array<'easy'|'medium'|'hard'> = ['easy','medium','hard'];
          const difficulty = difficulties[Math.floor(Math.random()*difficulties.length)];
          const pointsBy: Record<'easy'|'medium'|'hard', number> = { easy: 80, medium: 120, hard: 200 };
          const xpBy: Record<'easy'|'medium'|'hard', number> = { easy: 40, medium: 60, hard: 100 };

          const newQuest: AIGeneratedQuest = {
            id: `ai-quest-${Date.now()}-${i}`,
            title: questTitle,
            description: questDescription,
            type: difficulty === 'easy' ? 'daily' : 'weekly',
            difficulty,
            points: pointsBy[difficulty],
            xp: xpBy[difficulty],
            completed: false,
            icon: 'target',
            minNoRequired: minNo,
            durationMinutes: 60,
            source: 'ai',
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            placeName: place.name,
            placeAddress: place.vicinity || place.formatted_address,
          };

          generatedQuests.push(newQuest);
          console.log(`Generated quest ${i + 1}/${chosen.length}: ${questTitle}`);
        } catch (error) {
          console.error(`Error generating quest for ${place.name}:`, error);
        }
      }

      setAiGeneratedQuests(generatedQuests);
      console.log(`Successfully generated ${generatedQuests.length} AI quests (target ${targetCount})`);
    } catch (error) {
      console.error('Error generating AI quests:', error);
      Alert.alert('Error', 'Failed to generate quests. Please try again.');
    } finally {
      setIsGeneratingAIQuests(false);
    }
  };

  const handleRegenerateQuests = async () => {
    Alert.alert(
      'Regenerate Quests',
      'This will remove all current AI quests and generate new ones. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            setAiGeneratedQuests([]);
            await generateAIQuests();
          },
        },
      ]
    );
  };

  const handleQuestMarkerClick = (quest: AIGeneratedQuest) => {
    setSelectedQuest(quest);
  };

  const handleAcceptQuest = async (quest: AIGeneratedQuest) => {
    try {
      const newQuest = await addCustomQuest({
        title: quest.title,
        description: quest.description,
        minNoRequired: quest.minNoRequired || 3,
        durationMinutes: quest.durationMinutes || 60,
      });

      console.log('Quest accepted and added to queue:', newQuest);
      setSelectedQuest(null);
      Alert.alert('Quest Added!', 'The quest has been added to your Quest Queue. Check the home screen to start!');
      
      setAiGeneratedQuests(prev => prev.filter(q => q.id !== quest.id));
    } catch (error) {
      console.error('Error accepting quest:', error);
      Alert.alert('Error', 'Failed to add quest. Please try again.');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userLocation) {
      console.log('No search query or user location');
      return;
    }

    setIsSearching(true);
    try {
      console.log('Searching for places:', searchQuery);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLocation.latitude},${userLocation.longitude}&radius=5000&keyword=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.results) {
        console.log('Search results:', data.results.length);
        setSearchResults(data.results.slice(0, 10));
      } else {
        console.log('No results found');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToQueue = async (place: Place) => {
    if (!user?.id) {
      console.log('User not logged in');
      return;
    }

    try {
      const questId = activeQuest?.id || 'no-quest';
      await addPlaceToQueue(
        user.id,
        questId,
        place.name,
        place.vicinity || place.formatted_address,
        place.geometry.location.lat,
        place.geometry.location.lng,
        activeQuest ? `For quest: ${activeQuest.title}` : undefined
      );
      console.log('Added to queue:', place.name);
      await loadQueue();
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  };

  const handleGetDirections = (place: Place) => {
    const { lat, lng } = place.geometry.location;
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    
    Linking.openURL(url);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#4ADE80';
      case 'medium':
        return '#FBBF24';
      case 'hard':
        return '#FB923C';
      case 'extreme':
        return '#EF4444';
      default:
        return theme.colors.primary;
    }
  };

  const generateMapHTML = () => {
    const completedMarkers = completedQuests
      .filter((quest) => quest.location)
      .map(
        (quest) => `
        {
          position: { lat: ${quest.location!.latitude}, lng: ${quest.location!.longitude} },
          title: "${quest.title.replace(/"/g, '\\"')}",
          color: "${getDifficultyColor(quest.difficulty)}",
          description: "${quest.description.replace(/"/g, '\\"')}",
          date: "${quest.completedAt ? new Date(quest.completedAt).toLocaleDateString() : 'Just now'}",
          type: "completed"
        }`
      )
      .join(',');

    const aiQuestMarkers = aiGeneratedQuests
      .map((quest, index) => `
        {
          position: { lat: ${quest.latitude}, lng: ${quest.longitude} },
          title: "${quest.title.replace(/"/g, '\\"')}",
          color: "#FFD700",
          description: "${quest.description.replace(/"/g, '\\"')}",
          placeName: "${quest.placeName.replace(/"/g, '\\"')}",
          index: ${index},
          type: "ai-quest"
        }`
      )
      .join(',');

    const allMarkers = [completedMarkers, aiQuestMarkers].filter(Boolean).join(',');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; overflow: hidden; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map;
    let markers = [];
    
    function initMap() {
      const userLocation = { lat: ${userLocation?.latitude || 37.78825}, lng: ${userLocation?.longitude || -122.4324} };
      
      map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: userLocation,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: ${theme.colors.background === '#000000' || theme.colors.background === '#0A0A0A' ? `[
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
          },
          {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
          },
          {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
          },
        ]` : '[]'}
      });

      new google.maps.Marker({
        position: userLocation,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: "Your Location"
      });

      const allMarkers = [${allMarkers}];
      
      allMarkers.forEach((markerData) => {
        const isAIQuest = markerData.type === "ai-quest";
        const marker = new google.maps.Marker({
          position: markerData.position,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isAIQuest ? 14 : 10,
            fillColor: markerData.color,
            fillOpacity: isAIQuest ? 0.9 : 1,
            strokeColor: "#ffffff",
            strokeWeight: isAIQuest ? 3 : 2,
          },
          title: markerData.title
        });

        const infoWindow = new google.maps.InfoWindow({
          content: \`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">\${markerData.title}</h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">\${markerData.description}</p>
              \${isAIQuest ? \`<p style="margin: 0; font-size: 11px; color: #FFD700; font-weight: bold;">📍 \${markerData.placeName}</p>\` : \`<p style="margin: 0; font-size: 11px; color: #999;">\${markerData.date}</p>\`}
              \${isAIQuest ? \`<button onclick="window.ReactNativeWebView.postMessage('quest-clicked:\${markerData.index}')" style="margin-top: 8px; padding: 6px 12px; background: #FFD700; border: none; border-radius: 6px; color: #000; font-weight: bold; cursor: pointer;">View Quest</button>\` : ''}
            </div>
          \`
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
          if (isAIQuest) {
            window.ReactNativeWebView.postMessage('quest-clicked:' + markerData.index);
          }
        });

        markers.push(marker);
      });
    }

    window.initMap = initMap;
  </script>
  <script async src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&callback=initMap"></script>
</body>
</html>
    `;
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={[theme.colors.backgroundTertiary, theme.colors.background]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.header}>
          <Pressable 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)/(home)' as any);
              }
            }} 
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Quest Map</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {totalRejections} rejections • {aiGeneratedQuests.length} AI quests
            </Text>
          </View>
          <Pressable style={styles.menuButton}>
            <Menu size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable style={styles.shareButton}>
            <Share2 size={20} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.mapPlaceholder}>
          <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
            Map view is only available on mobile devices
          </Text>
          <Text style={[styles.placeholderSubtext, { color: theme.colors.textSecondary }]}>
            Scan the QR code to view on your phone
          </Text>
        </View>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading map...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: generateMapHTML() }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          if (message.startsWith('quest-clicked:')) {
            const index = parseInt(message.split(':')[1]);
            if (aiGeneratedQuests[index]) {
              handleQuestMarkerClick(aiGeneratedQuests[index]);
            }
          }
        }}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      />

      <View style={[styles.topContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Pressable 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)/(home)' as any);
              }
            }} 
            style={[styles.backButton, styles.headerButton]}
          >
            <ChevronLeft size={24} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Quest Map</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {totalRejections} completed • {aiGeneratedQuests.length} AI quests
            </Text>
          </View>
          <Pressable 
            style={[styles.menuButton, styles.headerButton]}
            onPress={() => setShowQueueModal(true)}
          >
            <Menu size={24} color={theme.colors.text} />
            {queueItems.length > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.badgeText}>{queueItems.length}</Text>
              </View>
            )}
          </Pressable>
          <Pressable 
            style={[styles.shareButton, styles.headerButton]}
            onPress={() => setShowQuestQueueModal(true)}
          >
            <List size={20} color={theme.colors.text} />
            {aiGeneratedQuests.length > 0 && (
              <View style={[styles.badge, { backgroundColor: '#FFD700' }]}>
                <Text style={[styles.badgeText, { color: '#000' }]}>{aiGeneratedQuests.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: theme.colors.card }]}>
            <Search size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder={activeQuest ? `Search places for: ${activeQuest.title.substring(0, 30)}...` : 'Search places...'}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Pressable 
                style={[styles.searchButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSearch}
              >
                <Text style={styles.searchButtonText}>Search</Text>
              </Pressable>
            )}
          </View>

          {searchResults.length > 0 && (
            <ScrollView style={[styles.resultsContainer, { backgroundColor: theme.colors.card }]}>
              {searchResults.map((place, index) => (
                <Pressable
                  key={index}
                  style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => handleAddToQueue(place)}
                >
                  <MapPin size={20} color={theme.colors.primary} />
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: theme.colors.text }]}>{place.name}</Text>
                    <Text style={[styles.resultAddress, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {place.vicinity || place.formatted_address}
                    </Text>
                  </View>
                  <Plus size={20} color={theme.colors.primary} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={[styles.actionButtonsContainer, { bottom: insets.bottom + 20 }]}>
        <Pressable
          style={[styles.regenerateButton, { backgroundColor: theme.colors.card }]}
          onPress={handleRegenerateQuests}
          disabled={isGeneratingAIQuests}
        >
          {isGeneratingAIQuests ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <RefreshCw size={20} color={theme.colors.primary} />
          )}
        </Pressable>
      </View>

      <QueueModal
        visible={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        queueItems={queueItems}
        onRemoveItem={async (id) => {
          if (user?.id) {
            try {
              await removePlaceFromQueue(id, user.id);
              await loadQueue();
            } catch (error) {
              console.error('Error removing from queue:', error);
            }
          }
        }}
        onGetDirections={handleGetDirections}
        theme={theme.colors}
        isLoading={isLoadingQueue}
      />

      <QuestDetailsModal
        visible={selectedQuest !== null}
        quest={selectedQuest}
        onClose={() => setSelectedQuest(null)}
        onAccept={handleAcceptQuest}
        theme={theme.colors}
      />

      <QuestQueueModal
        visible={showQuestQueueModal}
        onClose={() => setShowQuestQueueModal(false)}
        quests={aiGeneratedQuests}
        onSelectQuest={(quest) => {
          setShowQuestQueueModal(false);
          setSelectedQuest(quest);
        }}
        onRegenerate={handleRegenerateQuests}
        isRegenerating={isGeneratingAIQuests}
        theme={theme.colors}
      />

      <QuestLoadingModal visible={isGeneratingAIQuests} />
    </View>
  );
}

interface QueueModalProps {
  visible: boolean;
  onClose: () => void;
  queueItems: any[];
  onRemoveItem: (id: string) => void;
  onGetDirections: (place: Place) => void;
  theme: any;
  isLoading: boolean;
}

function QueueModal({ visible, onClose, queueItems, onRemoveItem, onGetDirections, theme, isLoading }: QueueModalProps) {
  const getPlaceFromItem = (item: any): Place => {
    return {
      name: item.placeName,
      vicinity: item.placeAddress,
      formatted_address: item.placeAddress,
      geometry: {
        location: {
          lat: item.latitude,
          lng: item.longitude,
        },
      },
      place_id: item.id,
    };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={queueModalStyles.backdrop}>
        <View style={[queueModalStyles.container, { backgroundColor: theme.card }]}>
          <View style={[queueModalStyles.header, { borderBottomColor: theme.border }]}>
            <Text style={[queueModalStyles.title, { color: theme.text }]}>Places Queue</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={theme.text} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={queueModalStyles.emptyState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[queueModalStyles.emptyText, { color: theme.textSecondary, marginTop: 16 }]}>
                Loading places...
              </Text>
            </View>
          ) : queueItems.length === 0 ? (
            <View style={queueModalStyles.emptyState}>
              <MapPin size={48} color={theme.textSecondary} />
              <Text style={[queueModalStyles.emptyText, { color: theme.textSecondary }]}>
                No places in queue
              </Text>
              <Text style={[queueModalStyles.emptySubtext, { color: theme.textSecondary }]}>
                Search and add places to visit for your quest
              </Text>
            </View>
          ) : (
            <ScrollView style={queueModalStyles.list}>
              {queueItems.map((item, index) => {
                const place = getPlaceFromItem(item);
                return (
                  <View key={item.id} style={[queueModalStyles.queueItem, { borderBottomColor: theme.border }]}>
                    <View style={queueModalStyles.itemNumber}>
                      <Text style={[queueModalStyles.itemNumberText, { color: theme.primary }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={queueModalStyles.itemInfo}>
                      <Text style={[queueModalStyles.itemName, { color: theme.text }]}>
                        {item.placeName}
                      </Text>
                      {item.placeAddress && (
                        <Text style={[queueModalStyles.itemAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                          {item.placeAddress}
                        </Text>
                      )}
                      {item.notes && (
                        <Text style={[queueModalStyles.itemQuest, { color: theme.primary }]} numberOfLines={1}>
                          {item.notes}
                        </Text>
                      )}
                    </View>
                    <View style={queueModalStyles.itemActions}>
                      <Pressable
                        style={[queueModalStyles.actionButton, { backgroundColor: theme.primary }]}
                        onPress={() => onGetDirections(place)}
                      >
                        <Navigation size={16} color="#FFFFFF" />
                      </Pressable>
                      <Pressable
                        style={[queueModalStyles.actionButton, { backgroundColor: theme.error }]}
                        onPress={() => onRemoveItem(item.id)}
                      >
                        <X size={16} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

interface QuestDetailsModalProps {
  visible: boolean;
  quest: AIGeneratedQuest | null;
  onClose: () => void;
  onAccept: (quest: AIGeneratedQuest) => void;
  theme: any;
}

function QuestDetailsModal({ visible, quest, onClose, onAccept, theme }: QuestDetailsModalProps) {
  if (!quest) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={questModalStyles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[questModalStyles.container, { backgroundColor: theme.card }]}>
          <LinearGradient colors={['#FFD70030', theme.card]} style={questModalStyles.gradient}>
            <View style={questModalStyles.header}>
              <Sparkles size={48} color="#FFD700" />
              <Text style={[questModalStyles.title, { color: theme.text }]}>{quest.title}</Text>
              <Text style={[questModalStyles.location, { color: theme.textSecondary }]}>
                📍 {quest.placeName}
              </Text>
            </View>

            <View style={[questModalStyles.content, { backgroundColor: theme.backgroundTertiary }]}>
              <Text style={[questModalStyles.description, { color: theme.text }]}>
                {quest.description}
              </Text>
              
              <View style={questModalStyles.stats}>
                <View style={[questModalStyles.statBadge, { backgroundColor: '#FFD70020' }]}>
                  <Text style={[questModalStyles.statValue, { color: '#FFD700' }]}>
                    {quest.minNoRequired || 3} NOs
                  </Text>
                  <Text style={[questModalStyles.statLabel, { color: theme.textSecondary }]}>
                    Required
                  </Text>
                </View>
                <View style={[questModalStyles.statBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[questModalStyles.statValue, { color: theme.primary }]}>
                    {quest.durationMinutes || 60} min
                  </Text>
                  <Text style={[questModalStyles.statLabel, { color: theme.textSecondary }]}>
                    Duration
                  </Text>
                </View>
              </View>

              <View style={questModalStyles.rewards}>
                <View style={[questModalStyles.rewardBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[questModalStyles.rewardText, { color: theme.primary }]}>
                    +{quest.xp} XP
                  </Text>
                </View>
                <View style={[questModalStyles.rewardBadge, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[questModalStyles.rewardText, { color: theme.primary }]}>
                    +{quest.points} Points
                  </Text>
                </View>
              </View>
            </View>

            <View style={questModalStyles.actions}>
              <Pressable
                style={[questModalStyles.acceptButton, { backgroundColor: '#FFD700' }]}
                onPress={() => onAccept(quest)}
              >
                <Text style={questModalStyles.acceptButtonText}>Accept Quest</Text>
              </Pressable>
              <Pressable
                style={[questModalStyles.cancelButton, { borderColor: theme.border }]}
                onPress={onClose}
              >
                <Text style={[questModalStyles.cancelButtonText, { color: theme.text }]}>
                  Maybe Later
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

interface QuestQueueModalProps {
  visible: boolean;
  onClose: () => void;
  quests: AIGeneratedQuest[];
  onSelectQuest: (quest: AIGeneratedQuest) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  theme: any;
}

function QuestQueueModal({ visible, onClose, quests, onSelectQuest, onRegenerate, isRegenerating, theme }: QuestQueueModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={queueModalStyles.backdrop}>
        <View style={[queueModalStyles.container, { backgroundColor: theme.card }]}>
          <View style={[queueModalStyles.header, { borderBottomColor: theme.border }]}>
            <Text style={[queueModalStyles.title, { color: theme.text }]}>AI Quest Queue</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Pressable 
                onPress={onRegenerate}
                disabled={isRegenerating}
                style={[queueModalStyles.iconButton, { backgroundColor: theme.backgroundTertiary }]}
              >
                {isRegenerating ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <RefreshCw size={20} color={theme.primary} />
                )}
              </Pressable>
              <Pressable onPress={onClose}>
                <X size={24} color={theme.text} />
              </Pressable>
            </View>
          </View>

          {quests.length === 0 ? (
            <View style={queueModalStyles.emptyState}>
              <Sparkles size={48} color={theme.textSecondary} />
              <Text style={[queueModalStyles.emptyText, { color: theme.textSecondary }]}>
                No AI quests available
              </Text>
              <Text style={[queueModalStyles.emptySubtext, { color: theme.textSecondary }]}>
                Tap the refresh button to generate new quests
              </Text>
            </View>
          ) : (
            <ScrollView style={queueModalStyles.list}>
              {quests.map((quest, index) => (
                <Pressable
                  key={quest.id}
                  style={[queueModalStyles.queueItem, { borderBottomColor: theme.border }]}
                  onPress={() => onSelectQuest(quest)}
                >
                  <View style={[queueModalStyles.questNumber, { backgroundColor: '#FFD70020' }]}>
                    <Text style={[queueModalStyles.questNumberText, { color: '#FFD700' }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={queueModalStyles.itemInfo}>
                    <Text style={[queueModalStyles.itemName, { color: theme.text }]}>
                      {quest.title}
                    </Text>
                    <Text style={[queueModalStyles.itemAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                      📍 {quest.placeName}
                    </Text>
                    <Text style={[queueModalStyles.questMeta, { color: theme.primary }]}>
                      {quest.minNoRequired} NOs • {quest.durationMinutes} min
                    </Text>
                  </View>
                  <Sparkles size={20} color="#FFD700" />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    topContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerButton: {
      backgroundColor: colors.card,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      flex: 1,
      marginLeft: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    headerSubtitle: {
      fontSize: 12,
    },
    menuButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    shareButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700' as const,
    },
    searchContainer: {
      marginTop: 12,
      zIndex: 1000,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      paddingVertical: 4,
    },
    searchButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    searchButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700' as const,
    },
    resultsContainer: {
      marginTop: 8,
      maxHeight: 300,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
      borderBottomWidth: 1,
    },
    resultInfo: {
      flex: 1,
    },
    resultName: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    resultAddress: {
      fontSize: 12,
    },
    mapPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    placeholderText: {
      fontSize: 18,
      fontWeight: '600' as const,
      textAlign: 'center',
      marginBottom: 8,
    },
    placeholderSubtext: {
      fontSize: 14,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
    },
    actionButtonsContainer: {
      position: 'absolute',
      right: 20,
      flexDirection: 'column',
      gap: 12,
    },
    regenerateButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  });
}

const queueModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    minHeight: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
    paddingBottom: 20,
  },
  queueItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  questNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  itemAddress: {
    fontSize: 12,
    marginBottom: 4,
  },
  itemQuest: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  questMeta: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

const questModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    textAlign: 'center',
  },
  location: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  statBadge: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  rewards: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  rewardBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  actions: {
    gap: 12,
  },
  acceptButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#000',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
