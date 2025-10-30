# Performance & Integration Test Cases

## PERFORMANCE TESTING

## TC-PF-001: Message Delivery Performance

### Test Scenario 1.1: Message Delivery Latency - Normal Load
**Priority:** High
**Requirement:** NFR-PF-001

**Test Steps:**
1. User A sends 100 messages to User B (both online)
2. Measure time from send to delivery confirmation for each
3. Calculate: median, 95th percentile, 99th percentile

**Expected Results:**
- Median latency: <200ms
- 95th percentile: <500ms
- 99th percentile: <1000ms
- Measured from client send to server delivery confirmation
- Consistent performance

---

### Test Scenario 1.2: Message Delivery Under Concurrent Load
**Priority:** High
**Requirement:** NFR-PF-001

**Test Steps:**
1. Simulate 40 concurrent users
2. Each sends 10 messages simultaneously
3. Measure delivery latency

**Expected Results:**
- 95th percentile still <500ms under load
- No significant degradation
- System handles concurrent load
- Message queue processes efficiently

---

### Test Scenario 1.3: Message Delivery to Offline Users
**Priority:** Medium
**Requirement:** NFR-PF-001

**Test Steps:**
1. Send messages to offline users
2. Users come online
3. Measure delivery time when online

**Expected Results:**
- Messages queued efficiently
- Delivered within 500ms of user coming online
- No message loss
- Queue performance acceptable

---

## TC-PF-002: Page Load Performance

### Test Scenario 2.1: Initial Page Load Time
**Priority:** High
**Requirement:** NFR-PF-002

**Test Steps:**
1. Clear browser cache
2. Navigate to application URL
3. Measure time to page load
4. Measure time to interactive

**Expected Results:**
- Initial page load: <2 seconds
- Time to interactive: <3 seconds
- Measured on simulated 3G network (throttled)
- Assets optimized (minified, compressed)
- Critical rendering path optimized

---

### Test Scenario 2.2: Lighthouse Performance Score
**Priority:** High
**Requirement:** NFR-PF-002

**Test Steps:**
1. Run Lighthouse audit on homepage
2. Check performance score

**Expected Results:**
- Lighthouse performance score: >90
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Total Blocking Time: <300ms
- Cumulative Layout Shift: <0.1
- Speed Index: <3.0s

---

### Test Scenario 2.3: Code Splitting and Lazy Loading
**Priority:** Medium
**Requirement:** NFR-PF-002

**Test Steps:**
1. Inspect network requests on initial load
2. Navigate to different sections
3. Observe additional resource loading

**Expected Results:**
- Initial bundle size <200KB (gzipped)
- Code split by route
- Non-critical components lazy-loaded
- Efficient resource loading
- Fast initial load

---

### Test Scenario 2.4: Subsequent Page Loads (Cached)
**Priority:** Low
**Requirement:** NFR-PF-002

**Test Steps:**
1. Load page once
2. Navigate away
3. Return to page
4. Measure load time

**Expected Results:**
- Cached load: <500ms
- Assets served from cache
- Service worker utilized (if implemented)
- Fast repeat visits

---

## TC-PF-003: System Availability

### Test Scenario 3.1: Uptime Measurement
**Priority:** High
**Requirement:** NFR-PF-003

**Test Steps:**
1. Monitor system over 30 days
2. Track downtime incidents
3. Calculate uptime percentage

**Expected Results:**
- Uptime: ≥99.5%
- Maximum downtime: 3.5 hours per month
- Uptime SLA met
- Availability monitored

---

### Test Scenario 3.2: Planned Maintenance Notification
**Priority:** Medium
**Requirement:** NFR-PF-003

**Test Steps:**
1. Admin schedules maintenance
2. Check user notifications

**Expected Results:**
- Maintenance announced 48 hours in advance
- Notification sent via email and in-app
- Users informed of downtime window
- Advance notice provided

---

### Test Scenario 3.3: Graceful Degradation
**Priority:** High
**Requirement:** NFR-PF-003

**Test Steps:**
1. Simulate Redis failure (cache down)
2. Observe system behavior

**Expected Results:**
- System continues to function
- Falls back to database for cached data
- Performance may degrade but system operational
- Graceful degradation
- Users not blocked

---

### Test Scenario 3.4: Health Check Endpoint
**Priority:** High
**Requirement:** NFR-PF-003

**Test Steps:**
1. Send GET request to /health or /api/health
2. Measure response time

**Expected Results:**
- Health check responds with 200 OK
- Response time: <100ms
- Includes: database status, cache status, disk space
- Used by monitoring/load balancers
- Fast health checks

---

### Test Scenario 3.5: Automatic Failover
**Priority:** Medium
**Requirement:** NFR-PF-003

**Test Steps:**
1. Simulate primary database failure
2. Observe system recovery

**Expected Results:**
- Automatic failover to standby (if configured)
- Minimal downtime (<5 minutes)
- Data integrity maintained
- Failover transparent to users (as much as possible)

---

## TC-PF-004: Concurrent User Support

### Test Scenario 4.1: 40 Concurrent WebSocket Connections
**Priority:** High
**Requirement:** NFR-PF-004

**Test Steps:**
1. Simulate 40 users logging in simultaneously
2. Each establishes WebSocket connection
3. Monitor system performance

**Expected Results:**
- All 40 connections established successfully
- No connection failures
- System stable
- CPU/RAM within acceptable limits (<80% usage)
- No performance degradation

---

### Test Scenario 4.2: Performance at Capacity
**Priority:** High
**Requirement:** NFR-PF-004

**Test Steps:**
1. Run load test with 40 concurrent users
2. Each user sends 10 messages, makes 2 calls, uploads 1 file
3. Measure system performance

**Expected Results:**
- No performance degradation at capacity
- Response times within SLA
- All operations succeed
- System handles capacity without issues

---

### Test Scenario 4.3: Load Test to 150% Capacity (60 Users)
**Priority:** High
**Requirement:** NFR-PF-004

**Test Steps:**
1. Load test with 60 concurrent users
2. Observe system behavior

**Expected Results:**
- System remains stable at 150% capacity
- May show degraded performance but not crash
- Queuing mechanism handles over-capacity
- Graceful degradation
- No data loss

---

### Test Scenario 4.4: Resource Usage Monitoring
**Priority:** Medium
**Requirement:** NFR-PF-004

**Test Steps:**
1. Monitor system under load: CPU, RAM, disk I/O, network
2. Track metrics over time

**Expected Results:**
- Resource usage tracked via Prometheus
- Dashboards in Grafana
- Alerts configured for thresholds
- Proactive monitoring

---

## TC-PF-005: Video Call Quality

### Test Scenario 5.1: Default 720p Resolution
**Priority:** High
**Requirement:** NFR-PF-005

**Test Steps:**
1. Establish video call
2. Check video resolution and frame rate

**Expected Results:**
- Default resolution: 720p (1280x720)
- Frame rate: ≥25fps
- Video smooth and clear
- Quality acceptable

---

### Test Scenario 5.2: Adaptive Bitrate Based on Bandwidth
**Priority:** High
**Requirement:** NFR-PF-005

**Test Steps:**
1. Start video call with good bandwidth
2. Throttle network to simulate poor connection
3. Observe video quality adaptation

**Expected Results:**
- Initial quality: 720p
- Network degradation detected
- Quality automatically reduced (e.g., 480p, 360p)
- Call continues with lower quality
- Adaptive bitrate working

---

### Test Scenario 5.3: Audio Codec - Opus
**Priority:** High
**Requirement:** NFR-PF-005

**Test Steps:**
1. Establish call
2. Inspect WebRTC connection
3. Check audio codec

**Expected Results:**
- Audio codec: Opus
- High-quality audio
- Low latency
- Industry-standard codec

---

### Test Scenario 5.4: Video Codec - VP8 or H.264
**Priority:** High
**Requirement:** NFR-PF-005

**Test Steps:**
1. Establish call
2. Check video codec

**Expected Results:**
- Video codec: VP8 or H.264
- Browser compatibility
- Efficient compression
- Good quality

---

### Test Scenario 5.5: Call Quality Metrics Logging
**Priority:** Medium
**Requirement:** NFR-PF-005

**Test Steps:**
1. Complete video call
2. Check logged metrics

**Expected Results:**
- Metrics logged: bitrate, packet loss, jitter, latency, resolution, frame rate
- Stored in calls table or separate metrics table
- Used for quality monitoring and improvement

---

---

## SCALABILITY & RELIABILITY

## TC-SC-001: User Scalability

### Test Scenario 1.1: Support 100 Registered Users
**Priority:** Medium
**Requirement:** NFR-SC-001

**Test Steps:**
1. Create 100 user accounts
2. Verify database performance
3. Check system resource usage

**Expected Results:**
- All 100 users created successfully
- Database handles 100 users efficiently
- No performance issues
- System designed for this scale

---

### Test Scenario 1.2: Performance Testing at 100 Users
**Priority:** Medium
**Requirement:** NFR-SC-001

**Test Steps:**
1. Simulate usage patterns with 100 users
2. 40 concurrent, 60 intermittent
3. Monitor performance

**Expected Results:**
- System performs well with 100 total users
- 40 concurrent active without issues
- Resource usage projected and acceptable
- Scalability validated

---

### Test Scenario 1.3: User Limit Enforcement
**Priority:** Low
**Requirement:** NFR-SC-001

**Test Steps:**
1. Attempt to register 101st user (if hard limit implemented)

**Expected Results:**
- Registration blocked OR warning shown
- User limit configurable (not hard-coded)
- Graceful handling

---

## TC-SC-002: Storage Scalability

### Test Scenario 2.1: Storage Monitoring and Alerts
**Priority:** Medium
**Requirement:** NFR-SC-002

**Test Steps:**
1. Monitor storage usage
2. Simulate reaching 80% capacity (128GB / 160GB)
3. Check alerts

**Expected Results:**
- Storage usage tracked in admin dashboard
- Alert triggered at 80% capacity
- Admin notified via email/push
- Proactive monitoring

---

### Test Scenario 2.2: Automatic Message Cleanup
**Priority:** High
**Requirement:** NFR-SC-002

**Test Steps:**
1. Check messages older than 30 days
2. Verify automatic deletion

**Expected Results:**
- Old messages deleted automatically (cron job)
- Storage freed
- Cleanup runs daily
- Efficient storage management

---

### Test Scenario 2.3: File Compression
**Priority:** Low
**Requirement:** NFR-SC-002

**Test Steps:**
1. Upload image file
2. Check stored file size

**Expected Results:**
- Images optimized/compressed (where applicable)
- Storage efficiency
- Quality maintained
- File compression implemented

---

### Test Scenario 2.4: Storage Growth Rate Tracking
**Priority:** Low
**Requirement:** NFR-SC-002

**Test Steps:**
1. View storage metrics over 30 days
2. Check growth trend

**Expected Results:**
- Growth rate calculated: GB per day/week
- Projected time to capacity
- Dashboard shows trend chart
- Capacity planning data available

---

## TC-SC-003: Message Throughput

### Test Scenario 3.1: 1000 Messages Per Minute
**Priority:** High
**Requirement:** NFR-SC-003

**Test Steps:**
1. Simulate 1000 messages sent across system in 1 minute
2. Monitor message queue and processing

**Expected Results:**
- All 1000 messages processed successfully
- No message loss
- Queue handles throughput
- Message delivery within SLA (<500ms)
- System performs well

---

### Test Scenario 3.2: No Message Loss Under Load
**Priority:** High
**Requirement:** NFR-SC-003

**Test Steps:**
1. Send 5000 messages in 5 minutes
2. Verify all messages delivered

**Expected Results:**
- All messages accounted for
- No message loss
- Delivery confirmations match sent count
- Reliable message delivery

---

### Test Scenario 3.3: Queue Depth Monitoring
**Priority:** Medium
**Requirement:** NFR-SC-003

**Test Steps:**
1. Monitor message queue during high load
2. Check queue depth metrics

**Expected Results:**
- Queue depth tracked (number of pending messages)
- Dashboard displays queue metrics
- Alerts if queue grows too large
- Monitoring in place

---

### Test Scenario 3.4: Backpressure Mechanism
**Priority:** Medium
**Requirement:** NFR-SC-003

**Test Steps:**
1. Overload system with 2000 messages per minute
2. Observe backpressure handling

**Expected Results:**
- System applies backpressure when overloaded
- Rate limiting enforced
- Requests queued or rejected gracefully
- System does not crash
- Overload protection

---

---

## INTEGRATION TESTING

## TC-INT-001: WebSocket Integration

### Test Scenario 1.1: WebSocket Connection Lifecycle
**Priority:** High
**Requirement:** FR-RT-001

**Test Steps:**
1. User logs in
2. WebSocket connection established
3. Send/receive messages
4. User logs out
5. Observe connection close

**Expected Results:**
- WebSocket connects on login
- Authentication via JWT token
- Bidirectional communication works
- Connection closed on logout
- Clean lifecycle

---

### Test Scenario 1.2: WebSocket Auto-Reconnect
**Priority:** High
**Requirement:** FR-RT-001

**Test Steps:**
1. Establish WebSocket connection
2. Simulate network disconnect
3. Restore network
4. Observe reconnection

**Expected Results:**
- Auto-reconnect triggered on disconnect
- Max 5 retry attempts with exponential backoff
- Connection restored successfully
- User notified during reconnection
- Resilient connection

---

### Test Scenario 1.3: Heartbeat Ping/Pong
**Priority:** Medium
**Requirement:** FR-RT-001

**Test Steps:**
1. Establish connection
2. Monitor WebSocket ping/pong messages
3. Simulate no pong response

**Expected Results:**
- Heartbeat ping sent every 25 seconds
- Server responds with pong
- Connection timeout after 60 seconds of no pong
- Keep-alive mechanism working

---

## TC-INT-002: Database Integration

### Test Scenario 2.1: Database Connection Pool
**Priority:** High
**Requirement:** Performance

**Test Steps:**
1. Simulate 20 concurrent database queries
2. Monitor connection pool

**Expected Results:**
- Connection pool configured: min 5, max 20
- Connections reused efficiently
- No connection exhaustion
- Queries execute successfully

---

### Test Scenario 2.2: Database Transaction Rollback
**Priority:** High
**Requirement:** Data Integrity

**Test Steps:**
1. Initiate operation requiring transaction (send message with file)
2. Simulate error mid-transaction
3. Verify rollback

**Expected Results:**
- Transaction rolled back on error
- No partial data committed
- Database consistency maintained
- ACID properties enforced

---

### Test Scenario 2.3: Database Query Performance
**Priority:** High
**Requirement:** Performance

**Test Steps:**
1. Execute common queries (get messages, search users)
2. Measure execution time

**Expected Results:**
- Queries execute within <100ms
- Indexes utilized
- Explain plans optimized
- Efficient queries

---

## TC-INT-003: Redis Cache Integration

### Test Scenario 3.1: Cache Hit/Miss Behavior
**Priority:** High
**Requirement:** Performance

**Test Steps:**
1. Request user profile (not in cache)
2. Request same profile again
3. Monitor cache

**Expected Results:**
- First request: cache miss, fetched from DB, stored in cache
- Second request: cache hit, served from Redis
- Cache TTL configured (e.g., 10 minutes)
- Cache improves performance

---

### Test Scenario 3.2: Cache Invalidation
**Priority:** High
**Requirement:** Data Consistency

**Test Steps:**
1. User profile cached
2. User updates profile
3. Request profile again

**Expected Results:**
- Profile update invalidates cache
- Fresh data fetched from DB
- Cache updated with new data
- Data consistency maintained

---

### Test Scenario 3.3: Redis Connection Failure Handling
**Priority:** High
**Requirement:** Reliability

**Test Steps:**
1. Simulate Redis down
2. Attempt to access cached data

**Expected Results:**
- System falls back to database
- No errors shown to user
- Performance degrades but system functional
- Graceful degradation

---

## TC-INT-004: Email Service Integration

### Test Scenario 4.1: Email Delivery Success
**Priority:** High
**Requirement:** FR-NT-001

**Test Steps:**
1. User registers
2. Wait for verification email

**Expected Results:**
- Email sent via SendGrid/AWS SES
- Email delivered within 1 minute
- Email content correct (verification link)
- Email received in inbox

---

### Test Scenario 4.2: Email Delivery Failure Retry
**Priority:** High
**Requirement:** FR-NT-001

**Test Steps:**
1. Simulate email service failure
2. Trigger email event
3. Observe retry behavior

**Expected Results:**
- Email send fails initially
- System retries up to 3 times
- Exponential backoff between retries
- Email eventually sent or marked as failed
- Resilient email delivery

---

### Test Scenario 4.3: Email Unsubscribe
**Priority:** Medium
**Requirement:** FR-NT-001

**Test Steps:**
1. User clicks "Unsubscribe" link in marketing email
2. Verify unsubscribe status

**Expected Results:**
- User unsubscribed from non-critical emails
- Status updated in database
- Future marketing emails not sent
- User can re-subscribe if desired

---

## TC-INT-005: File Storage Integration

### Test Scenario 5.1: File Upload to Storage
**Priority:** High
**Requirement:** FR-FL-001

**Test Steps:**
1. Upload file via API
2. Verify file stored on disk/object storage

**Expected Results:**
- File saved to configured storage location
- Filename unique (hashed or UUID)
- File metadata in database
- File accessible for download

---

### Test Scenario 5.2: File Download from Storage
**Priority:** High
**Requirement:** FR-FL-002

**Test Steps:**
1. Request file download
2. Verify file served correctly

**Expected Results:**
- File retrieved from storage
- Correct MIME type set
- Content-Disposition header set
- File downloads successfully

---

### Test Scenario 5.3: Storage Disk Space Monitoring
**Priority:** Medium
**Requirement:** Reliability

**Test Steps:**
1. Check disk space usage
2. Simulate low disk space

**Expected Results:**
- Disk usage monitored
- Alert when disk >80% full
- Uploads blocked if disk full
- Admin notified

---

## TC-INT-006: ClamAV Integration

### Test Scenario 6.1: ClamAV Service Availability
**Priority:** High
**Requirement:** FR-SC-005

**Test Steps:**
1. Upload file
2. Verify ClamAV scans file

**Expected Results:**
- ClamAV service running
- File scanned before storage
- Scan completes successfully
- Integration working

---

### Test Scenario 6.2: ClamAV Service Failure Handling
**Priority:** High
**Requirement:** Reliability

**Test Steps:**
1. Stop ClamAV service
2. Attempt file upload
3. Observe behavior

**Expected Results:**
- Upload fails gracefully OR file quarantined
- Error message shown to user
- Admin alerted of service failure
- System does not crash

---

## TC-INT-007: Push Notification Integration (FCM)

### Test Scenario 7.1: FCM Push Notification Delivery
**Priority:** High
**Requirement:** FR-NT-003

**Test Steps:**
1. User receives message while app backgrounded
2. Observe push notification

**Expected Results:**
- Push notification sent via FCM
- Notification delivered to device
- Notification displays sender name and preview
- Tapping opens app to conversation

---

### Test Scenario 7.2: FCM Token Registration
**Priority:** High
**Requirement:** FR-NT-003

**Test Steps:**
1. User installs mobile app
2. App requests notification permission
3. User grants permission
4. Check FCM token stored

**Expected Results:**
- FCM token generated
- Token stored in database (user devices table)
- Token used for push notifications
- Token refreshed on expiry

---

### Test Scenario 7.3: FCM Failure Handling
**Priority:** Medium
**Requirement:** Reliability

**Test Steps:**
1. Simulate FCM service unavailable
2. Trigger push notification

**Expected Results:**
- Push notification fails
- Failure logged
- Retry mechanism (optional)
- User still receives in-app notification when online

---

## TC-INT-008: TURN Server Integration

### Test Scenario 8.1: TURN Server for NAT Traversal
**Priority:** High
**Requirement:** FR-VC-002

**Test Steps:**
1. Establish call in restricted network (NAT/firewall)
2. Verify TURN relay used

**Expected Results:**
- STUN fails to establish P2P
- Fallback to TURN relay
- Connection via TURN successful
- Call works despite network restrictions

---

### Test Scenario 8.2: TURN Server Authentication
**Priority:** High
**Requirement:** Security

**Test Steps:**
1. Client requests TURN credentials
2. Check credentials validity

**Expected Results:**
- TURN credentials generated dynamically
- Short-lived credentials (TTL)
- Authentication required to use TURN
- Unauthorized access prevented

---

---

## END-TO-END TESTING

## TC-E2E-001: Complete User Journey

### Test Scenario 1.1: Full User Onboarding to First Message
**Priority:** High
**Requirement:** All User Management and Messaging FRs

**Test Steps:**
1. User registers account
2. Verifies email
3. Admin approves account
4. User logs in
5. Searches for another user
6. Adds contact
7. Sends first message
8. Receives reply

**Expected Results:**
- Complete journey successful
- All steps work end-to-end
- No errors encountered
- Smooth user experience

---

### Test Scenario 1.2: Full Video Call Flow
**Priority:** High
**Requirement:** All Video Call FRs

**Test Steps:**
1. User A initiates video call to User B
2. User B receives incoming call notification
3. User B accepts call
4. Call connected with video/audio
5. User A toggles video off
6. User B mutes audio
7. Users unmute/enable video
8. User A ends call
9. Call history updated

**Expected Results:**
- Complete call flow successful
- All features work (mute, video toggle, end)
- Call quality good
- No disconnections

---

### Test Scenario 1.3: File Sharing End-to-End
**Priority:** High
**Requirement:** All File Sharing FRs

**Test Steps:**
1. User A uploads file in conversation
2. File scanned for malware
3. File stored
4. Thumbnail generated (if image)
5. User B receives file message
6. User B downloads file
7. File opens correctly

**Expected Results:**
- File sharing works end-to-end
- Malware scan completes
- Download successful
- File integrity maintained

---

## TC-E2E-002: Cross-Browser Compatibility

### Test Scenario 2.1: Chrome Compatibility
**Priority:** High
**Requirement:** NFR-US-002

**Test Steps:**
1. Open app in Chrome (latest version)
2. Test all major features

**Expected Results:**
- All features functional
- UI renders correctly
- WebSocket works
- WebRTC works
- No console errors

---

### Test Scenario 2.2: Firefox Compatibility
**Priority:** High
**Requirement:** NFR-US-002

**Test Steps:**
1. Open app in Firefox (latest version)
2. Test all major features

**Expected Results:**
- Feature parity with Chrome
- All features work
- No browser-specific issues

---

### Test Scenario 2.3: Safari Compatibility
**Priority:** High
**Requirement:** NFR-US-002

**Test Steps:**
1. Open app in Safari (latest version)
2. Test all major features

**Expected Results:**
- All features functional
- Safari-specific quirks handled
- WebRTC compatibility

---

### Test Scenario 2.4: Edge Compatibility
**Priority:** High
**Requirement:** NFR-US-002

**Test Steps:**
1. Open app in Edge (latest version)
2. Test all major features

**Expected Results:**
- Full compatibility
- All features work

---

### Test Scenario 2.5: Graceful Degradation for Unsupported Browsers
**Priority:** Medium
**Requirement:** NFR-US-002

**Test Steps:**
1. Open app in old browser (e.g., IE11)
2. Observe behavior

**Expected Results:**
- Graceful degradation or warning message
- Message: "Browser not supported. Please use Chrome, Firefox, Safari, or Edge."
- No crashes or broken UI
- Feature detection used

---

## TC-E2E-003: Mobile App Compatibility

### Test Scenario 3.1: Android App - All Features
**Priority:** High
**Requirement:** NFR-US-003

**Test Steps:**
1. Install Android app (Android 10+)
2. Test messaging, calls, files, notifications
3. Test background operation

**Expected Results:**
- All features functional on Android
- Push notifications work
- Background service for notifications
- Offline support for viewing cached messages
- Responsive layouts

---

### Test Scenario 3.2: Android - Different Screen Sizes
**Priority:** Medium
**Requirement:** NFR-US-003

**Test Steps:**
1. Test on small phone (5")
2. Test on large phone (6.5")
3. Test on tablet (10")

**Expected Results:**
- Responsive layouts adapt
- UI usable on all screen sizes
- No clipping or overflow

---

---

## TEST SUMMARY REPORT FORMAT

### Test Execution Summary
- **Total Test Cases:** [Count all scenarios across all files]
- **Test Cases Executed:** [X]
- **Passed:** [X]
- **Failed:** [X]
- **Blocked:** [X]
- **Pass Rate:** [X%]

### Defect Summary
- **Critical:** [X]
- **High:** [X]
- **Medium:** [X]
- **Low:** [X]

### Risk Assessment
- **High Risk Areas:** [e.g., WebRTC under poor network, scalability beyond 100 users]
- **Medium Risk Areas:** [e.g., Email delivery reliability]
- **Low Risk Areas:** [e.g., UI cosmetic issues]

### Recommendations
- [List of recommendations based on test results]

### Sign-off
- **QA Lead:** _______________
- **Date:** _______________
