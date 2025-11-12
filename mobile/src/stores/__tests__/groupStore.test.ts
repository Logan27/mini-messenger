import { useGroupStore } from '../groupStore';
import { groupAPI } from '../../services/api';

// Mock groupAPI
jest.mock('../../services/api', () => ({
  groupAPI: {
    getUserGroups: jest.fn(),
    getGroup: jest.fn(),
    createGroup: jest.fn(),
    updateGroup: jest.fn(),
    deleteGroup: jest.fn(),
    leaveGroup: jest.fn(),
    muteGroup: jest.fn(),
    unmuteGroup: jest.fn(),
    getGroupMembers: jest.fn(),
    addGroupMembers: jest.fn(),
    removeGroupMember: jest.fn(),
    updateMemberRole: jest.fn(),
    getGroupSettings: jest.fn(),
    updateGroupSettings: jest.fn(),
  },
}));

describe('groupStore', () => {
  beforeEach(() => {
    // Reset store state
    useGroupStore.setState({
      groups: [],
      selectedGroup: null,
      groupMembers: {},
      groupSettings: {},
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useGroupStore.getState();

      expect(state.groups).toEqual([]);
      expect(state.selectedGroup).toBeNull();
      expect(state.groupMembers).toEqual({});
      expect(state.groupSettings).toEqual({});
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadUserGroups', () => {
    it('loads groups successfully', async () => {
      const mockGroups = [
        { id: 'group-1', name: 'Team Chat', memberCount: 5, groupType: 'private' },
        { id: 'group-2', name: 'Public Group', memberCount: 100, groupType: 'public' },
      ];

      (groupAPI.getUserGroups as jest.Mock).mockResolvedValueOnce({
        data: { data: mockGroups },
      });

      await useGroupStore.getState().loadUserGroups();

      const state = useGroupStore.getState();
      expect(state.groups).toEqual(mockGroups);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(groupAPI.getUserGroups).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('loads groups with pagination and filters', async () => {
      (groupAPI.getUserGroups as jest.Mock).mockResolvedValueOnce({
        data: { data: [] },
      });

      await useGroupStore.getState().loadUserGroups(2, 50, 'test', 'public');

      expect(groupAPI.getUserGroups).toHaveBeenCalledWith(2, 50, 'test', 'public');
    });

    it('handles load groups error', async () => {
      (groupAPI.getUserGroups as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Network error' } },
      });

      await useGroupStore.getState().loadUserGroups();

      const state = useGroupStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (groupAPI.getUserGroups as jest.Mock).mockReturnValueOnce(promise);

      const loadPromise = useGroupStore.getState().loadUserGroups();

      expect(useGroupStore.getState().isLoading).toBe(true);

      resolvePromise!({ data: { data: [] } });
      await loadPromise;

      expect(useGroupStore.getState().isLoading).toBe(false);
    });
  });

  describe('getGroup', () => {
    it('gets group and sets as selected', async () => {
      const mockGroup = { id: 'group-1', name: 'Team Chat', memberCount: 5 };

      (groupAPI.getGroup as jest.Mock).mockResolvedValueOnce({
        data: { data: mockGroup },
      });

      await useGroupStore.getState().getGroup('group-1');

      const state = useGroupStore.getState();
      expect(state.selectedGroup).toEqual(mockGroup);
      expect(state.groups).toContainEqual(mockGroup);
      expect(groupAPI.getGroup).toHaveBeenCalledWith('group-1');
    });

    it('updates existing group in list', async () => {
      const existingGroup = { id: 'group-1', name: 'Old Name', memberCount: 5 };
      const updatedGroup = { id: 'group-1', name: 'New Name', memberCount: 5 };

      useGroupStore.setState({ groups: [existingGroup] });

      (groupAPI.getGroup as jest.Mock).mockResolvedValueOnce({
        data: { data: updatedGroup },
      });

      await useGroupStore.getState().getGroup('group-1');

      const state = useGroupStore.getState();
      expect(state.groups).toHaveLength(1);
      expect(state.groups[0].name).toBe('New Name');
    });

    it('throws error on get group failure', async () => {
      const mockError = {
        response: { data: { message: 'Group not found' } },
      };
      (groupAPI.getGroup as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().getGroup('invalid-group');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Group not found');
    });
  });

  describe('createGroup', () => {
    it('creates group successfully', async () => {
      const newGroup = {
        id: 'group-1',
        name: 'New Group',
        description: 'Test group',
        memberCount: 1,
      };

      (groupAPI.createGroup as jest.Mock).mockResolvedValueOnce({
        data: { data: newGroup },
      });

      await useGroupStore.getState().createGroup({
        name: 'New Group',
        description: 'Test group',
      });

      const state = useGroupStore.getState();
      expect(state.groups).toContainEqual(newGroup);
      expect(state.selectedGroup).toEqual(newGroup);
      expect(groupAPI.createGroup).toHaveBeenCalledWith({
        name: 'New Group',
        description: 'Test group',
      });
    });

    it('throws error on create failure', async () => {
      const mockError = {
        response: { data: { message: 'Creation failed' } },
      };
      (groupAPI.createGroup as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().createGroup({ name: 'Test' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Creation failed');
    });
  });

  describe('updateGroup', () => {
    it('updates group successfully', async () => {
      const existingGroup = { id: 'group-1', name: 'Old Name', memberCount: 5 };
      const updatedGroup = { id: 'group-1', name: 'New Name', memberCount: 5 };

      useGroupStore.setState({
        groups: [existingGroup],
        selectedGroup: existingGroup,
      });

      (groupAPI.updateGroup as jest.Mock).mockResolvedValueOnce({
        data: { data: updatedGroup },
      });

      await useGroupStore.getState().updateGroup('group-1', { name: 'New Name' });

      const state = useGroupStore.getState();
      expect(state.groups[0].name).toBe('New Name');
      expect(state.selectedGroup?.name).toBe('New Name');
      expect(groupAPI.updateGroup).toHaveBeenCalledWith('group-1', { name: 'New Name' });
    });

    it('throws error on update failure', async () => {
      const mockError = {
        response: { data: { message: 'Update failed' } },
      };
      (groupAPI.updateGroup as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().updateGroup('group-1', { name: 'New' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Update failed');
    });
  });

  describe('deleteGroup', () => {
    it('deletes group successfully', async () => {
      const group1 = { id: 'group-1', name: 'Group 1', memberCount: 5 };
      const group2 = { id: 'group-2', name: 'Group 2', memberCount: 3 };

      useGroupStore.setState({
        groups: [group1, group2],
        selectedGroup: group1,
        groupMembers: { 'group-1': [], 'group-2': [] },
        groupSettings: { 'group-1': {}, 'group-2': {} },
      });

      (groupAPI.deleteGroup as jest.Mock).mockResolvedValueOnce({});

      await useGroupStore.getState().deleteGroup('group-1');

      const state = useGroupStore.getState();
      expect(state.groups).toHaveLength(1);
      expect(state.groups[0].id).toBe('group-2');
      expect(state.selectedGroup).toBeNull();
      expect(state.groupMembers['group-1']).toBeUndefined();
      expect(state.groupSettings['group-1']).toBeUndefined();
    });

    it('throws error on delete failure', async () => {
      const mockError = {
        response: { data: { message: 'Delete failed' } },
      };
      (groupAPI.deleteGroup as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().deleteGroup('group-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Delete failed');
    });
  });

  describe('leaveGroup', () => {
    it('leaves group successfully', async () => {
      const group1 = { id: 'group-1', name: 'Group 1', memberCount: 5 };
      const group2 = { id: 'group-2', name: 'Group 2', memberCount: 3 };

      useGroupStore.setState({
        groups: [group1, group2],
        selectedGroup: group1,
        groupMembers: { 'group-1': [], 'group-2': [] },
      });

      (groupAPI.leaveGroup as jest.Mock).mockResolvedValueOnce({});

      await useGroupStore.getState().leaveGroup('group-1');

      const state = useGroupStore.getState();
      expect(state.groups).toHaveLength(1);
      expect(state.groups[0].id).toBe('group-2');
      expect(state.selectedGroup).toBeNull();
      expect(state.groupMembers['group-1']).toBeUndefined();
    });

    it('throws error on leave failure', async () => {
      const mockError = {
        response: { data: { message: 'Leave failed' } },
      };
      (groupAPI.leaveGroup as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().leaveGroup('group-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Leave failed');
    });
  });

  describe('muteGroup', () => {
    it('mutes group successfully', async () => {
      const group = { id: 'group-1', name: 'Group 1', memberCount: 5, isMuted: false };

      useGroupStore.setState({
        groups: [group],
        selectedGroup: group,
      });

      (groupAPI.muteGroup as jest.Mock).mockResolvedValueOnce({});

      await useGroupStore.getState().muteGroup('group-1');

      const state = useGroupStore.getState();
      expect(state.groups[0].isMuted).toBe(true);
      expect(state.selectedGroup?.isMuted).toBe(true);
    });

    it('throws error on mute failure', async () => {
      const mockError = {
        response: { data: { message: 'Mute failed' } },
      };
      (groupAPI.muteGroup as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().muteGroup('group-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Mute failed');
    });
  });

  describe('unmuteGroup', () => {
    it('unmutes group successfully', async () => {
      const group = { id: 'group-1', name: 'Group 1', memberCount: 5, isMuted: true };

      useGroupStore.setState({
        groups: [group],
        selectedGroup: group,
      });

      (groupAPI.unmuteGroup as jest.Mock).mockResolvedValueOnce({});

      await useGroupStore.getState().unmuteGroup('group-1');

      const state = useGroupStore.getState();
      expect(state.groups[0].isMuted).toBe(false);
      expect(state.selectedGroup?.isMuted).toBe(false);
    });
  });

  describe('loadGroupMembers', () => {
    it('loads group members successfully', async () => {
      const mockMembers = [
        { userId: 'user-1', username: 'alice', role: 'admin' },
        { userId: 'user-2', username: 'bob', role: 'member' },
      ];

      (groupAPI.getGroupMembers as jest.Mock).mockResolvedValueOnce({
        data: { data: mockMembers },
      });

      await useGroupStore.getState().loadGroupMembers('group-1');

      const state = useGroupStore.getState();
      expect(state.groupMembers['group-1']).toEqual(mockMembers);
      expect(groupAPI.getGroupMembers).toHaveBeenCalledWith('group-1');
    });

    it('handles load members error', async () => {
      (groupAPI.getGroupMembers as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Failed to load members' } },
      });

      await useGroupStore.getState().loadGroupMembers('group-1');

      const state = useGroupStore.getState();
      expect(state.error).toBe('Failed to load members');
    });
  });

  describe('addGroupMembers', () => {
    it('adds members successfully', async () => {
      const group = { id: 'group-1', name: 'Group 1', memberCount: 5 };

      useGroupStore.setState({
        groups: [group],
        selectedGroup: group,
      });

      (groupAPI.addGroupMembers as jest.Mock).mockResolvedValueOnce({});
      (groupAPI.getGroupMembers as jest.Mock).mockResolvedValueOnce({
        data: { data: [] },
      });

      await useGroupStore.getState().addGroupMembers('group-1', ['user-1', 'user-2']);

      const state = useGroupStore.getState();
      expect(state.groups[0].memberCount).toBe(7);
      expect(state.selectedGroup?.memberCount).toBe(7);
      expect(groupAPI.addGroupMembers).toHaveBeenCalledWith('group-1', ['user-1', 'user-2']);
    });

    it('throws error on add members failure', async () => {
      const mockError = {
        response: { data: { message: 'Add members failed' } },
      };
      (groupAPI.addGroupMembers as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().addGroupMembers('group-1', ['user-1']);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Add members failed');
    });
  });

  describe('removeGroupMember', () => {
    it('removes member successfully', async () => {
      const group = { id: 'group-1', name: 'Group 1', memberCount: 5 };
      const members = [
        { userId: 'user-1', username: 'alice', role: 'admin' },
        { userId: 'user-2', username: 'bob', role: 'member' },
      ];

      useGroupStore.setState({
        groups: [group],
        selectedGroup: group,
        groupMembers: { 'group-1': members },
      });

      (groupAPI.removeGroupMember as jest.Mock).mockResolvedValueOnce({});

      await useGroupStore.getState().removeGroupMember('group-1', 'user-2');

      const state = useGroupStore.getState();
      expect(state.groupMembers['group-1']).toHaveLength(1);
      expect(state.groupMembers['group-1'][0].userId).toBe('user-1');
      expect(state.groups[0].memberCount).toBe(4);
    });

    it('throws error on remove member failure', async () => {
      const mockError = {
        response: { data: { message: 'Remove member failed' } },
      };
      (groupAPI.removeGroupMember as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().removeGroupMember('group-1', 'user-1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Remove member failed');
    });
  });

  describe('updateMemberRole', () => {
    it('updates member role successfully', async () => {
      const members = [
        { userId: 'user-1', username: 'alice', role: 'admin' },
        { userId: 'user-2', username: 'bob', role: 'member' },
      ];

      useGroupStore.setState({
        groupMembers: { 'group-1': members },
      });

      (groupAPI.updateMemberRole as jest.Mock).mockResolvedValueOnce({});

      await useGroupStore.getState().updateMemberRole('group-1', 'user-2', 'moderator');

      const state = useGroupStore.getState();
      expect(state.groupMembers['group-1'][1].role).toBe('moderator');
      expect(groupAPI.updateMemberRole).toHaveBeenCalledWith('group-1', 'user-2', 'moderator');
    });

    it('throws error on update role failure', async () => {
      const mockError = {
        response: { data: { message: 'Update role failed' } },
      };
      (groupAPI.updateMemberRole as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().updateMemberRole('group-1', 'user-1', 'admin');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Update role failed');
    });
  });

  describe('loadGroupSettings', () => {
    it('loads group settings successfully', async () => {
      const mockSettings = {
        onlyAdminsCanPost: true,
        onlyAdminsCanAddMembers: false,
        enableReadReceipts: true,
      };

      (groupAPI.getGroupSettings as jest.Mock).mockResolvedValueOnce({
        data: { data: mockSettings },
      });

      await useGroupStore.getState().loadGroupSettings('group-1');

      const state = useGroupStore.getState();
      expect(state.groupSettings['group-1']).toEqual(mockSettings);
      expect(groupAPI.getGroupSettings).toHaveBeenCalledWith('group-1');
    });

    it('handles load settings error', async () => {
      (groupAPI.getGroupSettings as jest.Mock).mockRejectedValueOnce({
        response: { data: { message: 'Failed to load settings' } },
      });

      await useGroupStore.getState().loadGroupSettings('group-1');

      const state = useGroupStore.getState();
      expect(state.error).toBe('Failed to load settings');
    });
  });

  describe('updateGroupSettings', () => {
    it('updates group settings successfully', async () => {
      const updatedSettings = {
        onlyAdminsCanPost: false,
        onlyAdminsCanAddMembers: true,
      };

      (groupAPI.updateGroupSettings as jest.Mock).mockResolvedValueOnce({
        data: { data: updatedSettings },
      });

      await useGroupStore.getState().updateGroupSettings('group-1', updatedSettings);

      const state = useGroupStore.getState();
      expect(state.groupSettings['group-1']).toEqual(updatedSettings);
      expect(groupAPI.updateGroupSettings).toHaveBeenCalledWith('group-1', updatedSettings);
    });

    it('throws error on update settings failure', async () => {
      const mockError = {
        response: { data: { message: 'Update settings failed' } },
      };
      (groupAPI.updateGroupSettings as jest.Mock).mockRejectedValueOnce(mockError);

      try {
        await useGroupStore.getState().updateGroupSettings('group-1', {});
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }

      expect(useGroupStore.getState().error).toBe('Update settings failed');
    });
  });

  describe('setSelectedGroup', () => {
    it('sets selected group', () => {
      const group = { id: 'group-1', name: 'Group 1', memberCount: 5 };

      useGroupStore.getState().setSelectedGroup(group);

      const state = useGroupStore.getState();
      expect(state.selectedGroup).toEqual(group);
    });

    it('clears selected group', () => {
      useGroupStore.setState({
        selectedGroup: { id: 'group-1', name: 'Group 1', memberCount: 5 },
      });

      useGroupStore.getState().setSelectedGroup(null);

      const state = useGroupStore.getState();
      expect(state.selectedGroup).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useGroupStore.setState({ error: 'Some error' });

      useGroupStore.getState().clearError();

      const state = useGroupStore.getState();
      expect(state.error).toBeNull();
    });
  });
});
