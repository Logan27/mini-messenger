import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ChatMenuAction {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

interface ChatOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  actions: ChatMenuAction[];
  isDark?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MENU_ITEM_HEIGHT = 44;
const MENU_PADDING = 8;

const ChatOptionsMenu: React.FC<ChatOptionsMenuProps> = ({
  visible,
  onClose,
  actions,
  isDark = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const colors = {
    background: isDark ? '#1a1a1a' : '#fff',
    text: isDark ? '#ffffff' : '#374151',
    border: isDark ? '#3a3a3a' : '#e5e7eb',
    handle: isDark ? '#4a4a4a' : '#e0e0e0',
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.menuContainer,
            {
              backgroundColor: colors.background,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.handle }]} />

          {/* Menu Items */}
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                { borderBottomColor: colors.border },
                index === actions.length - 1 && styles.menuItemLast,
              ]}
              onPress={() => {
                action.onPress();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <Ionicons
                  name={action.icon as any}
                  size={22}
                  color={action.variant === 'danger' ? '#ef4444' : (isDark ? '#60a5fa' : '#2563eb')}
                  style={styles.menuIcon}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    { color: action.variant === 'danger' ? '#ef4444' : colors.text },
                  ]}
                >
                  {action.label}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={action.variant === 'danger' ? '#ef4444' : (isDark ? '#6b7280' : '#9ca3af')}
              />
            </TouchableOpacity>
          ))}

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { borderTopColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    height: MENU_ITEM_HEIGHT,
    borderBottomWidth: 1,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatOptionsMenu;
