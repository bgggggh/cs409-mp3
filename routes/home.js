// routes/home.js
module.exports = function (router) {
    var homeRoute = router.route('/');
    
    homeRoute.get(function (req, res) {
      res.json({ 
        message: 'Welcome to Task Management API',
        data: {
          version: '1.0.0',
          endpoints: ['/api/users', '/api/tasks']
        }
      });
    });
    
    return router;
  };