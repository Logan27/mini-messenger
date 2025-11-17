import { create } from 'zustand';
import { Group, GroupMember, GroupSettings } from '../types';
import { groupAPI } from '../services/api';

interface GroupState {
  groups: Group[];
  selectedGroup: Group | null;
  groupMembers: Record<string, GroupMember[]>;
  groupSettings: Record<string, GroupSettings>;
  isLoading: boolean;
  error: string | null;

  // Actions - Group CRUD
  loadUserGroups: (page?: number, limit?: number, search?: string, groupType?: 'private' | 'public') => Promise<void>;
  getGroup: (groupId: string) => Promise<void>;
  createGroup: (data: {
    name: string;
    description?: string;
    groupType?: 'private' | 'public';
    avatar?: string;
    initialMembers?: string[];
  }) => Promise<void>;
  updateGroup: (groupId: string, data: {
    name?: string;
    description?: string;
    avatar?: string;
  }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  muteGroup: (groupId: string) => Promise<void>;
  unmuteGroup: (groupId: string) => Promise<void>;

  // Member management
  loadGroupMembers: (groupId: string) => Promise<void>;
  addGroupMembers: (groupId: string, userIds: string[]) => Promise<void>;
  removeGroupMember: (groupId: string, userId: string) => Promise<void>;
  updateMemberRole: (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member') => Promise<void>;

  // Settings
  loadGroupSettings: (groupId: string) => Promise<void>;
  updateGroupSettings: (groupId: string, settings: {
    onlyAdminsCanPost?: boolean;
    onlyAdminsCanAddMembers?: boolean;
    onlyAdminsCanEditInfo?: boolean;
    enableReadReceipts?: boolean;
    enableTypingIndicators?: boolean;
  }) => Promise<void>;

  // Utility
  setSelectedGroup: (group: Group | null) => void;
  clearError: () => void;

  // Alias for backward compatibility
  loadGroups: () => Promise<void>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMembers: {},
  groupSettings: {},
  isLoading: false,
  error: null,

  loadUserGroups: async (page = 1, limit = 20, search?: string, groupType?: 'private' | 'public') => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupAPI.getUserGroups(page, limit, search, groupType);
      set({
        groups: response.data.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load groups',
        isLoading: false,
      });
    }
  },

  getGroup: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupAPI.getGroup(groupId);
      const group = response.data.data;

      // Update group in list if it exists, otherwise add it
      set((state) => ({
        selectedGroup: group,
        groups: state.groups.some((g) => g.id === groupId)
          ? state.groups.map((g) => (g.id === groupId ? group : g))
          : [...state.groups, group],
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load group',
        isLoading: false,
      });
      throw error;
    }
  },

  createGroup: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupAPI.createGroup(data);
      const newGroup = response.data.data;

      // Add new group to list
      set((state) => ({
        groups: [newGroup, ...state.groups],
        selectedGroup: newGroup,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create group',
        isLoading: false,
      });
      throw error;
    }
  },

  updateGroup: async (groupId: string, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupAPI.updateGroup(groupId, data);
      const updatedGroup = response.data.data;

      // Update group in list
      set((state) => ({
        groups: state.groups.map((g) => (g.id === groupId ? updatedGroup : g)),
        selectedGroup: state.selectedGroup?.id === groupId ? updatedGroup : state.selectedGroup,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update group',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      await groupAPI.deleteGroup(groupId);

      // Remove group from list
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        selectedGroup: state.selectedGroup?.id === groupId ? null : state.selectedGroup,
        groupMembers: Object.fromEntries(
          Object.entries(state.groupMembers).filter(([id]) => id !== groupId)
        ),
        groupSettings: Object.fromEntries(
          Object.entries(state.groupSettings).filter(([id]) => id !== groupId)
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete group',
        isLoading: false,
      });
      throw error;
    }
  },

  leaveGroup: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      await groupAPI.leaveGroup(groupId);

      // Remove group from list
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        selectedGroup: state.selectedGroup?.id === groupId ? null : state.selectedGroup,
        groupMembers: Object.fromEntries(
          Object.entries(state.groupMembers).filter(([id]) => id !== groupId)
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to leave group',
        isLoading: false,
      });
      throw error;
    }
  },

  muteGroup: async (groupId: string) => {
    try {
      await groupAPI.muteGroup(groupId);

      // Update group mute status
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, isMuted: true } : g
        ),
        selectedGroup: state.selectedGroup?.id === groupId
          ? { ...state.selectedGroup, isMuted: true }
          : state.selectedGroup,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to mute group',
      });
      throw error;
    }
  },

  unmuteGroup: async (groupId: string) => {
    try {
      await groupAPI.unmuteGroup(groupId);

      // Update group mute status
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, isMuted: false } : g
        ),
        selectedGroup: state.selectedGroup?.id === groupId
          ? { ...state.selectedGroup, isMuted: false }
          : state.selectedGroup,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to unmute group',
      });
      throw error;
    }
  },

  loadGroupMembers: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupAPI.getGroupMembers(groupId);
      const members = response.data.data || [];

      // Store members for this group
      set((state) => ({
        groupMembers: {
          ...state.groupMembers,
          [groupId]: members,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load group members',
        isLoading: false,
      });
    }
  },

  addGroupMembers: async (groupId: string, userIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      await groupAPI.addGroupMembers(groupId, userIds);

      // Reload members to get updated list
      await get().loadGroupMembers(groupId);

      // Update member count in group
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId
            ? { ...g, memberCount: g.memberCount + userIds.length }
            : g
        ),
        selectedGroup: state.selectedGroup?.id === groupId
          ? { ...state.selectedGroup, memberCount: state.selectedGroup.memberCount + userIds.length }
          : state.selectedGroup,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to add group members',
        isLoading: false,
      });
      throw error;
    }
  },

  removeGroupMember: async (groupId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await groupAPI.removeGroupMember(groupId, userId);

      // Remove member from local list
      set((state) => ({
        groupMembers: {
          ...state.groupMembers,
          [groupId]: (state.groupMembers[groupId] || []).filter((m) => m.userId !== userId),
        },
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, memberCount: g.memberCount - 1 } : g
        ),
        selectedGroup: state.selectedGroup?.id === groupId
          ? { ...state.selectedGroup, memberCount: state.selectedGroup.memberCount - 1 }
          : state.selectedGroup,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to remove group member',
        isLoading: false,
      });
      throw error;
    }
  },

  updateMemberRole: async (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member') => {
    set({ isLoading: true, error: null });
    try {
      await groupAPI.updateMemberRole(groupId, userId, role);

      // Update member role in local list
      set((state) => ({
        groupMembers: {
          ...state.groupMembers,
          [groupId]: (state.groupMembers[groupId] || []).map((m) =>
            m.userId === userId ? { ...m, role } : m
          ),
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update member role',
        isLoading: false,
      });
      throw error;
    }
  },

  loadGroupSettings: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupAPI.getGroupSettings(groupId);
      const settings = response.data.data;

      // Store settings for this group
      set((state) => ({
        groupSettings: {
          ...state.groupSettings,
          [groupId]: settings,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load group settings',
        isLoading: false,
      });
    }
  },

  updateGroupSettings: async (groupId: string, settings) => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupAPI.updateGroupSettings(groupId, settings);
      const updatedSettings = response.data.data;

      // Update settings in local store
      set((state) => ({
        groupSettings: {
          ...state.groupSettings,
          [groupId]: updatedSettings,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update group settings',
        isLoading: false,
      });
      throw error;
    }
  },

  setSelectedGroup: (group: Group | null) => {
    set({ selectedGroup: group });
  },

  clearError: () => {
    set({ error: null });
  },

  // Alias for backward compatibility - calls loadUserGroups with default params
  loadGroups: async () => {
    await get().loadUserGroups();
  },
}));
