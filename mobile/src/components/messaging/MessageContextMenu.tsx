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
import { Message } from '../../types';

export interface MessageAction {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

interface MessageContextMenuProps {
  visible: boolean;
  message: Message | null;
  position: { x: number; y: number } | null;
  isOwnMessage: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: (deleteForEveryone: boolean) => void;
  onCopy?: () => void;
  onForward?: () => void;
  onReact?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MENU_WIDTH = 200;
const MENU_ITEM_HEIGHT = 44;
const MENU_PADDING = 8;

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  visible,
  message,
  position,
  isOwnMessage,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onForward,
  onReact,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!message || !position) return null;

  // Handle both frontend (type) and backend (messageType) formats
  const messageType = (message as any).messageType || message.type || 'text';

  // Check if message can be edited (within 5 minutes)
  const canEdit = () => {
    if (!isOwnMessage) return false;
    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return now - messageTime < fiveMinutes;
  };

  const actions: MessageAction[] = [];

  // React is available for all messages
  if (onReact) {
    actions.push({
      icon: 'happy-outline',
      label: 'React',
      onPress: () => {
        onReact();
        onClose();
      },
    });
  }

  // Reply is available for all messages
  actions.push({
    icon: 'arrow-undo',
    label: 'Reply',
    onPress: () => {
      onReply();
      onClose();
    },
  });

  // Edit is only for own text messages within 5 minutes
  if (isOwnMessage && messageType === 'text' && canEdit() && onEdit) {
    actions.push({
      icon: 'pencil',
      label: 'Edit',
      onPress: () => {
        onEdit();
        onClose();
      },
    });
  }

  // Copy is only for text messages
  if (messageType === 'text' && onCopy) {
    actions.push({
      icon: 'copy',
      label: 'Copy',
      onPress: () => {
        onCopy();
        onClose();
      },
    });
  }

  // Forward is available for all message types
  if (onForward) {
    actions.push({
      icon: 'arrow-redo',
      label: 'Forward',
      onPress: () => {
        onForward();
        onClose();
      },
    });
  }

  // Delete for Me is available for all messages
  actions.push({
    icon: 'trash',
    label: 'Delete for Me',
    onPress: () => {
      onDelete(false);
      onClose();
    },
    variant: 'danger',
  });

  // Delete for Everyone is only available for own messages
  if (isOwnMessage) {
    actions.push({
      icon: 'trash',
      label: 'Delete for Everyone',
      onPress: () => {
        onDelete(true);
        onClose();
      },
      variant: 'danger',
    });
  }

  // Calculate menu height
  const menuHeight = actions.length * MENU_ITEM_HEIGHT + MENU_PADDING * 2;

  // Calculate menu position
  // Position menu near the message, but ensure it stays within screen bounds
  let menuX = position.x;
  let menuY = position.y;

  // Adjust X position if menu would overflow right edge
  if (menuX + MENU_WIDTH > SCREEN_WIDTH - 20) {
    menuX = SCREEN_WIDTH - MENU_WIDTH - 20;
  }

  // Adjust X position if menu would overflow left edge
  if (menuX < 20) {
    menuX = 20;
  }

  // Adjust Y position if menu would overflow bottom edge
  if (menuY + menuHeight > SCREEN_HEIGHT - 40) {
    menuY = SCREEN_HEIGHT - menuHeight - 40;
  }

  // Adjust Y position if menu would overflow top edge
  if (menuY < 40) {
    menuY = 40;
  }

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
            styles.menu,
            {
              left: menuX,
              top: menuY,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === 0 && styles.menuItemFirst,
                index === actions.length - 1 && styles.menuItemLast,
              ]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={action.icon as any}
                size={20}
                color={action.variant === 'danger' ? '#ef4444' : '#374151'}
                style={styles.menuIcon}
              />
              <Text
                style={[
                  styles.menuLabel,
                  action.variant === 'danger' && styles.menuLabelDanger,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: MENU_PADDING,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: MENU_WIDTH,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: MENU_ITEM_HEIGHT,
  },
  menuItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menuItemLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  menuLabelDanger: {
    color: '#ef4444',
  },
});

export default MessageContextMenu;
