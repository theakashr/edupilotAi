const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize admin
const sa = require('./serviceAccountKey.json'); // wait, I don't have serviceAccountKey!
