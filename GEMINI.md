# Visual Correction - Project Overview

A WebRTC-based screen-sharing application that allows an Electron-based broadcaster to share its screen with web-based viewers. Viewers have the unique ability to select and take screenshots of specific areas of the live stream.

## Architecture

The project consists of three main components:

1.  **Broadcaster (Electron App):**
    *   Runs as a background process with a system tray icon.
    *   Uses Electron's `desktopCapturer` to access screen content.
    *   Initiates WebRTC connections to send the video stream.
    *   Key files: `main.js`, `broadcaster.html`, `preload.js`.

2.  **Signaling Server (Node.js):**
    *   Acts as a WebSocket server (`ws`) to coordinate WebRTC offers, answers, and ICE candidates between broadcasters and viewers.
    *   Serves the `viewer.html` page over HTTP.
    *   Dynamically updates the WebSocket connection URL in the served HTML.
    *   Key file: `signaling-server.js`.

3.  **Viewer (Web Page):**
    *   Connects to the signaling server to receive the video stream.
    *   Provides a UI for viewing the stream and an interactive selection tool for taking high-resolution screenshots of specific areas.
    *   Key file: `viewer.html`.

## Technologies

*   **Electron:** Desktop application framework.
*   **WebRTC:** Real-time peer-to-peer communication for video streaming.
*   **WebSockets (ws):** Signaling protocol for WebRTC.
*   **Node.js:** Backend signaling and HTTP server.
*   **Vanilla JS/HTML/CSS:** Frontend implementation for broadcaster and viewer.

## Getting Started

### Prerequisites

*   Node.js and npm installed.

### Running the Project

1.  **Start the Signaling Server:**
    ```bash
    npm run signal
    ```
    The server will run on `http://0.0.0.0:3000`.

2.  **Start the Broadcaster (Electron):**
    ```bash
    npm start
    ```
    *   Right-click the tray icon (requires `icon.png`) and select **Start** to begin sharing.
    *   The broadcaster window runs hidden in the background.

3.  **Access the Viewer:**
    Open a web browser and navigate to `http://localhost:3000` (or the server's IP address).

### Building for Production

To create a standalone executable for the broadcaster:
```bash
npm run build
```
Outputs will be in the `dist/` directory.

## Development Conventions

*   **Signaling Protocol:** Messages are JSON objects with a `type` field (e.g., `offer`, `answer`, `candidate`, `broadcaster`, `viewer`).
*   **IPC Bridge:** All Electron-specific functionality (like desktop capture) is exposed to the renderer via `preload.js` using `contextBridge`.
*   **Screenshot Logic:** Screenshots are taken by drawing the current video frame onto a hidden canvas at full resolution, then cropping based on user selection.
*   **Error Logging:** Errors are logged to the console and may also be found in `error_log.txt`.

## Project Structure

*   `main.js`: Electron main process and tray management.
*   `signaling-server.js`: Node.js WebSocket and HTTP server.
*   `broadcaster.html`: Renderer process for the broadcaster's WebRTC logic.
*   `viewer.html`: Frontend for the stream viewer and screenshot tool.
*   `preload.js`: Secure bridge for Electron IPC.
*   `index.html`: Alternative standalone broadcaster (using `getDisplayMedia`).
*   `.env`: Environment variables (if any).
*   `icon.png`: Required for the system tray icon.
