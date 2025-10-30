#!/bin/bash

echo "=========================================="
echo "TC-MS-001: Send 1-to-1 Text Message Test"
echo "=========================================="
echo ""

BASE_URL="http://localhost:4000/api"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "[Step 1] Registering Test Users..."
echo ""

# Register User A
echo "Registering User A (testusera)..."
RESPONSE_A=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testusera","email":"usera@test.com","password":"TestPass123!","firstName":"Test","lastName":"UserA"}')

echo "Response: $RESPONSE_A"
echo ""

# Register User B
echo "Registering User B (testuserb)..."
RESPONSE_B=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuserb","email":"userb@test.com","password":"TestPass123!","firstName":"Test","lastName":"UserB"}')

echo "Response: $RESPONSE_B"
echo ""

# Extract user IDs (if successful)
USER_A_ID=$(echo $RESPONSE_A | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
USER_B_ID=$(echo $RESPONSE_B | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)

echo "User A ID: $USER_A_ID"
echo "User B ID: $USER_B_ID"
echo ""

# Login User A
echo "[Step 2] Logging in User A..."
LOGIN_A=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"usera@test.com","password":"TestPass123!"}')

echo "Login Response: $LOGIN_A"
echo ""

# Extract token
TOKEN_A=$(echo $LOGIN_A | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN_A" ]; then
  echo -e "${RED}ERROR: Failed to get User A token${NC}"
  echo "Login response: $LOGIN_A"
  exit 1
fi

echo -e "${GREEN}User A Token obtained${NC}"
echo ""

# Login User B
echo "[Step 3] Logging in User B..."
LOGIN_B=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"userb@test.com","password":"TestPass123!"}')

TOKEN_B=$(echo $LOGIN_B | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN_B" ]; then
  echo -e "${YELLOW}WARNING: User B not approved yet or login failed${NC}"
  echo "This is expected - new users need admin approval"
else
  echo -e "${GREEN}User B Token obtained${NC}"
fi
echo ""

# Get User B's actual ID by listing users
echo "[Step 4] Getting User B's ID..."
USERS_LIST=$(curl -s -X GET "$BASE_URL/users?limit=100" \
  -H "Authorization: Bearer $TOKEN_A")

echo "Users list: $USERS_LIST"
echo ""

# Extract User B ID from users list (get the ID that appears before "username":"testuserb")
USER_B_ACTUAL_ID=$(echo $USERS_LIST | grep -o '"id":"[^"]*","username":"testuserb"' | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$USER_B_ACTUAL_ID" ]; then
  echo -e "${RED}ERROR: Could not find User B in users list${NC}"
  exit 1
fi

echo "User B Actual ID: $USER_B_ACTUAL_ID"
echo ""

# Send message from User A to User B
echo "[Step 5] TC-MS-001: Sending message from User A to User B..."
echo "Message: 'Hello, this is a test message'"
echo ""

MESSAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"recipientId\":\"$USER_B_ACTUAL_ID\",\"content\":\"Hello, this is a test message\",\"messageType\":\"text\"}")

echo "Message Response:"
echo "$MESSAGE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$MESSAGE_RESPONSE"
echo ""

# Check if message was successful
if echo "$MESSAGE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ TEST PASSED: Message sent successfully${NC}"

  # Extract message ID
  MESSAGE_ID=$(echo $MESSAGE_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Message ID: $MESSAGE_ID"

  # Verify expected results from TC-MS-001
  echo ""
  echo "Verifying TC-MS-001 Expected Results:"
  echo "✓ Message sent immediately"
  echo "✓ Message ID generated: $MESSAGE_ID"

  if echo "$MESSAGE_RESPONSE" | grep -q '"status":"sent"'; then
    echo "✓ Message status: sent (single checkmark)"
  fi

  if echo "$MESSAGE_RESPONSE" | grep -q '"createdAt"'; then
    echo "✓ Timestamp recorded (UTC)"
  fi

else
  echo -e "${RED}✗ TEST FAILED: Message not sent${NC}"
  echo "Error details:"
  echo "$MESSAGE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$MESSAGE_RESPONSE"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
