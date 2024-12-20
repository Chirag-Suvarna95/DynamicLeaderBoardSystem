const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For token generation

const app = express();
app.use(express.json());
app.use(cors());

// Database connection
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'ATXr10@', // Replace with your MySQL password
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
const JWT_SECRET = 'your_jwt_secret'; // Change this to a strong secret

// User registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const checkUserQuery = 'SELECT * FROM Users WHERE email = ?';
    db.query(checkUserQuery, [email], async (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error.' });
        }
        if (results.length > 0) {
            return res.status(400).json({ error: 'User already exists.' });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = 'INSERT INTO Users (username, email, password) VALUES (?, ?, ?)';
        
        db.query(query, [username, email, hashedPassword], (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Failed to create user.' });
            }
            res.status(201).json({ message: "User successfully created", userId: results.insertId });
        });
    });
});

// User login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM Users WHERE email = ?';
    db.query(query, [email], async (error, results) => {
        if (error || results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password); // Compare hashed passwords

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET); // Create token
        res.json({ token });
    });
});

// Get list of games
app.get('/games', (req, res) => {
    const query = 'SELECT * FROM Games';
    
    db.query(query, (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to retrieve games.' });
        }
        res.json(results);
    });
});

// Route to submit scores
app.post('/submit-score', (req, res) => {
    const { game_id, score, user_id } = req.body; 
    
    const query = 'INSERT INTO Scores (user_id, game_id, score) VALUES (?, ?, ?)';
    
    db.query(query, [user_id, game_id, score], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to submit score.' });
        }
        res.status(201).json({ scoreId: results.insertId });
    });
});

// Route to get the leaderboard for a specific game
app.get('/leaderboard/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    
    const query = `
        SELECT s.id AS id, s.score, s.date_achieved, u.username, s.user_id 
        FROM Scores s 
        JOIN Users u ON s.user_id = u.id 
        WHERE s.game_id = ? 
        ORDER BY s.score DESC`;

    db.query(query, [gameId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
        }
        res.json(results);
    });
});

// Route to delete a score
app.delete('/delete-score/:id', (req, res) => {
   const scoreId = req.params.id;
   const userId = req.body.user_id; // Get user ID from request body

   // Check if the score belongs to the user
   const checkScoreQuery = 'SELECT user_id FROM Scores WHERE id = ?';
   db.query(checkScoreQuery, [scoreId], (error, results) => {
       if (error || results.length === 0) {
           return res.status(404).json({ error: 'Score not found.' });
       }

       const scoreOwnerId = results[0].user_id;
       if (scoreOwnerId !== userId) { 
           return res.status(403).json({ error: 'You do not have permission to delete this score.' });
       }

       // Proceed to delete the score
       const query = 'DELETE FROM Scores WHERE id = ?';
       db.query(query, [scoreId], (error, results) => {
           if (error) {
               return res.status(500).json({ error: 'Failed to delete score.' });
           }
           res.status(200).json({ message: 'Score deleted successfully.' });
       });
   });
});

// Start the server
app.listen(3000, () => {
   console.log('Server is running on http://localhost:3000');
});
