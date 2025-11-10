import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupService } from '../group.service';
import apiClient from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('groupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const mockGroup = {
        id: 'group1',
        name: 'Test Group',
        description: 'A test group',
        groupType: 'private',
        creatorId: 'user1',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockGroup },
      });

      const groupData = {
        name: 'Test Group',
        description: 'A test group',
        groupType: 'private' as const,
        initialMembers: ['user2', 'user3'],
      };

      const result = await groupService.createGroup(groupData);

      expect(apiClient.post).toHaveBeenCalledWith('/groups', groupData);
      expect(result).toEqual(mockGroup);
    });

    it('should create a public group', async () => {
      const mockPublicGroup = {
        id: 'group2',
        name: 'Public Group',
        groupType: 'public',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockPublicGroup },
      });

      const result = await groupService.createGroup({
        name: 'Public Group',
        groupType: 'public',
        initialMembers: [],
      });

      expect(result.groupType).toBe('public');
    });

    it('should handle group creation errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(
        new Error('Group name already exists')
      );

      await expect(
        groupService.createGroup({
          name: 'Duplicate',
          initialMembers: [],
        })
      ).rejects.toThrow('Group name already exists');
    });
  });

  describe('getGroups', () => {
    it('should fetch all groups', async () => {
      const mockGroups = [
        { id: 'group1', name: 'Group 1' },
        { id: 'group2', name: 'Group 2' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockGroups },
      });

      const result = await groupService.getGroups();

      expect(apiClient.get).toHaveBeenCalledWith('/groups', { params: undefined });
      expect(result).toEqual(mockGroups);
    });

    it('should fetch groups with search query', async () => {
      const mockGroups = [{ id: 'group1', name: 'Test Group' }];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockGroups },
      });

      await groupService.getGroups({ search: 'Test' });

      expect(apiClient.get).toHaveBeenCalledWith('/groups', {
        params: { search: 'Test' },
      });
    });

    it('should fetch groups with pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: [] },
      });

      await groupService.getGroups({ page: 2, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/groups', {
        params: { page: 2, limit: 10 },
      });
    });

    it('should filter groups by type', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: [] },
      });

      await groupService.getGroups({ groupType: 'public' });

      expect(apiClient.get).toHaveBeenCalledWith('/groups', {
        params: { groupType: 'public' },
      });
    });
  });

  describe('getGroup', () => {
    it('should fetch a specific group', async () => {
      const mockGroup = {
        id: 'group1',
        name: 'Test Group',
        members: [{ id: 'user1' }, { id: 'user2' }],
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockGroup },
      });

      const result = await groupService.getGroup('group1');

      expect(apiClient.get).toHaveBeenCalledWith('/groups/group1');
      expect(result).toEqual(mockGroup);
    });

    it('should handle group not found', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Group not found'));

      await expect(groupService.getGroup('nonexistent')).rejects.toThrow(
        'Group not found'
      );
    });
  });

  describe('updateGroup', () => {
    it('should update group details', async () => {
      const mockUpdatedGroup = {
        id: 'group1',
        name: 'Updated Name',
        description: 'Updated description',
      };

      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: mockUpdatedGroup },
      });

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const result = await groupService.updateGroup('group1', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/groups/group1', updateData);
      expect(result).toEqual(mockUpdatedGroup);
    });

    it('should update only group name', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { id: 'group1', name: 'New Name' } },
      });

      await groupService.updateGroup('group1', { name: 'New Name' });

      expect(apiClient.put).toHaveBeenCalledWith('/groups/group1', {
        name: 'New Name',
      });
    });

    it('should update group avatar', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { id: 'group1', avatar: '/path/to/avatar.jpg' } },
      });

      await groupService.updateGroup('group1', {
        avatar: '/path/to/avatar.jpg',
      });

      expect(apiClient.put).toHaveBeenCalledWith('/groups/group1', {
        avatar: '/path/to/avatar.jpg',
      });
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group', async () => {
      const mockResponse = { success: true, message: 'Group deleted' };

      vi.mocked(apiClient.delete).mockResolvedValue({
        data: mockResponse,
      });

      const result = await groupService.deleteGroup('group1');

      expect(apiClient.delete).toHaveBeenCalledWith('/groups/group1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addMember', () => {
    it('should add a member to the group', async () => {
      const mockMember = {
        id: 'member1',
        userId: 'user1',
        groupId: 'group1',
        role: 'member',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockMember },
      });

      const result = await groupService.addMember('group1', 'user1');

      expect(apiClient.post).toHaveBeenCalledWith('/groups/group1/members', {
        userId: 'user1',
        role: undefined,
      });
      expect(result).toEqual(mockMember);
    });

    it('should add a member with admin role', async () => {
      const mockAdmin = {
        id: 'member2',
        userId: 'user2',
        groupId: 'group1',
        role: 'admin',
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockAdmin },
      });

      const result = await groupService.addMember('group1', 'user2', 'admin');

      expect(apiClient.post).toHaveBeenCalledWith('/groups/group1/members', {
        userId: 'user2',
        role: 'admin',
      });
      expect(result.role).toBe('admin');
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the group', async () => {
      const mockResponse = { success: true, message: 'Member removed' };

      vi.mocked(apiClient.delete).mockResolvedValue({
        data: mockResponse,
      });

      const result = await groupService.removeMember('group1', 'user1');

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/groups/group1/members/user1'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role', async () => {
      const mockUpdatedMember = {
        id: 'member1',
        userId: 'user1',
        role: 'moderator',
      };

      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: mockUpdatedMember },
      });

      const result = await groupService.updateMemberRole(
        'group1',
        'user1',
        'moderator'
      );

      expect(apiClient.put).toHaveBeenCalledWith(
        '/groups/group1/members/user1/role',
        { role: 'moderator' }
      );
      expect(result).toEqual(mockUpdatedMember);
    });

    it('should promote member to admin', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: { role: 'admin' } },
      });

      const result = await groupService.updateMemberRole(
        'group1',
        'user1',
        'admin'
      );

      expect(result.role).toBe('admin');
    });
  });

  describe('leaveGroup', () => {
    it('should leave a group', async () => {
      const mockResponse = { success: true, message: 'Left group' };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: mockResponse,
      });

      const result = await groupService.leaveGroup('group1');

      expect(apiClient.post).toHaveBeenCalledWith('/groups/group1/leave');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('muteGroup', () => {
    it('should mute a group', async () => {
      const mockMutedGroup = {
        id: 'group1',
        isMuted: true,
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockMutedGroup },
      });

      const result = await groupService.muteGroup('group1');

      expect(apiClient.post).toHaveBeenCalledWith('/groups/group1/mute');
      expect(result).toEqual(mockMutedGroup);
    });
  });

  describe('unmuteGroup', () => {
    it('should unmute a group', async () => {
      const mockUnmutedGroup = {
        id: 'group1',
        isMuted: false,
      };

      vi.mocked(apiClient.delete).mockResolvedValue({
        data: { data: mockUnmutedGroup },
      });

      const result = await groupService.unmuteGroup('group1');

      expect(apiClient.delete).toHaveBeenCalledWith('/groups/group1/mute');
      expect(result).toEqual(mockUnmutedGroup);
    });
  });
});
