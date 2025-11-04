// routes/index.js
const express = require('express');
const router = express.Router();

// Import route files
const usersRouter = require('./users');
const tasksRouter = require('./tasks');
const homeRouter = require('./home');

// Use routes
router.use('/users', usersRouter);
router.use('/tasks', tasksRouter);
router.use('/', homeRouter);

module.exports = router;