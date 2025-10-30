import { CallError } from '@/shared/lib/types'

export class CallPermissions {
  private static instance: CallPermissions
  private permissionCache: Map<string, PermissionState> = new Map()

  static getInstance(): CallPermissions {
    if (!CallPermissions.instance) {
      CallPermissions.instance = new CallPermissions()
    }
    return CallPermissions.instance
  }

  // Check if browser supports required APIs
  static checkBrowserSupport(): { supported: boolean; missingFeatures: string[] } {
    const missingFeatures: string[] = []

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      missingFeatures.push('getUserMedia')
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      missingFeatures.push('getDisplayMedia')
    }

    if (!window.RTCPeerConnection) {
      missingFeatures.push('RTCPeerConnection')
    }

    if (!window.RTCDataChannel) {
      missingFeatures.push('RTCDataChannel')
    }

    return {
      supported: missingFeatures.length === 0,
      missingFeatures
    }
  }

  // Request camera and microphone permissions
  async requestMediaPermissions(): Promise<{ granted: boolean; error?: CallError }> {
    try {
      const support = CallPermissions.checkBrowserSupport()
      if (!support.supported) {
        return {
          granted: false,
          error: this.createError(
            'PERMISSION_DENIED',
            `Browser missing required features: ${support.missingFeatures.join(', ')}`
          )
        }
      }

      // Check if permissions API is available
      if (navigator.permissions && navigator.permissions.query) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName })

        this.permissionCache.set('camera', cameraPermission.state)
        this.permissionCache.set('microphone', microphonePermission.state)

        // If permissions are already granted, return success
        if (cameraPermission.state === 'granted' && microphonePermission.state === 'granted') {
          return { granted: true }
        }

        // If permissions are denied, return error
        if (cameraPermission.state === 'denied' || microphonePermission.state === 'denied') {
          return {
            granted: false,
            error: this.createError(
              'PERMISSION_DENIED',
              'Camera or microphone access denied. Please enable permissions in browser settings.'
            )
          }
        }
      }

      // Request permissions by attempting to get media stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        })

        // Immediately stop tracks as we only needed to check permissions
        stream.getTracks().forEach(track => track.stop())

        return { granted: true }
      } catch (error: any) {
        let errorCode: CallError['code'] = 'PERMISSION_DENIED'
        let errorMessage = 'Failed to access camera or microphone'

        switch (error.name) {
          case 'NotAllowedError':
            errorCode = 'PERMISSION_DENIED'
            errorMessage = 'Camera or microphone access denied by user'
            break
          case 'NotFoundError':
            errorCode = 'DEVICE_NOT_FOUND'
            errorMessage = 'No camera or microphone found'
            break
          case 'NotReadableError':
            errorCode = 'DEVICE_NOT_FOUND'
            errorMessage = 'Camera or microphone is already in use by another application'
            break
          case 'OverconstrainedError':
            errorCode = 'DEVICE_NOT_FOUND'
            errorMessage = 'Camera or microphone does not meet requirements'
            break
          case 'SecurityError':
            errorCode = 'PERMISSION_DENIED'
            errorMessage = 'Camera or microphone access blocked for security reasons'
            break
          default:
            errorMessage = `Media access error: ${error.message}`
        }

        return {
          granted: false,
          error: this.createError(errorCode, errorMessage, error)
        }
      }
    } catch (error: any) {
      return {
        granted: false,
        error: this.createError(
          'PERMISSION_DENIED',
          `Permission check failed: ${error.message}`,
          error
        )
      }
    }
  }

  // Request screen share permissions
  async requestScreenSharePermissions(): Promise<{ granted: boolean; error?: CallError }> {
    try {
      const support = CallPermissions.checkBrowserSupport()
      if (!support.supported) {
        return {
          granted: false,
          error: this.createError(
            'PERMISSION_DENIED',
            `Browser missing required features: ${support.missingFeatures.join(', ')}`
          )
        }
      }

      // Check if screen share is supported
      if (!navigator.mediaDevices.getDisplayMedia) {
        return {
          granted: false,
          error: this.createError(
            'PERMISSION_DENIED',
            'Screen sharing is not supported in this browser'
          )
        }
      }

      // Request screen share permission by attempting to get display media
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })

        // Immediately stop tracks as we only needed to check permissions
        stream.getTracks().forEach(track => track.stop())

        return { granted: true }
      } catch (error: any) {
        let errorCode: CallError['code'] = 'PERMISSION_DENIED'
        let errorMessage = 'Failed to access screen sharing'

        switch (error.name) {
          case 'NotAllowedError':
            errorCode = 'PERMISSION_DENIED'
            errorMessage = 'Screen sharing access denied by user'
            break
          case 'NotFoundError':
            errorCode = 'DEVICE_NOT_FOUND'
            errorMessage = 'No screen sharing source found'
            break
          case 'NotSupportedError':
            errorCode = 'PERMISSION_DENIED'
            errorMessage = 'Screen sharing is not supported'
            break
          default:
            errorMessage = `Screen sharing error: ${error.message}`
        }

        return {
          granted: false,
          error: this.createError(errorCode, errorMessage, error)
        }
      }
    } catch (error: any) {
      return {
        granted: false,
        error: this.createError(
          'PERMISSION_DENIED',
          `Screen share permission check failed: ${error.message}`,
          error
        )
      }
    }
  }

  // Check if notifications are allowed for incoming calls
  async checkNotificationPermissions(): Promise<{ granted: boolean; error?: CallError }> {
    try {
      if (!('Notification' in window)) {
        return {
          granted: false,
          error: this.createError(
            'PERMISSION_DENIED',
            'Notifications are not supported in this browser'
          )
        }
      }

      if (Notification.permission === 'granted') {
        return { granted: true }
      }

      if (Notification.permission === 'denied') {
        return {
          granted: false,
          error: this.createError(
            'PERMISSION_DENIED',
            'Notifications are blocked. Please enable them in browser settings.'
          )
        }
      }

      // Request notification permission
      const permission = await Notification.requestPermission()

      if (permission === 'granted') {
        return { granted: true }
      } else {
        return {
          granted: false,
          error: this.createError(
            'PERMISSION_DENIED',
            'Notification permission denied. Incoming call notifications will not be shown.'
          )
        }
      }
    } catch (error: any) {
      return {
        granted: false,
        error: this.createError(
          'PERMISSION_DENIED',
          `Notification permission check failed: ${error.message}`,
          error
        )
      }
    }
  }

  // Get cached permission state
  getCachedPermission(permission: 'camera' | 'microphone'): PermissionState | null {
    return this.permissionCache.get(permission) || null
  }

  // Clear permission cache
  clearPermissionCache(): void {
    this.permissionCache.clear()
  }

  // Show notification for incoming call
  showIncomingCallNotification(call: { initiator: { name: string; avatar?: string }, type: 'audio' | 'video' }): void {
    if (Notification.permission !== 'granted') return

    try {
      const notification = new Notification(`Incoming ${call.type} call`, {
        body: `From ${call.initiator.name}`,
        icon: call.initiator.avatar || '/default-avatar.png',
        tag: 'incoming-call',
        requireInteraction: true,
        silent: false,
        actions: [
          { action: 'accept', title: 'Accept' },
          { action: 'decline', title: 'Decline' }
        ]
      })

      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()

        // Dispatch custom event for call acceptance
        window.dispatchEvent(new CustomEvent('call:notification_clicked', {
          detail: { action: 'focus' }
        }))

        notification.close()
      }

      // Auto-close after 30 seconds
      setTimeout(() => {
        notification.close()
      }, 30000)
    } catch (error) {
      console.error('Failed to show incoming call notification:', error)
    }
  }

  // Create standardized call error
  private createError(code: CallError['code'], message: string, details?: any): CallError {
    return { code, message, details }
  }

  // Validate call requirements
  async validateCallRequirements(): Promise<{ valid: boolean; errors: CallError[] }> {
    const errors: CallError[] = []

    // Check browser support
    const support = CallPermissions.checkBrowserSupport()
    if (!support.supported) {
      errors.push(this.createError(
        'PERMISSION_DENIED',
        `Browser missing required features: ${support.missingFeatures.join(', ')}`
      ))
    }

    // Check media permissions
    const mediaPermissions = await this.requestMediaPermissions()
    if (!mediaPermissions.granted) {
      errors.push(mediaPermissions.error!)
    }

    // Check notification permissions (optional but recommended)
    const notificationPermissions = await this.checkNotificationPermissions()
    if (!notificationPermissions.granted && notificationPermissions.error) {
      // Don't fail the call for notification permissions, just log warning
      console.warn('Notification permissions not granted:', notificationPermissions.error.message)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const callPermissions = CallPermissions.getInstance()