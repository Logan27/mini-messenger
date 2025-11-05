import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types';

interface MessageActionsModalProps {
  visible: boolean;
  message: Message | null;
  isMyMessage: boolean;
  onClose: () => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message, deleteForEveryone: boolean) => void;
  onReply?: (message: Message) => void;
  onCopy?: (message: Message) => void;
  onForward?: (message: Message) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MessageActionsModal: React.FC<MessageActionsModalProps> = ({
  visible,
  message,
  isMyMessage,
  onClose,
  onEdit,
  onDelete,
  onReply,
  onCopy,
  onForward,
}) => {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!message) return null;

  // Check if message can be edited (within 5 minutes)
  const canEdit = () => {
    if (!isMyMessage) return false;
    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return now - messageTime < fiveMinutes;
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.handle} />

              <Text style={styles.title}>Message Actions</Text>

              {/* Reply */}
              {onReply && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAction(() => onReply(message))}
                >
                  <Ionicons name="arrow-undo" size={22} color="#2563eb" />
                  <Text style={styles.actionText}>Reply</Text>
                </TouchableOpacity>
              )}

              {/* Copy */}
              {onCopy && message.type === 'text' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAction(() => onCopy(message))}
                >
                  <Ionicons name="copy-outline" size={22} color="#2563eb" />
                  <Text style={styles.actionText}>Copy</Text>
                </TouchableOpacity>
              )}

              {/* Forward */}
              {onForward && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAction(() => onForward(message))}
                >
                  <Ionicons name="arrow-redo" size={22} color="#2563eb" />
                  <Text style={styles.actionText}>Forward</Text>
                </TouchableOpacity>
              )}

              {/* Edit (only for own messages within 5 minutes) */}
              {isMyMessage && canEdit() && onEdit && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAction(() => onEdit(message))}
                >
                  <Ionicons name="create-outline" size={22} color="#2563eb" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
              )}

              {/* Delete */}
              {onDelete && (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      handleAction(() => onDelete(message, false))
                    }
                  >
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                    <Text style={[styles.actionText, styles.deleteText]}>
                      Delete for Me
                    </Text>
                  </TouchableOpacity>

                  {isMyMessage && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        handleAction(() => onDelete(message, true))
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color="#dc2626"
                      />
                      <Text style={[styles.actionText, styles.deleteText]}>
                        Delete for Everyone
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Cancel */}
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  actionText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 16,
    fontWeight: '500',
  },
  deleteText: {
    color: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 12,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MessageActionsModal;
