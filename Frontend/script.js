// Handle user login/register
document.getElementById('authBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;

    const response = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email }),
    });

    if (response.ok) {
        showFeedback('Login/Register successful!');
        clearAuthFields(); // Clear input fields after successful login/register
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('score-section').style.display = 'block';
        fetchLeaderboard(); // Fetch leaderboard after login
    } else {
        showFeedback('Error logging in. Please try again.');
    }
});

// Function to clear authentication input fields
function clearAuthFields() {
    document.getElementById('username').value = '';
    document.getElementById('email').value = '';
}

// Handle score submission
document.getElementById('submitScoreBtn').addEventListener('click', async () => {
    const game = document.getElementById('game-select').value;
    const score = document.getElementById('score-input').value;

    const response = await fetch('http://localhost:3000/submit-score', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ game_id: game, score }),
    });

    if (response.ok) {
        showFeedback('Score submitted successfully!');
        clearScoreFields(); // Clear input fields after successful score submission
        fetchLeaderboard(); // Refresh leaderboard after submission
    } else {
        showFeedback('Error submitting score. Please try again.');
    }
});

// Function to clear score input fields
function clearScoreFields() {
    document.getElementById('game-select').selectedIndex = 0; // Reset select dropdown
    document.getElementById('score-input').value = ''; // Clear score input
}

// Function to show feedback messages
function showFeedback(message) {
   const feedbackSection = document.getElementById('feedback-section');
   const feedbackMessage = document.getElementById('feedback-message');
   
   feedbackMessage.textContent = message;
   feedbackSection.style.display = 'block';
   
   // Hide after a few seconds
   setTimeout(() => {
       feedbackSection.style.display = 'none';
   }, 3000);
}

// Function to fetch and display the leaderboard
async function fetchLeaderboard() {
   const response = await fetch('http://localhost:3000/leaderboard');
   
   if (response.ok) {
       const leaderboard = await response.json();
       
       // Update the leaderboard display
       const leaderboardBody = document.querySelector('#leaderboard tbody');
       leaderboardBody.innerHTML = ''; // Clear existing leaderboard

       leaderboard.forEach((entry, index) => {
           const newRow = document.createElement('tr');
           newRow.innerHTML = `
               <td>${index + 1}</td>
               <td>${entry.game_name}</td>
               <td>${entry.username}</td>
               <td>${entry.score}</td>
               <td>${new Date(entry.date_achieved).toLocaleString()}</td>
               <td><button class="delete-btn" data-id="${entry.id}">Delete</button></td> <!-- Added delete button -->
           `;
           leaderboardBody.appendChild(newRow);
       });

       // Add event listeners for delete buttons
       document.querySelectorAll('.delete-btn').forEach(button => {
           button.addEventListener('click', async (event) => {
               const scoreId = event.target.getAttribute('data-id');
               await deleteScore(scoreId);
           });
       });
       
   } else {
       showFeedback('Error fetching leaderboard. Please try again.');
   }
}

// Function to delete a score
async function deleteScore(scoreId) {
   const response = await fetch(`http://localhost:3000/delete-score/${scoreId}`, {
       method: 'DELETE',
   });

   if (response.ok) {
       showFeedback('Score deleted successfully!');
       fetchLeaderboard(); // Refresh leaderboard after deletion
   } else {
       showFeedback('Error deleting score. Please try again.');
   }
}

// Initial leaderboard fetch when the page loads
document.addEventListener('DOMContentLoaded', fetchLeaderboard);
