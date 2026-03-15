// signaling-server.js
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 3000;

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/viewer.html') {
    fs.readFile(path.join(__dirname, 'viewer.html'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading viewer.html');
        return;
      }
      // Replace the placeholder with the dynamic IP address
      // Also handle wss for ngrok
      const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
      const host = req.headers.host || `localhost:${port}`;
      const modifiedHtml = data.replace('ws://YOUR_SERVER_IP_ADDRESS:3000', `${protocol}://${host}`);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(modifiedHtml);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Create WebSocket server and attach it to the HTTP server
const wss = new WebSocket.Server({ server });

let broadcaster;
const viewers = new Set();

wss.on('connection', ws => {
  ws.on('message', message => {
    const data = JSON.parse(message.toString());

    switch (data.type) {
      case 'broadcaster':
        broadcaster = ws;
        console.log('Broadcaster connected');
        break;
      case 'viewer':
        viewers.add(ws);
        console.log('Viewer connected');
        // Removed: broadcaster.send(JSON.stringify({ type: 'viewer-connected' }));
        break;
      case 'offer':
        viewers.forEach(viewer => {
          if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ type: 'offer', offer: data.offer }));
          }
        });
        break;
      case 'answer':
        if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
          broadcaster.send(JSON.stringify({ type: 'answer', answer: data.answer }));
        }
        break;
      case 'candidate':
        if (ws === broadcaster) {
          viewers.forEach(viewer => {
            if (viewer.readyState === WebSocket.OPEN) {
              viewer.send(JSON.stringify({ type: 'candidate', candidate: data.candidate }));
            }
          });
        } else {
          if (broadcaster && broadcaster.readyState === WebSocket.OPEN) {
            broadcaster.send(JSON.stringify({ type: 'candidate', candidate: data.candidate }));
          }
        }
      case 'request-offer':
        if (broadcaster) {
          broadcaster.send(JSON.stringify({ type: 'viewer-connected' }));
        }
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  });

  ws.on('close', () => {
    if (ws === broadcaster) {
      broadcaster = null;
      console.log('Broadcaster disconnected');
      viewers.forEach(viewer => {
        if (viewer.readyState === WebSocket.OPEN) {
          viewer.send(JSON.stringify({ type: 'broadcaster-disconnected' }));
        }
      });
    } else {
      viewers.delete(ws);
      console.log('Viewer disconnected');
    }
  });

  
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Signaling server and HTTP server running on http://0.0.0.0:${port}`);
});