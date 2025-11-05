import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type ThemeMode = 'light' | 'dark' | 'auto';
type FontSize = 'small' | 'medium' | 'large';

const AppearanceSettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [theme, setTheme] = useState<ThemeMode>('light');
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
    { value: 'light', label: 'Light', description: 'Classic light theme' },
    { value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
    { value: 'auto', label: 'Auto', description: 'Match system settings' },
  ];

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    Alert.alert('Theme Changed', `Theme set to ${newTheme}. This will be applied in a future update.`);
  };

  const handleFontSizeChange = (newSize: FontSize) => {
    setFontSize(newSize);
    Alert.alert('Font Size Changed', `Font size set to ${newSize}. This will be applied in a future update.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THEME</Text>
          <View style={styles.sectionContent}>
            {themeOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  index === themeOptions.length - 1 && styles.optionItemLast,
                ]}
                onPress={() => handleThemeChange(option.value)}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {theme === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Font Size Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEXT SIZE</Text>
          <View style={styles.sectionContent}>
            {fontSizeOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  index === fontSizeOptions.length - 1 && styles.optionItemLast,
                ]}
                onPress={() => handleFontSizeChange(option.value)}
              >
                <View style={styles.optionLeft}>
                  <Text
                    style={[
                      styles.fontSizeLabel,
                      option.value === 'small' && styles.fontSizeSmall,
                      option.value === 'medium' && styles.fontSizeMedium,
                      option.value === 'large' && styles.fontSizeLarge,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {fontSize === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREVIEW</Text>
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={styles.previewAvatar}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>John Doe</Text>
                <Text style={styles.previewStatus}>Online</Text>
              </View>
            </View>
            <View style={styles.previewMessage}>
              <View style={styles.previewBubble}>
                <Text style={styles.previewText}>
                  This is how messages will look with your current settings.
                </Text>
                <Text style={styles.previewTime}>12:34 PM</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chat Bubbles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHAT BUBBLES</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => Alert.alert('Chat Bubbles', 'Bubble style customization coming soon!')}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionLabel}>Bubble Style</Text>
                <Text style={styles.optionDescription}>Default</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, styles.optionItemLast]}
              onPress={() => Alert.alert('Bubble Color', 'Bubble color customization coming soon!')}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionLabel}>Bubble Color</Text>
                <View style={styles.colorPreview} />
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Appearance changes will be applied immediately after selection.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    minWidth: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionContent: {
    backgroundColor: '#fff',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  fontSizeLabel: {
    fontWeight: '500',
    color: '#000',
  },
  fontSizeSmall: {
    fontSize: 14,
  },
  fontSizeMedium: {
    fontSize: 16,
  },
  fontSizeLarge: {
    fontSize: 18,
  },
  previewContainer: {
    backgroundColor: '#fff',
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  previewStatus: {
    fontSize: 13,
    color: '#10b981',
  },
  previewMessage: {
    alignItems: 'flex-start',
  },
  previewBubble: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '80%',
  },
  previewText: {
    fontSize: 15,
    color: '#000',
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 11,
    color: '#666',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 32,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});

export default AppearanceSettingsScreen;
