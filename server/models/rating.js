const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    videoId: {
        type: String,
        required: true,
        unique: true
    },
    votes: [{
        userId: {
            type: String,
            required: true
        },
        age: {
            type: Number,
            required: true,
            enum: [7, 12, 16, 18]
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// Add index for faster lookups
ratingSchema.index({ videoId: 1 });

module.exports = mongoose.model('Rating', ratingSchema);