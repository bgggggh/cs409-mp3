// models/Task.js
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  completed: {
    type: Boolean,
    default: false
  },
  assignedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedUserName: {
    type: String,
    default: 'unassigned'
  },
  dateCreated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', TaskSchema);