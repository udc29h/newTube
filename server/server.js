require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Rating = require('./models/rating');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

mongoose.set('strictQuery', true);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/api/ratings/:videoId', async (req, res) => {
  try {
    const ratings = await Rating.find({ videoId: req.params.videoId });
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/ratings/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const { age } = req.body;
    
    if (!age || ![7, 12, 16, 18].includes(age)) {
      return res.status(400).json({ error: 'Invalid age rating' });
    }

    const rating = new Rating({ videoId, age });
    await rating.save();
    
    // Return all ratings for the video after saving
    const ratings = await Rating.find({ videoId });
    res.status(201).json(ratings);
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});