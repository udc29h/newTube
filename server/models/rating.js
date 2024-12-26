const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    index: true
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
});

module.exports = mongoose.model('Rating', ratingSchema);