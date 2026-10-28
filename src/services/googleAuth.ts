// Google OAuth configuration
// User needs to create a project in Google Cloud Console and get these credentials
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with actual client ID
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
].join(' ');

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
}

// Initialize Google Sign-In
export function initializeGoogleSignIn(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if Google API is loaded
    if (typeof window.gapi === 'undefined') {
      // Load Google API script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2', () => {
          window.gapi.client.init({
            clientId: GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest']
          }).then(() => {
            resolve();
          }).catch(reject);
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      resolve();
    }
  });
}

// Sign in with Google
export async function signInWithGoogle(): Promise<GoogleUser | null> {
  try {
    if (typeof window.gapi === 'undefined') {
      await initializeGoogleSignIn();
    }
    
    const authInstance = window.gapi.auth2.getAuthInstance();
    const googleUser = await authInstance.signIn();
    
    const profile = googleUser.getBasicProfile();
    const authResponse = googleUser.getAuthResponse();
    
    return {
      email: profile.getEmail(),
      name: profile.getName(),
      picture: profile.getImageUrl(),
      accessToken: authResponse.access_token
    };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return null;
  }
}

// Sign out from Google
export async function signOutFromGoogle(): Promise<void> {
  try {
    if (typeof window.gapi !== 'undefined') {
      const authInstance = window.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
    }
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
}

// Check if user is signed in
export function isSignedIn(): boolean {
  if (typeof window.gapi === 'undefined') {
    return false;
  }
  
  const authInstance = window.gapi.auth2.getAuthInstance();
  return authInstance.isSignedIn.get();
}

// Get current user
export function getCurrentUser(): GoogleUser | null {
  if (!isSignedIn()) {
    return null;
  }
  
  const authInstance = window.gapi.auth2.getAuthInstance();
  const googleUser = authInstance.currentUser.get();
  const profile = googleUser.getBasicProfile();
  const authResponse = googleUser.getAuthResponse();
  
  return {
    email: profile.getEmail(),
    name: profile.getName(),
    picture: profile.getImageUrl(),
    accessToken: authResponse.access_token
  };
}

// Get access token
export function getAccessToken(): string | null {
  const user = getCurrentUser();
  return user?.accessToken || null;
}

// Refresh access token if needed
export async function refreshAccessToken(): Promise<string | null> {
  try {
    if (!isSignedIn()) {
      return null;
    }
    
    const authInstance = window.gapi.auth2.getAuthInstance();
    const googleUser = authInstance.currentUser.get();
    
    if (googleUser.getAuthResponse().expires_at < new Date().getTime()) {
      await googleUser.reloadAuthResponse();
    }
    
    return googleUser.getAuthResponse().access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

// Type declarations for Google API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Alternative: Use Google Identity Services (newer API)
export function initializeGoogleIdentityServices(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      resolve();
    }
  });
}

// Sign in with Google Identity Services
export function signInWithGoogleIdentity(callback: (response: any) => void): void {
  if (typeof window.google === 'undefined') {
    console.error('Google Identity Services not loaded');
    return;
  }
  
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: callback,
    scope: GOOGLE_SCOPES
  });
  
  window.google.accounts.id.prompt();
}
