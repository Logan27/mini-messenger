# Messenger Mobile App

A React Native mobile application for the Messenger platform, built with Expo for cross-platform compatibility.

## 🚀 Features

### Core Features
- **Real-time Messaging**: Instant messaging with WebSocket integration
- **Authentication**: Secure login with biometric support (fingerprint/face ID)
- **Push Notifications**: Firebase Cloud Messaging integration
- **File Sharing**: Photo, video, and document sharing
- **Contact Integration**: Native contact book access and synchronization
- **Offline Support**: Graceful offline message handling

### Mobile-Optimized UX
- **Touch-Friendly Interface**: Optimized for mobile touch interactions
- **Gesture Navigation**: Swipe gestures for message actions
- **Keyboard-Aware Forms**: Smart keyboard handling and scrolling
- **Responsive Design**: Adaptive layouts for different screen sizes
- **Performance Optimized**: Battery and memory efficient

## 📱 Platforms

- **iOS**: iOS 12.0+
- **Android**: Android 8.0+ (API level 26+)

## 🛠️ Tech Stack

### Core Technologies
- **React Native** 0.81.4
- **Expo** SDK 54
- **TypeScript** for type safety
- **React Navigation** v6 for navigation

### State Management
- **Zustand** for global state management
- **React Query** for server state management
- **AsyncStorage** for local persistence

### Real-time Communication
- **Socket.io-client** for WebSocket connections
- **Expo Notifications** for push notifications

### Development Tools
- **Jest** for unit testing
- **React Native Testing Library** for component testing
- **ESLint** for code linting
- **TypeScript** for type checking

## 📂 Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── messaging/      # Messaging screens
│   │   └── profile/        # Profile and settings screens
│   ├── services/           # API and external services
│   ├── stores/             # Zustand state stores
│   ├── navigation/         # Navigation configuration
│   ├── utils/              # Utility functions and helpers
│   ├── types/              # TypeScript type definitions
│   ├── hooks/              # Custom React hooks
│   └── constants/          # App constants
├── assets/                 # Static assets (icons, images)
├── __tests__/             # Test files
└── docs/                  # Documentation
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development on macOS)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd messenger/mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file based on .env.example
   cp .env.example .env
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on platforms**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web (for testing)
   npm run web
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
API_URL=http://localhost:3001
WS_URL=ws://localhost:3001

# Push Notifications
EXPO_ACCESS_TOKEN=your-expo-access-token

# Optional: Custom configurations
ENABLE_BIOMETRIC=true
MAX_FILE_SIZE=10485760
```

### App Configuration

The `app.json` file contains Expo-specific configuration:

- **Bundle Identifier**: `com.messenger.app`
- **Version**: `1.0.0`
- **Permissions**: Camera, Contacts, Notifications, etc.
- **Build Settings**: Optimized for production

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Test Coverage

The project maintains **70%+ coverage** across:
- Unit tests for utilities and services
- Component tests for screens and UI elements
- Integration tests for API calls
- E2E tests for critical user flows

### Testing Tools

- **Jest**: Test runner and assertion library
- **React Native Testing Library**: Component testing utilities
- **Mock Services**: Comprehensive mocking for external dependencies

## 📦 Building for Production

### Android

```bash
# Build APK (debug)
npm run build:apk

# Build AAB (release)
npm run build:aab

# Build using EAS Build (recommended)
eas build --platform android
```

### iOS

```bash
# Build using EAS Build (recommended)
eas build --platform ios
```

### Code Optimization

```bash
# Run optimization checks
npm run optimize

# Bundle analyzer (development)
npx expo-bundle-analyzer
```

## 🔐 Security Features

### Authentication
- **Secure Token Storage**: Encrypted AsyncStorage
- **Biometric Authentication**: Fingerprint/Face ID support
- **JWT Token Management**: Automatic refresh and validation

### Data Protection
- **End-to-End Encryption**: Messages encrypted before transmission
- **Secure File Upload**: Virus scanning and validation
- **Privacy Compliance**: GDPR-ready data handling

### Network Security
- **Certificate Pinning**: Prevents man-in-the-middle attacks
- **Secure WebSocket**: WSS encryption for real-time features
- **API Security**: Rate limiting and request validation

## 🚀 Performance Optimizations

### Bundle Optimization
- **Tree Shaking**: Eliminates unused code
- **Code Splitting**: Lazy loading for better performance
- **Asset Optimization**: Compressed images and optimized fonts

### Runtime Performance
- **Memory Management**: Efficient memory usage patterns
- **Battery Optimization**: Background task optimization
- **Network Efficiency**: Smart caching and request batching

### Monitoring
- **Performance Tracking**: Built-in performance monitoring
- **Error Reporting**: Comprehensive error tracking
- **Analytics**: User behavior and performance metrics

## 🔄 CI/CD Pipeline

### Automated Testing
- **Unit Tests**: All utilities and services
- **Integration Tests**: API and external service integration
- **E2E Tests**: Critical user journey testing

### Code Quality
- **Linting**: ESLint with React Native rules
- **Type Checking**: TypeScript strict mode
- **Security Scanning**: Automated vulnerability detection

### Deployment
- **Automated Builds**: Platform-specific build automation
- **App Store Deployment**: Automated submission process
- **Version Management**: Semantic versioning and changelog

## 📚 Documentation

### Code Documentation
- **TypeScript Types**: Comprehensive type definitions
- **Component Documentation**: Prop descriptions and examples
- **Service Documentation**: API usage and configuration

### User Documentation
- **Setup Guide**: Development environment setup
- **API Documentation**: Integration guides for backend
- **Deployment Guide**: Production deployment instructions

## 🤝 Contributing

### Development Workflow
1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Write Tests**: Ensure test coverage for new features
3. **Implement Feature**: Follow React Native best practices
4. **Code Review**: Submit pull request for review
5. **Testing**: Ensure all tests pass
6. **Merge**: Merge to main branch

### Code Standards
- **ESLint**: Follow configured linting rules
- **TypeScript**: Strict type checking enabled
- **Testing**: 70%+ test coverage required
- **Documentation**: Document new features and APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join community discussions for help

### Troubleshooting
- **Common Issues**: Check the troubleshooting guide
- **Performance**: Use React Native Debugger for debugging
- **Testing**: Ensure all dependencies are properly installed

---

**Built with ❤️ using React Native and Expo**