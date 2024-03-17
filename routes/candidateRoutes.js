const express = require('express');
const router = express.Router();
const Candidate = require('../models/candidate');
const User = require('../models/user');
const { jwtAuthMiddleware } = require('../jwt');

const checkAdminRole = async (userId) => {
    try {
        const user = await User.findById(userId);
        return user.role === 'admin';
    } catch (err) {
        return false;
    }
}

// Post route to add a candidate
router.post('/', jwtAuthMiddleware, async (req, res) => {
    try {
        if (! await checkAdminRole(req.user.id))
            return res.status(403).json({ message: 'User has not admin role' });

        const data = req.body; // Assuming the request body contains the candidate data

        // Create a new candidate document using the Mongoose model
        const newCandidate = new Candidate(data);

        // Save the new candidate to the database
        const response = await newCandidate.save();
        console.log('Candidate saved');
        res.status(200).json({ response: response });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Post route to update candidate data
router.put('/:candidateId', jwtAuthMiddleware, async (req, res) => {
    try {
        if (! await checkAdminRole(req.user.id))
            return res.status(403).json({ message: 'User has not admin role' });

        const candidateId = req.params.candidateId; // Extract the id from the URL parameter
        const updatedCandidateData = req.body; // Updated data for the candidate

        const response = await Candidate.findByIdAndUpdate(candidateId, updatedCandidateData, {
            new: true,
            runValidators: true
        });

        if (!response) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        console.log('Candidate data updated');
        res.status(200).json(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete route to delete a candidate

router.delete('/:candidateId', jwtAuthMiddleware, async (req, res) => {
    try {
        if (! await checkAdminRole(req.user.id))
            return res.status(403).json({ message: 'User has not admin role' })

        const candidateId = req.params.candidateId;
        const response = await Candidate.findByIdAndDelete(candidateId);

        if (!response) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        console.log('Candidate deleted');
        res.status(200).json(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Voting route
router.post('/vote/:candidateId', jwtAuthMiddleware, async (req, res) => {
    // No admin can vote
    // User can only vote once

    const candidateId = req.params.candidateId;
    const userId = req.user.id;
    try {
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVoted) {
            res.status(400).json({ message: 'You have already voted' })
        }

        if (user.role == 'admin') {
            res.status(403).json({ message: 'Admin is not allowed' });
        }

        // Update the candidate document to record vote
        candidate.votes.push({ user: userId });
        candidate.voteCount++;
        await candidate.save();

        // Update the user document
        user.isVoted = true;
        await user.save();

        res.status(200).json({ message: 'Vote recorded successfully' })

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Vote count
router.get('/vote/count', async (req, res) => {
    try {
        // Find all the candidate and sort them by voteCount in descending order
        const candidate = await Candidate.find().sort({ voteCount: 'desc' });

        // Map the candidate to only return their name and voteCount
        const voteRecord = candidate.map((data) => {
            return {
                party: data.party,
                count: data.voteCount
            }
        });

        return res.status(200).json(voteRecord);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;