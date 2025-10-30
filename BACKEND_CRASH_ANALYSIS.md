# Backend Crash Issue - Root Cause Analysis

## Problem Statement
Backend crashes at test 18 (avatar upload), causing HTTP 000 errors for all subsequent tests (80+ tests fail).

---

## Investigation Summary

### Database Connection Issue (Current Blocker)
**Status:** ❌ CRITICAL  
**Error:** `password authentication failed for user "messenger"`

**Cause:** 
- Docker containers were recreated/restarted with different compose file
- Container names changed from `messenger-postgres` to `sk-postgres`
- Database credentials may have changed

**Impact:** Backend won't start at all - cannot test avatar upload crash

**Fix Required:**
1. Check which docker-compose file is active
2. Verify database credentials in .env match Docker setup
3. Restart containers with correct configuration

---

## Avatar Upload Crash (Original Issue)

### Root Cause Identified
**File:** `backend/src/routes/users.js` (Line 416)  
**File:** `backend/src/services/fileUploadService.js` (Line 147)

**Problem:** **Incompatible storage configuration**

The route uses **multer disk storage**:
```javascript
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './temp/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
```

But `fileUploadService.processFile()` expects **memory storage**:
```javascript
// Line 147 in fileUploadService.js
await fs.writeFile(filePath, file.buffer);  // ❌ file.buffer is undefined!
```

**Why it crashes:**
1. Multer disk storage provides `file.path` (not `file.buffer`)
2. Service tries to access `file.buffer` → undefined
3. `fs.writeFile(path, undefined)` throws error
4. Error handler missing → backend crashes

---

## Fix Options

### Option 1: Use File Path (Recommended)
Modify `fileUploadService.processFile()` to accept disk-stored files:

```javascript
async processFile(file, options = {}) {
  // Check if file is already on disk or in memory
  if (file.path && !file.buffer) {
    // File is already on disk (multer diskStorage)
    const filePath = file.path;
    // Skip write, proceed with scanning
  } else if (file.buffer) {
    // File is in memory (multer memoryStorage)
    await fs.writeFile(filePath, file.buffer);
  } else {
    throw new Error('Invalid file object - no path or buffer');
  }
  // ... rest of processing
}
```

### Option 2: Switch to Memory Storage
Change the route to use memory storage:

```javascript
const upload = multer({
  storage: multer.memoryStorage(), // ✅ Change to memory storage
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: /* same */
});
```

**Pros:** Service works as-is  
**Cons:** Loads entire file into memory (not ideal for large files)

### Option 3: Add Error Handling
Wrap file processing in try-catch:

```javascript
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    // ... existing code
    const processedFiles = await fileUploadService.processFile(req.file, options);
    // ... success response
  } catch (fileError) {
    logger.error('File processing error', { error: fileError.message });
    
    // Clean up uploaded file
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    return res.status(500).json({  // ✅ Return error instead of crashing
      success: false,
      error: 'Failed to process avatar upload'
    });
  }
});
```

---

## Additional Issues Found

### 1. Missing Directory Creation
**File:** `backend/src/services/fileUploadService.js`

The service assumes `./temp/` and `./uploads/` directories exist.

**Fix Applied:** Created directories manually
```bash
mkdir backend/temp
mkdir backend/uploads
```

**Better Fix:** Add startup check in service initialization:
```javascript
async initialize() {
  await fs.mkdir(this.uploadDir, { recursive: true });
  await fs.mkdir(this.tempDir, { recursive: true });
  // ... rest of init
}
```

### 2. ClamAV Dependency
**File:** `backend/src/services/fileUploadService.js` (Line 79)

Service checks for ClamAV on Windows but it's never installed.

**Current:** Logs warning and continues (✅ OK for development)  
**Production:** Needs actual virus scanning or proper skip logic

---

## Recommended Solution

**Implement Option 1 + Option 3** (Path handling + Error handling)

```javascript
// In fileUploadService.js
async processFile(file, options = {}) {
  if (!this.initialized) {
    await this.initialize();
  }

  try {
    const { resizeImage = false, /* ... */ } = options;
    
    // Validate file
    const validatedMimeType = await fileValidator.validateFile(file);
    const secureFilename = fileValidator.generateSecureFilename(
      file.originalname,
      validatedMimeType
    );
    
    const fileSubDir = fileValidator.isImageFile(validatedMimeType) ? 'images' : 'files';
    const finalPath = path.join(this.uploadDir, fileSubDir, secureFilename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    
    // Handle both memory and disk storage
    let sourceFilePath;
    if (file.path) {
      // File already on disk (disk storage)
      sourceFilePath = file.path;
    } else if (file.buffer) {
      // File in memory (memory storage) - write to disk
      sourceFilePath = path.join(this.tempDir, `temp-${Date.now()}-${secureFilename}`);
      await fs.writeFile(sourceFilePath, file.buffer);
    } else {
      throw new Error('Invalid file object: no path or buffer provided');
    }
    
    // Scan for viruses
    await this.scanFile(sourceFilePath, null, options.userId, options.uploadId);
    
    // Process image if needed
    if (resizeImage && fileValidator.isImageFile(validatedMimeType)) {
      await this.processImage(sourceFilePath, finalPath, options);
    } else {
      // Move/copy file to final location
      await fs.copyFile(sourceFilePath, finalPath);
    }
    
    // Clean up temp file if we created one
    if (sourceFilePath !== file.path) {
      await fs.unlink(sourceFilePath).catch(() => {});
    }
    
    return {
      original: {
        filename: path.relative(this.uploadDir, finalPath),
        path: finalPath,
        size: file.size,
        mimeType: validatedMimeType
      }
    };
    
  } catch (error) {
    logger.error('File processing failed:', { error: error.message, stack: error.stack });
    throw error; // Let route handler catch and respond appropriately
  }
}
```

---

## Testing After Fix

1. Start fresh database:
   ```bash
   docker-compose up -d postgres redis
   npm run migrate
   node temp/create-admin.mjs
   ```

2. Start backend:
   ```bash
   npm run dev
   ```

3. Test avatar upload:
   ```bash
   # Manual test
   curl -X POST http://localhost:4000/api/users/me/avatar \
     -H "Authorization: Bearer $TOKEN" \
     -F "avatar=@test-files/test-image.png"
   ```

4. Run full test suite:
   ```bash
   api-test-complete-fixed-v2.bat
   ```

**Expected Result:** 
- Avatar upload succeeds (HTTP 200/201)
- Backend stays running
- All messaging/contacts/groups tests execute
- Success rate increases from 23% to 60-70%

---

## Summary

| Issue | Status | Impact | Fix Complexity |
|-------|--------|--------|----------------|
| **Database connection** | ❌ Blocking | HIGH | Easy - fix credentials |
| **Avatar upload crash** | 🔍 Identified | HIGH | Medium - code changes needed |
| **Missing error handling** | 🔍 Identified | MEDIUM | Easy - add try-catch |
| **Directory missing** | ✅ Fixed | LOW | Done - created dirs |
| **ClamAV dependency** | ✅ OK | LOW | Skips on Windows |

**Next Steps:**
1. Fix database connection (immediate)
2. Implement file storage compatibility fix
3. Add proper error handling
4. Re-run full test suite
5. Document any remaining failures

---

## Files to Modify

1. **`backend/src/services/fileUploadService.js`**
   - Add path/buffer detection
   - Handle disk-stored files
   - Add directory creation in init

2. **`backend/src/routes/users.js`**
   - Add try-catch around processFile
   - Return proper error responses
   - Clean up temp files on error

3. **`backend/src/config/index.js`** (optional)
   - Add validation for upload directories
   - Create directories on startup
