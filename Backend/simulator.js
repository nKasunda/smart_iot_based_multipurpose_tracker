const axios = require("axios");

// Configuration
const SERVER_URL = "http://localhost:5000/api/tracker/update";

// Trackers list (ADD MORE HERE)
const trackers = [
  { id: "TRK-001", lat: -15.38596, lng: 35.3188 },
 
  { id: "TRK-003", lat: -15.38700, lng: 35.3200 },
];

// Move a tracker
function moveTracker(tracker) {
  tracker.lat += (Math.random() - 0.5) * 0.001;
  tracker.lng += (Math.random() - 0.5) * 0.001;
}

// Send ONE tracker update
async function sendTrackerData(tracker) {
  moveTracker(tracker);

  const data = {
    trackerId: tracker.id,
    lat: tracker.lat,
    lng: tracker.lng,
    battery: Math.floor(Math.random() * 100),
    signalStrength: -50 + Math.floor(Math.random() * 40),
    network: "GSM",
  };

  try {
    await axios.post(SERVER_URL, data);
    console.log(`[${tracker.id}] sent`);
  } catch (err) {
    console.error(`[${tracker.id}] error:`, err.message);
  }
}

// Send ALL trackers every 5 seconds
setInterval(() => {
  trackers.forEach(sendTrackerData);
}, 5000);
