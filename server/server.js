require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Rating = require('./models/rating');

const app = express();

// Middleware
const corsOptions = {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

mongoose.set('strictQuery', true);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Get ratings for a video
app.get('/', (req, res) => {
    res.send('Hello, World! This is Uday server.');
});

app.get('/api/ratings/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const rating = await Rating.findOne({ videoId });
        
        if (!rating) {
            return res.json({ videoId, votes: [] });
        }

        // Calculate vote statistics
        const voteCounts = {
            7: 0,
            12: 0,
            16: 0,
            18: 0
        };

        rating.votes.forEach(vote => {
            voteCounts[vote.age]++;
        });

        res.json({
            videoId,
            votes: rating.votes,
            voteCounts
        });
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ error: 'Failed to fetch ratings' });
    }
});

// Submit a vote
app.post('/api/ratings/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { age, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Find or create rating document for this video
        let rating = await Rating.findOne({ videoId });
        
        if (!rating) {
            rating = new Rating({ 
                videoId,
                votes: []
            });
        }

        // Check if user has already voted
        const existingVote = rating.votes.find(vote => vote.userId === userId);
        if (existingVote) {
            return res.status(400).json({ error: 'User has already voted for this video' });
        }

        // Add new vote
        rating.votes.push({
            userId,
            age,
            timestamp: new Date()
        });

        await rating.save();

        // Calculate updated vote counts
        const voteCounts = {
            7: 0,
            12: 0,
            16: 0,
            18: 0
        };

        rating.votes.forEach(vote => {
            voteCounts[vote.age]++;
        });

        res.json({
            videoId,
            votes: rating.votes,
            voteCounts
        });
    } catch (error) {
        console.error('Error submitting vote:', error);
        res.status(500).json({ error: 'Failed to submit vote' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})