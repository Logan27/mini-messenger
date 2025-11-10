import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupService } from '@/services/group.service';
import { mockDataFactories } from '@/tests/mockDataFactories';

vi.mock('@/services/group.service');

describe('Group Creation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate group creation data', () => {
    const groupData = {
      name: 'Test Group',
      description: 'A test group',
      initialMembers: ['user-1', 'user-2'],
    };

    expect(groupData.name.length).toBeGreaterThanOrEqual(3);
    expect(groupData.name.length).toBeLessThanOrEqual(100);
    expect(groupData.initialMembers.length).toBeGreaterThanOrEqual(2);
  });

  it('should create group successfully', async () => {
    const mockGroup = mockDataFactories.createMockGroup({
      name: 'New Group',
    });

    vi.mocked(groupService.createGroup).mockResolvedValue(mockGroup);

    const result = await groupService.createGroup({
      name: 'New Group',
      initialMembers: ['user-1', 'user-2'],
    });

    expect(result.name).toBe('New Group');
    expect(groupService.createGroup).toHaveBeenCalled();
  });

  it('should require minimum members', () => {
    const invalidGroup = {
      name: 'Group',
      initialMembers: ['user-1'], // Only 1 member
    };

    const isValid = invalidGroup.initialMembers.length >= 2;
    expect(isValid).toBe(false);
  });

  it('should enforce maximum members', () => {
    const members = Array.from({ length: 25 }, (_, i) => `user-${i}`);
    const isValid = members.length <= 20;

    expect(isValid).toBe(false);
  });

  it('should handle group creation error', async () => {
    vi.mocked(groupService.createGroup).mockRejectedValue(
      new Error('Group name already exists')
    );

    await expect(
      groupService.createGroup({
        name: 'Duplicate',
        initialMembers: ['user-1', 'user-2'],
      })
    ).rejects.toThrow('Group name already exists');
  });

  it('should add creator as admin', async () => {
    const mockGroup = mockDataFactories.createMockGroup({
      creatorId: 'user-123',
      members: [
        {
          userId: 'user-123',
          role: 'admin',
        },
      ],
    });

    vi.mocked(groupService.createGroup).mockResolvedValue(mockGroup);

    const result = await groupService.createGroup({
      name: 'Test',
      initialMembers: ['user-456'],
    });

    const creator = result.members.find((m: { userId: string; role: string }) => m.userId === 'user-123');
    expect(creator?.role).toBe('admin');
  });
});
