// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  pendingTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  dateCreated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);