import React, { useState, useEffect } from 'react';
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
import { useSettingsStore } from '../../stores/settingsStore';

type ThemeMode = 'light' | 'dark' | 'auto';
type FontSize = 'small' | 'medium' | 'large';

const AppearanceSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { appearance, updateAppearance } = useSettingsStore();

  const [theme, setTheme] = useState<ThemeMode>(appearance.theme);
  const [fontSize, setFontSize] = useState<FontSize>(appearance.fontSize);

  // Resolve 'system' theme to actual light/dark
  const isDark = appearance.theme === 'dark' || (appearance.theme === 'system' && false);
  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2a2a2a' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#a0a0a0' : '#666666',
    border: isDark ? '#3a3a3a' : '#f0f0f0',
    primary: '#007AFF',
    accent: isDark ? '#333333' : '#f0f8ff',
  };

  useEffect(() => {
    // Sync local state with store
    // Map 'system' to 'auto' for UI display
    setTheme(appearance.theme === 'system' ? 'auto' : appearance.theme);
    setFontSize(appearance.fontSize);
  }, [appearance]);

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
    // Update the settings store with new theme
    if (newTheme === 'auto') {
      updateAppearance({ theme: 'system' });
    } else {
      updateAppearance({ theme: newTheme });
    }
  };

  const handleFontSizeChange = (newSize: FontSize) => {
    setFontSize(newSize);
    // Update the settings store with new font size
    updateAppearance({ fontSize: newSize });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.content}>
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>THEME</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            {themeOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  { borderBottomColor: colors.border },
                  index === themeOptions.length - 1 && styles.optionItemLast,
                ]}
                onPress={() => handleThemeChange(option.value)}
              >
                <View style={styles.optionLeft}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                </View>
                {theme === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Font Size Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TEXT SIZE</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
            {fontSizeOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  { borderBottomColor: colors.border },
                  index === fontSizeOptions.length - 1 && styles.optionItemLast,
                ]}
                onPress={() => handleFontSizeChange(option.value)}
              >
                <View style={styles.optionLeft}>
                  <Text
                    style={[
                      styles.fontSizeLabel,
                      { color: colors.text },
                      option.value === 'small' && styles.fontSizeSmall,
                      option.value === 'medium' && styles.fontSizeMedium,
                      option.value === 'large' && styles.fontSizeLarge,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {fontSize === option.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREVIEW</Text>
          <View style={[styles.previewContainer, { backgroundColor: colors.card }]}>
            <View style={styles.previewHeader}>
              <View style={[styles.previewAvatar, { backgroundColor: colors.primary }]}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={styles.previewInfo}>
                <Text style={[styles.previewName, { color: colors.text }]}>John Doe</Text>
                <Text style={styles.previewStatus}>Online</Text>
              </View>
            </View>
            <View style={styles.previewMessage}>
              <View style={[styles.previewBubble, { backgroundColor: isDark ? '#3a3a3a' : '#f1f5f9' }]}>
                <Text style={[styles.previewText, { color: colors.text }]}>
                  This is how messages will look with your current settings.
                </Text>
                <Text style={[styles.previewTime, { color: colors.textSecondary }]}>12:34 PM</Text>
              </View>
            </View>
          </View>
        </View>


        <View style={[styles.infoBox, { backgroundColor: colors.accent }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
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
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionContent: {
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
  },
  fontSizeLabel: {
    fontWeight: '500',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '80%',
  },
  previewText: {
    fontSize: 15,
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 11,
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
    lineHeight: 18,
  },
});

export default AppearanceSettingsScreen;
