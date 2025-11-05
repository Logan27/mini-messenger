import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types';

export interface MessageAction {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

interface MessageActionsSheetProps {
  visible: boolean;
  message: Message | null;
  isOwnMessage: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: (deleteForEveryone: boolean) => void;
  onCopy?: () => void;
  onForward?: () => void;
  onReact?: () => void;
}

const MessageActionsSheet: React.FC<MessageActionsSheetProps> = ({
  visible,
  message,
  isOwnMessage,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onForward,
  onReact,
}) => {
  if (!message) return null;

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
  if (isOwnMessage && message.type === 'text' && canEdit() && onEdit) {
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
  if (message.type === 'text' && onCopy) {
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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.handle} />
            </View>

            {/* Message Preview */}
            {message.type === 'text' && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewText} numberOfLines={2}>
                  {message.content}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsContainer}>
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.actionItem}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      action.variant === 'danger' && styles.dangerIconContainer,
                    ]}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={22}
                      color={action.variant === 'danger' ? '#ef4444' : '#2563eb'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.actionLabel,
                      action.variant === 'danger' && styles.dangerLabel,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </View>
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
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
  },
  previewContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  previewText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  actionItem: {
    alignItems: 'center',
    width: '22%',
    marginBottom: 12,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerIconContainer: {
    backgroundColor: '#fef2f2',
  },
  actionLabel: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
  },
  dangerLabel: {
    color: '#ef4444',
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
});

export default MessageActionsSheet;
