// routes/tasks.js
const express = require('express');
const Task = require('../models/task');
const User = require('../models/user');
const router = express.Router();

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
  parsed.limit = count === 'true' ? null : (parseInt(limit) || 100); 
  parsed.count = count === 'true';
  
  return parsed;
};

router.get('/', async (req, res) => {
  try {
    const { where, sort, select, skip, limit, count } = parseQueryParams(req.query);
    
    let query = Task.find(where || {});
    
    if (sort) query = query.sort(sort);
    if (select) query = query.select(select);
    if (skip) query = query.skip(skip);
    if (limit !== null) query = query.limit(limit);
    
    if (count) {
      const count = await Task.countDocuments(where || {});
      return res.status(200).json({
        message: 'OK',
        data: count
      });
    }
    
    const tasks = await query.exec();
    
    res.status(200).json({
      message: 'Tasks retrieved successfully',
      data: tasks
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, deadline, completed, assignedUser } = req.body;
    
    if (!name || !deadline) {
      return res.status(400).json({
        message: 'Name and deadline are required',
        data: null
      });
    }
    
    let assignedUserName = 'unassigned';
    
    if (assignedUser) {
      const user = await User.findById(assignedUser);
      if (!user) {
        return res.status(400).json({
          message: 'Assigned user not found',
          data: null
        });
      }
      assignedUserName = user.name;
    }
    
    const task = new Task({
      name,
      description: description || '',
      deadline,
      completed: completed || false,
      assignedUser: assignedUser || null,
      assignedUserName
    });
    
    const newTask = await task.save();
    
    if (assignedUser && !completed) {
      await User.findByIdAndUpdate(assignedUser, {
        $addToSet: { pendingTasks: newTask._id }
      });
    }
    
    res.status(201).json({
      message: 'Task created successfully',
      data: newTask
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { select } = parseQueryParams(req.query);
    
    let query = Task.findById(req.params.id);
    
    if (select) query = query.select(select);
    
    const task = await query.exec();
    
    if (!task) {
      return res.status(404).json({
        message: 'Task not found',
        data: null
      });
    }
    
    res.status(200).json({
      message: 'Task retrieved successfully',
      data: task
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        message: 'Task not found',
        data: null
      });
    }
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, deadline, completed, assignedUser } = req.body;
    
    if (!name || !deadline) {
      return res.status(400).json({
        message: 'Name and deadline are required',
        data: null
      });
    }
    
    const currentTask = await Task.findById(req.params.id);
    if (!currentTask) {
      return res.status(404).json({
        message: 'Task not found',
        data: null
      });
    }
    
    let assignedUserName = 'unassigned';
    const previousAssignedUser = currentTask.assignedUser;
    
    if (assignedUser) {
      const user = await User.findById(assignedUser);
      if (!user) {
        return res.status(400).json({
          message: 'Assigned user not found',
          data: null
        });
      }
      assignedUserName = user.name;
    }
    
    if (completed !== undefined && completed !== currentTask.completed) {
      if (completed && currentTask.assignedUser) {
        await User.findByIdAndUpdate(currentTask.assignedUser, {
          $pull: { pendingTasks: req.params.id }
        });
      } else if (!completed && assignedUser) {
        await User.findByIdAndUpdate(assignedUser, {
          $addToSet: { pendingTasks: req.params.id }
        });
      }
    }
    
    if (assignedUser !== currentTask.assignedUser?.toString()) {
      if (previousAssignedUser && !currentTask.completed) {
        await User.findByIdAndUpdate(previousAssignedUser, {
          $pull: { pendingTasks: req.params.id }
        });
      }
      
      if (assignedUser && !completed) {
        await User.findByIdAndUpdate(assignedUser, {
          $addToSet: { pendingTasks: req.params.id }
        });
      }
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description: description || '',
        deadline,
        completed: completed || false,
        assignedUser: assignedUser || null,
        assignedUserName
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        message: 'Task not found',
        data: null
      });
    }
    res.status(400).json({
      message: error.message,
      data: null
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        message: 'Task not found',
        data: null
      });
    }
    
    if (task.assignedUser && !task.completed) {
      await User.findByIdAndUpdate(task.assignedUser, {
        $pull: { pendingTasks: req.params.id }
      });
    }
    
    await Task.findByIdAndDelete(req.params.id);
    
    res.status(204).json({
      message: 'Task deleted successfully',
      data: null
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        message: 'Task not found',
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