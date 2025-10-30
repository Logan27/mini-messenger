#!/usr/bin/env python3
"""
Fix the API test batch script to use HTTP status code validation
instead of searching for the word "success" in responses.
"""

import re

def fix_test_script(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add the CheckHttpSuccess function at the beginning (after setlocal)
    function_code = '''
REM HTTP Status Check Function - Returns 0 if status is 2xx, 1 otherwise
goto :SkipHttpCheckFunction
:CheckHttpSuccess
set STATUS=%~1
if "%STATUS:~0,1%"=="2" (
    exit /b 0
) else (
    exit /b 1
)
:SkipHttpCheckFunction

'''
    
    # Insert after "setlocal enabledelayedexpansion"
    content = content.replace(
        'setlocal enabledelayedexpansion\n',
        'setlocal enabledelayedexpansion\n' + function_code
    )
    
    # Replace all instances of:
    #   findstr /C:"success" FILENAME.json > nul 2>&1
    #   if !errorlevel! equ 0 (
    # with:
    #   call :CheckHttpSuccess !HTTP_STATUS!
    #   if !errorlevel! equ 0 (
    
    pattern = r'findstr /C:"success" [a-zA-Z_]+\.json > nul 2>&1\s+if !errorlevel! equ 0'
    replacement = 'call :CheckHttpSuccess !HTTP_STATUS!\n        if !errorlevel! equ 0'
    
    content = re.sub(pattern, replacement, content)
    
    # Also fix timestamp generation to be alphanumeric only
    content = content.replace(
        'set "TIMESTAMP=%TIMESTAMP: =0%"',
        'set "TIMESTAMP=%TIMESTAMP: =0%"\nset "TIMESTAMP=%TIMESTAMP:_=%"'
    )
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"[OK] Fixed test script saved to {output_file}")
    print(f"  - Added HTTP status check function")
    print(f"  - Replaced success string checks with HTTP status validation")
    print(f"  - Fixed timestamp generation for alphanumeric usernames")

if __name__ == '__main__':
    fix_test_script(
        'C:\\Users\\anton\\Documents\\messenger\\api-test-complete.bat',
        'C:\\Users\\anton\\Documents\\messenger\\api-test-complete-fixed-v2.bat'
    )
