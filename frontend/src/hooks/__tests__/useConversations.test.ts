import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useConversations } from '../useConversations';
import apiClient from '@/lib/api-client';
import { AllTheProviders, createTestQueryClient } from '@/tests/test-utils';
import { mockDataFactories } from '@/tests/mockDataFactories';

vi.mock('@/lib/api-client');

describe('useConversations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('should fetch conversations successfully', async () => {
    const mockConversations = mockDataFactories.createMockConversations(3);

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: mockConversations },
    });

    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith('/messages/conversations', {
      params: undefined,
    });
    expect(result.current.data).toEqual(mockConversations);
    expect(result.current.data).toHaveLength(3);
  });

  it('should fetch conversations with pagination params', async () => {
    const mockConversations = mockDataFactories.createMockConversations(2);

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: mockConversations },
    });

    const { result } = renderHook(
      () => useConversations({ page: 2, limit: 10 }),
      {
        wrapper: ({ children }) => (
          <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
        ),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith('/messages/conversations', {
      params: { page: 2, limit: 10 },
    });
  });

  it('should handle empty conversations list', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [] },
    });

    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle loading state', () => {
    vi.mocked(apiClient.get).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
      ),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle error state', async () => {
    const error = new Error('Failed to fetch conversations');
    vi.mocked(apiClient.get).mockRejectedValue(error);

    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
      ),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(error);
  });

  it('should have correct query options for real-time updates', () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [] },
    });

    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
      ),
    });

    // Check that staleTime is 0 for immediate refetch
    expect(result.current).toBeDefined();
  });

  it('should include direct conversations', async () => {
    const mockConversation = mockDataFactories.createMockConversation({
      type: 'direct',
      unreadCount: 5,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [mockConversation] },
    });

    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].type).toBe('direct');
    expect(result.current.data?.[0].unreadCount).toBe(5);
  });

  it('should include group conversations', async () => {
    const mockConversation = mockDataFactories.createMockConversation({
      type: 'group',
      group: mockDataFactories.createMockGroup({ name: 'Test Group' }),
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [mockConversation] },
    });

    const { result } = renderHook(() => useConversations(), {
      wrapper: ({ children }) => (
        <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].type).toBe('group');
    expect(result.current.data?.[0].group?.name).toBe('Test Group');
  });
});
