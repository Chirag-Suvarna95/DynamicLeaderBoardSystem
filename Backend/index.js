const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

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

// Route to get users and register new users
app.post('/users', (req, res) => {
  const { username, email } = req.body;
  
  const query = 'INSERT INTO Users (username, email) VALUES (?, ?)';
  
  db.query(query, [username, email], (error, results) => {
      if (error) {
          return res.status(500).json({ error: 'Failed to create user.' });
      }
      res.status(201).json({ userId: results.insertId });
  });
});

// Route to submit scores
app.post('/submit-score', (req, res) => {
  const { game_id, score } = req.body;

  // Assuming you have a way to get user_id from session or token; for now using a static value for demonstration.
  const user_id = 1; // Replace this with actual user ID logic
  
  const query = 'INSERT INTO Scores (user_id, game_id, score) VALUES (?, ?, ?)';
  
  db.query(query, [user_id, game_id, score], (error, results) => {
      if (error) {
          return res.status(500).json({ error: 'Failed to submit score.' });
      }
      res.status(201).json({ scoreId: results.insertId });
  });
});

// Route to get the leaderboard
app.get('/leaderboard', (req, res) => {
  const query = `
      SELECT s.id AS id, s.score, s.date_achieved, u.username, g.name AS game_name 
      FROM Scores s 
      JOIN Users u ON s.user_id = u.id 
      JOIN Games g ON s.game_id = g.id 
      ORDER BY s.score DESC`;
  
  db.query(query, (error, results) => {
      if (error) {
          return res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
      }
      res.json(results);
  });
});

// Route to delete a score
app.delete('/delete-score/:id', (req, res) => {
   const scoreId = req.params.id;

   const query = 'DELETE FROM Scores WHERE id = ?';
   
   db.query(query, [scoreId], (error, results) => {
       if (error) {
           return res.status(500).json({ error: 'Failed to delete score.' });
       }
       res.status(200).json({ message: 'Score deleted successfully.' });
   });
});

// Start the server
app.listen(3000, () => {
   console.log('Server is running on http://localhost:3000');
});
