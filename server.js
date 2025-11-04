// server.js
var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser');

require('dotenv').config();

var app = express();
var port = process.env.PORT || 3000;

// MongoDB connection with detailed error handling
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Log masked connection string for debugging
    const maskedURI = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log('Using connection string:', maskedURI);

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log('✅ MongoDB connected successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'MongoParseError') {
      console.error('This is a connection string parsing error.');
      console.error('Please check your MONGODB_URI format.');
    }
    
    process.exit(1);
  }
};

connectDB();

// CORS middleware
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Basic routes that work even if MongoDB fails
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    message: 'Welcome to Llama.io Task Management API',
    status: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    status: dbStatus === 'connected' ? 'OK' : 'Database disconnected',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// API routes - only load if MongoDB is connected
if (mongoose.connection.readyState === 1) {
  try {
    const routes = require('./routes');
    app.use('/api', routes);
    console.log('✅ API routes loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load API routes:', error.message);
  }
} else {
  console.log('⚠️  MongoDB not connected - API routes disabled');
  
  // Provide helpful error for API routes
  app.use('/api', (req, res) => {
    res.status(503).json({
      message: 'Database not connected - API unavailable',
      data: null
    });
  });
}

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    data: null
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    data: null
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Database connection state: ${mongoose.connection.readyState}`);
  console.log(`   (0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting)`);
});