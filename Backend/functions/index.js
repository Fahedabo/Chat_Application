// this file AI assistance
// functions/index.js - Firebase Cloud Function for push notifications
// Refactored for cleaner structure & maintainability

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp();

// Constants
const NOTIFICATION_TYPE = 'chat_message';

// --- Helper Functions ---

// Validate required fields
function validateFields(data, required) {
  for (const field of required) {
    if (!data[field]) return `${field} is required`;
  }
  return null;
}

// Create notification payload
function createNotificationPayload(senderId, receiverId, message, senderName) {
  return {
    title: `New message from ${senderName || 'Someone'}`,
    body: message.length > 50 ? message.substring(0, 50) + '...' : message,
    icon: '/assets/chat-icon.png',
    click_action: '/chat',
    data: {
      senderId,
      receiverId,
      timestamp: new Date().toISOString(),
      type: NOTIFICATION_TYPE
    }
  };
}

// Log notification details
function logNotification(label, payload) {
  console.log(`\n🔔 ${label} 🔔`);
  console.log('==========================================');
  console.log(`Notification sent to: ${payload.data.receiverId}`);
  console.log(`From: ${payload.data.senderId}`);
  console.log(`Message: "${payload.body}"`);
  console.log(`Timestamp: ${payload.data.timestamp}`);
  console.log('==========================================');
  console.log('Payload:', JSON.stringify(payload, null, 2));
}

// Shared notification handler
async function handleNotification({ senderId, receiverId, message, senderName }) {
  const payload = createNotificationPayload(senderId, receiverId, message, senderName);
  logNotification('Push Notification Simulation', payload);
  return {
    success: true,
    message: 'Push notification simulated successfully',
    notificationSent: true,
    timestamp: new Date().toISOString(),
    recipientId: receiverId,
    senderId,
    simulatedPayload: payload
  };
}

// --- HTTP Endpoint ---
exports.sendNotificationHTTP = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const errorMsg = validateFields(req.body, ['senderId', 'receiverId', 'message']);
    if (errorMsg) return res.status(400).json({ error: errorMsg });

    try {
      const response = await handleNotification(req.body);
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in HTTP notification function:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });
});

// --- Callable Function ---
exports.sendNotification = functions.https.onCall(async (data, context) => {
  try {
    // Optional: Check authentication
    if (!context.auth) {
      console.log('Unauthenticated call to sendNotification');
    }

    const errorMsg = validateFields(data, ['senderId', 'receiverId', 'message']);
    if (errorMsg) {
      throw new functions.https.HttpsError('invalid-argument', errorMsg);
    }

    return await handleNotification(data);
  } catch (error) {
    console.error('Error in callable notification function:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred');
  }
});
