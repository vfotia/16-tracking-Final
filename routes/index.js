var express = require('express');
var router = express.Router();

//Imports a library that encrypts stored passwords
const bcrypt = require('bcryptjs');
//Imports a library that stores and checks log in information
const jwt = require('jsonwebtoken');

//Security Key for the backend (Do not change)
const JWT_SECRET = "67";

// Function to check if a user is logged in
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

//Creates an array of users/ This will delete once the system turns off/ Will need to replace with a database
let users = [];
//Stores location history of assets
// Each entry will look like: { id: "T-001", lat: 42.9, lng: -81.2, timestamp: Date }
let locationHistory = [
  { id: "T-100", name: "Red Truck", location: "North Wing - Room 202", lastUpdated: new Date("2026-03-25T10:00:00"), floor: "North"},
  { id: "T-100", name: "Red Truck", location: "North Wing - Hallway B", lastUpdated: new Date("2026-03-25T09:30:00"), floor: "North"},
  { id: "T-100", name: "Red Truck", location: "Loading Dock", lastUpdated: new Date("2026-03-25T09:00:00"), floor: "South" },
  { id: "T-100", name: "Red Truck", location: "Loading Dock", lastUpdated: new Date("2026-03-10T09:00:00"), floor: "South" },
  { id: "T-200", name: "WheelChair", location: "North Wing - Room 202", lastUpdated: new Date("2026-03-03T10:00:00"),floor: "North" },
  { id: "T-200", name: "WheelChair", location: "North Wing - Hallway B", lastUpdated: new Date("2026-03-14T09:30:00"), floor: "North"  },
  { id: "T-200", name: "WheelChair", location: "Loading Dock", lastUpdated: new Date("2026-03-18T09:00:00"), floor: "North"  },
  { id: "T-200", name: "WheelChair", location: "Loading Dock", lastUpdated: new Date("2026-03-10T09:00:00"), floor: "South"  }
];
// Assets array
let assets = [
  {
    id: "T-100",
    name: "Red Truck",
    lastUpdated: new Date()
  },
  {
    id: "T-200",
    name: "Wheelchair",
    lastUpdated: new Date()
  }
];

//Method for different methods here to force only a certain role to be able to use that function
const authorizeRole = (roleRequired) => {
  return (req, res, next) => {
    authenticateToken(req, res, () => {
      // Force both to lowercase for a safe comparison
      const userRole = req.user.role ? req.user.role.toLowerCase() : "";

      // Check if user is the specific role OR a general admin
      if (userRole === roleRequired.toLowerCase() || userRole === "admin") {
        next();
      } else {
        console.log(`Access Denied. User Role: ${userRole}, Required: ${roleRequired}`);
        res.status(403).json({ message: "Forbidden: Higher privileges required." });
      }
    });
  };
};
// Registers users
router.post('/api/register', async (req, res) => {
  const { username, password, role } = req.body;
  // 1. CHECK IF USER EXISTS
  const userExists = users.some(u => u.username === username);
  if (userExists) {
    // 409 Conflict is the standard status code for duplicate data
    return res.status(409).json({ message: "Username already taken!" });
  }
  // 2. PROCEED IF UNIQUE
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword, role: role });
  res.status(201).json({ message: "User created!" });
});
//Logs in users, Needs a password and username
router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  // Check if user exists first
  if (!user) {
    return res.status(404).json({ message: "User not found. Please register." });
  }
  // Then check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, role: user.role });
  } else {
    res.status(401).json({ message: "Invalid password." });
  }
});

/* This is a location update code block, if needed, uncomment
router.post('/api/update', (req, res) => {
  const { id, rssi } = req.body;

  const x = mapRange(rssi, -90, -30, 0, 1000);
  const y = 500;
  const now = new Date();

  let asset = assets.find(a => a.id === id);
  if (asset) {
    asset.lat = y;
    asset.lng = x;
    asset.lastUpdated = now;
  }

  // Use x and y here!
  locationHistory.push({
    id: id,
    lat: y,
    lng: x,
    timestamp: now
  });

  res.json({ message: "Location updated" }); // Always send a response!
});
*/

//Accessing the asset history
//Require the certain asset
router.get('/api/history/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const days = req.query.days ? parseInt(req.query.days) : 0;

  // Filter by ID
  let results = locationHistory.filter(h => h.id === id);

  if (days > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // FIX: Changed h.timestamp to h.lastUpdated to match your array
    results = results.filter(h => new Date(h.lastUpdated) >= cutoff);
  }

  // Sort by newest first so the top of the table is the most recent
  results.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

  res.json(results);
});

//HOME PAGE ROUTE
// This displays your main website (index.ejs)
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Asset Tracker System' });
});

//Search route
// This lets the user search for assets.
// Example: http://localhost:3000/api/search?name=Truck
router.get('/api/search', authenticateToken, (req, res) => {

  // Grabs the name after the first equal sign and makes sure its lower case
  // ?: represents if/else, if the name is entered use that, else use empty ""
  const query = req.query.name ? req.query.name.toLowerCase() : "";
  // Filter() goes through all the assets in the asset variable
  //.includes(query) looks for the name and stores the information if found in asset
  const results = assets.filter(a => a.name.toLowerCase().includes(query));
  //If data found, sends back data, or it prints an error
  if (results.length > 0) {
    res.json(results);
  } else {
    res.status(404).json({ message: "No asset found with that name." });
  }
});

//All assets route
// This sends the entire list
router.get('/api/assets', authenticateToken, (req, res) => {
  res.json(assets);
});

//Delete assets route
//Allows frontend to delete assets
router.delete('/api/assets/:id', authorizeRole("it"),  (req, res) => {
  //stores the object we want to delete
  const {id} = req.params;
  //Checks how long the 'before deletion' object is
  const initialLength = assets.length;
  // Keep only the assets that DON'T match the ID provided
  assets = assets.filter(a => a.id !== id);
  //Checks if the current asset length is not the same as the previous asset length
  if (assets.length < initialLength) {
    res.json({message: `Asset ${id} deleted successfully.`});
  } else {
    res.status(404).json({message: "Asset not found."});
  }
})

//Adding a new asset to the list
router.post('/api/assets', authorizeRole("it"), (req, res) => {
  const { id, name } = req.body;
  //Basic Validation: Ensure the user sent an ID and a Name
  if (!id || !name) {
    return res.status(400).json({ message: "ID and Name are required." });
  }
  //Prevent Duplicates: Check if the ID already exists
  const existing = assets.find(a => a.id === id);
  if (existing) {
    return res.status(409).json({ message: "An asset with this ID already exists." });
  }
  //Create the new asset object
  const newAsset = {
    id: id,
    name: name,
    lat: 0, // Default position until the tracker sends real data
    lng: 0,
    lastUpdated: new Date()
  };
  //Save to the asset list
  assets.push(newAsset);
  res.status(201).json({ message: "Asset added successfully!", asset: newAsset });
});





module.exports = router;