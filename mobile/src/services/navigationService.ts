import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { RootStackParamList } from '../types';

// Create a navigation ref that can be used outside of React components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen
 */
export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params);
  }
}

/**
 * Replace current screen
 */
export function replace(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.replace(name as any, params));
  }
}

/**
 * Go back
 */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

/**
 * Reset navigation stack
 */
export function reset(state: any) {
  if (navigationRef.isReady()) {
    navigationRef.reset(state);
  }
}

export default {
  navigationRef,
  navigate,
  replace,
  goBack,
  reset,
};
