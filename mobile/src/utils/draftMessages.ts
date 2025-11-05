import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = '@draft_';

export interface DraftMessage {
  conversationId: string;
  text: string;
  timestamp: number;
}

/**
 * Save a draft message for a conversation
 */
export const saveDraft = async (conversationId: string, text: string): Promise<void> => {
  try {
    if (!text || text.trim().length === 0) {
      // If text is empty, remove the draft
      await clearDraft(conversationId);
      return;
    }

    const draft: DraftMessage = {
      conversationId,
      text,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(
      `${DRAFT_PREFIX}${conversationId}`,
      JSON.stringify(draft)
    );
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
};

/**
 * Load a draft message for a conversation
 */
export const loadDraft = async (conversationId: string): Promise<string | null> => {
  try {
    const draftString = await AsyncStorage.getItem(`${DRAFT_PREFIX}${conversationId}`);

    if (!draftString) {
      return null;
    }

    const draft: DraftMessage = JSON.parse(draftString);

    // Optionally, you could add expiration logic here
    // For example, drafts older than 7 days could be automatically cleared
    const MAX_DRAFT_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - draft.timestamp > MAX_DRAFT_AGE) {
      await clearDraft(conversationId);
      return null;
    }

    return draft.text;
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
};

/**
 * Clear a draft message for a conversation
 */
export const clearDraft = async (conversationId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${DRAFT_PREFIX}${conversationId}`);
  } catch (error) {
    console.error('Failed to clear draft:', error);
  }
};

/**
 * Load all drafts (for showing indicators in conversation list)
 */
export const loadAllDrafts = async (): Promise<Map<string, string>> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter(key => key.startsWith(DRAFT_PREFIX));

    const drafts = new Map<string, string>();

    for (const key of draftKeys) {
      const conversationId = key.replace(DRAFT_PREFIX, '');
      const text = await loadDraft(conversationId);
      if (text) {
        drafts.set(conversationId, text);
      }
    }

    return drafts;
  } catch (error) {
    console.error('Failed to load all drafts:', error);
    return new Map();
  }
};

/**
 * Clear all drafts (useful for cleanup)
 */
export const clearAllDrafts = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter(key => key.startsWith(DRAFT_PREFIX));
    await AsyncStorage.multiRemove(draftKeys);
  } catch (error) {
    console.error('Failed to clear all drafts:', error);
  }
};
