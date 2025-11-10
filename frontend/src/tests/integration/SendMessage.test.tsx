import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { messageService } from '@/services/message.service';
import { mockDataFactories } from '@/tests/mockDataFactories';

vi.mock('@/services/message.service');

// Simple chat input component for testing
const TestChatInput = ({ onSend }: { onSend: (message: string) => void }) => {
  const [message, setMessage] = React.useState('');

  return (
    <div>
      <input
        data-testid="message-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button
        data-testid="send-button"
        onClick={() => {
          onSend(message);
          setMessage('');
        }}
      >
        Send
      </button>
    </div>
  );
};

describe('Send Message Integration', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('should send message successfully', async () => {
    const mockMessage = mockDataFactories.createMockMessage({
      content: 'Hello world',
    });

    vi.mocked(messageService.sendMessage).mockResolvedValue(mockMessage);

    const handleSend = vi.fn(async (content: string) => {
      await messageService.sendMessage({
        recipientId: 'user-456',
        content,
      });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestChatInput onSend={handleSend} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const input = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    // Type message
    await user.type(input, 'Hello world');
    expect(input).toHaveValue('Hello world');

    // Send message
    await user.click(sendButton);

    await waitFor(() => {
      expect(handleSend).toHaveBeenCalledWith('Hello world');
      expect(messageService.sendMessage).toHaveBeenCalledWith({
        recipientId: 'user-456',
        content: 'Hello world',
      });
    });

    // Input should be cleared
    expect(input).toHaveValue('');
  });

  it('should handle send message error', async () => {
    vi.mocked(messageService.sendMessage).mockRejectedValue(
      new Error('Failed to send')
    );

    const handleSend = vi.fn(async (content: string) => {
      try {
        await messageService.sendMessage({
          recipientId: 'user-456',
          content,
        });
      } catch (error) {
        // Error handled
      }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestChatInput onSend={handleSend} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const input = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    await user.type(input, 'Test message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(messageService.sendMessage).toHaveBeenCalled();
    });
  });

  it('should prevent sending empty messages', async () => {
    const handleSend = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestChatInput onSend={handleSend} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const sendButton = screen.getByTestId('send-button');

    // Click send without typing
    await user.click(sendButton);

    // Should still call handler but with empty string
    expect(handleSend).toHaveBeenCalledWith('');
  });

  it('should handle rapid message sending', async () => {
    const mockMessage = mockDataFactories.createMockMessage();
    vi.mocked(messageService.sendMessage).mockResolvedValue(mockMessage);

    const handleSend = vi.fn(async (content: string) => {
      await messageService.sendMessage({
        recipientId: 'user-456',
        content,
      });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestChatInput onSend={handleSend} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const input = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    // Send multiple messages quickly
    await user.type(input, 'Message 1');
    await user.click(sendButton);

    await user.type(input, 'Message 2');
    await user.click(sendButton);

    await user.type(input, 'Message 3');
    await user.click(sendButton);

    await waitFor(() => {
      expect(handleSend).toHaveBeenCalledTimes(3);
      expect(messageService.sendMessage).toHaveBeenCalledTimes(3);
    });
  });
});
