import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  selectFiles: () => ipcRenderer.invoke('select-files'),
  
  // File transfer
  sendFile: (data) => ipcRenderer.invoke('send-file', data),
  
  // Device discovery
  getMyDevice: () => ipcRenderer.invoke('get-my-device'),
  
  // Events
  onDevicesUpdated: (callback) => 
    ipcRenderer.on('devices-updated', (_, devices) => callback(devices)),
  
  onTransferStarted: (callback) => 
    ipcRenderer.on('transfer-started', (_, data) => callback(data)),
  
  onTransferProgress: (callback) => 
    ipcRenderer.on('transfer-progress', (_, data) => callback(data)),
  
  onTransferComplete: (callback) => 
    ipcRenderer.on('transfer-complete', (_, data) => callback(data)),
  
  onTransferError: (callback) => 
    ipcRenderer.on('transfer-error', (_, data) => callback(data)),
  
  onSendStarted: (callback) => 
    ipcRenderer.on('send-started', (_, data) => callback(data)),
  
  onSendProgress: (callback) => 
    ipcRenderer.on('send-progress', (_, data) => callback(data)),
  
  onSendComplete: (callback) => 
    ipcRenderer.on('send-complete', (_, data) => callback(data)),
  
  onSendError: (callback) => 
    ipcRenderer.on('send-error', (_, data) => callback(data)),
    
  // Cleanup listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  onDevicesUpdated: (callback) => {
    console.log("Setting up devices-updated listener");
    ipcRenderer.on('devices-updated', (_, data) => {
      console.log("Received devices-updated event with data:", data);
      callback(data);
    });
  },
}
;

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}