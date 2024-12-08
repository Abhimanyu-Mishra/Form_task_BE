const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { countries, states, cities } = require('./countriesData');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => {
  console.error('MongoDB connection error:', err.message);
});

// Define schemas and models
const UserSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  firstName: String,
  lastName: String,
  email: String,
  country: Number, // Store ID
  state: Number,   // Store ID
  city: Number,    // Store ID
  gender: String,
  dob: String,
  age: Number,
});

const User = mongoose.model('User', UserSchema);

// Counter schema for generating user IDs
const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', CounterSchema);

// Function to get the next userId
async function getNextUserId() {
  const counter = await Counter.findOneAndUpdate(
    { name: 'userId' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
}

// Endpoint to fetch countries
app.get('/api/countries', (req, res) => {
  res.json(countries);
});

// Endpoint to fetch states based on country
app.get('/api/states/:countryId', (req, res) => {
  const { countryId } = req.params;
  res.json(states[countryId] || []);
});

// Endpoint to fetch cities based on state
app.get('/api/cities/:stateId', (req, res) => {
  const { stateId } = req.params;
  res.json(cities[stateId] || []);
});

// Endpoint to save submitted data
app.post('/api/submit', async (req, res) => {
  try {
    const userData = req.body;

    const age = Math.floor((new Date() - new Date(userData.dob)) / 31557600000); // Calculate age
    const userId = await getNextUserId(); // Get the next userId

    const user = new User({ ...userData, userId, age });
    await user.save();

    res.status(200).json({ message: 'Data saved successfully!' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data.' });
  }
});

// Endpoint to fetch all submitted data with names instead of IDs
app.get('/api/submit', async (req, res) => {
  try {
    const users = await User.find();

    const enrichedUsers = users.map((user) => {
      const countryName = countries.find((c) => c.id === user.country)?.name || 'Unknown';
      const stateName = states[user.country]?.find((s) => s.id === user.state)?.name || 'Unknown';
      const cityName = cities[user.state]?.find((c) => c.id === user.city)?.name || 'Unknown';

      return {
        id: user._id,
        userId: user.userId, // Return the custom userId
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        country: countryName,
        state: stateName,
        city: cityName,
        gender: user.gender,
        dob: user.dob,
        age: user.age,
      };
    });

    res.json(enrichedUsers);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data.' });
  }
});

// Start server
app.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});
