import { Chat, Message } from "@/types/chat";

export const mockChats: Chat[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    lastMessage: "See you tomorrow! 👋",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: "2",
    name: "Development Team",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Team",
    lastMessage: "The new feature is ready for testing",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "3",
    name: "Mike Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    lastMessage: "Thanks for the help!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "4",
    name: "Design Squad",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Design",
    lastMessage: "Updated the mockups in Figma",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    unreadCount: 5,
    isOnline: false,
  },
  {
    id: "5",
    name: "Emma Watson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    lastMessage: "Perfect! Let's do it",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unreadCount: 0,
    isOnline: false,
  },
];

export const mockMessages: Record<string, Message[]> = {
  "1": [
    {
      id: "1",
      text: "Hey! How's the project going?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      isOwn: false,
    },
    {
      id: "2",
      text: "Going great! Just finished the main features",
      timestamp: new Date(Date.now() - 1000 * 60 * 55),
      isOwn: true,
      isRead: true,
      reactions: [
        { emoji: "👍", count: 1, userReacted: false },
        { emoji: "🎉", count: 2, userReacted: true },
      ],
    },
    {
      id: "3",
      text: "That's awesome! Can I take a look?",
      timestamp: new Date(Date.now() - 1000 * 60 * 50),
      isOwn: false,
    },
    {
      id: "4",
      text: "Sure! I'll send you the link in a minute",
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      isOwn: true,
      isRead: true,
      replyTo: {
        id: "3",
        text: "That's awesome! Can I take a look?",
        senderName: "Sarah Johnson",
      },
    },
    {
      id: "5",
      imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop",
      text: "Check out this screenshot!",
      timestamp: new Date(Date.now() - 1000 * 60 * 40),
      isOwn: true,
      isRead: true,
    },
    {
      id: "6",
      text: "Looks amazing! 😍",
      timestamp: new Date(Date.now() - 1000 * 60 * 35),
      isOwn: false,
      reactions: [
        { emoji: "❤️", count: 1, userReacted: true },
      ],
    },
    {
      id: "7",
      text: "Meeting tomorrow at 10 AM?",
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      isOwn: false,
    },
    {
      id: "8",
      text: "See you tomorrow! 👋",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      isOwn: false,
    },
  ],
  "2": [
    {
      id: "1",
      text: "Team standup in 10 minutes!",
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      isOwn: false,
    },
    {
      id: "2",
      text: "I'll be there",
      timestamp: new Date(Date.now() - 1000 * 60 * 115),
      isOwn: true,
      isRead: true,
    },
    {
      id: "3",
      text: "The new feature is ready for testing",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      isOwn: false,
      reactions: [
        { emoji: "🚀", count: 3, userReacted: true },
      ],
    },
  ],
};
