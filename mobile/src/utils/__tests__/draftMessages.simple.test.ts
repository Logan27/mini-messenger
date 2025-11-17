import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

import { saveDraft, loadDraft, clearDraft, loadAllDrafts, clearAllDrafts } from '../draftMessages';

describe('Draft Messages Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveDraft', () => {
    it('should save draft message successfully', async () => {
      const conversationId = 'conv123';
      const message = 'Test draft message';
      const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
      mockSetItem.mockResolvedValueOnce(undefined);

      await saveDraft(conversationId, message);

      expect(mockSetItem).toHaveBeenCalledWith(
        '@draft_conv123',
        expect.stringContaining('"conversationId":"conv123"')
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        '@draft_conv123',
        expect.stringContaining('"text":"Test draft message"')
      );
      expect(mockSetItem).toHaveBeenCalledTimes(1);
    });

    it('should clear draft when saving empty message', async () => {
      const conversationId = 'conv123';
      const message = '';
      const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;
      mockRemoveItem.mockResolvedValueOnce(undefined);

      await saveDraft(conversationId, message);

      expect(mockRemoveItem).toHaveBeenCalledWith('@draft_conv123');
    });

    it('should handle storage errors gracefully', async () => {
      const conversationId = 'conv123';
      const message = 'Test message';
      const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
      mockSetItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw error
      await expect(saveDraft(conversationId, message)).resolves.toBeUndefined();
    });
  });

  describe('loadDraft', () => {
    it('should load draft message successfully', async () => {
      const conversationId = 'conv123';
      const draftData = {
        conversationId: 'conv123',
        text: 'Saved draft message',
        timestamp: Date.now()
      };
      const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
      mockGetItem.mockResolvedValueOnce(JSON.stringify(draftData));

      const result = await loadDraft(conversationId);

      expect(mockGetItem).toHaveBeenCalledWith('@draft_conv123');
      expect(result).toBe('Saved draft message');
    });

    it('should return null when no draft exists', async () => {
      const conversationId = 'conv123';
      const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
      mockGetItem.mockResolvedValueOnce(null);

      const result = await loadDraft(conversationId);

      expect(mockGetItem).toHaveBeenCalledWith('@draft_conv123');
      expect(result).toBeNull();
    });

    it('should return null for expired drafts', async () => {
      const conversationId = 'conv123';
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      const draftData = {
        conversationId: 'conv123',
        text: 'Old draft message',
        timestamp: oldTimestamp
      };
      const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
      const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;
      mockGetItem.mockResolvedValueOnce(JSON.stringify(draftData));
      mockRemoveItem.mockResolvedValueOnce(undefined);

      const result = await loadDraft(conversationId);

      expect(result).toBeNull();
      expect(mockRemoveItem).toHaveBeenCalledWith('@draft_conv123');
    });

    it('should handle storage errors gracefully', async () => {
      const conversationId = 'conv123';
      const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
      mockGetItem.mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadDraft(conversationId);

      expect(result).toBeNull();
    });
  });

  describe('clearDraft', () => {
    it('should clear draft message successfully', async () => {
      const conversationId = 'conv123';
      const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;
      mockRemoveItem.mockResolvedValueOnce(undefined);

      await clearDraft(conversationId);

      expect(mockRemoveItem).toHaveBeenCalledWith('@draft_conv123');
      expect(mockRemoveItem).toHaveBeenCalledTimes(1);
    });

    it('should handle storage errors gracefully', async () => {
      const conversationId = 'conv123';
      const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;
      mockRemoveItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw error
      await expect(clearDraft(conversationId)).resolves.toBeUndefined();
    });
  });

  describe('loadAllDrafts', () => {
    it('should load all drafts successfully', async () => {
      const keys = ['@draft_conv1', '@draft_conv2', '@other_key'];
      const draft1Data = {
        conversationId: 'conv1',
        text: 'Draft 1',
        timestamp: Date.now()
      };
      const draft2Data = {
        conversationId: 'conv2',
        text: 'Draft 2',
        timestamp: Date.now()
      };

      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.MockedFunction<typeof AsyncStorage.getAllKeys>;
      const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;

      mockGetAllKeys.mockResolvedValueOnce(keys);
      mockGetItem
        .mockResolvedValueOnce(JSON.stringify(draft1Data))
        .mockResolvedValueOnce(JSON.stringify(draft2Data));

      const result = await loadAllDrafts();

      expect(mockGetAllKeys).toHaveBeenCalled();
      expect(result.size).toBe(2);
      expect(result.get('conv1')).toBe('Draft 1');
      expect(result.get('conv2')).toBe('Draft 2');
    });

    it('should return empty map when no drafts exist', async () => {
      const keys = ['@other_key', '@another_key'];
      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.MockedFunction<typeof AsyncStorage.getAllKeys>;
      mockGetAllKeys.mockResolvedValueOnce(keys);

      const result = await loadAllDrafts();

      expect(result.size).toBe(0);
    });

    it('should handle storage errors gracefully', async () => {
      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.MockedFunction<typeof AsyncStorage.getAllKeys>;
      mockGetAllKeys.mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadAllDrafts();

      expect(result.size).toBe(0);
    });
  });

  describe('clearAllDrafts', () => {
    it('should clear all drafts successfully', async () => {
      const keys = ['@draft_conv1', '@draft_conv2', '@other_key'];
      const expectedKeys = ['@draft_conv1', '@draft_conv2'];

      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.MockedFunction<typeof AsyncStorage.getAllKeys>;
      const mockMultiRemove = AsyncStorage.multiRemove as jest.MockedFunction<typeof AsyncStorage.multiRemove>;

      mockGetAllKeys.mockResolvedValueOnce(keys);
      mockMultiRemove.mockResolvedValueOnce(undefined);

      await clearAllDrafts();

      expect(mockGetAllKeys).toHaveBeenCalled();
      expect(mockMultiRemove).toHaveBeenCalledWith(expectedKeys);
    });

    it('should handle no drafts gracefully', async () => {
      const keys = ['@other_key', '@another_key'];

      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.MockedFunction<typeof AsyncStorage.getAllKeys>;
      const mockMultiRemove = AsyncStorage.multiRemove as jest.MockedFunction<typeof AsyncStorage.multiRemove>;

      mockGetAllKeys.mockResolvedValueOnce(keys);
      mockMultiRemove.mockResolvedValueOnce(undefined);

      await clearAllDrafts();

      expect(mockMultiRemove).toHaveBeenCalledWith([]);
    });

    it('should handle storage errors gracefully', async () => {
      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.MockedFunction<typeof AsyncStorage.getAllKeys>;
      mockGetAllKeys.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw error
      await expect(clearAllDrafts()).resolves.toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete draft lifecycle', async () => {
      const conversationId = 'conv123';
      const message = 'Complete test message';
      const draftData = {
        conversationId: 'conv123',
        text: message,
        timestamp: Date.now()
      };

      const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
      const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
      const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<typeof AsyncStorage.removeItem>;

      mockSetItem.mockResolvedValueOnce(undefined);
      mockGetItem.mockResolvedValueOnce(JSON.stringify(draftData));
      mockRemoveItem.mockResolvedValueOnce(undefined);

      // Save draft
      await saveDraft(conversationId, message);
      expect(mockSetItem).toHaveBeenCalledWith('@draft_conv123', expect.any(String));

      // Load draft
      const loadedMessage = await loadDraft(conversationId);
      expect(loadedMessage).toBe(message);
      expect(mockGetItem).toHaveBeenCalledWith('@draft_conv123');

      // Clear draft
      await clearDraft(conversationId);
      expect(mockRemoveItem).toHaveBeenCalledWith('@draft_conv123');
    });
  });
});