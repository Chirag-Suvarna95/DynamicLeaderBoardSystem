const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Database connection
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'ATXr10@',
    database: 'GamingLeaderboard'
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the database.');
});

// Secret key for JWT
const JWT_SECRET = 'your_jwt_secret';

// User registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const checkUserQuery = 'SELECT * FROM Users WHERE email = ?';
    db.query(checkUserQuery, [email], async (error, results) => {
        if (error) return res.status(500).json({ error: 'Database error.' });
        if (results.length > 0) return res.status(400).json({ error: 'User already exists.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO Users (username, email, password) VALUES (?, ?, ?)';
        db.query(query, [username, email, hashedPassword], (error, results) => {
            if (error) return res.status(500).json({ error: 'Failed to create user.' });
            res.status(201).json({ message: "User successfully created", userId: results.insertId });
        });
    });
});

// User login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM Users WHERE email = ?';
    db.query(query, [email], async (error, results) => {
        if (error || results.length === 0)
            return res.status(401).json({ error: 'Invalid credentials.' });
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ error: 'Invalid credentials.' });
        const token = jwt.sign({ id: user.id }, JWT_SECRET);
        res.json({ token, userId: user.id });
    });
});

// Get list of games
app.get('/games', (req, res) => {
    const query = 'SELECT * FROM Games';
    db.query(query, (error, results) => {
        if (error)
            return res.status(500).json({ error: 'Failed to retrieve games.' });
        res.json(results);
    });
});

// Submit regular scores
app.post('/submit-score', (req, res) => {
    const { game_id, score, user_id } = req.body;
    const query = 'INSERT INTO Scores (user_id, game_id, score) VALUES (?, ?, ?)';
    db.query(query, [user_id, game_id, score], (error, results) => {
        if (error)
            return res.status(500).json({ error: 'Failed to submit score.' });
        res.status(201).json({ scoreId: results.insertId });
    });
});

// Get leaderboard for a specific game
app.get('/leaderboard/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    const query = `
        SELECT s.id AS id, s.score, s.date_achieved, u.username, s.user_id 
        FROM Scores s 
        JOIN Users u ON s.user_id = u.id 
        WHERE s.game_id = ? 
        ORDER BY s.score DESC`;
    db.query(query, [gameId], (error, results) => {
        if (error)
            return res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
        res.json(results);
    });
});

// Update score
app.put('/update-score/:id', (req, res) => {
    const scoreId = req.params.id;
    const { user_id, new_score } = req.body;
    const checkScoreQuery = 'SELECT user_id FROM Scores WHERE id=?';
    db.query(checkScoreQuery, [scoreId], (error, result) => {
        if (error || result.length === 0)
            return res.status(404).json({ error: 'Score not found.' });
        let ownerID = result[0].user_id;
        if (ownerID !== user_id)
            return res.status(403).json({ error: 'You do not have permission to update this score.' });
        const queryUpdateScore = 'UPDATE Scores SET score=? WHERE id=?';
        db.query(queryUpdateScore, [new_score, scoreId], (error, result) => {
            if (error)
                return res.status(500).json({ error: 'Failed to update score.' });
            res.status(200).json({ message: 'Score updated successfully.' });
        });
    });
});

// Delete score
app.delete('/delete-score/:id', (req, res) => {
    const scoreID = req.params.id;
    const userID = req.body.user_id;
    const checkScoreQuery = 'SELECT user_id FROM Scores WHERE id=?';
    db.query(checkScoreQuery, [scoreID], (error, result) => {
        if (error || result.length === 0)
            return res.status(404).json({ error: 'Score not found.' });
        let ownerID = result[0].user_id;
        if (ownerID !== userID)
            return res.status(403).json({ error: 'You do not have permission to delete this score.' });
        const query = 'DELETE FROM Scores WHERE id=?';
        db.query(query, [scoreID], (error, result) => {
            if (error)
                return res.status(500).json({ error: 'Failed to delete score.' });
            res.status(200).json({ message: 'Score deleted successfully.' });
        });
    });
});

// Get top 10 combined scores
app.get('/top10', (req, res) => {
    const query = `
        SELECT u.username, t.total_score, t.date_updated 
        FROM Top10 t 
        JOIN Users u ON t.user_id = u.id 
        ORDER BY t.total_score DESC 
        LIMIT 10`;
    db.query(query, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).json({ error: 'Failed to retrieve top scores.' });
        }
        results.forEach(result => {
            result.date_updated = new Date(result.date_updated).toLocaleString();
        });
        res.json(results);
    });
});

// Get user profile
app.get('/profile/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = `
        SELECT u.username, up.bio, up.location, up.date_of_birth, up.website, up.steamID, up.EpicID 
        FROM UserProfiles up 
        JOIN Users u ON up.user_id = u.id 
        WHERE up.user_id = ?`;
    db.query(query, [userId], (error, results) => {
        if (error || results.length === 0)
            return res.status(404).json({ error: 'User profile not found.' });
        res.json(results[0]);
    });
});

// Update user profile
app.put('/profile/:userId', (req, res) => {
    const userId = req.params.userId;
    const { bio, location, date_of_birth, website, steamID, EpicID } = req.body;
    const query = `
        UPDATE UserProfiles 
        SET bio = ?, location = ?, date_of_birth = ?, website = ?, steamID = ?, EpicID = ?
        WHERE user_id = ?`;
    db.query(query, [bio, location, date_of_birth, website, steamID, EpicID, userId], (error, results) => {
        if (error)
            return res.status(500).json({ error: 'Failed to update profile.' });
        res.status(200).json({ message: 'Profile updated successfully.' });
    });
});

// ===== OPEN TRIVIA QUIZ ENDPOINTS =====

// Fetch quiz questions from Open Trivia DB API
app.get('/start-quiz', (req, res) => {
    const { amount = 5, category, difficulty } = req.query;
    let apiUrl = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    if (category) apiUrl += `&category=${category}`;
    if (difficulty) apiUrl += `&difficulty=${difficulty}`;
    axios.get(apiUrl)
        .then(response => {
            if (!response.data || !response.data.results)
                return res.status(500).json({ error: 'Invalid trivia response.' });
            const quizData = response.data.results.map(q => ({
                question: q.question,
                answers: [q.correct_answer, ...q.incorrect_answers].sort(() => Math.random() - 0.5)
            }));
            res.json({ questions: quizData, correctAnswers: response.data.results.map(q => q.correct_answer) });
        })
        .catch(() => res.status(500).json({ error: 'Failed to fetch quiz.' }));
});

// Submit quiz answers and save score
app.post('/submit-quiz', (req, res) => {
    const { user_id, game_id, userAnswers = [], correctAnswers = [] } = req.body;
    if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers))
        return res.status(400).json({ error: 'Invalid data.' });
    let score = 0;
    for (let i = 0; i < correctAnswers.length; i++) {
        if (userAnswers[i] && userAnswers[i].trim() === correctAnswers[i].trim())
             score++;
    }
    const query = 'INSERT INTO Scores (user_id, game_id, score) VALUES (?, ?, ?)';
    db.query(query, [user_id, game_id, score], (error, results) => {
        if (error)
            return res.status(500).json({ error: 'Failed to save score.' });
        res.json({ message: 'Score saved', score, scoreId: results.insertId });
    });
});

// ====== SERVER START (do not put any routes below this!) ======
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
