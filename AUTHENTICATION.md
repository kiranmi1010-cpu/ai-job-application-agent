# Authentication System

JobPilot AI now includes a complete authentication system with login and signup functionality.

## Features

- ✅ **User Authentication**: Secure login and signup
- ✅ **Session Persistence**: Users stay logged in across browser sessions
- ✅ **Protected Routes**: All app features require authentication
- ✅ **User Profile**: Dynamic user name and avatar in header
- ✅ **Logout Functionality**: Easy sign out from any page
- ✅ **Demo Credentials**: Quick access for testing

## Demo Accounts

For quick testing, use these pre-configured accounts:

### Account 1 (Kiran Prem)
- **Email**: `kiran@example.com`
- **Password**: `demo123`

### Account 2 (Demo User)
- **Email**: `demo@example.com`
- **Password**: `demo`

## Creating a New Account

1. Click "Sign Up" on the login page
2. Enter your full name
3. Enter your email address
4. Create a password
5. Click "Create Account"

Your account will be saved locally and you'll be automatically logged in.

## How It Works

### Authentication Flow

1. **Login Page**: Users see a professional login form
2. **Credentials Check**: System validates against demo accounts or registered users
3. **Session Creation**: User data stored in localStorage
4. **App Access**: Authenticated users can access all features
5. **Logout**: Clears session and returns to login page

### Data Storage

- **Session Data**: Stored in `localStorage` as `jobpilot_user`
- **Registered Users**: Stored in `localStorage` as `jobpilot_registered_users`
- **Persistence**: Users stay logged in until they explicitly logout

### Security Notes

⚠️ **Important**: This is a client-side authentication system for demonstration purposes. For production use:

- Implement server-side authentication
- Use proper password hashing (bcrypt, argon2)
- Add JWT tokens or session cookies
- Implement rate limiting
- Add email verification
- Use HTTPS in production
- Consider using a service like Clerk, Auth0, or Firebase Auth

## User Interface

### Login Page
- Clean, professional design
- Email and password fields
- Toggle between Sign In and Sign Up
- Error messages for invalid credentials
- Demo credentials quick-fill button

### Header (When Logged In)
- User's name displayed
- Avatar with user's initial
- Logout button with icon
- Notification bell

### Dashboard
- Personalized welcome message: "Welcome back, [Name] 👋"

## Code Structure

```
src/
├── contexts/
│   └── AuthContext.tsx       # Authentication context and provider
├── components/
│   ├── LoginPage.tsx         # Login/Signup form
│   └── ...
└── App.tsx                   # Main app with auth wrapper
```

## API Reference

### AuthContext

```typescript
interface AuthContextType {
  user: User | null;                    // Current logged-in user
  login: (email, password) => Promise<boolean>;  // Login function
  signup: (email, password, name) => Promise<boolean>;  // Signup function
  logout: () => void;                   // Logout function
  isAuthenticated: boolean;             // Auth status
}
```

### Usage in Components

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Customization

### Adding More Demo Users

Edit `src/contexts/AuthContext.tsx`:

```typescript
const DEMO_USERS = [
  { email: 'kiran@example.com', password: 'demo123', name: 'Kiran Prem' },
  { email: 'demo@example.com', password: 'demo', name: 'Demo User' },
  // Add more users here
  { email: 'john@example.com', password: 'pass123', name: 'John Doe' }
];
```

### Changing Login Page Design

Edit `src/components/LoginPage.tsx` to customize:
- Colors and gradients
- Logo and branding
- Form fields
- Error messages
- Layout

### Adding Password Requirements

Modify the signup validation in `AuthContext.tsx`:

```typescript
const signup = async (email, password, name) => {
  // Add password validation
  if (password.length < 8) {
    return false; // Password too short
  }
  // ... rest of signup logic
};
```

## Testing

### Manual Testing

1. **Login Flow**:
   - Open the app
   - Try logging in with demo credentials
   - Verify you're redirected to dashboard
   - Check user name appears in header

2. **Signup Flow**:
   - Click "Sign Up"
   - Create a new account
   - Verify automatic login
   - Logout and login again with new credentials

3. **Session Persistence**:
   - Login to the app
   - Refresh the page
   - Verify you're still logged in
   - Close and reopen browser
   - Verify session persists

4. **Logout**:
   - Click logout button
   - Verify redirect to login page
   - Try accessing app directly
   - Verify login required

### Browser Console Testing

```javascript
// Check current user
JSON.parse(localStorage.getItem('jobpilot_user'))

// Check all registered users
JSON.parse(localStorage.getItem('jobpilot_registered_users'))

// Clear all auth data
localStorage.removeItem('jobpilot_user')
localStorage.removeItem('jobpilot_registered_users')
```

## Migration to Production Auth

When ready for production, replace the localStorage-based auth with a proper service:

### Option 1: Clerk (Recommended)
```bash
npm install @clerk/clerk-react
```

### Option 2: Firebase Auth
```bash
npm install firebase
```

### Option 3: Auth0
```bash
npm install @auth0/auth0-react
```

### Option 4: Supabase Auth
```bash
npm install @supabase/supabase-js
```

Each service provides:
- Secure password hashing
- Email verification
- Password reset
- Social login (Google, GitHub, etc.)
- Multi-factor authentication
- User management dashboard

## Troubleshooting

### Can't login with demo credentials
- Clear browser localStorage
- Refresh the page
- Try again with exact credentials

### User name not showing in header
- Check if `useAuth()` is properly imported
- Verify user is logged in
- Check browser console for errors

### Session not persisting
- Check if localStorage is enabled
- Verify no browser extensions are blocking storage
- Try in incognito mode to test

### Can't create new account
- Check if email already exists
- Verify all fields are filled
- Check browser console for errors

## Next Steps

1. ✅ Authentication system implemented
2. ✅ Login/Signup pages created
3. ✅ User profile integrated
4. ⏭️ Add password reset functionality
5. ⏭️ Add email verification
6. ⏭️ Migrate to production auth service
7. ⏭️ Add social login (Google, GitHub)
8. ⏭️ Implement user settings page
