const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  onViewerConnected: (cb) => ipcRenderer.on('viewer-connected', cb),
  sendOffer: (offer) => ipcRenderer.send('offer', offer),
  sendCandidate: (candidate) => ipcRenderer.send('candidate', candidate),
  onAnswer: (cb) => ipcRenderer.on('answer', (e, answer) => cb(answer)),
  onCandidate: (cb) => ipcRenderer.on('candidate', (e, candidate) => cb(candidate)),
});