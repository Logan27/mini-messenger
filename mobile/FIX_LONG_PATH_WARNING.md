# Fix: CMake/Ninja Path Length Errors on Windows

## Problem
Building fails with one or both errors:

### Error 1: CMake Warning
```
CMake Warning: The object file directory has 182 characters.
The maximum full path to an object file is 250 characters.
```

### Error 2: Ninja Build Failure (Critical)
```
ninja: error: mkdir(safeareacontext_autolinked_build/CMakeFiles/react_codegen_safeareacontext.dir/...):
No such file or directory
```

These errors appear when building React Native Android apps on Windows due to deeply nested paths in `node_modules` exceeding Windows' 260-character path limit.

## Solutions Applied

### 1. CMake Configuration (Applied)
Added CMake arguments to [android/app/build.gradle](android/app/build.gradle#L100-L106):
```gradle
externalNativeBuild {
    cmake {
        arguments "-DCMAKE_OBJECT_PATH_MAX=300"
        cppFlags "-std=c++17"
    }
}
```

### 2. Shortened Build Cache Path (Applied)
Added to [android/gradle.properties](android/gradle.properties#L68):
```properties
android.buildCacheDir=C:\\.gradle\\build-cache
```

## **REQUIRED**: Move Project to Shorter Path

The ninja build error **requires** moving the project to a shorter path. The CMake configuration alone is insufficient.

### Automated Method (Recommended)
```powershell
# Run the provided PowerShell script
.\move-to-shorter-path.ps1

# Or specify custom target path
.\move-to-shorter-path.ps1 -targetPath "C:\dev"
```

### Manual Method
```bash
# Current: C:\Users\anton\Documents\messenger (35 chars base)
# Target:  C:\msg (6 chars base) - saves 29 characters!

cd C:\
mkdir msg
robocopy "C:\Users\anton\Documents\messenger" "C:\msg" /E /COPYALL /MT:8
cd C:\msg\mobile
```

### Option B: Enable Windows Long Path Support (Admin Required)
Run `enable-long-paths.ps1` as Administrator, then restart your computer:
```powershell
# Run as Administrator
.\enable-long-paths.ps1
```

### Option C: Use Git for Windows LFS
If using Git Bash, enable long path support:
```bash
git config --system core.longpaths true
```

## Clean Build After Moving Project

**IMPORTANT**: After moving to shorter path, clean build cache:

```bash
# Navigate to new location
cd C:\msg\mobile  # Or your chosen path

# Clean Android build
cd android
.\gradlew clean
cd ..

# Clean node_modules (optional but recommended)
rm -rf node_modules
npm install

# Rebuild
npx expo run:android
```

## Verify Fix
After rebuilding:
1. CMake warning should show **higher character count** or disappear
2. Ninja build should **complete successfully** without mkdir errors
3. APK should build and install on device/emulator

## Path Length Analysis

| Location | Base Path Length | mobile/ Path Length | Savings |
|----------|-----------------|---------------------|---------|
| **Current** | `C:\Users\anton\Documents\messenger` (35 chars) | 42 chars | - |
| **Recommended** | `C:\msg` (6 chars) | 13 chars | **29 chars** |
| **Alternative** | `C:\dev` (6 chars) | 13 chars | **29 chars** |
| **Alternative** | `C:\projects\msg` (16 chars) | 23 chars | **19 chars** |

Each saved character at the base multiplies through all subdirectories. Saving 29 characters at the root prevents hundreds of path length issues in nested node_modules.

## Why This Happens
- **Windows PATH_MAX**: Historically 260 characters (MAX_PATH)
- **React Native nesting**: `node_modules/react-native-gesture-handler/android/build/generated/source/codegen/jni/react/renderer/components/...`
- **CMake build dirs**: `.cxx/Debug/{hash}/{arch}/...`
- **Combined**: Easily exceeds 250+ characters from project root

## Notes
- The CMake warning alone can be ignored, but **ninja mkdir errors block builds**
- Enabling Windows long path support helps but isn't sufficient for all build tools
- React Native's deep dependency structure makes this common on Windows
- Moving to shorter path is the most reliable solution
