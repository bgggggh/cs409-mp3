// server.js
var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser');

require('dotenv').config();

var app = express();
var port = process.env.PORT || 3000;

// Improved MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.log('MongoDB connection error: ' + err);
});

// CORS middleware
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Import routes
const routes = require('./routes');
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Llama.io Task Management API',
    data: {
      version: '1.0.0',
      endpoints: [
        '/api/users',
        '/api/tasks'
      ],
      documentation: 'Use /api/users and /api/tasks endpoints'
    }
  });
});

// Health check route for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    data: null
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    data: null
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});