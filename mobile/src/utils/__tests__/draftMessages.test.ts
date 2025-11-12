import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveDraft,
  loadDraft,
  clearDraft,
  loadAllDrafts,
  clearAllDrafts,
} from '../draftMessages';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('draftMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date.now for consistent timestamp testing
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('saveDraft', () => {
    it('saves draft message to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await saveDraft('conv-1', 'Hello, this is a draft');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@draft_conv-1',
        JSON.stringify({
          conversationId: 'conv-1',
          text: 'Hello, this is a draft',
          timestamp: 1000000,
        })
      );
    });

    it('clears draft when text is empty', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);

      await saveDraft('conv-1', '');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@draft_conv-1');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('clears draft when text is only whitespace', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);

      await saveDraft('conv-1', '   ');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@draft_conv-1');
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('handles save errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await saveDraft('conv-1', 'Test draft');

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to save draft:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('loadDraft', () => {
    it('loads draft message from AsyncStorage', async () => {
      const draftData = {
        conversationId: 'conv-1',
        text: 'My draft message',
        timestamp: 1000000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(draftData)
      );

      const result = await loadDraft('conv-1');

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@draft_conv-1');
      expect(result).toBe('My draft message');
    });

    it('returns null when no draft exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await loadDraft('conv-1');

      expect(result).toBeNull();
    });

    it('expires old drafts (older than 7 days)', async () => {
      const oldTimestamp = 1000000 - 8 * 24 * 60 * 60 * 1000; // 8 days old
      const draftData = {
        conversationId: 'conv-1',
        text: 'Old draft',
        timestamp: oldTimestamp,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(draftData)
      );
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await loadDraft('conv-1');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@draft_conv-1');
    });

    it('keeps recent drafts (within 7 days)', async () => {
      const recentTimestamp = 1000000 - 5 * 24 * 60 * 60 * 1000; // 5 days old
      const draftData = {
        conversationId: 'conv-1',
        text: 'Recent draft',
        timestamp: recentTimestamp,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(draftData)
      );

      const result = await loadDraft('conv-1');

      expect(result).toBe('Recent draft');
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('handles load errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const result = await loadDraft('conv-1');

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load draft:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('handles JSON parse errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid json');

      const result = await loadDraft('conv-1');

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load draft:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('clearDraft', () => {
    it('clears draft from AsyncStorage', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);

      await clearDraft('conv-1');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@draft_conv-1');
    });

    it('handles clear errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await clearDraft('conv-1');

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to clear draft:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('loadAllDrafts', () => {
    it('loads all drafts from AsyncStorage', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        '@draft_conv-1',
        '@draft_conv-2',
        '@other_key',
        '@draft_conv-3',
      ]);

      const draft1 = {
        conversationId: 'conv-1',
        text: 'Draft 1',
        timestamp: 1000000,
      };
      const draft2 = {
        conversationId: 'conv-2',
        text: 'Draft 2',
        timestamp: 1000000,
      };
      const draft3 = {
        conversationId: 'conv-3',
        text: 'Draft 3',
        timestamp: 1000000,
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(draft1))
        .mockResolvedValueOnce(JSON.stringify(draft2))
        .mockResolvedValueOnce(JSON.stringify(draft3));

      const result = await loadAllDrafts();

      expect(result.size).toBe(3);
      expect(result.get('conv-1')).toBe('Draft 1');
      expect(result.get('conv-2')).toBe('Draft 2');
      expect(result.get('conv-3')).toBe('Draft 3');
      expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
    });

    it('returns empty Map when no drafts exist', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        '@other_key_1',
        '@other_key_2',
      ]);

      const result = await loadAllDrafts();

      expect(result.size).toBe(0);
    });

    it('filters out null drafts (expired)', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        '@draft_conv-1',
        '@draft_conv-2',
      ]);

      const validDraft = {
        conversationId: 'conv-1',
        text: 'Valid draft',
        timestamp: 1000000,
      };
      const expiredDraft = {
        conversationId: 'conv-2',
        text: 'Expired draft',
        timestamp: 1000000 - 8 * 24 * 60 * 60 * 1000, // 8 days old
      };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(validDraft))
        .mockResolvedValueOnce(JSON.stringify(expiredDraft));

      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await loadAllDrafts();

      expect(result.size).toBe(1);
      expect(result.get('conv-1')).toBe('Valid draft');
      expect(result.has('conv-2')).toBe(false);
    });

    it('handles errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const result = await loadAllDrafts();

      expect(result.size).toBe(0);
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load all drafts:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('clearAllDrafts', () => {
    it('clears all drafts from AsyncStorage', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        '@draft_conv-1',
        '@draft_conv-2',
        '@other_key',
        '@draft_conv-3',
      ]);

      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValueOnce(undefined);

      await clearAllDrafts();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@draft_conv-1',
        '@draft_conv-2',
        '@draft_conv-3',
      ]);
    });

    it('does nothing when no drafts exist', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        '@other_key_1',
        '@other_key_2',
      ]);

      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValueOnce(undefined);

      await clearAllDrafts();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([]);
    });

    it('handles errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      await clearAllDrafts();

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to clear all drafts:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('save, load, and clear cycle works correctly', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          conversationId: 'conv-1',
          text: 'Test draft',
          timestamp: 1000000,
        })
      );
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await saveDraft('conv-1', 'Test draft');
      const loaded = await loadDraft('conv-1');
      await clearDraft('conv-1');

      expect(loaded).toBe('Test draft');
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(AsyncStorage.getItem).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('multiple conversations can have separate drafts', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
        '@draft_conv-1',
        '@draft_conv-2',
        '@draft_conv-3',
      ]);

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(
          JSON.stringify({
            conversationId: 'conv-1',
            text: 'Draft 1',
            timestamp: 1000000,
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            conversationId: 'conv-2',
            text: 'Draft 2',
            timestamp: 1000000,
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            conversationId: 'conv-3',
            text: 'Draft 3',
            timestamp: 1000000,
          })
        );

      const allDrafts = await loadAllDrafts();

      expect(allDrafts.size).toBe(3);
      expect(allDrafts.get('conv-1')).toBe('Draft 1');
      expect(allDrafts.get('conv-2')).toBe('Draft 2');
      expect(allDrafts.get('conv-3')).toBe('Draft 3');
    });
  });
});
