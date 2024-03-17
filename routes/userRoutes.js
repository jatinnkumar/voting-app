const express = require('express');
const router = express.Router();
const User = require('./../models/user');
const { jwtAuthMiddleware, generateToken } = require('./../jwt');

// Signup route
router.post('/signup', async (req, res) => {
    try {
        const data = req.body; // Assuming the request body contains the User data

        // Create a new User document using the mongoose model
        const newUser = new User(data);
        const response = await newUser.save();
        console.log('Data saved');

        const payload = {
            id: response.id
        }
        console.log(JSON.stringify(payload));
        const token = generateToken(payload);
        console.log('Token is :', token);

        res.status(200).json({ response: response, token: token });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' })
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        // Extract adhaarCardNumber and password from request body
        const { aadharCardNumber, password } = req.body;

        // Find the user by aadharCardNumber
        const user = await User.find({ aadharCardNumber: aadharCardNumber });

        // If user does not exists or password does not match, return error
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // generate token
        const payload = {
            id: user.id
        }

        const token = generateToken(payload);

        // return token as response
        res.json({ token })
    } catch (err) {
        console.log(err);
    }
});

// Profile route
router.get('/profile', jwtAuthMiddleware, async (req, res) => {
    try {
        const userData = req.user;
        const userId = userData.id;
        const user = await User.findById(userId);

        res.status(200).json({ user });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' })
    }
});

router.put('/profile/password', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPasswrod } = req.body; // Extract current and new password from request body

        // Find the user by userId
        const user = await User.findById(userId);

        // If password does not match, return error
        if (!(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Update the user's password
        user.password = newPasswrod;
        await user.save();
        console.log('password updated');
        res.status(200).json({ message: 'Password updated' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;