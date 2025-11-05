import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessageReaction } from '../../types';

interface WhoReactedModalProps {
  visible: boolean;
  onClose: () => void;
  reactions: MessageReaction[];
  getUserName: (userId: string) => string;
}

const WhoReactedModal: React.FC<WhoReactedModalProps> = ({
  visible,
  onClose,
  reactions,
  getUserName,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Reactions</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Reactions List */}
            <ScrollView style={styles.scrollView}>
              {reactions.map((reaction, index) => (
                <View key={index} style={styles.reactionSection}>
                  <View style={styles.reactionHeader}>
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                    <Text style={styles.reactionCount}>
                      {reaction.users.length}
                    </Text>
                  </View>
                  {reaction.users.map((userId, userIndex) => (
                    <View key={userIndex} style={styles.userRow}>
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={16} color="#666" />
                      </View>
                      <Text style={styles.userName}>{getUserName(userId)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 350,
    maxHeight: '70%',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 400,
  },
  reactionSection: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reactionEmoji: {
    fontSize: 28,
    marginRight: 8,
  },
  reactionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 15,
    color: '#1f2937',
  },
});

export default WhoReactedModal;
