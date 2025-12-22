import React, { useState, useEffect } from 'react';
import {
  Image,
  ImageProps,
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthenticatedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  showLoadingIndicator?: boolean;
}

const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  uri,
  style,
  showLoadingIndicator = true,
  ...props
}) => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // If it's already a data URI, use it directly
        if (uri.startsWith('data:')) {
          if (isMounted) {
            setImageData(uri);
            setLoading(false);
          }
          return;
        }

        // If it's a file URI (local file), use it directly
        if (uri.startsWith('file://')) {
          if (isMounted) {
            setImageData(uri);
            setLoading(false);
          }
          return;
        }

        // If it's an external URL (not our backend), use it directly
        if ((uri.startsWith('http://') || uri.startsWith('https://')) &&
            !uri.includes('localhost:4000') &&
            !uri.includes('/api/files/')) {
          if (isMounted) {
            setImageData(uri);
            setLoading(false);
          }
          return;
        }

        // Need to fetch with authentication
        const fullUrl = uri.startsWith('http') ? uri : `${API_URL}${uri}`;

        // Get token
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token available');
        }

        // Download file with authentication headers
        const downloadResult = await FileSystem.downloadAsync(
          fullUrl,
          FileSystem.cacheDirectory + `image-${Date.now()}.jpg`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Mobile-App': 'true',
            },
          }
        );

        if (downloadResult.status !== 200) {
          throw new Error(`HTTP ${downloadResult.status}`);
        }

        // Read the downloaded file as base64
        const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Determine MIME type from URL or default to jpeg
        let mimeType = 'image/jpeg';
        if (uri.includes('.png')) {
          mimeType = 'image/png';
        } else if (uri.includes('.gif')) {
          mimeType = 'image/gif';
        } else if (uri.includes('.webp')) {
          mimeType = 'image/webp';
        }

        const base64Image = `data:${mimeType};base64,${base64}`;

        if (isMounted) {
          setImageData(base64Image);
          setLoading(false);
        }

        // Clean up the cached file after a delay
        setTimeout(() => {
          FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {
            // Ignore cleanup errors
          });
        }, 5000);

      } catch (err: any) {
        console.error('[AuthenticatedImage] Error loading image:', err);
        console.error('[AuthenticatedImage] Error details:', err.message);
        if (isMounted) {
          setError(err.message || 'Failed to load image');
          setLoading(false);
        }
      }
    };

    if (uri && accessToken) {
      loadImage();
    } else if (!accessToken) {
      console.warn('[AuthenticatedImage] No access token available');
      setError('Not authenticated');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [uri, accessToken]);

  if (loading) {
    if (!showLoadingIndicator) return null;
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorText}>Failed to load image</Text>
      </View>
    );
  }

  if (!imageData) {
    return null;
  }

  return (
    <Image
      {...props}
      source={{ uri: imageData }}
      style={style}
      onError={(e) => {
        console.error('[AuthenticatedImage] Image component error:', e.nativeEvent.error);
        setError('Image display error');
      }}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
  },
});

export default AuthenticatedImage;
