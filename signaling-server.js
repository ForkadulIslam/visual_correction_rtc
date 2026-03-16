// signaling-server.js
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const port = 59123;

// Initialize Gemini AI
let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('Gemini AI successfully initialized from .env');
} else {
  console.warn('GEMINI_API_KEY not found in .env. AI features will be disabled.');
}

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
      const modifiedHtml = data.replace('ws://YOUR_SERVER_IP_ADDRESS:59123', `${protocol}://${host}`);
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
  ws.on('message', async message => {
    const data = JSON.parse(message.toString());

    switch (data.type) {
      case 'broadcaster':
        broadcaster = ws;
        console.log('Broadcaster connected');
        break;
      case 'viewer':
        viewers.add(ws);
        console.log('Viewer connected');
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
        break;
      case 'request-offer':
        if (broadcaster) {
          broadcaster.send(JSON.stringify({ type: 'viewer-connected' }));
        }
        break;
      case 'analyze-image':
        if (!genAI) {
          ws.send(JSON.stringify({ type: 'analysis-error', error: 'AI features are not configured on the server.' }));
          break;
        }
        try {
          const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });

          const prompt = `Act as a Senior Staff Engineer. Analyze the screen area for technical assessment problems. 
Respond ONLY with a JSON object following this schema:
{
  "answer": "The final atomic result ONLY (string). (e.g., 'h1', 'Option B', '42', 'O(n)', or 'Bug on line 12').",
  "logic": "High-signal reasoning (single string, use Markdown bullets). Max 2-3 bullets. Briefly list Red Flags in distractors.",
  "task_summary": "Short problem type (string)"
}
Rules:
- THE ENTIRE RESPONSE MUST BE VALID JSON ONLY.
- "answer" MUST be a short value. NO boilerplate explanation in this field.
- "logic" MUST be a single string, not an array.
- Prioritize speed of reading over completeness.
- No conversational filler. Assume user expertise.`;
          
          const result = await model.generateContent([
            prompt,
            { inlineData: { data: data.image, mimeType: "image/png" } }
          ]);
          
          const responseText = result.response.text();
          console.log('--- Gemini JSON Response ---');
          console.log(responseText);
          
          ws.send(JSON.stringify({
            type: 'analysis-response',
            text: responseText // Sending the raw JSON string to be parsed by frontend
          }));
        } catch (error) {
          console.error('Error analyzing image:', error);
          ws.send(JSON.stringify({ type: 'analysis-error', error: 'Failed to analyze image with AI.' }));
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