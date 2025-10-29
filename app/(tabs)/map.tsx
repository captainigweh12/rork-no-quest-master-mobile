import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, TextInput, ScrollView, Modal, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Menu, Share2, Search, MapPin, Plus, Navigation, X, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { addPlaceToQueue, getPlaceQueue, removePlaceFromQueue } from '@/services/supabase/map';
import { generateText } from '@rork/toolkit-sdk';


const GOOGLE_PLACES_API_KEY = 'AIzaSyCHMHlOrPPSRULrUf-FqPWHz0Y6PJoPrRk';

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

  const handleGenerateLocationQuest = async () => {
    if (!userLocation || !user?.id) {
      console.log('No location or user ID available');
      return;
    }

    setIsGeneratingQuest(true);
    try {
      console.log('Generating location-based quest...');
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.latitude},${userLocation.longitude}&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      let locationName = 'your current area';
      let locationDetails: string = '';
      
      if (data.results && data.results[0]) {
        const addressComponents = data.results[0].address_components;
        const neighborhood = addressComponents.find((c: any) => c.types.includes('neighborhood'));
        const city = addressComponents.find((c: any) => c.types.includes('locality'));
        
        if (neighborhood) {
          locationName = neighborhood.long_name;
        } else if (city) {
          locationName = city.long_name;
        }
        
        locationDetails = data.results[0].formatted_address;
      }

      const nearbyResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLocation.latitude},${userLocation.longitude}&radius=500&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const nearbyData = await nearbyResponse.json();
      const placeTypes = nearbyData.results
        ?.slice(0, 5)
        .map((p: any) => p.types?.[0])
        .filter(Boolean)
        .join(', ') || 'various establishments';

      const questPrompt = `Generate a rejection therapy quest based on the user's location in ${locationName}. Nearby places include: ${placeTypes}.

Create a specific quest that involves getting rejected by asking strangers or businesses something in this area.

Provide your response in this exact format:
Title: [A short, catchy quest title mentioning ${locationName}]
Description: [A clear action statement of what to do and how many times. For example: "Ask 3 strangers in ${locationName} to take a photo with you" or "Visit 5 local shops and ask for a discount"]
MinNo: [Number between 3-5]`;

      const aiResponse = await generateText(questPrompt);
      console.log('AI Response:', aiResponse);
      
      const titleMatch = aiResponse.match(/Title:\s*(.+?)(?:\n|$)/i);
      const descMatch = aiResponse.match(/Description:\s*(.+?)(?:\n|$)/i);
      const minNoMatch = aiResponse.match(/MinNo:\s*(\d+)/i);
      
      let questTitle = titleMatch ? titleMatch[1].trim() : `${locationName} Challenge`;
      let questDescription = descMatch ? descMatch[1].trim() : `Complete a rejection challenge in ${locationName}`;
      const minNo = minNoMatch ? parseInt(minNoMatch[1]) : 3;
      
      questTitle = questTitle.replace(/^[*#\s]+/, '').replace(/[*#\s]+$/, '');
      questDescription = questDescription.replace(/^[*#\s]+/, '').replace(/[*#\s]+$/, '');

      const newQuest = await addCustomQuest({
        title: questTitle,
        description: questDescription,
        minNoRequired: minNo,
        durationMinutes: 60,
      });

      console.log('Location quest generated:', newQuest);
      router.push('/(tabs)/(home)/?focus=1' as any);
    } catch (error) {
      console.error('Error generating location quest:', error);
    } finally {
      setIsGeneratingQuest(false);
    }
  };

  const generateMapHTML = () => {
    const markers = completedQuests
      .filter((quest) => quest.location)
      .map(
        (quest) => `
        {
          position: { lat: ${quest.location!.latitude}, lng: ${quest.location!.longitude} },
          title: "${quest.title.replace(/"/g, '\\"')}",
          color: "${getDifficultyColor(quest.difficulty)}",
          description: "${quest.description.replace(/"/g, '\\"')}",
          date: "${quest.completedAt ? new Date(quest.completedAt).toLocaleDateString() : 'Just now'}"
        }`
      )
      .join(',');

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

      const questMarkers = [${markers}];
      
      questMarkers.forEach((markerData) => {
        const marker = new google.maps.Marker({
          position: markerData.position,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: markerData.color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: markerData.title
        });

        const infoWindow = new google.maps.InfoWindow({
          content: \`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">\${markerData.title}</h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">\${markerData.description}</p>
              <p style="margin: 0; font-size: 11px; color: #999;">\${markerData.date}</p>
            </div>
          \`
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Rejection Map</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {totalRejections} rejections tracked
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
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      />

      <View style={[styles.topContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, styles.headerButton]}>
            <ChevronLeft size={24} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Rejection Map</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {totalRejections} rejections tracked
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
          <Pressable style={[styles.shareButton, styles.headerButton]}>
            <Share2 size={20} color={theme.colors.text} />
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

      <Pressable
        style={[styles.generateQuestButton, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 20 }]}
        onPress={handleGenerateLocationQuest}
        disabled={isGeneratingQuest}
      >
        {isGeneratingQuest ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Sparkles size={24} color="#FFFFFF" />
            <Text style={styles.generateQuestButtonText}>Generate Location Quest</Text>
          </>
        )}
      </Pressable>

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
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
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
    generateQuestButton: {
      position: 'absolute',
      left: 20,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    generateQuestButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700' as const,
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
    maxHeight: '70%',
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
  list: {
    flex: 1,
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
