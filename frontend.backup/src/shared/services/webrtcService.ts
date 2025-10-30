import {
  WebRTCConnection,
  WebRTCSignal,
  ICECandidateData,
  MediaConstraints,
  CallError,
  Call
} from '@/shared/lib/types'

export interface NetworkQuality {
  packetLoss: number
  latency: number
  jitter: number
  bitrate: number
  quality: 'good' | 'fair' | 'poor'
}

export class WebRTCService {
  private connections: Map<string, WebRTCConnection> = new Map()
  private localStream: MediaStream | null = null
  private screenShareStream: MediaStream | null = null
  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers in production
      // { urls: 'turn:your-turn-server.com:3478', username: '...', credential: '...' }
    ]
  }
  private qualityMonitoringIntervals: Map<string, NodeJS.Timeout> = new Map()
  private previousStats: Map<string, any> = new Map()

  // Initialize local media stream
  async initializeMediaStream(constraints: MediaConstraints): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: constraints.audio,
        video: constraints.video
      })
      return this.localStream
    } catch (error) {
      throw this.createCallError('PERMISSION_DENIED', 'Failed to access camera/microphone', error)
    }
  }

  // Initialize screen share stream
  async initializeScreenShare(): Promise<MediaStream> {
    try {
      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })

      // Handle screen share end
      this.screenShareStream.getTracks().forEach(track => {
        track.onended = () => {
          this.stopScreenShare()
        }
      })

      return this.screenShareStream
    } catch (error) {
      throw this.createCallError('PERMISSION_DENIED', 'Failed to access screen share', error)
    }
  }

  // Create peer connection for a user
  async createPeerConnection(userId: string, isInitiator: boolean = false): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection(this.configuration)

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!)
      })
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.handleICECandidate(userId, event.candidate)
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const connection = this.connections.get(userId)
      if (connection) {
        connection.isConnected = peerConnection.connectionState === 'connected'
        connection.connectionQuality = this.getConnectionQuality(peerConnection)
        connection.lastActivity = Date.now()
      }
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      this.handleRemoteStream(userId, event.streams[0])
    }

    // Create data channel for call control (for initiator)
    if (isInitiator) {
      const dataChannel = peerConnection.createDataChannel('call-control', {
        ordered: true,
        maxPacketLifeTime: 3000
      })

      dataChannel.onopen = () => {
        console.log('Data channel opened for user:', userId)
      }

      dataChannel.onmessage = (event) => {
        this.handleDataChannelMessage(userId, event.data)
      }

      const connection: WebRTCConnection = {
        peerConnection,
        dataChannel,
        isConnected: false,
        connectionQuality: 'disconnected',
        lastActivity: Date.now(),
        retryCount: 0
      }

      this.connections.set(userId, connection)
    } else {
      // Handle incoming data channel (for receiver)
      peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel
        dataChannel.onmessage = (event) => {
          this.handleDataChannelMessage(userId, event.data)
        }

        const connection: WebRTCConnection = {
          peerConnection,
          dataChannel,
          isConnected: false,
          connectionQuality: 'disconnected',
          lastActivity: Date.now(),
          retryCount: 0
        }

        this.connections.set(userId, connection)
      }
    }

    return peerConnection
  }

  // Create and send offer
  async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
    const connection = this.connections.get(userId)
    if (!connection) {
      throw this.createCallError('CONNECTION_FAILED', 'No peer connection found')
    }

    try {
      const offer = await connection.peerConnection.createOffer()
      await connection.peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      throw this.createCallError('WEBRTC_ERROR', 'Failed to create offer', error)
    }
  }

  // Create and send answer
  async createAnswer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const connection = this.connections.get(userId)
    if (!connection) {
      throw this.createCallError('CONNECTION_FAILED', 'No peer connection found')
    }

    try {
      await connection.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await connection.peerConnection.createAnswer()
      await connection.peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      throw this.createCallError('WEBRTC_ERROR', 'Failed to create answer', error)
    }
  }

  // Handle received answer
  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const connection = this.connections.get(userId)
    if (!connection) {
      throw this.createCallError('CONNECTION_FAILED', 'No peer connection found')
    }

    try {
      await connection.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      throw this.createCallError('WEBRTC_ERROR', 'Failed to handle answer', error)
    }
  }

  // Handle ICE candidate
  async handleICECandidate(userId: string, candidate: RTCIceCandidate): Promise<void> {
    const connection = this.connections.get(userId)
    if (!connection) {
      throw this.createCallError('CONNECTION_FAILED', 'No peer connection found')
    }

    try {
      await connection.peerConnection.addIceCandidate(candidate)
    } catch (error) {
      throw this.createCallError('WEBRTC_ERROR', 'Failed to add ICE candidate', error)
    }
  }

  // Handle remote stream
  private handleRemoteStream(userId: string, stream: MediaStream): void {
    // Emit event for remote stream
    window.dispatchEvent(new CustomEvent('webrtc:remote-stream', {
      detail: { userId, stream }
    }))
  }

  // Handle data channel messages
  private handleDataChannelMessage(userId: string, data: string): void {
    try {
      const message = JSON.parse(data)
      window.dispatchEvent(new CustomEvent('webrtc:data-channel-message', {
        detail: { userId, message }
      }))
    } catch (error) {
      console.error('Failed to parse data channel message:', error)
    }
  }

  // Get connection quality based on ICE connection state and stats
  private getConnectionQuality(peerConnection: RTCPeerConnection): WebRTCConnection['connectionQuality'] {
    switch (peerConnection.connectionState) {
      case 'connected':
        return 'excellent'
      case 'connecting':
        return 'good'
      case 'disconnected':
        return 'disconnected'
      case 'failed':
        return 'disconnected'
      case 'new':
        return 'disconnected'
      case 'closed':
        return 'disconnected'
      default:
        return 'disconnected'
    }
  }

  // Collect WebRTC stats
  async collectStats(userId: string): Promise<NetworkQuality | null> {
    const connection = this.connections.get(userId)
    if (!connection) return null

    try {
      const stats = await connection.peerConnection.getStats()
      const previousStats = this.previousStats.get(userId) || {}

      let packetLoss = 0
      let latency = 0
      let jitter = 0
      let bitrate = 0
      let packetsReceived = 0
      let packetsLost = 0
      let roundTripTime = 0
      let jitterBufferDelay = 0

      // Parse stats
      stats.forEach((report: any) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          packetsReceived = report.packetsReceived || 0
          packetsLost = report.packetsLost || 0
          jitterBufferDelay = report.jitterBufferDelay || 0

          // Calculate packet loss percentage
          const totalPackets = packetsReceived + packetsLost
          packetLoss = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0

          // Calculate bitrate
          if (previousStats.bytesReceived) {
            const bytesDiff = report.bytesReceived - previousStats.bytesReceived
            const timeDiff = report.timestamp - previousStats.timestamp
            bitrate = timeDiff > 0 ? (bytesDiff * 8) / timeDiff : 0 // bits per second
          }
        }

        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          roundTripTime = report.currentRoundTripTime * 1000 || 0 // Convert to milliseconds
        }
      })

      // Calculate jitter (simplified - using jitter buffer delay as proxy)
      jitter = jitterBufferDelay / 1000 // Convert to milliseconds

      // Calculate latency
      latency = roundTripTime

      // Store current stats for next calculation
      this.previousStats.set(userId, {
        bytesReceived: stats.get('inbound-rtp')?.bytesReceived || 0,
        timestamp: Date.now()
      })

      // Determine quality based on metrics
      let quality: 'good' | 'fair' | 'poor' = 'good'

      if (packetLoss > 5 || latency > 200 || jitter > 50) {
        quality = 'poor'
      } else if (packetLoss > 2 || latency > 100 || jitter > 20) {
        quality = 'fair'
      }

      return {
        packetLoss,
        latency,
        jitter,
        bitrate,
        quality
      }
    } catch (error) {
      console.error('Failed to collect WebRTC stats:', error)
      return null
    }
  }

  // Start quality monitoring for a user
  startQualityMonitoring(userId: string): void {
    // Stop existing interval if any
    this.stopQualityMonitoring(userId)

    // Start new monitoring interval (every 2 seconds)
    const interval = setInterval(async () => {
      const quality = await this.collectStats(userId)
      if (quality) {
        // Emit quality update event
        window.dispatchEvent(new CustomEvent('webrtc:quality-update', {
          detail: { userId, quality }
        }))

        // Check for quality degradation warnings
        this.checkQualityDegradation(userId, quality)

        // Apply adaptive adjustments if needed
        this.applyAdaptiveAdjustments(userId, quality)
      }
    }, 2000)

    this.qualityMonitoringIntervals.set(userId, interval)
  }

  // Stop quality monitoring for a user
  stopQualityMonitoring(userId: string): void {
    const interval = this.qualityMonitoringIntervals.get(userId)
    if (interval) {
      clearInterval(interval)
      this.qualityMonitoringIntervals.delete(userId)
    }
    this.previousStats.delete(userId)
  }

  // Check for quality degradation and emit warnings
  private checkQualityDegradation(userId: string, quality: NetworkQuality): void {
    if (quality.quality === 'poor') {
      window.dispatchEvent(new CustomEvent('webrtc:quality-warning', {
        detail: {
          userId,
          type: 'degradation',
          message: 'Call quality is poor. Consider reducing video resolution or checking connection.',
          metrics: quality
        }
      }))
    } else if (quality.quality === 'fair') {
      window.dispatchEvent(new CustomEvent('webrtc:quality-warning', {
        detail: {
          userId,
          type: 'fair',
          message: 'Call quality is fair. Minor connection issues detected.',
          metrics: quality
        }
      }))
    }
  }

  // Apply adaptive quality adjustments
  private async applyAdaptiveAdjustments(userId: string, quality: NetworkQuality): Promise<void> {
    const connection = this.connections.get(userId)
    if (!connection) return

    try {
      const sender = connection.peerConnection.getSenders().find(s =>
        s.track && s.track.kind === 'video'
      )

      if (sender && sender.track) {
        const parameters = sender.getParameters()
        
        if (quality.quality === 'poor') {
          // Reduce video quality for poor connections
          if (parameters.encodings && parameters.encodings[0]) {
            // Reduce resolution and bitrate
            parameters.encodings[0].scaleResolutionDownBy = 2
            parameters.encodings[0].maxBitrate = 150000 // 150 kbps
            parameters.encodings[0].maxFramerate = 15
          }
          
          console.log('📉 ADAPTIVE_QUALITY: Reducing video quality due to poor connection')
        } else if (quality.quality === 'fair') {
          // Moderate quality adjustments
          if (parameters.encodings && parameters.encodings[0]) {
            parameters.encodings[0].scaleResolutionDownBy = 1.5
            parameters.encodings[0].maxBitrate = 300000 // 300 kbps
            parameters.encodings[0].maxFramerate = 20
          }
          
          console.log('📊 ADAPTIVE_QUALITY: Adjusting video quality for fair connection')
        } else {
          // Restore full quality for good connections
          if (parameters.encodings && parameters.encodings[0]) {
            parameters.encodings[0].scaleResolutionDownBy = 1
            parameters.encodings[0].maxBitrate = 500000 // 500 kbps
            parameters.encodings[0].maxFramerate = 30
          }
          
          console.log('📈 ADAPTIVE_QUALITY: Restoring full video quality for good connection')
        }

        // Apply the new parameters
        await sender.setParameters(parameters)
      }

      // Update connection quality in the connection object
      connection.connectionQuality = quality.quality === 'good' ? 'excellent' :
                                   quality.quality === 'fair' ? 'good' : 'poor'

      // Emit quality change event
      window.dispatchEvent(new CustomEvent('webrtc:quality-changed', {
        detail: {
          userId,
          previousQuality: connection.connectionQuality,
          newQuality: quality,
          adjustments: {
            bitrate: quality.bitrate,
            latency: quality.latency,
            packetLoss: quality.packetLoss,
            jitter: quality.jitter
          }
        }
      }))
    } catch (error) {
      console.error('❌ ADAPTIVE_QUALITY: Failed to apply adaptive adjustments:', error)
    }
  }

  // Send data channel message
  sendDataChannelMessage(userId: string, message: any): void {
    const connection = this.connections.get(userId)
    if (!connection || !connection.dataChannel || connection.dataChannel.readyState !== 'open') {
      console.warn('Data channel not ready for user:', userId)
      return
    }

    try {
      connection.dataChannel.send(JSON.stringify(message))
    } catch (error) {
      console.error('Failed to send data channel message:', error)
    }
  }

  // Toggle audio track
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }

  // Toggle video track
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }

  // Replace video track (for screen share)
  async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    for (const connection of this.connections.values()) {
      const sender = connection.peerConnection.getSenders().find(s =>
        s.track && s.track.kind === 'video'
      )
      if (sender) {
        await sender.replaceTrack(newTrack)
      }
    }
  }

  // Start screen share
  async startScreenShare(): Promise<MediaStream> {
    const stream = await this.initializeScreenShare()

    // Replace video track with screen share track
    const screenTrack = stream.getVideoTracks()[0]
    await this.replaceVideoTrack(screenTrack)

    return stream
  }

  // Stop screen share
  async stopScreenShare(): Promise<void> {
    if (this.screenShareStream) {
      this.screenShareStream.getTracks().forEach(track => track.stop())
      this.screenShareStream = null
    }

    // Restore camera track if available
    if (this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0]
      if (cameraTrack) {
        await this.replaceVideoTrack(cameraTrack)
      }
    }
  }

  // Get available media devices
  async getAvailableDevices(): Promise<{
    audioInputs: MediaDeviceInfo[]
    videoInputs: MediaDeviceInfo[]
    audioOutputs: MediaDeviceInfo[]
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()

      return {
        audioInputs: devices.filter(device => device.kind === 'audioinput'),
        videoInputs: devices.filter(device => device.kind === 'videoinput'),
        audioOutputs: devices.filter(device => device.kind === 'audiooutput')
      }
    } catch (error) {
      throw this.createCallError('DEVICE_NOT_FOUND', 'Failed to get media devices', error)
    }
  }

  // Change audio input device
  async changeAudioInput(deviceId: string): Promise<void> {
    try {
      const constraints: MediaConstraints = {
        audio: { deviceId: { exact: deviceId } },
        video: this.localStream ? this.localStream.getVideoTracks()[0]?.getSettings() : false
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Replace audio track
      if (this.localStream) {
        const oldAudioTrack = this.localStream.getAudioTracks()[0]
        if (oldAudioTrack) {
          oldAudioTrack.stop()
          this.localStream.removeTrack(oldAudioTrack)
        }

        const newAudioTrack = newStream.getAudioTracks()[0]
        this.localStream.addTrack(newAudioTrack)

        // Update all peer connections
        for (const connection of this.connections.values()) {
          const sender = connection.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'audio'
          )
          if (sender) {
            await sender.replaceTrack(newAudioTrack)
          }
        }
      }
    } catch (error) {
      throw this.createCallError('DEVICE_NOT_FOUND', 'Failed to change audio device', error)
    }
  }

  // Change video input device
  async changeVideoInput(deviceId: string): Promise<void> {
    try {
      const constraints: MediaConstraints = {
        audio: this.localStream ? this.localStream.getAudioTracks()[0]?.getSettings() : false,
        video: { deviceId: { exact: deviceId } }
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Replace video track
      if (this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0]
        if (oldVideoTrack) {
          oldVideoTrack.stop()
          this.localStream.removeTrack(oldVideoTrack)
        }

        const newVideoTrack = newStream.getVideoTracks()[0]
        this.localStream.addTrack(newVideoTrack)

        // Update all peer connections
        for (const connection of this.connections.values()) {
          const sender = connection.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          )
          if (sender) {
            await sender.replaceTrack(newVideoTrack)
          }
        }
      }
    } catch (error) {
      throw this.createCallError('DEVICE_NOT_FOUND', 'Failed to change video device', error)
    }
  }

  // Get connection stats
  async getConnectionStats(userId: string): Promise<RTCStatsReport | null> {
    const connection = this.connections.get(userId)
    if (!connection) return null

    try {
      return await connection.peerConnection.getStats()
    } catch (error) {
      console.error('Failed to get connection stats:', error)
      return null
    }
  }

  // Close connection
  closeConnection(userId: string): void {
    const connection = this.connections.get(userId)
    if (connection) {
      connection.peerConnection.close()
      this.connections.delete(userId)
    }
    // Stop quality monitoring
    this.stopQualityMonitoring(userId)
  }

  // Close all connections
  closeAllConnections(): void {
    for (const [userId] of this.connections) {
      this.closeConnection(userId)
    }
  }

  // Cleanup resources
  cleanup(): void {
    this.closeAllConnections()

    // Clear all quality monitoring intervals
    for (const [userId] of this.qualityMonitoringIntervals) {
      this.stopQualityMonitoring(userId)
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.screenShareStream) {
      this.screenShareStream.getTracks().forEach(track => track.stop())
      this.screenShareStream = null
    }
  }

  // Get current local stream
  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  // Get remote streams
  getRemoteStreams(): Map<string, MediaStream> {
    const remoteStreams = new Map<string, MediaStream>()

    for (const [userId, connection] of this.connections) {
      const receivers = connection.peerConnection.getReceivers()
      for (const receiver of receivers) {
        if (receiver.track && receiver.track.kind === 'video') {
          // Create a stream from the receiver track
          const stream = new MediaStream([receiver.track])
          remoteStreams.set(userId, stream)
          break
        }
      }
    }

    return remoteStreams
  }

  // Create call error
  private createCallError(code: CallError['code'], message: string, details?: any): CallError {
    return { code, message, details }
  }

  // Handle WebRTC signaling
  async handleSignalingMessage(message: WebRTCSignal): Promise<void> {
    switch (message.type) {
      case 'offer':
        // Handle incoming offer
        break
      case 'answer':
        // Handle incoming answer
        break
      case 'ice-candidate':
        // Handle ICE candidate
        break
      case 'call-initiate':
        // Handle call initiation
        break
      case 'call-accept':
        // Handle call acceptance
        break
      case 'call-decline':
        // Handle call decline
        break
      case 'call-end':
        // Handle call end
        break
    }
  }
}

// Singleton instance
export const webrtcService = new WebRTCService()