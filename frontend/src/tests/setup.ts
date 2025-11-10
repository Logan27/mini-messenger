import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test case
afterEach(() => {
  cleanup();
  // Clear storage between tests
  localStorage.clear();
  sessionStorage.clear();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock HTMLMediaElement
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
});

// Mock localStorage with actual storage functionality
const localStorageData: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key];
  }),
  clear: vi.fn(() => {
    for (const key in localStorageData) {
      delete localStorageData[key];
    }
  }),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage with actual storage functionality
const sessionStorageData: Record<string, string> = {};
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageData[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageData[key];
  }),
  clear: vi.fn(() => {
    for (const key in sessionStorageData) {
      delete sessionStorageData[key];
    }
  }),
};
global.sessionStorage = sessionStorageMock as any;

// Mock WebRTC APIs
global.RTCPeerConnection = class RTCPeerConnection {
  constructor() {}
  createOffer() {
    return Promise.resolve({} as RTCSessionDescriptionInit);
  }
  createAnswer() {
    return Promise.resolve({} as RTCSessionDescriptionInit);
  }
  setLocalDescription() {
    return Promise.resolve();
  }
  setRemoteDescription() {
    return Promise.resolve();
  }
  addIceCandidate() {
    return Promise.resolve();
  }
  close() {}
} as any;

// Mock getUserMedia
const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [],
  getVideoTracks: () => [],
  getAudioTracks: () => [],
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
});

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn().mockReturnValue({
    result: {},
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  }),
  deleteDatabase: vi.fn(),
  databases: vi.fn().mockResolvedValue([]),
};
global.indexedDB = indexedDBMock as any;
