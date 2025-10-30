import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { GroupMembersModal } from '../GroupMembersModal'
import { useAuthStore } from '@/app/stores/authStore'
import { useMessageStore } from '@/app/stores/messageStore'
import { groupsApi } from '@/features/groups/api/groupsApi'
import websocketService from '@/services/websocketService'

// Mock the stores
vi.mock('@/app/stores/authStore')
vi.mock('@/app/stores/messageStore')

// Mock the API
vi.mock('@/features/groups/api/groupsApi')

// Mock the websocket service
vi.mock('@/services/websocketService')

// Mock the UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => open ? <div data-testid="dialog">{children({ onOpenChange })}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props} data-testid="button">
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarFallback: ({ children }: any) => <div data-testid="avatar-fallback">{children}</div>,
  AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="avatar-image" />,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-menu-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick} data-testid="dropdown-menu-item">
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-menu-separator" />,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-menu-trigger">{children}</div>,
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
}))

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title, message, type }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <div data-testid="confirm-title">{title}</div>
        <div data-testid="confirm-message">{message}</div>
        <div data-testid="confirm-type">{type}</div>
        <button onClick={onClose} data-testid="confirm-cancel">
          Cancel
        </button>
        <button onClick={onConfirm} data-testid="confirm-confirm">
          Confirm
        </button>
      </div>
    ) : null,
}))

vi.mock('./AddMembersModal', () => ({
  AddMembersModal: ({ isOpen, onClose, onAddMembers }: any) =>
    isOpen ? (
      <div data-testid="add-members-modal">
        <button onClick={onClose} data-testid="add-members-close">
          Close
        </button>
        <button onClick={() => onAddMembers(['user1'])} data-testid="add-members-submit">
          Submit
        </button>
      </div>
    ) : null,
}))

const mockUser = {
  id: 'user1',
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  avatar: 'avatar.jpg',
  role: 'user' as const,
  isApproved: true,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
}

const mockMembers = [
  {
    id: 'member1',
    userId: 'user1',
    groupId: 'group1',
    role: 'admin' as const,
    joinedAt: '2023-01-01',
    user: mockUser,
  },
  {
    id: 'member2',
    userId: 'user2',
    groupId: 'group1',
    role: 'member' as const,
    joinedAt: '2023-01-01',
    user: {
      ...mockUser,
      id: 'user2',
      name: 'Test User 2',
      email: 'test2@example.com',
      username: 'testuser2',
    },
  },
]

describe('GroupMembersModal', () => {
  const mockOnClose = vi.fn()
  const mockLoadConversations = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    
    // Mock auth store
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
      login: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token: 'token',
    } as any)
    
    // Mock message store
    vi.mocked(useMessageStore).mockReturnValue({
      conversations: [{
        id: 'group1',
        type: 'group' as const,
        name: 'Test Group',
        participants: [mockUser],
        lastMessage: undefined,
        unreadCount: 0,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      }],
      loadConversations: mockLoadConversations,
    } as any)
    
    // Mock API
    vi.mocked(groupsApi.getGroup).mockResolvedValue({
      members: mockMembers,
    } as any)
    
    vi.mocked(groupsApi.addMember).mockResolvedValue({} as any)
    vi.mocked(groupsApi.removeMember).mockResolvedValue()
    vi.mocked(groupsApi.updateMemberRole).mockResolvedValue({} as any)
    
    // Mock websocket
    vi.mocked(websocketService.on).mockReturnValue()
    vi.mocked(websocketService.off).mockReturnValue()
  })

  it('renders correctly when open', async () => {
    render(
      <GroupMembersModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Group Members')).toBeInTheDocument()
      expect(screen.getByText('Test Group • 2 members')).toBeInTheDocument()
    })
  })

  it('does not render when closed', () => {
    render(
      <GroupMembersModal
        isOpen={false}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('displays group members', async () => {
    render(
      <GroupMembersModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByText('Test User 2')).toBeInTheDocument()
      expect(screen.getByText('member')).toBeInTheDocument()
    })
  })

  it('shows "Add Members" button for admins', async () => {
    render(
      <GroupMembersModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Add Members')).toBeInTheDocument()
    })
  })

  it('opens AddMembersModal when "Add Members" is clicked', async () => {
    render(
      <GroupMembersModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    await waitFor(() => {
      const addMembersButton = screen.getByText('Add Members')
      fireEvent.click(addMembersButton)
      expect(screen.getByTestId('add-members-modal')).toBeInTheDocument()
    })
  })

  it('shows management options for members that can be managed', async () => {
    render(
      <GroupMembersModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    await waitFor(() => {
      // Find the dropdown trigger for the second member (who is not admin)
      const dropdownTriggers = screen.getAllByTestId('dropdown-menu-trigger')
      expect(dropdownTriggers.length).toBeGreaterThan(0)
      
      // Click the dropdown for the second member
      fireEvent.click(dropdownTriggers[dropdownTriggers.length - 1])
      
      // Check that management options are present
      expect(screen.getByText('Promote to Moderator')).toBeInTheDocument()
      expect(screen.getByText('Remove from Group')).toBeInTheDocument()
    })
  })

  it('calls onClose when close button is clicked', async () => {
    render(
      <GroupMembersModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    await waitFor(() => {
      const closeButton = screen.getByText('Close')
      fireEvent.click(closeButton)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('sets up websocket listeners when opened', async () => {
    render(
      <GroupMembersModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    await waitFor(() => {
      expect(websocketService.on).toHaveBeenCalledWith('group_member_added', expect.any(Function))
      expect(websocketService.on).toHaveBeenCalledWith('group_member_removed', expect.any(Function))
      expect(websocketService.on).toHaveBeenCalledWith('group_member_role_updated', expect.any(Function))
      expect(websocketService.on).toHaveBeenCalledWith('group_updated', expect.any(Function))
    })
  })

  it('cleans up websocket listeners when unmounted', async () => {
    const { unmount } = render(
      <GroupMembersModal
        isOpen={true}
        onClose={mockOnClose}
        groupId="group1"
        groupName="Test Group"
      />
    )

    await waitFor(() => {
      expect(websocketService.on).toHaveBeenCalled()
    })

    unmount()

    expect(websocketService.off).toHaveBeenCalledWith('group_member_added', expect.any(Function))
    expect(websocketService.off).toHaveBeenCalledWith('group_member_removed', expect.any(Function))
    expect(websocketService.off).toHaveBeenCalledWith('group_member_role_updated', expect.any(Function))
    expect(websocketService.off).toHaveBeenCalledWith('group_updated', expect.any(Function))
  })
})