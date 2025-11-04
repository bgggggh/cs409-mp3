// routes/home.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Llama.io Task Management API',
    data: {
      version: '1.0.0',
      endpoints: [
        { 
          path: '/api/users', 
          methods: ['GET', 'POST'],
          description: 'User management'
        },
        { 
          path: '/api/tasks', 
          methods: ['GET', 'POST'],
          description: 'Task management'
        },
        { 
          path: '/api/users/:id', 
          methods: ['GET', 'PUT', 'DELETE'],
          description: 'Individual user operations'
        },
        { 
          path: '/api/tasks/:id', 
          methods: ['GET', 'PUT', 'DELETE'],
          description: 'Individual task operations'
        }
      ]
    }
  });
});

module.exports = router;