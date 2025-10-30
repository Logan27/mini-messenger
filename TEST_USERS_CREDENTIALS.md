# Test User Credentials

**All test users have the same password:** `Admin123!@#`

## Test Users

| Username | Email | Name | Role | Status |
|----------|-------|------|------|--------|
| alice | alice@test.com | Alice Anderson | user | ✅ Approved |
| bob | bob@test.com | Bob Brown | user | ✅ Approved |
| charlie | charlie@test.com | Charlie Chen | user | ✅ Approved |
| diana | diana@test.com | Diana Davis | user | ✅ Approved |
| eve | eve@test.com | Eve Evans | user | ✅ Approved |
| admin | admin@messenger.local | Admin User | admin | ✅ Approved |

## Login Credentials

### Regular Users:
```
Username: alice
Password: Admin123!@#
```

```
Username: bob
Password: Admin123!@#
```

```
Username: charlie  ← YOU WANTED THIS
Password: Admin123!@#
```

```
Username: diana
Password: Admin123!@#
```

```
Username: eve
Password: Admin123!@#
```

### Admin:
```
Username: admin
Password: Admin123!@#
```

---

## Contact Relationships

All users are connected to each other:
- Alice ↔ Bob, Charlie, Diana, Eve
- Bob ↔ Alice, Charlie, Diana, Eve
- Charlie ↔ Alice, Bob, Diana, Eve
- Diana ↔ Alice, Bob, Charlie, Eve
- Eve ↔ Alice, Bob, Charlie, Diana

---

## Testing

To login as charlie for testing:
1. Go to http://localhost:3000/login
2. Enter username: `charlie`
3. Enter password: `Admin123!@#`
4. Click Sign In
