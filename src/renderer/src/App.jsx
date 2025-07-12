import { useState, useEffect, useRef, useCallback } from 'react'
import { BsLink45Deg, BsQuestionCircle, BsSearch } from 'react-icons/bs'
import { MdComputer } from 'react-icons/md'
import { IoIosPaperPlane, IoIosCloseCircle } from 'react-icons/io'
import { LuFileStack } from 'react-icons/lu'
import { AiOutlineCheckCircle } from 'react-icons/ai'
import { BiError } from 'react-icons/bi'
import { FiSend } from 'react-icons/fi'
import { RiDeleteBin2Fill } from 'react-icons/ri'
import EnhancedScrollbarDemo from './components/Custom'
import EnhancedScrollbar from './components/Custom'
import '../src/components/no-scrollbar.css'

// Animated background component
const AnimatedBackground = () => {
  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden z-0">
      <div className="absolute w-1/2 h-1/2 top-0 left-0 rounded-full opacity-50 filter blur-3xl bg-gradient-to-r from-indigo-600 to-blue-500 animate-blob-slow animate-pulse"></div>
      <div className="absolute w-3/5 h-3/5 bottom-0 right-0 rounded-full opacity-50 filter blur-3xl bg-gradient-to-r from-emerald-500 to-blue-400 animate-blob-med"></div>
      <div className="absolute w-2/5 h-2/5 bottom-1/3 right-1/4 rounded-full opacity-50 filter blur-3xl bg-gradient-to-r from-pink-500 to-orange-400 animate-blob-fast"></div>
      <div className="absolute inset-0 bg-blac bg-opacity-70 backdrop-blur-sm rounded-md"></div>
      <style jsx>{`
        @keyframes blob-slow {
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(20%, 20%) scale(1.3);
          }
        }

        @keyframes blob-med {
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(-20%, -10%) scale(1.2);
          }
        }

        @keyframes blob-fast {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          100% {
            transform: translate(-10%, 10%) rotate(30deg) scale(1.4);
          }
        }

        .animate-blob-slow {
          animation: blob-slow 25s ease infinite alternate;
        }

        .animate-blob-med {
          animation: blob-med 35s ease infinite alternate;
        }

        .animate-blob-fast {
          animation: blob-fast 30s ease infinite alternate;
        }
      `}</style>
    </div>
  )
}

// Status badge component
const StatusBadge = ({ status }) => {
  let color = 'bg-blue-500'

  if (status.includes('Error')) {
    color = 'bg-red-500'
  } else if (
    status.includes('Complete') ||
    status.includes('Received') ||
    status.includes('Sent')
  ) {
    color = 'bg-green-500'
  }

  return (
    <div className="flex items-center gap-1 group">
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
      <p>{status}</p>
    </div>
  )
}

// Improved main App component
function App() {
  const [devices, setDevices] = useState([])
  const [myDevice, setMyDevice] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [transfers, setTransfers] = useState([])
  const [status, setStatus] = useState('Ready')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDevices, setShowDevices] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Process files and prepare file data
  const processFiles = useCallback((files) => {
    const processedFiles = Array.from(files).map((file) => {
      const fileType = file.type ? file.type.split('/')[1] || 'unknown' : 'unknown'

      return {
        name: file.name,
        file: file,
        size: file.size,
        type: fileType,
        lastModified: file.lastModified,
        path: file.name // Browsers don't expose full path for security reasons
      }
    })

    setSelectedFiles(processedFiles)
    setStatus(`Selected ${processedFiles.length} file(s)`)
  }, [])

  // Set up all event listeners when the component mounts
  useEffect(() => {
    if (!window.api) {
      console.error('API not available')
      setStatus('Error: API not available')
      return
    }

    // Get my device info
    window.api.getMyDevice &&
      window.api.getMyDevice().then((device) => {
        setMyDevice(device)
      })

    // Device handling
    const onDevicesUpdated = (updatedDevices) => {
      console.log('Devices updated:', updatedDevices)
      setDevices(updatedDevices)
    }

    window.api.onDevicesUpdated(onDevicesUpdated)

    // Initial scan for devices
    window.api.scanDevices &&
      window.api.scanDevices().catch((err) => {
        console.error('Failed to scan devices:', err)
        setStatus('Error scanning for devices')
      })

    // Setup transfer event listeners
    window.api.onTransferStarted((data) => {
      setTransfers((prev) => [
        ...prev,
        {
          id: `recv-${Date.now()}-${data.fileName}`,
          fileName: data.fileName,
          fileSize: data.fileSize,
          progress: 0,
          type: 'receive',
          sender: data.sender || 'Unknown',
          status: 'in-progress',
          bytesTransferred: 0,
          totalBytes: data.fileSize,
          startTime: Date.now()
        }
      ])
      setStatus(`Receiving ${data.fileName} from ${data.sender || 'Unknown'}...`)
    })

    window.api.onTransferProgress((data) => {
      setTransfers((prev) =>
        prev.map((transfer) => {
          if (
            transfer.fileName === data.fileName &&
            transfer.type === 'receive' &&
            transfer.status === 'in-progress'
          ) {
            return {
              ...transfer,
              progress: data.progress,
              bytesTransferred: data.bytesTransferred || transfer.bytesTransferred,
              speed: data.speed || transfer.speed
            }
          }
          return transfer
        })
      )
    })

    window.api.onTransferComplete((data) => {
      setTransfers((prev) =>
        prev.map((transfer) => {
          if (
            transfer.fileName === data.fileName &&
            transfer.type === 'receive' &&
            transfer.status === 'in-progress'
          ) {
            return {
              ...transfer,
              progress: 100,
              status: 'complete',
              bytesTransferred: transfer.totalBytes,
              transferTime: data.transferTime || Date.now() - transfer.startTime
            }
          }
          return transfer
        })
      )
      setStatus(`Received ${data.fileName} successfully!`)
    })

    window.api.onTransferError((data) => {
      setTransfers((prev) =>
        prev.map((transfer) => {
          if (
            transfer.fileName === data.fileName &&
            transfer.type === 'receive' &&
            transfer.status === 'in-progress'
          ) {
            return { ...transfer, status: 'error', error: data.error }
          }
          return transfer
        })
      )
      setStatus(`Error receiving ${data.fileName}: ${data.error}`)
    })

    // Setup send event listeners
    window.api.onSendStarted((data) => {
      setTransfers((prev) => [
        ...prev,
        {
          id: `send-${Date.now()}-${data.fileName}`,
          fileName: data.fileName,
          fileSize: data.fileSize,
          progress: 0,
          type: 'send',
          recipient: data.recipient || 'Unknown',
          status: 'in-progress',
          bytesTransferred: 0,
          totalBytes: data.fileSize,
          startTime: Date.now()
        }
      ])
      setStatus(`Sending ${data.fileName} to ${data.recipient || 'Unknown'}...`)
    })

    window.api.onSendProgress((data) => {
      setTransfers((prev) =>
        prev.map((transfer) => {
          if (
            transfer.fileName === data.fileName &&
            transfer.type === 'send' &&
            transfer.status === 'in-progress'
          ) {
            return {
              ...transfer,
              progress: data.progress,
              bytesTransferred: data.bytesTransferred || transfer.bytesTransferred,
              speed: data.speed || transfer.speed
            }
          }
          return transfer
        })
      )
    })

    window.api.onSendComplete((data) => {
      setTransfers((prev) =>
        prev.map((transfer) => {
          if (
            transfer.fileName === data.fileName &&
            transfer.type === 'send' &&
            transfer.status === 'in-progress'
          ) {
            return {
              ...transfer,
              progress: 100,
              status: 'complete',
              bytesTransferred: transfer.totalBytes,
              transferTime: data.transferTime || Date.now() - transfer.startTime
            }
          }
          return transfer
        })
      )
      setStatus(`Sent ${data.fileName} to ${data.recipient || 'Unknown'} successfully!`)
    })

    window.api.onSendError((data) => {
      setTransfers((prev) =>
        prev.map((transfer) => {
          if (
            transfer.fileName === data.fileName &&
            transfer.type === 'send' &&
            transfer.status === 'in-progress'
          ) {
            return { ...transfer, status: 'error', error: data.error }
          }
          return transfer
        })
      )
      setStatus(`Error sending ${data.fileName}: ${data.error}`)
    })

    // Clean up all event listeners when component unmounts
    return () => {
      // Cleanup device listeners
      if (window.api.removeListener) {
        window.api.removeListener('devices-updated', onDevicesUpdated)

        // Cleanup all listeners by channel type
        const channels = [
          'devices-updated',
          'transfer-started',
          'transfer-progress',
          'transfer-complete',
          'transfer-error',
          'send-started',
          'send-progress',
          'send-complete',
          'send-error'
        ]

        channels.forEach((channel) => {
          window.api.removeAllListeners && window.api.removeAllListeners(channel)
        })
      }
    }
  }, [])

  // File handling methods from the second component
  const handleFileChange = (event) => {
    if (!event.target.files || event.target.files.length === 0) return
    processFiles(event.target.files)
  }

  const handleFileSelect = async () => {
    // If the API provides a file selection method, use it
    if (window.api && window.api.selectFiles) {
      try {
        const files = await window.api.selectFiles()
        if (files && files.length > 0) {
          setSelectedFiles(files)
          setStatus(`Selected ${files.length} file(s)`)
        }
      } catch (error) {
        console.error('Error selecting files:', error)
        setStatus('Error selecting files')
      }
    } else {
      // Otherwise, use the browser's file input
      fileInputRef.current?.click()
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files?.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  // Improved sendFile function with proper error handling and transfer tracking
  const handleSendFile = async (deviceId) => {
    if (selectedFiles.length === 0) {
      setStatus('No files selected')
      return
    }

    if (!window.api) {
      console.error('API not available for file transfer')
      setStatus('Error: API not available for file transfer')
      return
    }

    try {
      const device = devices.find((d) => d.id === deviceId)
      if (!device) {
        throw new Error('Selected device not found')
      }

      setStatus(`Sending to ${device.name}...`)

      for (const file of selectedFiles) {
        try {
          console.log(`Preparing to send file: ${file.name} to device: ${device.name}`)

          // Prepare the file for sending
          const fileData = {
            file: file.file, // Send the actual File object
            deviceId: deviceId,
            fileName: file.name, // Ensure the fileName is accessible
            filePath: file.path // Added for API compatibility
          }

          console.log('Sending file data:', fileData)

          // Send the file using the API
          await window.api.sendFile(fileData)

          console.log(`File ${file.name} sent successfully to ${device.name}`)
        } catch (fileError) {
          console.error(`Error sending ${file.name}:`, fileError)

          // Update the UI with the error
          setStatus(`Error sending ${file.name}: ${fileError.message || 'Unknown error'}`)

          // Update the transfer status to error
          setTransfers((prev) =>
            prev.map((t) => {
              if (t.fileName === file.name && t.status === 'in-progress' && t.type === 'send') {
                return {
                  ...t,
                  status: 'error',
                  error: fileError.message || 'Failed to send file'
                }
              }
              return t
            })
          )
        }
      }

      setShowDevices(false)
    } catch (error) {
      console.error('Error in send operation:', error)
      setStatus(`Error: ${error.message || 'Unknown error during send operation'}`)
    }
  }

  // Format helpers
  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatTime = (ms) => {
    if (!ms) return '0s'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s'

    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))

    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getTimeRemaining = (transfer) => {
    if (!transfer.speed || transfer.speed === 0 || transfer.progress >= 100) return ''

    const bytesRemaining = transfer.totalBytes - transfer.bytesTransferred
    const secondsRemaining = bytesRemaining / transfer.speed

    return formatTime(secondsRemaining * 1000)
  }

  const filteredDevices = devices.filter((device) =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    if (selectedFiles.length <= 1) {
      setStatus('No files selected')
    }
  }

  // Clear completed or failed transfers
  const clearDoneTransfers = () => {
    setTransfers((prev) => prev.filter((t) => t.status === 'in-progress'))
  }

  // Debug function for troubleshooting
  const debugTransfers = () => {
    console.log('Current transfers:', transfers)
    console.log('Selected files:', selectedFiles)
    console.log('Available devices:', devices)
    console.log('My device:', myDevice)
  }
  const [showDropdown, setShowDropdown] = useState(false)

  // Add this function to toggle the dropdown
  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev)
    // Close devices panel if it's open
    if (showDevices) setShowDevices(false)
  }

  // Add this useEffect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Make sure we're not closing when clicking on the toggle button itself
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  // Modify the handleSendFile function to add debugging
  const originalHandleSendFile = handleSendFile
  const handleSendFileWithDebug = (deviceId) => {
    console.log('handleSendFile called with deviceId:', deviceId)
    console.log('Selected files:', selectedFiles)
    console.log(
      'Device information:',
      devices.find((d) => d.id === deviceId)
    )
    return originalHandleSendFile(deviceId)
  }

  return (
    <div
      className="flex flex-col h-full w-full relative text-gray-300 text-[8px]"
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Animated background */}
      <AnimatedBackground />

      <div className="h-full w-full flex flex-col relative z-10">
        {/* Status bar */}
        <div className="flex items-center justify-between px-2 py-1 bg-black bg-opacity-50 border-b border-zinc-600 backdrop-blur-sm font-medium">
          <StatusBadge status={status} />
          <div className="flex items-center">
            {myDevice && <span className="text-gray-400 mr-2">Your device: {myDevice.name}</span>}
        
          </div>
        </div>

        <div className="flex-1 relative">
          {/* Files Preview Area */}
                  

          {selectedFiles.length > 0 && (
            <div className="absolute top-2 left-2 right-2 scrollbar-hide bg-black bg-opacity-60 backdrop-blur-sm rounded p-2 max-h-40 overflow-y-auto border border-zinc-800 shadow-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium flex items-center">
                  <LuFileStack className="mr-1 text-blue-400" size={12} />
                  {selectedFiles.length} file(s) selected
                </span>
                <span
                  className="cursor-pointer hover:text-red-400 transition-colors duration-200"
                  onClick={() => setSelectedFiles([])}
                >
                  <IoIosCloseCircle size={12} />
                </span>
              </div>
                <EnhancedScrollbar
        className="h-20 w-full max-w-xl "
        barColor="#3B82F6"
        autoHide={true}
        scrollbarPosition="right"
      >
              {selectedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-1 border-b border-zinc-700 hover:bg-black hover:bg-opacity-40"
                >
                  <span className="truncate max-w-36">{file.name}</span>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-400">{formatSize(file.size)}</span>
                    <span
                      className="cursor-pointer hover:text-red-500 transition-colors duration-200"
                      onClick={() => removeFile(i)}
                    >
                      <IoIosCloseCircle size={10} />
                    </span>
                  </div>
                </div>
              ))} </EnhancedScrollbar>
            </div>
          )}
     
        

          {/* Transfers Preview */}

          {transfers.length > 0 && (
            <div className="absolute scrollbar-hide bottom-2 left-2 right-2 bg-black bg-opacity-60 backdrop-blur-sm rounded p-2 max-h-48 overflow-y-auto border border-zinc-800 shadow-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium flex items-center">
                  <FiSend className="mr-1 text-blue-400" size={12} />
                  Recent Transfers
                </span>
                <div className="flex items-center">
                  <span
                    className="cursor-pointer mr-2 hover:text-blue-300 transition-colors duration-200"
                    onClick={clearDoneTransfers}
                  >
                    <RiDeleteBin2Fill className="text-red-400" size={10} />
                  </span>
                  <span
                    className="cursor-pointer hover:text-red-400 transition-colors duration-200"
                    onClick={() => setTransfers([])}
                  >
                    <IoIosCloseCircle size={12} />
                  </span>
                </div>
              </div>
              <EnhancedScrollbar
                className="h-20 w-full max-w-xl "
                barColor="#3B82F6"
                autoHide={true}
                scrollbarPosition="right"
              >
                {transfers.map((t) => (
                  <div
                    key={t.id}
                    className="py-1 border-b border-zinc-700 hover:bg-black hover:bg-opacity-40"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center truncate max-w-40">
                        {t.status === 'complete' ? (
                          <AiOutlineCheckCircle size={10} className="text-green-400 mr-1" />
                        ) : t.status === 'error' ? (
                          <BiError size={10} className="text-red-400 mr-1" />
                        ) : (
                          <IoIosPaperPlane size={8} className="text-blue-400 mr-1" />
                        )}
                        <span className="truncate">{t.fileName}</span>
                      </div>
                      <div className="flex items-center text-right">
                        <span className="ml-1 text-gray-400">
                          {t.type === 'send' ? `To: ${t.recipient}` : `From: ${t.sender}`}
                        </span>
                        <span className="ml-2 min-w-12 text-right">
                          {t.status === 'complete'
                            ? t.transferTime
                              ? formatTime(t.transferTime)
                              : 'Done'
                            : t.status === 'error'
                              ? 'Failed'
                              : `${t.progress}%`}
                        </span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-gray-700 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          t.status === 'complete'
                            ? 'bg-green-500'
                            : t.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${t.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-gray-500 mt-1">
                      {/* Show file size */}
                      {t.fileSize && <span>{formatSize(t.fileSize)}</span>}

                      {/* Display transfer speed for in-progress transfers */}
                      {t.status === 'in-progress' && t.speed && <span>{formatSpeed(t.speed)}</span>}

                      {/* Display time remaining for in-progress transfers */}
                      {t.status === 'in-progress' && t.speed > 0 && (
                        <span>ETA: {getTimeRemaining(t)}</span>
                      )}
                    </div>
                    {t.status === 'error' && t.error && (
                      <div className="text-red-400 mt-1 truncate">Error: {t.error}</div>
                    )}
                  </div>
                ))}{' '}
              </EnhancedScrollbar>
            </div>
          )}

          {/* Empty state / main content area */}
          {selectedFiles.length === 0 && (
            <div className="flex flex-col w-full h-full items-center justify-center">
              <div className="p-6 rounded-lg text-center max-w-xs transition-all duration-300 transform hover:scale-105">
                <BsLink45Deg className="text-5xl mb-4 text-blue-400 mx-auto" />
                <p className="text-center text-xs font-medium text-gray-300">
                  You wanna share files? Let's get started
                </p>
                <p className="text-center text-gray-400 mt-2">
                  Drag & drop files here or click "SELECT FILES" below
                </p>
              </div>
            </div>
          )}

          {/* Search/Devices Panel */}
          {showDevices && (
            <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex flex-col p-2 z-20">
              <div className="flex items-center mb-2 border border-zinc-700 rounded-full px-2 py-1 bg-black bg-opacity-40">
                <BsSearch className="mr-1 text-gray-400" size={12} />
                <input
                  type="text"
                  placeholder="Search devices..."
                  className="w-full bg-transparent outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredDevices.length === 0 ? (
                  <div className="flex flex-col h-full justify-center items-center text-center text-gray-500">
                    <MdComputer size={24} className="mb-2" />
                    <p>
                      {devices.length === 0
                        ? 'Searching for devices...'
                        : 'No devices match your search.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDevices.map((device) => (
                      <div
                        key={device.id}
                        className="border border-zinc-700 rounded p-2 bg-black bg-opacity-40 backdrop-blur-sm hover:bg-opacity-60 transition-all duration-200"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{device.name}</p>
                            <p className="text-gray-500">{device.address}</p>
                          </div>
                          <button
                            className={`px-2 py-1 rounded-full font-medium flex items-center transition-all duration-200 ${
                              selectedFiles.length > 0
                                ? 'bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 shadow-lg'
                                : 'bg-gray-700 opacity-50'
                            }`}
                            onClick={() => selectedFiles.length > 0 && handleSendFile(device.id)}
                            disabled={selectedFiles.length === 0}
                          >
                            <IoIosPaperPlane size={10} className="mr-1" />
                            SEND
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="mt-2 w-full px-2 py-1 bg-zinc-800 bg-opacity-70 backdrop-blur-sm border border-zinc-700 rounded-full font-medium hover:bg-zinc-700 transition-all duration-200"
                onClick={() => setShowDevices(false)}
              >
                CLOSE
              </button>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-between w-full p-2 z-10">
          <div
            className={`flex items-center px-2 py-1 bg-black bg-opacity-60 backdrop-blur-sm border border-zinc-600 rounded-full cursor-pointer hover:bg-zinc-900 hover:bg-opacity-60 transition-all duration-200 ${isDragging ? 'ring-2 ring-blue-400' : ''}`}
            onClick={handleFileSelect}
          >
            <LuFileStack className="text-blue-400" />
            <p className="ml-1 font-medium">
              {selectedFiles.length > 0 ? `${selectedFiles.length} FILE(S)` : 'SELECT FILES'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="relative dropdown-container">
            <button
              className={`flex items-center px-2 py-1 rounded-full font-medium transition-all duration-200 ${
                selectedFiles.length > 0 && devices.length > 0
                  ? 'bg-gradient-to-r from-blue-600 to-blue-400 cursor-pointer hover:from-blue-700 hover:to-blue-500 shadow-lg'
                  : 'bg-gray-700 bg-opacity-60 backdrop-blur-sm opacity-50 border border-zinc-500'
              }`}
              onClick={toggleDropdown}
              disabled={!(selectedFiles.length > 0 && devices.length > 0)}
            >
              <BsSearch className="mr-1" /> SEARCH DEVICES
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className="absolute bottom-full right-0 mb-1 w-52 bg-black bg-opacity-80 backdrop-blur-sm border border-zinc-700 rounded shadow-lg z-50 max-h-40 overflow-y-auto">
                {devices.length === 0 ? (
                  <div className="p-2 text-center text-gray-500">No devices found</div>
                ) : (
                  <>
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className="flex justify-between items-center p-2 hover:bg-zinc-800 hover:bg-opacity-50 transition-all duration-200 border-b border-zinc-800 last:border-b-0"
                      >
                        <div className="truncate pr-1">
                          <p className="font-medium truncate">{device.name}</p>
                        </div>
                        <button
                          type="button"
                          className={`px-2 py-0.5 rounded-full font-medium flex items-center transition-all duration-200 ${
                            selectedFiles.length > 0
                              ? 'bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500'
                              : 'bg-gray-700 opacity-50'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            console.log('Send button clicked for device:', device.id)
                            if (selectedFiles.length > 0) {
                              handleSendFileWithDebug(device.id)
                              setShowDropdown(false)
                            }
                          }}
                          disabled={selectedFiles.length === 0}
                        >
                          <IoIosPaperPlane size={8} className="mr-1" />
                          SEND
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
