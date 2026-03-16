var express = require('express');
var router = express.Router();

//Stores location history of assets
// Each entry will look like: { id: "T-001", lat: 42.9, lng: -81.2, timestamp: Date }
let locationHistory = [];

//This listens for the information the tracker will send
router.post('/api/update', (req, res) => {
  const { id, lat, lng } = req.body;
  const now = new Date(); // Captures the exact second the data arrived

  //Updates the location of an asset
  let asset = assets.find(a => a.id === id);
  if (asset) {
    asset.lat = lat;
    asset.lng = lng;
    asset.lastUpdated = now;
  }

  //Records the history of asset
  locationHistory.push({
    id: id,
    lat: lat,
    lng: lng,

    //Saves the time it received the data
    timestamp: now
  });
})

//Accessing the asset history
//Require the certain asset
router.get('/api/history/:id', (req, res) => {
  const { id } = req.params;
  //If the URL looks like /api/history/123?days=7, it will extract the days (which is optional)
  //Converts it to int if it does have days, if not, the standard is 0 days
  const days = req.query.days ? parseInt(req.query.days) : 0;

  //Find all history for this specific ID
  let results = locationHistory.filter(h => h.id === id);
  //If the user asked for a specific timeframe
  if (days > 0) {
    //Sets the current time as cutoff
    const cutoff = new Date();
    //So if its Mon and user says 2 days, then the cutoff changes to Sat
    cutoff.setDate(cutoff.getDate() - days);

    //Filters through all the history and only keeps everything from and after the cutoff
    results = results.filter(h => h.timestamp >= cutoff);
  }
  res.json(results);
});

//Mock Database
// This stores your assets in your computer's RAM while the server is running.
// Created a variable named assets with three different objects
let assets = [];

//HOME PAGE ROUTE
// This displays your main website (index.ejs)
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Asset Tracker System' });
});

//SEARCH API ROUTE
// This lets the user search for assets.
// Example: http://localhost:3000/api/search?name=Truck
router.get('/api/search', (req, res) => {

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

//ALL ASSETS API ROUTE
// This sends the entire list to your Map
router.get('/api/assets', (req, res) => {
  res.json(assets);
});

//Delete assets route
//Allows frontend to delete assets
router.delete('/api/assets/:id', (req, res) => {
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
router.post('/api/assets', (req, res) => {
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