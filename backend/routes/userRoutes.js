const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middlewares/authMiddleware');

// Public routes
router.post('/login', userController.loginUser);
router.post('/register', userController.registerUser);



// Protected routes
router.get('/list', verifyToken, userController.getUserList);
router.get('/detail/:id', verifyToken, userController.getUserDetail);
router.put('/update/:id', verifyToken, userController.updateUser); // <-- ADD THIS ROUTE
router.delete('/delete/:id', verifyToken, userController.deleteUser);

module.exports = router;