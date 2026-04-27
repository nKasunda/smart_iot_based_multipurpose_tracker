const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve login.html for SPA-like feel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// For other routes, let static handle, or 404
app.get('*', (req, res) => {
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`Frontend Server running at http://localhost:${PORT}`);
});
