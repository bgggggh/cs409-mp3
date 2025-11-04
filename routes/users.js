// routes/users.js
const express = require('express');
const User = require('../models/user');
const Task = require('../models/task');
const router = express.Router();

// Helper function to parse query parameters
const parseQueryParams = (query) => {
  const { where, sort, select, skip, limit, count } = query;
  
  let parsed = {};
  
  if (where) {
    try {
      parsed.where = JSON.parse(where);
    } catch (e) {
      throw new Error('Invalid where parameter');
    }
  }
  
  if (sort) {
    try {
      parsed.sort = JSON.parse(sort);
    } catch (e) {
      throw new Error('Invalid sort parameter');
    }
  }
  
  if (select) {
    try {
      parsed.select = JSON.parse(select);
    } catch (e) {
      throw new Error('Invalid select parameter');
    }
  }
  
  parsed.skip = parseInt(skip) || 0;
  parsed.limit = count === 'true' ? null : (parseInt(limit) || null);
  parsed.count = count === 'true';
  
  return parsed;
};

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const { where, sort, select, skip, limit, count } = parseQueryParams(req.query);
    
    let query = User.find(where || {});
    
    if (sort) query = query.sort(sort);
    if (select) query = query.select(select);
    if (skip) query = query.skip(skip);
    if (limit !== null) query = query.limit(limit);
    
    if (count) {
      const count = await User.countDocuments(where || {});
      return res.status(200).json({
        message: 'OK',
        data: count
      });
    }
    
    const users = await query.exec();
    
    res.status(200).json({
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
  try {
    const { name, email, pendingTasks } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required',
        data: null
      });
    }
    
    const user = new User({
      name,
      email,
      pendingTasks: pendingTasks || []
    });
    
    const newUser = await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email already exists',
        data: null
      });
    }
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { select } = parseQueryParams(req.query);
    
    let query = User.findById(req.params.id);
    
    if (select) query = query.select(select);
    
    const user = await query.exec();
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        data: null
      });
    }
    
    res.status(200).json({
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        message: 'User not found',
        data: null
      });
    }
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, email, pendingTasks } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required',
        data: null
      });
    }
    
    // First, get the current user to handle task reference updates
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({
        message: 'User not found',
        data: null
      });
    }
    
    // If pendingTasks is being modified, update the tasks' assigned users
    if (pendingTasks && JSON.stringify(pendingTasks) !== JSON.stringify(currentUser.pendingTasks)) {
      // Remove this user from previously assigned tasks that are no longer in pendingTasks
      const removedTasks = currentUser.pendingTasks.filter(taskId => 
        !pendingTasks.includes(taskId.toString())
      );
      
      for (const taskId of removedTasks) {
        await Task.findByIdAndUpdate(taskId, {
          assignedUser: null,
          assignedUserName: 'unassigned'
        });
      }
      
      // Add this user to new tasks in pendingTasks
      const newTasks = pendingTasks.filter(taskId => 
        !currentUser.pendingTasks.includes(taskId)
      );
      
      for (const taskId of newTasks) {
        const task = await Task.findById(taskId);
        if (task) {
          await Task.findByIdAndUpdate(taskId, {
            assignedUser: req.params.id,
            assignedUserName: name
          });
        }
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        pendingTasks: pendingTasks || []
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        message: 'User not found',
        data: null
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email already exists',
        data: null
      });
    }
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        data: null
      });
    }
    
    // Unassign all pending tasks
    await Task.updateMany(
      { _id: { $in: user.pendingTasks } },
      {
        assignedUser: null,
        assignedUserName: 'unassigned'
      }
    );
    
    await User.findByIdAndDelete(req.params.id);
    
    res.status(204).json({
      message: 'User deleted successfully',
      data: null
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        message: 'User not found',
        data: null
      });
    }
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

module.exports = router;