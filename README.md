# Black House Gaming Forum

A gaming forum built for GitHub Pages with optional Firebase integration for real-time data.

## Features

- Gaming forum with categories and topics
- User registration and login
- Level system with XP and achievements
- Leaderboard rankings
- Search functionality
- Responsive design

## Demo Accounts

- **DemoUser** / demo123 (Admin)
- **GameMaster** / demo123 (Moderator)

## Deployment to GitHub Pages

### Quick Start (LocalStorage Mode - Demo)

1. Create a new repository on GitHub (e.g., `yourusername/black-house`)

2. Upload these files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `.nojekyll`

3. Go to Repository Settings → Pages

4. Select the branch (main) and folder (root)

5. Click Save

Your forum will be at: `https://yourusername.github.io/black-house/`

### Full Version with Firebase (Real-time Data)

For a fully functional forum where all users see the same data:

1. Create a Firebase project at https://console.firebase.google.com/

2. Enable Realtime Database

3. Set security rules to public (for testing):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. Copy your Firebase config and update `firebase-config.js`

5. Upload all files to GitHub

## How It Works

### Without Firebase (LocalStorage)
- Data is stored in each user's browser
- Each user has their own "copy" of the forum
- Good for demos and testing

### With Firebase
- All users share the same data
- Real-time updates across all users
- User registration works globally

## Files Included

- `index.html` - Main page
- `styles.css` - Styling
- `app.js` - Forum logic
- `firebase-config.js` - Firebase configuration (edit this!)
- `.nojekyll` - Required for GitHub Pages
- `README.md` - This file

## Local Development

```bash
# Open index.html directly in browser
# OR use a local server
npx serve .
```

## License

MIT
