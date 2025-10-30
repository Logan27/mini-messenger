import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useMessagingShortcuts } from '@/hooks/useKeyboardNavigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { MessageInput } from '@/components/messaging/MessageInput';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import { cn } from '@/lib/utils';
import { ArrowLeft, MoreVertical, Phone, Video, Search } from 'lucide-react';
import { format } from 'date-fns';

// Mock data for demonstration
const mockMessages = [
  {
    id: '1',
    content: 'Hey! How are you doing?',
    sender: 'other',
    timestamp: new Date(Date.now() - 3600000),
    status: 'read' as const,
    isEdited: false,
    senderName: 'John Doe',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  },
  {
    id: '2',
    content: "I'm doing great! Just working on some new features. How about you?",
    sender: 'me',
    timestamp: new Date(Date.now() - 3000000),
    status: 'read' as const,
    isEdited: false,
  },
  {
    id: '3',
    content: 'Same here! Actually, I wanted to ask you about the new design system we discussed.',
    sender: 'other',
    timestamp: new Date(Date.now() - 2400000),
    status: 'read' as const,
    isEdited: false,
    senderName: 'John Doe',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  },
  {
    id: '4',
    content: 'Oh right! I implemented the Telegram-style components yesterday. They look great!',
    sender: 'me',
    timestamp: new Date(Date.now() - 1800000),
    status: 'read' as const,
    isEdited: true,
  },
];

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [messages, setMessages] = useState(mockMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcuts
  useMessagingShortcuts({
    onSendMessage: () => {
      const input = inputRef.current;
      if (input && input.value.trim()) {
        handleSendMessage(input.value.trim());
      }
    },
    onFocusInput: () => {
      inputRef.current?.focus();
    },
    onSearch: () => {
      // TODO: Implement search in chat
      console.log('Search in chat not implemented yet');
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (content: string) => {
    const newMessage = {
      id: String(messages.length + 1),
      content,
      sender: 'me' as const,
      timestamp: new Date(),
      status: 'sending' as const,
      isEdited: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setReplyToMessage(null);

    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }, 500);

    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === newMessage.id ? { ...msg, status: 'read' } : msg
      ));

      // Simulate reply
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: String(messages.length + 2),
          content: "That's awesome! I'd love to see them. Can you share some screenshots?",
          sender: 'other',
          timestamp: new Date(),
          status: 'read' as const,
          isEdited: false,
          senderName: 'John Doe',
          senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        }]);
      }, 2000);
    }, 1500);
  };

  const handleReply = (message: any) => {
    setReplyToMessage(message);
  };

  const handleEmojiClick = () => {
    // TODO: Implement emoji picker
    console.log('Emoji picker not implemented yet');
  };

  const handleAttach = () => {
    // TODO: Implement file attachment
    console.log('File attachment not implemented yet');
  };

  const handleVoiceRecord = () => {
    // TODO: Implement voice recording
    console.log('Voice recording not implemented yet');
  };

  const chatInfo = {
    id: conversationId || '1',
    name: 'John Doe',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    isOnline: true,
    isTyping: false,
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Chat Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <Avatar className="w-10 h-10">
            <AvatarImage src={chatInfo.avatar} alt={chatInfo.name} />
            <AvatarFallback>
              {chatInfo.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {chatInfo.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {chatInfo.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Search in chat"
          >
            <Search className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Start voice call"
          >
            <Phone className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Start video call"
          >
            <Video className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-chat-bg">
        <div className="flex flex-col px-4 py-4">
          {/* Date separator */}
          <div className="flex items-center justify-center my-4">
            <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
              Today
            </span>
          </div>

          {/* Messages */}
          {messages.map((message, index) => (
            <div key={message.id}>
              <MessageBubble
                content={message.content}
                sender={message.sender}
                timestamp={message.timestamp}
                status={message.status}
                isEdited={message.isEdited}
                senderAvatar={message.senderAvatar}
                senderName={message.senderName}
                showAvatar={message.sender === 'other' && (index === 0 || messages[index - 1].sender !== 'other')}
                isGroupChat={false}
              />

              {/* Date separator for new day */}
              {index < messages.length - 1 &&
                format(messages[index].timestamp, 'yyyy-MM-dd') !== format(messages[index + 1].timestamp, 'yyyy-MM-dd') && (
                <div className="flex items-center justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
                    {format(messages[index + 1].timestamp, 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <TypingIndicator usernames={['John Doe']} />
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput
        ref={inputRef}
        onSend={handleSendMessage}
        onAttach={handleAttach}
        onVoiceRecord={handleVoiceRecord}
        onEmojiClick={handleEmojiClick}
        replyToMessage={replyToMessage}
        onCancelReply={() => setReplyToMessage(null)}
        placeholder="Type a message..."
      />
    </div>
  );
}
