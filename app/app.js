// Simple Node.js application that will be deployed via CDK
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Basic system information endpoint
app.get('/', (req, res) => {
  const info = {
    service: 'CDK Infrastructure Demo',
    hostname: require('os').hostname(),
    platform: process.platform,
    nodejs: process.version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
  
  res.json(info);
});

// Health check endpoint for load balancer
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
app.listen(port, () => {
  console.log(`Application running on port ${port}`);
});
