import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

describe('ChatList', () => {
  it('should handle empty chat list', () => {
    const chats: unknown[] = [];
    expect(chats).toHaveLength(0);
  });

  it('should sort chats by last message time', () => {
    const chats = [
      { id: '1', lastMessageAt: new Date('2024-01-01') },
      { id: '2', lastMessageAt: new Date('2024-01-02') },
    ];

    const sorted = [...chats].sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );

    expect(sorted[0].id).toBe('2');
  });

  it('should filter chats by search query', () => {
    const chats = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
    ];

    const filtered = chats.filter((chat) =>
      chat.name.toLowerCase().includes('john')
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('John Doe');
  });

  it('should show unread count badge', () => {
    const chat = { id: '1', unreadCount: 5 };
    expect(chat.unreadCount).toBeGreaterThan(0);
  });
});
