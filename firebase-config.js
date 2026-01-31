// Firebase Configuration
// Replace these values with your Firebase project config
// Get your config from: https://console.firebase.google.com/

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let firebaseApp;
let database;
let auth;

try {
  firebaseApp = firebase.initializeApp(firebaseConfig);
  database = firebase.database();
  auth = firebase.auth();
} catch (error) {
  console.log('Firebase not configured - using localStorage fallback');
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseApp, database, auth, firebaseConfig };
}
