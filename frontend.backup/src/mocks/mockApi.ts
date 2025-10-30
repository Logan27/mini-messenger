// Mock API для тестирования без backend
export const mockAuthApi = {
  async register(userData: { username: string; email: string; password: string }) {
    // Симуляция задержки сети
    await new Promise(resolve => setTimeout(resolve, 500))

    // Сохраняем пользователя в localStorage для демо
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]')

    // Проверка на существование
    if (users.some((u: any) => u.email === userData.email)) {
      throw new Error('User already exists')
    }

    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    localStorage.setItem('mock_users', JSON.stringify(users))

    return {
      data: {
        user: newUser,
        token: `mock_token_${newUser.id}`,
      },
    }
  },

  async login(credentials: { email: string; password: string }) {
    await new Promise(resolve => setTimeout(resolve, 500))

    const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
    const user = users.find((u: any) => u.email === credentials.email)

    if (!user) {
      throw new Error('Invalid credentials')
    }

    return {
      data: {
        user,
        token: `mock_token_${user.id}`,
      },
    }
  },
}
