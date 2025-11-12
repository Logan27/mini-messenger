import { StackActions } from '@react-navigation/native';
import * as navigationService from '../navigationService';
import { navigationRef } from '../navigationService';

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: jest.fn(() => ({
    isReady: jest.fn(),
    navigate: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(),
    reset: jest.fn(),
  })),
  StackActions: {
    replace: jest.fn((name, params) => ({ type: 'REPLACE', payload: { name, params } })),
  },
}));

describe('navigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('navigate', () => {
    it('navigates to screen when navigationRef is ready', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(true);

      navigationService.navigate('Login', { email: 'test@example.com' });

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(navigationRef.navigate).toHaveBeenCalledWith('Login', { email: 'test@example.com' });
    });

    it('does not navigate when navigationRef is not ready', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(false);

      navigationService.navigate('Login');

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(navigationRef.navigate).not.toHaveBeenCalled();
    });

    it('navigates without params', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(true);

      navigationService.navigate('Conversations');

      expect(navigationRef.navigate).toHaveBeenCalledWith('Conversations', undefined);
    });
  });

  describe('replace', () => {
    it('replaces current screen when navigationRef is ready', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(true);

      navigationService.replace('Chat', { conversationId: '123' });

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(StackActions.replace).toHaveBeenCalledWith('Chat', { conversationId: '123' });
      expect(navigationRef.dispatch).toHaveBeenCalledWith({
        type: 'REPLACE',
        payload: { name: 'Chat', params: { conversationId: '123' } },
      });
    });

    it('does not replace when navigationRef is not ready', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(false);

      navigationService.replace('Chat');

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(navigationRef.dispatch).not.toHaveBeenCalled();
    });

    it('replaces without params', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(true);

      navigationService.replace('Profile');

      expect(StackActions.replace).toHaveBeenCalledWith('Profile', undefined);
    });
  });

  describe('goBack', () => {
    it('goes back when navigationRef is ready and can go back', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(true);
      (navigationRef.canGoBack as jest.Mock).mockReturnValue(true);

      navigationService.goBack();

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(navigationRef.canGoBack).toHaveBeenCalled();
      expect(navigationRef.goBack).toHaveBeenCalled();
    });

    it('does not go back when navigationRef is not ready', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(false);
      (navigationRef.canGoBack as jest.Mock).mockReturnValue(true);

      navigationService.goBack();

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(navigationRef.canGoBack).not.toHaveBeenCalled();
      expect(navigationRef.goBack).not.toHaveBeenCalled();
    });

    it('does not go back when cannot go back', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(true);
      (navigationRef.canGoBack as jest.Mock).mockReturnValue(false);

      navigationService.goBack();

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(navigationRef.canGoBack).toHaveBeenCalled();
      expect(navigationRef.goBack).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('resets navigation stack when navigationRef is ready', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(true);

      const state = {
        index: 0,
        routes: [{ name: 'Login' }],
      };

      navigationService.reset(state);

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(navigationRef.reset).toHaveBeenCalledWith(state);
    });

    it('does not reset when navigationRef is not ready', () => {
      (navigationRef.isReady as jest.Mock).mockReturnValue(false);

      const state = {
        index: 0,
        routes: [{ name: 'Login' }],
      };

      navigationService.reset(state);

      expect(navigationRef.isReady).toHaveBeenCalled();
      expect(navigationRef.reset).not.toHaveBeenCalled();
    });
  });

  describe('default export', () => {
    it('exports all functions and navigationRef', () => {
      const defaultExport = require('../navigationService').default;

      expect(defaultExport.navigationRef).toBeDefined();
      expect(defaultExport.navigate).toBeDefined();
      expect(defaultExport.replace).toBeDefined();
      expect(defaultExport.goBack).toBeDefined();
      expect(defaultExport.reset).toBeDefined();
    });
  });
});
