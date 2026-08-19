## Firebase Authentication (Admin SDK)

### Initialization

```typescript
import { getAuth } from 'firebase-admin/auth';

const auth = getAuth();
```

### Create User

```typescript
// Create with email/password
const userRecord = await auth.createUser({
  email: 'user@example.com',
  emailVerified: false,
  phoneNumber: '+15551234567',
  password: 'secretPassword!',
  displayName: 'John Doe',
  photoURL: 'https://example.com/photo.jpg',
  disabled: false,
});
console.log('Created user:', userRecord.uid);

// Create with specific UID
const userRecord2 = await auth.createUser({
  uid: 'custom-uid-123',
  email: 'custom@example.com',
  password: 'password123',
});
```

### Get User

```typescript
// By UID
const user = await auth.getUser('uid-123');

// By email
const user2 = await auth.getUserByEmail('user@example.com');

// By phone number
const user3 = await auth.getUserByPhoneNumber('+15551234567');

// Get multiple users at once
const getUsersResult = await auth.getUsers([
  { uid: 'uid-1' },
  { email: 'user2@example.com' },
  { phoneNumber: '+15551234567' },
]);
getUsersResult.users.forEach((user) => console.log(user.uid));
getUsersResult.notFound.forEach((id) => console.log('Not found:', id));

// UserRecord properties
user.uid;              // string
user.email;            // string | undefined
user.emailVerified;    // boolean
user.displayName;      // string | undefined
user.phoneNumber;      // string | undefined
user.photoURL;         // string | undefined
user.disabled;         // boolean
user.metadata.creationTime;    // string (RFC 2822)
user.metadata.lastSignInTime;  // string (RFC 2822)
user.metadata.lastRefreshTime; // string | null
user.providerData;     // UserInfo[] (linked providers)
user.customClaims;     // Record<string, any> | undefined
user.tokensValidAfterTime; // string (RFC 2822)
user.tenantId;         // string | null
user.multiFactor;      // MultiFactorSettings
```

### Update User

```typescript
await auth.updateUser('uid-123', {
  email: 'newemail@example.com',
  emailVerified: true,
  phoneNumber: '+15559876543',
  password: 'newPassword!',
  displayName: 'Jane Doe',
  photoURL: 'https://example.com/new-photo.jpg',
  disabled: false,
});

// Remove optional fields by setting to null
await auth.updateUser('uid-123', {
  phoneNumber: null,   // Removes phone number
  photoURL: null,      // Removes photo URL
  displayName: null,   // Removes display name
});
```

### Delete User

```typescript
// Delete single user
await auth.deleteUser('uid-123');

// Delete multiple users (batch delete, up to 1000)
const deleteResult = await auth.deleteUsers(['uid-1', 'uid-2', 'uid-3']);
console.log(`Deleted ${deleteResult.successCount} users`);
console.log(`Failed to delete ${deleteResult.failureCount} users`);
deleteResult.errors.forEach((error) => {
  console.error(`Failed to delete ${error.index}:`, error.error);
});
```

### List Users

```typescript
// List users in batches
const listUsersResult = await auth.listUsers(1000); // maxResults (up to 1000)
listUsersResult.users.forEach((user) => {
  console.log(user.uid, user.email);
});

// Paginate
let pageToken: string | undefined;
do {
  const result = await auth.listUsers(1000, pageToken);
  result.users.forEach((user) => { /* process */ });
  pageToken = result.pageToken;
} while (pageToken);
```

### Custom Tokens

```typescript
// Create a custom token for a user (used for custom auth flows)
const customToken = await auth.createCustomToken('uid-123');

// With additional claims embedded in the token
const customToken2 = await auth.createCustomToken('uid-123', {
  admin: true,
  agencyId: 'agency_abc',
  role: 'manager',
});
// Client signs in with: signInWithCustomToken(auth, customToken)
```

### Verify ID Token

```typescript
// Verify token (checks signature, expiration, audience, issuer)
const decodedToken = await auth.verifyIdToken(idToken);
const uid = decodedToken.uid;
const email = decodedToken.email;
const claims = decodedToken; // All custom claims are on the token

// Check if token has been revoked
const decodedToken2 = await auth.verifyIdToken(idToken, true); // checkRevoked = true
// Throws auth/id-token-revoked if the token has been revoked

// DecodedIdToken properties
decodedToken.uid;           // string
decodedToken.email;         // string | undefined
decodedToken.email_verified;// boolean
decodedToken.phone_number;  // string | undefined
decodedToken.name;          // string | undefined
decodedToken.picture;       // string | undefined
decodedToken.iss;           // string (issuer)
decodedToken.aud;           // string (audience = project ID)
decodedToken.auth_time;     // number (seconds since epoch)
decodedToken.iat;           // number (issued at)
decodedToken.exp;           // number (expiration)
decodedToken.firebase;      // { sign_in_provider, identities, ... }
// Plus any custom claims set via setCustomClaims
```

### Custom Claims

```typescript
// Set custom claims (replaces all existing custom claims)
await auth.setCustomClaims('uid-123', {
  admin: true,
  agencyId: 'agency_abc',
  role: 'owner',
  permissions: ['read', 'write', 'delete', 'manage_users'],
});

// Remove all custom claims
await auth.setCustomClaims('uid-123', null);

// Read custom claims
const user = await auth.getUser('uid-123');
const claims = user.customClaims; // { admin: true, agencyId: 'agency_abc', ... }

// Claims are included in the ID token (available in security rules and client)
// Max custom claims payload: 1000 bytes
// Claims propagate on next token refresh (~1 hour) unless client forces refresh
```

### Revoke Refresh Tokens

```typescript
// Revoke all refresh tokens for a user (force re-authentication)
await auth.revokeRefreshTokens('uid-123');

// After revoking, existing ID tokens remain valid until they expire (~1 hour)
// Use verifyIdToken with checkRevoked=true to catch revoked tokens immediately
const user = await auth.getUser('uid-123');
const revokeTime = new Date(user.tokensValidAfterTime).getTime() / 1000;
```

### Generate Email Action Links

```typescript
// Generate email verification link
const verificationLink = await auth.generateEmailVerificationLink(
  'user@example.com',
  {
    url: 'https://app.trustedamerican.com/verify-complete',
    handleCodeInApp: true,
  }
);
// Send this link via your own email service (e.g., Mailgun)

// Generate password reset link
const resetLink = await auth.generatePasswordResetLink(
  'user@example.com',
  {
    url: 'https://app.trustedamerican.com/login',
    handleCodeInApp: true,
  }
);

// Generate sign-in with email link
const signInLink = await auth.generateSignInWithEmailLink(
  'user@example.com',
  {
    url: 'https://app.trustedamerican.com/complete-signin',
    handleCodeInApp: true,
  }
);
```

### Session Cookies

```typescript
// Create a session cookie from an ID token
const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days in milliseconds
const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

// Verify session cookie
const decodedClaims = await auth.verifySessionCookie(sessionCookie, true); // checkRevoked

// Useful for server-rendered pages or API gateways
```

### A3 Auth Flow

1. User enters email/password on the login page
2. Firebase Auth validates credentials
3. If MFA enabled: user completes phone/TOTP verification
4. On success: JWT ID token issued
5. ember-simple-auth stores token in session
6. Token attached to all Firestore requests and API calls via Authorization header
7. Cloud Functions verify token via `getAuth().verifyIdToken(token)`
8. Custom claims contain agencyId, role, permissions for authorization

### MFA Support

A3 supports multi-factor authentication via Firebase Auth:
- Phone number as second factor (SMS)
- TOTP (time-based one-time password) support
- Configured per-user in user settings
- Enrollment and verification handled in frontend

---
