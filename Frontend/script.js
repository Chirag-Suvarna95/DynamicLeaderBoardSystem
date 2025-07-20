// ==============================================
// Auth: Register and Login Handlers
// ==============================================

// Registration handler
document.getElementById('registerBtn')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
    });

    if (response.ok) {
        showFeedback('Registration successful! You can now log in.');
        clearAuthFields('register');
        window.location.href = 'index.html';
    } else {
        const errorData = await response.json();
        showFeedback(errorData.error || 'Registration failed.');
    }
});

// Login handler
document.getElementById('loginBtn')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = document.getElementById('log-email').value;
    const password = document.getElementById('log-password').value;

    const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId); // Store userId for later use
        showFeedback('Login successful!');
        clearAuthFields('login');
        window.location.href = 'games.html';
    } else {
        const errorData = await response.json();
        showFeedback(errorData.error || 'Login failed.');
    }
});

// Clear authentication input fields
function clearAuthFields(formType) {
    if (formType === 'register') {
        document.getElementById('reg-username').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
    }
    if (formType === 'login') {
        document.getElementById('log-email').value = '';
        document.getElementById('log-password').value = '';
    }
}

// ==============================================
// Score Submission Handler
// ==============================================

document.getElementById('submitScoreBtn')?.addEventListener('click', async () => {
    const game = document.getElementById('game-select').value;
    const score = document.getElementById('score-input').value;
    const userId = localStorage.getItem('userId');

    if (!userId) {
        showFeedback('You must be logged in to submit a score.');
        return;
    }

    const response = await fetch('http://localhost:3000/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: game, score, user_id: userId }),
    });

    if (response.ok) {
        showFeedback('Score submitted successfully!');
        clearScoreFields();
        fetchLeaderboard();
    } else {
        const errorData = await response.json();
        showFeedback(errorData.error || 'Error submitting score. Please try again.');
    }
});

// Clear score input fields
function clearScoreFields() {
    document.getElementById('game-select').selectedIndex = 0;
    document.getElementById('score-input').value = '';
}

// ==============================================
// Leaderboard Fetching Per Game
// ==============================================

async function fetchLeaderboard() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId') || document.getElementById('game-select')?.value; // fallback if not in URL

    if (!gameId) {
        showFeedback('No game selected for leaderboard.');
        return;
    }

    const response = await fetch(`http://localhost:3000/leaderboard/${gameId}`);

    if (response.ok) {
        const leaderboard = await response.json();
        const leaderboardBody = document.querySelector('#leaderboard tbody');
        leaderboardBody.innerHTML = '';

        leaderboard.forEach((entry, index) => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.username}</td>
                <td>${entry.score}</td>
                <td>${new Date(entry.date_achieved).toLocaleString()}</td>
                <td>
                    ${localStorage.getItem('userId') == entry.user_id
                        ? `<button class="delete-btn" data-id="${entry.id}">Delete</button>`
                        : ''}
                </td>
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

// ==============================================
// Score Deletion Handler
// ==============================================

async function deleteScore(scoreId) {
    const userId = localStorage.getItem('userId');
    const response = await fetch(`http://localhost:3000/delete-score/${scoreId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
    });

    if (response.ok) {
        showFeedback('Score deleted successfully!');
        fetchLeaderboard();
    } else {
        const errorData = await response.json();
        showFeedback(errorData.error || 'Error deleting score. Please try again.');
    }
}

// ==============================================
// Feedback Message Display
// ==============================================

function showFeedback(message) {
    const feedbackSection = document.getElementById('feedback-section');
    const feedbackMessage = document.getElementById('feedback-message');
    if (feedbackSection && feedbackMessage) {
        feedbackMessage.textContent = message;
        feedbackSection.style.display = 'block';
        setTimeout(() => {
            feedbackSection.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}

// ==============================================
// Initial Leaderboard Fetch (on page load, if appropriate)
// ==============================================

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('#leaderboard')) {
        fetchLeaderboard();
    }
});
