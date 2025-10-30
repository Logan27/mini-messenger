import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContactsList } from '../ContactsList';

// Mock the API client
vi.mock('../../../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the contacts service
vi.mock('../../../../services/contactsService', () => ({
  useContacts: vi.fn(),
}));

import { useContacts } from '../../../../services/contactsService';

const mockUseContacts = vi.mocked(useContacts);

const mockContacts = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar1.jpg',
    status: 'online',
    lastSeen: '2024-01-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: 'https://example.com/avatar2.jpg',
    status: 'offline',
    lastSeen: '2024-01-01T09:00:00Z',
  },
];

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ContactsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockUseContacts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList />);

    expect(screen.getByTestId('contacts-loading')).toBeInTheDocument();
  });

  it('renders empty state when no contacts', () => {
    mockUseContacts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList />);

    expect(screen.getByText('No contacts found')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation by adding contacts')).toBeInTheDocument();
  });

  it('renders contacts list correctly', async () => {
    mockUseContacts.mockReturnValue({
      data: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('displays online status correctly', async () => {
    mockUseContacts.mockReturnValue({
      data: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList />);

    await waitFor(() => {
      const onlineBadge = screen.getByText('Online');
      expect(onlineBadge).toBeInTheDocument();
      expect(onlineBadge).toHaveClass('bg-green-500');
    });
  });

  it('displays offline status correctly', async () => {
    mockUseContacts.mockReturnValue({
      data: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList />);

    await waitFor(() => {
      const offlineBadge = screen.getByText('Offline');
      expect(offlineBadge).toBeInTheDocument();
      expect(offlineBadge).toHaveClass('bg-gray-500');
    });
  });

  it('handles contact click events', async () => {
    const onContactClick = vi.fn();

    mockUseContacts.mockReturnValue({
      data: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList onContactClick={onContactClick} />);

    await waitFor(() => {
      const contactButton = screen.getByRole('button', { name: /john doe/i });
      fireEvent.click(contactButton);

      expect(onContactClick).toHaveBeenCalledWith(mockContacts[0]);
    });
  });

  it('displays error state when API fails', () => {
    const errorMessage = 'Failed to load contacts';

    mockUseContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error(errorMessage),
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList />);

    expect(screen.getByText('Error loading contacts')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows retry button when error occurs', () => {
    const mockRefetch = vi.fn();

    mockUseContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: mockRefetch,
    });

    renderWithQueryClient(<ContactsList />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('filters contacts based on search term', async () => {
    mockUseContacts.mockReturnValue({
      data: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList searchTerm="john" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('displays contact avatars with correct alt text', async () => {
    mockUseContacts.mockReturnValue({
      data: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList />);

    await waitFor(() => {
      const avatars = screen.getAllByRole('img');
      expect(avatars).toHaveLength(2);
      expect(avatars[0]).toHaveAttribute('alt', 'John Doe avatar');
      expect(avatars[1]).toHaveAttribute('alt', 'Jane Smith avatar');
    });
  });

  it('handles keyboard navigation', async () => {
    const onContactClick = vi.fn();

    mockUseContacts.mockReturnValue({
      data: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList onContactClick={onContactClick} />);

    await waitFor(() => {
      const contactButton = screen.getByRole('button', { name: /john doe/i });

      fireEvent.keyDown(contactButton, { key: 'Enter', code: 'Enter' });
      expect(onContactClick).toHaveBeenCalledWith(mockContacts[0]);

      fireEvent.keyDown(contactButton, { key: ' ', code: 'Space' });
      expect(onContactClick).toHaveBeenCalledTimes(2);
    });
  });

  it('displays last seen time for offline contacts', async () => {
    mockUseContacts.mockReturnValue({
      data: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList />);

    await waitFor(() => {
      expect(screen.getByText(/last seen/i)).toBeInTheDocument();
    });
  });

  it('applies custom className to container', () => {
    mockUseContacts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<ContactsList className="custom-contacts-class" />);

    const container = screen.getByTestId('contacts-container');
    expect(container).toHaveClass('custom-contacts-class');
  });
});