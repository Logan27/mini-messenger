# File Sharing & Calls Test Cases

## FILE SHARING

## TC-FL-001: File Upload

### Test Scenario 1.1: Upload Valid File Successfully
**Priority:** High
**Requirement:** FR-FL-001

**Test Data:**
- image.jpg (2MB)
- document.pdf (5MB)
- spreadsheet.xlsx (3MB)

**Test Steps:**
1. User A opens conversation with User B
2. Click "Attach File" button
3. Select valid file (e.g., image.jpg, 2MB)
4. Upload file
5. Observe progress and result

**Expected Results:**
- File upload progress indicator shown
- File scanned for malware (ClamAV)
- File passes scan
- File stored in storage
- File metadata saved in files table
- Message created with file attachment
- Thumbnail generated for images
- File visible in conversation
- User B receives file message

---

### Test Scenario 1.2: Upload File Exceeding Size Limit
**Priority:** High
**Requirement:** FR-FL-001

**Test Steps:**
1. Attempt to upload file >25MB (e.g., 30MB video)
2. Observe result

**Expected Results:**
- Upload rejected immediately
- Error message: "File size exceeds 25MB limit"
- File not uploaded
- No storage consumed
- Validation enforced client-side and server-side

---

### Test Scenario 1.3: Upload Unsupported File Type
**Priority:** High
**Requirement:** FR-FL-001

**Test Data:**
- file.exe
- script.sh
- malware.bat

**Test Steps:**
1. Attempt to upload unsupported file type
2. Observe result

**Expected Results:**
- Upload rejected
- Error: "File type not supported. Allowed: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, mp4"
- File not uploaded
- File type validation enforced

---

### Test Scenario 1.4: Upload File with Malware
**Priority:** High
**Requirement:** FR-FL-001, FR-SC-005

**Test Steps:**
1. Attempt to upload file containing test virus (EICAR test file)
2. Observe result

**Expected Results:**
- File scanned with ClamAV
- Malware detected
- Upload rejected
- Error: "File contains malware and cannot be uploaded"
- File not stored
- Admin notified of malware attempt
- Incident logged in audit trail

---

### Test Scenario 1.5: Upload Multiple Files
**Priority:** Medium
**Requirement:** FR-FL-001

**Test Steps:**
1. Select and upload 3 files simultaneously
2. Observe result

**Expected Results:**
- All 3 files uploaded successfully (if all valid)
- Each file scanned independently
- Progress shown for each file
- 3 separate messages created OR single message with 3 attachments
- All files accessible

---

### Test Scenario 1.6: Rate Limiting - 10 Files Per Hour
**Priority:** High
**Requirement:** FR-FL-001, FR-SC-003

**Test Steps:**
1. Upload 10 files within 1 hour
2. Attempt to upload 11th file
3. Wait 1 hour and try again

**Expected Results:**
- First 10 uploads succeed
- 11th upload rejected
- Error: "File upload limit reached. Try again in [X] minutes"
- After 1 hour: upload allowed again
- Rate limit enforced per user

---

### Test Scenario 1.7: Thumbnail Generation for Images
**Priority:** Medium
**Requirement:** FR-FL-001, FR-FL-003

**Test Steps:**
1. Upload image file (jpg, png, gif)
2. Wait for processing
3. View image in conversation

**Expected Results:**
- Thumbnail auto-generated (200x200px)
- Aspect ratio preserved
- Thumbnail generated asynchronously
- Thumbnail displayed in conversation
- Click thumbnail to view full image
- Thumbnail stored separately from original

---

### Test Scenario 1.8: Upload Scan Timeout
**Priority:** Medium
**Requirement:** FR-SC-005

**Preconditions:**
- ClamAV configured with 30s timeout

**Test Steps:**
1. Upload very large file that causes scan timeout
2. Observe result

**Expected Results:**
- Scan times out after 30 seconds
- File quarantined
- Upload fails or file marked as "scan failed"
- Admin notified
- User cannot download file until scan completes

---

## TC-FL-002: File Download

### Test Scenario 2.1: Download File Successfully
**Priority:** High
**Requirement:** FR-FL-002

**Preconditions:**
- User B has file attachment in conversation with User A

**Test Steps:**
1. User B clicks on file attachment
2. Click "Download" button
3. Observe download

**Expected Results:**
- File downloads successfully
- Original filename preserved
- Correct MIME type served
- Download counter incremented in database
- Download logged for audit
- File opens correctly after download

---

### Test Scenario 2.2: Download File from Own Messages
**Priority:** Medium
**Requirement:** FR-FL-002

**Test Steps:**
1. User A uploads file
2. User A clicks own file to download
3. Observe result

**Expected Results:**
- User can download own files
- Download succeeds
- Same file returned as uploaded

---

### Test Scenario 2.3: Download File Outside Conversation
**Priority:** High
**Requirement:** FR-FL-002

**Test Steps:**
1. User C (not in conversation) attempts to download file via direct URL
2. Observe result

**Expected Results:**
- Download fails
- Error: 403 Forbidden
- Authorization check enforced
- Only conversation participants can download
- Unauthorized attempt logged

---

### Test Scenario 2.4: Download Expired Link
**Priority:** Medium
**Requirement:** FR-FL-002

**Test Steps:**
1. Generate download link
2. Wait 25 hours
3. Attempt download

**Expected Results:**
- Download link expires after 24 hours
- Error: "Download link expired"
- Must generate new link from conversation
- Security enforced

---

### Test Scenario 2.5: Download File That Failed Virus Scan
**Priority:** High
**Requirement:** FR-FL-002, FR-SC-005

**Test Steps:**
1. Attempt to download file marked as infected
2. Observe result

**Expected Results:**
- Download blocked
- Error: "File failed security scan and cannot be downloaded"
- Infected files not downloadable
- User safety prioritized

---

### Test Scenario 2.6: Download Counter Increment
**Priority:** Low
**Requirement:** FR-FL-002

**Test Steps:**
1. Check initial download count (0)
2. Download file
3. Check download count
4. Another user downloads same file
5. Check count again

**Expected Results:**
- Download count starts at 0
- Increments to 1 after first download
- Increments to 2 after second download
- Accurate tracking
- Stat visible in file info

---

## TC-FL-003: Thumbnail Generation

### Test Scenario 3.1: Generate Thumbnail for JPG
**Priority:** Medium
**Requirement:** FR-FL-003

**Test Steps:**
1. Upload JPG image (1920x1080)
2. Wait for thumbnail generation
3. View thumbnail

**Expected Results:**
- Thumbnail created at 200x200px
- Aspect ratio preserved (may have letterboxing)
- Thumbnail generated asynchronously
- Thumbnail quality acceptable
- Thumbnail served with cache headers (efficient loading)

---

### Test Scenario 3.2: Generate Thumbnail for PNG
**Priority:** Medium
**Requirement:** FR-FL-003

**Test Steps:**
1. Upload PNG image with transparency
2. Check thumbnail

**Expected Results:**
- Thumbnail generated correctly
- Transparency preserved or white background used
- No errors in thumbnail generation

---

### Test Scenario 3.3: Thumbnail Generation Failure Fallback
**Priority:** Low
**Requirement:** FR-FL-003

**Test Steps:**
1. Upload corrupted image file (invalid format but passes validation)
2. Observe thumbnail

**Expected Results:**
- Thumbnail generation fails gracefully
- Fallback icon displayed (generic file icon)
- No error shown to user
- File still downloadable
- Failure logged

---

### Test Scenario 3.4: Thumbnail for Non-Image File
**Priority:** Low
**Requirement:** FR-FL-003

**Test Steps:**
1. Upload PDF file
2. Observe thumbnail

**Expected Results:**
- No thumbnail generated (or generic PDF icon)
- Fallback icon displayed
- File accessible and downloadable

---

## TC-FL-004: File Deletion

### Test Scenario 4.1: Delete File with Message
**Priority:** Medium
**Requirement:** FR-FL-004, FR-MS-006

**Test Steps:**
1. User A sends message with file attachment
2. User A deletes message "for everyone"
3. Check file storage
4. Wait 24 hours
5. Check storage again

**Expected Results:**
- File marked for deletion in database immediately
- File removed from storage within 24 hours
- Thumbnail also deleted
- Disk space reclaimed
- Deletion logged in audit trail
- File no longer downloadable

---

### Test Scenario 4.2: Delete Message "For Me" with File
**Priority:** Medium
**Requirement:** FR-FL-004

**Test Steps:**
1. User A deletes message with file "for me"
2. Check if file still accessible to User B

**Expected Results:**
- File NOT deleted from storage
- User B can still download file
- File remains for other participants
- Only deleted from User A's view

---

### Test Scenario 4.3: File Deletion Audit Logging
**Priority:** Low
**Requirement:** FR-FL-004, FR-AM-008

**Test Steps:**
1. Delete file attachment
2. Check audit logs

**Expected Results:**
- Deletion logged with: timestamp, user_id, file_id, filename, size
- Audit log entry created
- Admin can review deletion history
- Compliance with audit requirements

---

---

## VIDEO/VOICE CALLING

## TC-VC-001: Initiate Call

### Test Scenario 1.1: Initiate Video Call Successfully
**Priority:** High
**Requirement:** FR-VC-001

**Preconditions:**
- User A and User B are both online
- User B is in User A's contacts

**Test Steps:**
1. User A opens conversation with User B
2. Click "Video Call" button
3. Observe result

**Expected Results:**
- Call request sent via WebSocket
- User A sees "Calling..." status with ringtone
- Call logged in calls table with status='calling'
- Call request delivered to User B in real-time
- User B receives incoming call notification
- Call ID generated

---

### Test Scenario 1.2: Initiate Voice Call Successfully
**Priority:** High
**Requirement:** FR-VC-001

**Test Steps:**
1. User A opens conversation with User B
2. Click "Voice Call" button
3. Observe result

**Expected Results:**
- Voice call initiated
- Same flow as video call
- Call type='voice' recorded
- Audio-only mode

---

### Test Scenario 1.3: Call Timeout After 60 Seconds
**Priority:** High
**Requirement:** FR-VC-001

**Test Steps:**
1. User A initiates call to User B
2. User B does not answer
3. Wait 60 seconds
4. Observe result

**Expected Results:**
- Call automatically cancelled after 60 seconds
- User A notified: "No answer"
- Call status updated to 'missed'
- Ringtone stops
- Call logged as missed
- User B sees missed call notification

---

### Test Scenario 1.4: Initiate Call to Offline User
**Priority:** Medium
**Requirement:** FR-VC-001

**Preconditions:**
- User B is offline

**Test Steps:**
1. User A attempts to call User B
2. Observe result

**Expected Results:**
- Call button disabled OR call fails immediately
- Error: "User is offline"
- No call initiated
- Cannot call offline users

---

### Test Scenario 1.5: Concurrent Call Limit (10 Calls System-Wide)
**Priority:** High
**Requirement:** FR-VC-001

**Preconditions:**
- 10 concurrent calls already active

**Test Steps:**
1. User A attempts to initiate 11th call
2. Observe result

**Expected Results:**
- Call initiation fails
- Error: "Maximum concurrent calls reached. Try again later."
- System limit enforced (10 concurrent calls)
- User notified of system capacity

---

### Test Scenario 1.6: Call to Blocked User
**Priority:** Medium
**Requirement:** FR-VC-001, FR-CT-003

**Preconditions:**
- User A has blocked User B

**Test Steps:**
1. User A attempts to call User B

**Expected Results:**
- Call fails
- Error message displayed
- Blocked user cannot be called
- Privacy setting enforced

---

## TC-VC-002: Accept Call

### Test Scenario 2.1: Accept Video Call Successfully
**Priority:** High
**Requirement:** FR-VC-002

**Preconditions:**
- User B receives incoming video call from User A

**Test Steps:**
1. User B clicks "Accept" button
2. Grant camera and microphone permissions (if needed)
3. Observe connection

**Expected Results:**
- WebRTC handshake initiated
- STUN/TURN server used for NAT traversal
- P2P connection established (if possible)
- Call status updated to 'connected'
- Call timer starts
- Video and audio streams active
- Both users can see/hear each other
- Call controls displayed (mute, video toggle, end)

---

### Test Scenario 2.2: Accept Voice Call Successfully
**Priority:** High
**Requirement:** FR-VC-002

**Test Steps:**
1. Accept incoming voice call
2. Grant microphone permission
3. Observe connection

**Expected Results:**
- Audio connection established
- No video stream
- Call timer starts
- Audio quality good
- Both users can hear each other

---

### Test Scenario 2.3: WebRTC P2P Connection
**Priority:** High
**Requirement:** FR-VC-002

**Test Steps:**
1. Accept call
2. Monitor network traffic
3. Verify connection type

**Expected Results:**
- P2P connection established when possible (same network/no NAT)
- Direct peer-to-peer media streams
- Low latency
- Efficient bandwidth usage

---

### Test Scenario 2.4: WebRTC TURN Fallback
**Priority:** High
**Requirement:** FR-VC-002

**Preconditions:**
- P2P connection cannot be established (strict NAT/firewall)

**Test Steps:**
1. Accept call in restricted network
2. Observe connection establishment

**Expected Results:**
- STUN server fails to establish P2P
- Fallback to TURN relay server
- Connection still established (via relay)
- Call functional (may have higher latency)
- Reliable connection despite network restrictions

---

### Test Scenario 2.5: Accept Call Without Permissions
**Priority:** Medium
**Requirement:** FR-VC-002

**Test Steps:**
1. Accept video call
2. Deny camera/microphone permissions
3. Observe result

**Expected Results:**
- Call fails or connects without media
- Error: "Camera/microphone access required"
- User prompted to grant permissions
- Cannot proceed without permissions
- Call may be cancelled

---

## TC-VC-003: Reject Call

### Test Scenario 3.1: Reject Incoming Call
**Priority:** High
**Requirement:** FR-VC-003

**Test Steps:**
1. User B receives incoming call
2. Click "Reject" button
3. Observe both sides

**Expected Results:**
- Call rejected immediately
- User A notified: "Call declined"
- Call status updated to 'rejected'
- Call record saved with 0 duration
- Rejection notification sent via WebSocket
- User A's call screen closed

---

### Test Scenario 3.2: Reject Call During Ringing
**Priority:** Medium
**Requirement:** FR-VC-003

**Test Steps:**
1. Call initiated, ringing for 10 seconds
2. Recipient rejects
3. Observe timing

**Expected Results:**
- Rejection instant
- Ringtone stops immediately for both
- Rejection processed in real-time (<500ms)

---

## TC-VC-004: End Call

### Test Scenario 4.1: Caller Ends Call
**Priority:** High
**Requirement:** FR-VC-004

**Test Steps:**
1. Call connected successfully
2. Call active for 2 minutes
3. User A (caller) clicks "End Call"
4. Observe result

**Expected Results:**
- WebRTC connection closed
- Call status updated to 'ended'
- Call duration calculated: 2 minutes
- Duration stored in database
- End notification sent to User B
- User B's call screen closed
- Call summary shown (duration, quality)
- Media streams stopped
- Resources released (camera, microphone)

---

### Test Scenario 4.2: Recipient Ends Call
**Priority:** High
**Requirement:** FR-VC-004

**Test Steps:**
1. Call connected
2. User B (recipient) ends call
3. Observe result

**Expected Results:**
- Same as caller ending call
- Either participant can end call
- Symmetrical behavior

---

### Test Scenario 4.3: Call Summary Display
**Priority:** Low
**Requirement:** FR-VC-004

**Test Steps:**
1. End call after 5 minutes
2. Observe summary screen

**Expected Results:**
- Summary shows: Duration (05:00), Call quality (Good/Fair/Poor)
- Option to call again
- Summary dismissible
- Data saved to call history

---

### Test Scenario 4.4: Connection Lost During Call
**Priority:** Medium
**Requirement:** FR-VC-004

**Test Steps:**
1. Call active
2. Simulate network disconnect for User A
3. Observe result

**Expected Results:**
- Call ends automatically
- Both users notified: "Connection lost"
- Call logged as ended with actual duration
- Reconnection option shown (optional)
- Graceful handling of network issues

---

## TC-VC-005: Mute/Unmute Audio

### Test Scenario 5.1: Mute Audio During Call
**Priority:** High
**Requirement:** FR-VC-005

**Test Steps:**
1. Call active with audio
2. User A clicks "Mute" button
3. User A speaks
4. Observe User B's side

**Expected Results:**
- Audio stream paused
- Mute icon displayed on User A's UI
- Mute event sent to User B
- User B sees mute indicator for User A
- User B cannot hear User A
- Mute state persists until toggled

---

### Test Scenario 5.2: Unmute Audio
**Priority:** High
**Requirement:** FR-VC-005

**Test Steps:**
1. User A is muted
2. Click "Unmute" button
3. User A speaks
4. Observe User B's side

**Expected Results:**
- Audio stream resumed
- Mute icon removed
- Unmute event sent to User B
- User B can hear User A again
- User B sees audio indicator

---

### Test Scenario 5.3: Mute Status Indicator
**Priority:** Medium
**Requirement:** FR-VC-005

**Test Steps:**
1. User A mutes
2. Check UI on both sides

**Expected Results:**
- User A sees: Microphone icon with slash
- User B sees: "User A is muted" indicator
- Visual feedback clear
- Status synchronized in real-time

---

## TC-VC-006: Enable/Disable Video

### Test Scenario 6.1: Disable Video During Call
**Priority:** High
**Requirement:** FR-VC-006

**Test Steps:**
1. Video call active
2. User A clicks "Turn Off Camera"
3. Observe both sides

**Expected Results:**
- Video stream paused
- User A's camera indicator off
- Video disable event sent to User B
- User B sees placeholder/avatar instead of video
- User B notified: "User A turned off camera"
- Audio continues

---

### Test Scenario 6.2: Enable Video During Call
**Priority:** High
**Requirement:** FR-VC-006

**Test Steps:**
1. User A has video disabled
2. Click "Turn On Camera"
3. Observe result

**Expected Results:**
- Camera activated
- Video stream resumed
- User B sees User A's video again
- Enable event sent to User B
- Smooth transition

---

### Test Scenario 6.3: Voice-Only Mode (Both Disable Video)
**Priority:** Medium
**Requirement:** FR-VC-006

**Test Steps:**
1. Video call initiated
2. Both User A and User B disable video
3. Continue call

**Expected Results:**
- Call continues as voice-only
- No video streams
- Audio still active
- Efficient bandwidth usage (no video data)
- Call labeled as "Voice Call" in UI

---

## TC-VC-007: Network Quality Indicator

### Test Scenario 7.1: Good Network Quality
**Priority:** Medium
**Requirement:** FR-VC-007

**Preconditions:**
- Stable network connection

**Test Steps:**
1. Establish call
2. Observe quality indicator

**Expected Results:**
- Quality indicator: Green "Good"
- Metrics: Low packet loss (<1%), Low latency (<100ms), Low jitter
- Updated every 2 seconds
- No warnings displayed
- Call quality smooth

---

### Test Scenario 7.2: Fair Network Quality
**Priority:** Medium
**Requirement:** FR-VC-007

**Test Steps:**
1. Simulate moderate network issues (3% packet loss, 150ms latency)
2. Observe indicator

**Expected Results:**
- Quality indicator: Yellow "Fair"
- Warning: "Connection quality is fair"
- Call continues with possible degradation
- Automatic quality adjustment attempted
- User notified

---

### Test Scenario 7.3: Poor Network Quality
**Priority:** Medium
**Requirement:** FR-VC-007

**Test Steps:**
1. Simulate severe network issues (10% packet loss, 300ms latency)
2. Observe indicator

**Expected Results:**
- Quality indicator: Red "Poor"
- Warning: "Poor connection quality"
- Call may be choppy/laggy
- Recommendation to check connection
- Call still functional (best effort)

---

### Test Scenario 7.4: Quality Degradation Alert
**Priority:** Low
**Requirement:** FR-VC-007

**Test Steps:**
1. Call starts with good quality
2. Network degrades to poor
3. Observe alert

**Expected Results:**
- Alert shown when quality drops
- Message: "Connection quality degraded"
- Quality indicator changes color
- User aware of issue
- Can choose to continue or end call

---

## TC-VC-008: Call Encryption

### Test Scenario 8.1: WebRTC DTLS-SRTP Encryption
**Priority:** High
**Requirement:** FR-VC-008

**Test Steps:**
1. Establish call
2. Inspect WebRTC connection
3. Verify encryption

**Expected Results:**
- DTLS-SRTP encryption enabled
- Encryption keys exchanged securely during handshake
- Media streams encrypted end-to-end
- Server cannot decrypt media
- Encryption status shown on UI (padlock icon)
- Industry-standard encryption

---

### Test Scenario 8.2: P2P Connection Encrypted
**Priority:** High
**Requirement:** FR-VC-008

**Test Steps:**
1. Establish P2P call
2. Monitor network traffic
3. Verify encryption

**Expected Results:**
- All media packets encrypted
- Cannot intercept readable data
- Secure connection

---

### Test Scenario 8.3: TURN Relay Encrypted
**Priority:** High
**Requirement:** FR-VC-008

**Test Steps:**
1. Establish call via TURN relay
2. Verify encryption

**Expected Results:**
- TURN connection also encrypted
- No unencrypted media over relay
- End-to-end encryption maintained even through relay

---

## TC-VC-009: Call History

### Test Scenario 9.1: View Call History
**Priority:** Medium
**Requirement:** FR-VC-009

**Test Steps:**
1. Navigate to call history page
2. Observe displayed information

**Expected Results:**
- Call history shows: caller, recipient, type (video/voice), duration, timestamp, status
- Entries sorted by date (newest first)
- Paginated (20 entries per page)
- Duration formatted: HH:MM:SS
- Status: completed, missed, rejected, failed
- Call type icons displayed

---

### Test Scenario 9.2: Filter Call History
**Priority:** Low
**Requirement:** FR-VC-009

**Test Steps:**
1. Open call history
2. Apply filter: Type = "Video", Status = "Completed"
3. Observe results

**Expected Results:**
- Only video calls shown
- Only completed calls shown
- Filters applied correctly
- Result count updated

---

### Test Scenario 9.3: Call History Retention (90 Days)
**Priority:** Medium
**Requirement:** FR-VC-009, FR-CP-002

**Test Steps:**
1. Check call from 80 days ago
2. Check call from 100 days ago

**Expected Results:**
- 80-day-old call visible in history
- 100-day-old call deleted (auto-cleanup)
- 90-day retention enforced
- Old records purged automatically

---

### Test Scenario 9.4: Missed Call Indicator
**Priority:** Medium
**Requirement:** FR-VC-009

**Test Steps:**
1. User B misses call from User A
2. User B checks call history

**Expected Results:**
- Missed call highlighted (red icon or badge)
- Status: "Missed call from User A"
- Timestamp of missed call
- Option to call back
- Notification badge shown

---

## TC-VC-010: Incoming Call Notification

### Test Scenario 10.1: Real-Time Call Notification (Web)
**Priority:** High
**Requirement:** FR-VC-010

**Test Steps:**
1. User A calls User B (web app)
2. Observe User B's screen

**Expected Results:**
- Incoming call notification via WebSocket (real-time)
- Browser notification displayed (if permitted)
- Ringtone plays
- Caller info shown: name, avatar
- Call type displayed: "Video Call" or "Voice Call"
- Accept/Reject buttons visible
- Notification persists until action taken

---

### Test Scenario 10.2: Push Notification (Mobile)
**Priority:** High
**Requirement:** FR-VC-010

**Test Steps:**
1. User A calls User B (mobile app, backgrounded)
2. Observe notification

**Expected Results:**
- Push notification via FCM
- Notification shows: caller name, call type
- Tapping notification opens app to call screen
- Ringtone plays
- Full-screen incoming call UI

---

### Test Scenario 10.3: Notification Dismissed on Action
**Priority:** Medium
**Requirement:** FR-VC-010

**Test Steps:**
1. Incoming call received
2. Accept call
3. Observe notifications

**Expected Results:**
- All notifications dismissed (browser, push, ringtone)
- Only call UI shown
- No lingering notifications

---

### Test Scenario 10.4: Notification on Timeout
**Priority:** Low
**Requirement:** FR-VC-010

**Test Steps:**
1. Receive call
2. Do not answer for 60 seconds

**Expected Results:**
- Notification auto-dismissed after timeout
- Missed call notification shown instead
- Ringtone stops
