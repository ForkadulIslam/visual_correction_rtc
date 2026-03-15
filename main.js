const { app, BrowserWindow, desktopCapturer, ipcMain, Tray, Menu } = require('electron');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

let tray;
let broadcasterWindow;
let ws;
let signalingServerProcess;

function startSignalingServer() {
  if (signalingServerProcess) return;

  const serverPath = path.join(__dirname, 'signaling-server.js');
  const logStream = fs.createWriteStream(path.join(__dirname, 'signaling-server-log.txt'), { flags: 'a' });
  
  // Start the server and pipe stdout/stderr to signaling-server-log.txt
  signalingServerProcess = fork(serverPath, [], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    detached: false
  });

  if (signalingServerProcess.stdout) signalingServerProcess.stdout.pipe(logStream);
  if (signalingServerProcess.stderr) signalingServerProcess.stderr.pipe(logStream);

  signalingServerProcess.on('error', (err) => {
    logStream.write(`Process error: ${err.message}\n`);
  });

  signalingServerProcess.on('exit', (code) => {
    logStream.write(`Process exited with code: ${code}\n`);
    signalingServerProcess = null;
  });
}

function createTray() {
  // NOTE: You need to create an 'icon.png' file for the tray icon.
  // It should be a small, square image.
  try {
    tray = new Tray(path.join(__dirname, 'icon.png'));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Start', click: startSharing },
      { label: 'Stop', click: stopSharing },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setToolTip('System Service');
    tray.setContextMenu(contextMenu);
  } catch (error) {
    app.quit();
  }
}

function startSharing() {
  if (broadcasterWindow) {
    return;
  }

  broadcasterWindow = new BrowserWindow({
    show: false, // Run in background
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  broadcasterWindow.loadFile('broadcaster.html');

  broadcasterWindow.webContents.on('did-finish-load', () => {
    ws = new WebSocket('ws://127.0.0.1:59123');

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'broadcaster' }));
    });

    ws.on('error', (err) => {
      stopSharing(); // Stop on error
    });

    ws.on('message', message => {
      const data = JSON.parse(message.toString());
      if (broadcasterWindow) {
        if (data.type === 'viewer-connected') {
          broadcasterWindow.webContents.send('viewer-connected');
        } else if (data.type === 'answer') {
          broadcasterWindow.webContents.send('answer', data.answer);
        } else if (data.type === 'candidate') {
          broadcasterWindow.webContents.send('candidate', data.candidate);
        }
      }
    });

    ws.on('close', () => {
        console.log('Disconnected from signaling server.');
    });
  });

  broadcasterWindow.on('closed', () => {
    broadcasterWindow = null;
    if (ws) {
        ws.close();
        ws = null;
    }
  });
}

function stopSharing() {
  if (broadcasterWindow) {
    console.log('Stopping screen sharing...');
    broadcasterWindow.close();
  } else {
    console.log('Sharing is not currently active.');
  }
}

// Keep the app running in the background
app.on('window-all-closed', (e) => {
    e.preventDefault();
});

app.whenReady().then(() => {
  startSignalingServer();
  createTray();
});

app.on('before-quit', () => {
  if (signalingServerProcess) {
    signalingServerProcess.kill();
  }
});

ipcMain.on('offer', (_, offer) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'offer', offer }));
  }
});

ipcMain.on('candidate', (_, candidate) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'candidate', candidate }));
  }
});

ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return sources;
});
