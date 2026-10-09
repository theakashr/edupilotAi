const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./service-account.json'); // assuming it exists or I can fetch it, wait I don't need admin, I can just hit the api.
