const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
import process from 'process'
import { join } from 'path'
const fs = require('fs')
const { networkInterfaces } = require('os')
const dgram = require('dgram')
const net = require('net')

// Define global variables
let mainWindow = null
let splashWindow = null // Fixed: Added missing definition
let myDeviceInfo = null // Fixed: Added proper device info object

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    maxWidth: 400,
    maxHeight: 400,
    minWidth: 400,
    minHeight: 300,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/index.html')
    // Open DevTools in development
   // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize()
    console.log('min')
  })

  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
      mainWindow.getPosition()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('closeSplashWindow', () => {
    if (splashWindow) {
      splashWindow.close()
      splashWindow = null
    }
})

  ipcMain.on('close-window', () => {
    mainWindow?.close()
  })


ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections']
  })

  if (!result.canceled) {
    return result.filePaths.map((filePath) => {
      const stats = fs.statSync(filePath)
      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        type: path.extname(filePath).slice(1)
      }
    })
  }
  return []
})

// Socket for device discovery
const discoverySocket = dgram.createSocket('udp4')
const discoveryPort = 41234
const myDeviceId = `pcshare-${require('crypto').randomBytes(4).toString('hex')}`
const myDeviceName = `PcShare-${require('os').hostname()}`

let knownDevices = {}

discoverySocket.on('listening', () => {
  discoverySocket.setBroadcast(true)
  console.log(`Discovery service listening on port ${discoveryPort}`)
  console.log(`My device ID: ${myDeviceId}`)
  console.log(`Broadcast address: 255.255.255.255`)

  // Broadcast presence every 5 seconds
  setInterval(() => {
    const message = JSON.stringify({
      type: 'discovery',
      deviceId: myDeviceId,
      deviceName: myDeviceName
    })

    discoverySocket.send(message, discoveryPort, '255.255.255.255')
  }, 5000)
})

discoverySocket.on('message', (msg, rinfo) => {
  try {
    const data = JSON.parse(msg.toString())

    if (data.type === 'discovery') {
      // Add to known devices with timestamp
      knownDevices[data.deviceId] = {
        id: data.deviceId,
        name: data.deviceName,
        address: rinfo.address,
        lastSeen: Date.now()
      }

      // Send updated device list to renderer
      if (mainWindow) {
        mainWindow.webContents.send('devices-updated', Object.values(knownDevices))
      }
    }
  } catch (error) {
    console.error('Error parsing discovery message:', error)
  }
})
// Clean up old devices every 15 seconds
setInterval(() => {
  const now = Date.now()
  let updated = false

  Object.keys(knownDevices).forEach((id) => {
    if (now - knownDevices[id].lastSeen > 15000) {
      delete knownDevices[id]
      updated = true
    }
  })

  if (updated && mainWindow) {
    mainWindow.webContents.send('devices-updated', Object.values(knownDevices))
  }
}, 15000)

discoverySocket.bind(discoveryPort)

// File transfer server
const tcpServer = net.createServer()
const serverPort = 41235

tcpServer.on('connection', (socket) => {
  console.log('New transfer connection established')

  let fileInfo = null
  let fileStream = null
  let receivedBytes = 0

  socket.on('data', (data) => {
    // If this is the first chunk, it contains the file info
    if (!fileInfo) {
      // Extract the JSON header (first part until a special delimiter)
      const headerEndIndex = data.indexOf(Buffer.from('\r\n\r\n'))

      if (headerEndIndex !== -1) {
        const headerBuffer = data.slice(0, headerEndIndex)
        fileInfo = JSON.parse(headerBuffer.toString())

        console.log(`Receiving file: ${fileInfo.name} (${fileInfo.size} bytes)`)

        if (mainWindow) {
          mainWindow.webContents.send('transfer-started', {
            fileName: fileInfo.name,
            fileSize: fileInfo.size,
            sender: fileInfo.sender
          })
        }

        // Create write stream for the file
        const savePath = path.join(app.getPath('downloads'), fileInfo.name)
        fileStream = fs.createWriteStream(savePath)

        // Write the rest of the data (after the header)
        const fileData = data.slice(headerEndIndex + 4)
        fileStream.write(fileData)

        receivedBytes += fileData.length

        // Update progress
        if (mainWindow) {
          mainWindow.webContents.send('transfer-progress', {
            fileName: fileInfo.name,
            progress: Math.min(100, Math.floor((receivedBytes / fileInfo.size) * 100))
          })
        }
      }
    } else {
      // Continue writing file data
      fileStream.write(data)
      receivedBytes += data.length

      // Update progress
      if (mainWindow) {
        mainWindow.webContents.send('transfer-progress', {
          fileName: fileInfo.name,
          progress: Math.min(100, Math.floor((receivedBytes / fileInfo.size) * 100))
        })
      }

      // Check if file is complete
      if (receivedBytes >= fileInfo.size) {
        console.log(`File received: ${fileInfo.name}`)
        fileStream.end()

        if (mainWindow) {
          mainWindow.webContents.send('transfer-complete', {
            fileName: fileInfo.name,
            filePath: path.join(app.getPath('downloads'), fileInfo.name)
          })
        }

        // Reset for next file
        fileInfo = null
        fileStream = null
        receivedBytes = 0
      }
    }
  })

  socket.on('error', (err) => {
    console.error('Transfer connection error:', err)
    if (fileStream) {
      fileStream.end()
    }

    if (mainWindow && fileInfo) {
      mainWindow.webContents.send('transfer-error', {
        fileName: fileInfo.name,
        error: err.message
      })
    }
  })

  socket.on('close', () => {
    console.log('Transfer connection closed')
    if (fileStream) {
      fileStream.end()
    }
  })
})

tcpServer.listen(serverPort, () => {
  console.log(`Transfer server listening on port ${serverPort}`)
})

// Handle send file request
// In main.js (backend)
// Modify the send-file handler to throttle progress updates

// Handle send file request
ipcMain.handle('send-file', async (event, { filePath, deviceId }) => {
  try {
    // First, verify the file exists
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided')
    }

    // Check if file exists before proceeding
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const targetDevice = knownDevices[deviceId]
    if (!targetDevice) {
      throw new Error('Target device not found')
    }

    // Get file stats safely
    let fileStats
    try {
      fileStats = fs.statSync(filePath)
    } catch (err) {
      console.error(`Error accessing file: ${err.message}`)
      throw new Error(`Cannot access file: ${err.message}`)
    }

    // Verify it's actually a file
    if (!fileStats.isFile()) {
      throw new Error('The specified path is not a file')
    }

    const fileName = path.basename(filePath)

    // Update UI that we're starting to send
    mainWindow.webContents.send('send-started', {
      fileName,
      fileSize: fileStats.size,
      recipient: targetDevice.name
    })

    // Connect to target device
    const client = new net.Socket()

    client.connect(serverPort, targetDevice.address, () => {
      console.log(`Connected to ${targetDevice.name} at ${targetDevice.address}`)

      // Send file info header first
      const header = JSON.stringify({
        name: fileName,
        size: fileStats.size,
        type: path.extname(filePath).slice(1),
        sender: myDeviceName
      })

      client.write(header + '\r\n\r\n')

      // Create read stream and pipe to socket with optimized buffer size
      const fileStream = fs.createReadStream(filePath, {
        highWaterMark: 64 * 1024 // 64KB chunks
      })

      let sentBytes = 0
      let lastProgressUpdate = 0
      const startTime = new Date()

      fileStream.on('data', (chunk) => {
        // Check if socket buffer is full
        const canContinue = client.write(chunk)
        if (!canContinue) {
          // Pause the stream if buffer is full
          fileStream.pause()
        }

        sentBytes += chunk.length

        // Update progress at most 10 times per second to avoid UI jank
        const now = Date.now()
        if (now - lastProgressUpdate > 100) {
          lastProgressUpdate = now
          mainWindow.webContents.send('send-progress', {
            fileName,
            progress: Math.min(100, Math.floor((sentBytes / fileStats.size) * 100)),
            bytesTransferred: sentBytes,
            totalBytes: fileStats.size,
            speed: calculateSpeed(sentBytes, new Date() - startTime)
          })
        }
      })

      // Resume fileStream when drain event occurs
      client.on('drain', () => {
        fileStream.resume()
      })

      fileStream.on('end', () => {
        console.log(`File sent: ${fileName}`)

        // Final progress update with complete information
        mainWindow.webContents.send('send-progress', {
          fileName,
          progress: 100,
          bytesTransferred: fileStats.size,
          totalBytes: fileStats.size,
          speed: calculateSpeed(fileStats.size, new Date() - startTime)
        })

        mainWindow.webContents.send('send-complete', {
          fileName,
          recipient: targetDevice.name,
          transferTime: new Date() - startTime
        })

        client.end()
      })

      fileStream.on('error', (err) => {
        console.error('Error reading file:', err)
        client.end()

        mainWindow.webContents.send('send-error', {
          fileName,
          error: `Error reading file: ${err.message}`
        })
      })
    })

    client.on('error', (err) => {
      console.error('Connection error:', err)
      mainWindow.webContents.send('send-error', {
        fileName,
        error: `Connection error: ${err.message}`
      })
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending file:', error)
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN'
    }
  }
})

// Helper function to calculate transfer speed
function calculateSpeed(bytes, milliseconds) {
  if (milliseconds === 0) return 0
  return bytes / (milliseconds / 1000) // bytes per second
}

// Server-side reception also needs similar changes for consistent progress reporting
tcpServer.on('connection', (socket) => {
  console.log('New transfer connection established')

  let fileInfo = null
  let fileStream = null
  let receivedBytes = 0
  let lastProgressUpdate = 0
  let startTime = null

  socket.on('data', (data) => {
    // If this is the first chunk, it contains the file info
    if (!fileInfo) {
      // Extract the JSON header (first part until a special delimiter)
      const headerEndIndex = data.indexOf(Buffer.from('\r\n\r\n'))

      if (headerEndIndex !== -1) {
        const headerBuffer = data.slice(0, headerEndIndex)
        fileInfo = JSON.parse(headerBuffer.toString())
        startTime = new Date()

        console.log(`Receiving file: ${fileInfo.name} (${fileInfo.size} bytes)`)

        if (mainWindow) {
          mainWindow.webContents.send('transfer-started', {
            fileName: fileInfo.name,
            fileSize: fileInfo.size,
            sender: fileInfo.sender,
            startTime: startTime
          })
        }

        // Create write stream for the file
        const savePath = path.join(app.getPath('downloads'), fileInfo.name)
        fileStream = fs.createWriteStream(savePath)

        // Write the rest of the data (after the header)
        const fileData = data.slice(headerEndIndex + 4)
        fileStream.write(fileData)

        receivedBytes += fileData.length

        // Update progress (first update)
        if (mainWindow) {
          mainWindow.webContents.send('transfer-progress', {
            fileName: fileInfo.name,
            progress: Math.min(100, Math.floor((receivedBytes / fileInfo.size) * 100)),
            bytesTransferred: receivedBytes,
            totalBytes: fileInfo.size,
            speed: calculateSpeed(receivedBytes, new Date() - startTime)
          })
        }
      }
    } else {
      // Continue writing file data
      fileStream.write(data)
      receivedBytes += data.length

      // Update progress (throttled)
      const now = Date.now()
      if (now - lastProgressUpdate > 100 && mainWindow) {
        lastProgressUpdate = now
        mainWindow.webContents.send('transfer-progress', {
          fileName: fileInfo.name,
          progress: Math.min(100, Math.floor((receivedBytes / fileInfo.size) * 100)),
          bytesTransferred: receivedBytes,
          totalBytes: fileInfo.size,
          speed: calculateSpeed(receivedBytes, new Date() - startTime)
        })
      }

      // Check if file is complete
      if (receivedBytes >= fileInfo.size) {
        console.log(`File received: ${fileInfo.name}`)
        fileStream.end()

        if (mainWindow) {
          // Final progress update
          mainWindow.webContents.send('transfer-progress', {
            fileName: fileInfo.name,
            progress: 100,
            bytesTransferred: fileInfo.size,
            totalBytes: fileInfo.size,
            speed: calculateSpeed(fileInfo.size, new Date() - startTime)
          })

          mainWindow.webContents.send('transfer-complete', {
            fileName: fileInfo.name,
            filePath: path.join(app.getPath('downloads'), fileInfo.name),
            transferTime: new Date() - startTime
          })
        }

        // Reset for next file
        fileInfo = null
        fileStream = null
        receivedBytes = 0
        startTime = null
      }
    }
  })

  // ...rest of the code...
})
// Get my device info
ipcMain.handle('get-my-device', () => {
  return {
    id: myDeviceId,
    name: myDeviceName
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Clean up on exit
app.on('before-quit', () => {})
