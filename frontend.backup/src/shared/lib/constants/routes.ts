export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  CHAT: '/chat/:conversationId',
  MESSAGES: '/messages',
  CONTACTS: '/contacts',
  SETTINGS: '/settings',
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_PENDING: '/admin/pending',
  ADMIN_SETTINGS: '/admin/settings',
} as const

export type RouteKeys = keyof typeof ROUTES
export type RouteValues = typeof ROUTES[RouteKeys]