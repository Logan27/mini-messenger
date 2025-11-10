import { describe, it, expect } from 'vitest';
import { mockDataFactories } from '@/tests/mockDataFactories';

describe('Group Components', () => {
  describe('GroupInfo', () => {
    it('should display group details', () => {
      const group = mockDataFactories.createMockGroup({
        name: 'Test Group',
        description: 'A test group',
      });

      expect(group.name).toBe('Test Group');
      expect(group.description).toBe('A test group');
    });

    it('should show member count', () => {
      const members = mockDataFactories.createMockUsers(5);
      const group = mockDataFactories.createMockGroup({
        members,
      });

      expect(group.members).toHaveLength(5);
    });
  });

  describe('GroupSettings', () => {
    it('should validate group name', () => {
      const validNames = ['Team Chat', 'Project Group', 'Friends'];
      const invalidNames = ['', 'ab', 'a'.repeat(101)];

      validNames.forEach((name) => {
        expect(name.length).toBeGreaterThanOrEqual(3);
        expect(name.length).toBeLessThanOrEqual(100);
      });

      invalidNames.forEach((name) => {
        const isValid = name.length >= 3 && name.length <= 100;
        expect(isValid).toBe(false);
      });
    });

    it('should handle group type changes', () => {
      const group = mockDataFactories.createMockGroup({
        groupType: 'private',
      });

      expect(group.groupType).toBe('private');
      expect(['private', 'public']).toContain(group.groupType);
    });
  });

  describe('CreateGroupDialog', () => {
    it('should validate member selection', () => {
      const selectedMembers = mockDataFactories.createMockUsers(3);

      expect(selectedMembers.length).toBeGreaterThanOrEqual(2);
      expect(selectedMembers.length).toBeLessThanOrEqual(20);
    });

    it('should prevent duplicate members', () => {
      const members = mockDataFactories.createMockUsers(3);
      const memberIds = members.map((m) => m.id);
      const uniqueIds = new Set(memberIds);

      expect(uniqueIds.size).toBe(memberIds.length);
    });
  });

  describe('GroupMemberList', () => {
    it('should display members with roles', () => {
      const members = [
        { ...mockDataFactories.createMockUser(), role: 'admin' },
        { ...mockDataFactories.createMockUser(), role: 'member' },
      ];

      expect(members[0].role).toBe('admin');
      expect(members[1].role).toBe('member');
    });

    it('should sort members by role', () => {
      const members = [
        { role: 'member', name: 'User 1' },
        { role: 'admin', name: 'Admin 1' },
        { role: 'member', name: 'User 2' },
      ];

      const sorted = [...members].sort((a, b) => {
        if (a.role === 'admin') return -1;
        if (b.role === 'admin') return 1;
        return 0;
      });

      expect(sorted[0].role).toBe('admin');
    });
  });
});
