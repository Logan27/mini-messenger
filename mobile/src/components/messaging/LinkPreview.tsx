import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

interface LinkPreviewProps {
  metadata: LinkMetadata | null;
  isLoading?: boolean;
  onPress?: () => void;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({
  metadata,
  isLoading,
  onPress,
}) => {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563eb" />
        <Text style={styles.loadingText}>Loading preview...</Text>
      </View>
    );
  }

  if (!metadata) return null;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Linking.openURL(metadata.url);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {metadata.image && (
        <Image
          source={{ uri: metadata.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <View style={styles.content}>
        {metadata.siteName && (
          <View style={styles.siteNameContainer}>
            {metadata.favicon && (
              <Image
                source={{ uri: metadata.favicon }}
                style={styles.favicon}
                resizeMode="contain"
              />
            )}
            <Text style={styles.siteName} numberOfLines={1}>
              {metadata.siteName}
            </Text>
          </View>
        )}
        {metadata.title && (
          <Text style={styles.title} numberOfLines={2}>
            {metadata.title}
          </Text>
        )}
        {metadata.description && (
          <Text style={styles.description} numberOfLines={2}>
            {metadata.description}
          </Text>
        )}
        <View style={styles.urlContainer}>
          <Ionicons name="link" size={12} color="#9ca3af" />
          <Text style={styles.url} numberOfLines={1}>
            {new URL(metadata.url).hostname}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#6b7280',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 12,
  },
  siteNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  favicon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  siteName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  url: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
    flex: 1,
  },
});

export default LinkPreview;
