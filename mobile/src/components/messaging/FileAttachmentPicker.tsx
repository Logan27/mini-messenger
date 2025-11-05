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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'react-native-document-picker';

interface FileAttachmentPickerProps {
  visible: boolean;
  onClose: () => void;
  onFileSelected: (file: {
    uri: string;
    type: string;
    name: string;
    size?: number;
  }) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FileAttachmentPicker: React.FC<FileAttachmentPickerProps> = ({
  visible,
  onClose,
  onFileSelected,
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

  const handlePickImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          `Please grant ${
            useCamera ? 'camera' : 'photo library'
          } permission to continue.`
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        onFileSelected({
          uri: asset.uri,
          type: 'image',
          name: asset.fileName || `image-${Date.now()}.jpg`,
          size: asset.fileSize,
        });
        onClose();
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx,
          DocumentPicker.types.xls,
          DocumentPicker.types.xlsx,
          DocumentPicker.types.plainText,
        ],
      });

      if (result && result[0]) {
        const file = result[0];
        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size && file.size > maxSize) {
          Alert.alert(
            'File Too Large',
            'File size must be less than 10MB. Please choose a smaller file.'
          );
          return;
        }

        onFileSelected({
          uri: file.uri,
          type: 'document',
          name: file.name || 'document',
          size: file.size,
        });
        onClose();
      }
    } catch (error: any) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Document picker error:', error);
        Alert.alert('Error', 'Failed to pick document. Please try again.');
      }
    }
  };

  const handlePickVideo = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant photo library permission to continue.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (asset.fileSize && asset.fileSize > maxSize) {
          Alert.alert(
            'Video Too Large',
            'Video size must be less than 10MB. Please choose a shorter video.'
          );
          return;
        }

        onFileSelected({
          uri: asset.uri,
          type: 'video',
          name: asset.fileName || `video-${Date.now()}.mp4`,
          size: asset.fileSize,
        });
        onClose();
      }
    } catch (error) {
      console.error('Video picker error:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
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

              <Text style={styles.title}>Attach File</Text>

              {/* Camera */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => handlePickImage(true)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#ef4444' }]}>
                  <Ionicons name="camera" size={24} color="#fff" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Camera</Text>
                  <Text style={styles.optionDescription}>
                    Take a photo with your camera
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Photo Library */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => handlePickImage(false)}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#8b5cf6' }]}>
                  <Ionicons name="images" size={24} color="#fff" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Photo Library</Text>
                  <Text style={styles.optionDescription}>
                    Choose from your photos
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Document */}
              <TouchableOpacity
                style={styles.option}
                onPress={handlePickDocument}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#3b82f6' }]}>
                  <Ionicons name="document-text" size={24} color="#fff" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Document</Text>
                  <Text style={styles.optionDescription}>
                    Share PDF, Word, Excel, or text files
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Video */}
              <TouchableOpacity
                style={styles.option}
                onPress={handlePickVideo}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#f59e0b' }]}>
                  <Ionicons name="videocam" size={24} color="#fff" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Video</Text>
                  <Text style={styles.optionDescription}>
                    Share a video (max 60 sec, 10MB)
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                style={styles.cancelButton}
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
});

export default FileAttachmentPicker;
