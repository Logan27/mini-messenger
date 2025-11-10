/**
 * Extract error message from axios error response
 * Provides consistent error message extraction across the application
 *
 * @param error - The error object from axios or other sources
 * @param defaultMessage - Default message to show if error extraction fails
 * @returns Extracted error message string
 */
export function getErrorMessage(error: any, defaultMessage: string = "An error occurred. Please try again."): string {
  // Check for axios error response
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for axios error response with error field
  if (error.response?.data?.error) {
    return typeof error.response.data.error === 'string'
      ? error.response.data.error
      : error.response.data.error.message || defaultMessage;
  }

  // Check for validation errors array
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    const firstError = error.response.data.errors[0];
    if (firstError?.msg) {
      return firstError.msg;
    }
    if (firstError?.message) {
      return firstError.message;
    }
  }

  // Check for standard error message
  if (error.message) {
    return error.message;
  }

  // Return default message
  return defaultMessage;
}

/**
 * Extract validation errors from axios error response
 * Returns an array of validation error objects
 *
 * @param error - The error object from axios
 * @returns Array of validation errors or empty array
 */
export function getValidationErrors(error: unknown): Array<{ field: string; message: string }> {
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    return error.response.data.errors.map((err: any) => ({
      field: err.param || err.path || 'unknown',
      message: err.msg || err.message || 'Validation error',
    }));
  }

  return [];
}
