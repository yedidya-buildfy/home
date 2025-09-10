# 🔥 Firebase Rules Update Required

## The Issue:
The Settings invitation is failing because of Firestore permissions. You need to update the rules manually.

## Quick Fix:
1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Select your project: home-8a111**
3. **Go to Firestore Database → Rules**
4. **Replace the invites section with this:**

```javascript
// Invites - for invitation system (temporary fix)
match /invites/{inviteId} {
  // Allow all authenticated users to read/write invites
  allow read, write: if request.auth != null;
}
```

5. **Click "Publish"**

## After Publishing:
1. Go back to your app Settings page
2. Try sending the invitation again
3. Check the console logs

## Better Rules (use later):
```javascript
// Invites - for invitation system (secure version)
match /invites/{inviteId} {
  allow read: if request.auth != null && 
    (request.auth.uid == resource.data.invitedBy ||
     request.auth.token.email == resource.data.email);
  
  allow create: if request.auth != null &&
    request.auth.uid == request.resource.data.invitedBy;
  
  allow update: if request.auth != null &&
    (request.auth.uid == resource.data.invitedBy ||
     request.auth.token.email == resource.data.email);
  
  allow delete: if request.auth != null &&
    request.auth.uid == resource.data.invitedBy;
}
```

**Update the rules now, then test the invitation again!** 🚀