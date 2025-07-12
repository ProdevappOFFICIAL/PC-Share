import React from 'react'
import NavigationButtons from './NavigationButtons'
import { MdOutlineWhatshot, MdSubscriptions, MdUpdate } from 'react-icons/md'
import Popover from './popover'
import BlinkNETLogo from '../components/blinknetlogo_1.png'
import { FiSend } from 'react-icons/fi'
import { BsQuestionCircle, BsSendFill } from 'react-icons/bs'
import { RiSettingsFill } from 'react-icons/ri'
import { Minimize2 } from 'lucide-react'
import { CgMinimize } from 'react-icons/cg'
import { useState } from 'react'

const Header = () => {
  const [open, setisopen] = useState(false)
  const HandleOpen = () => {
    setisopen(true)
    if (open) {
      setisopen(false)
    }
  }

  return (
    <div className="flex flex-col h-fit">
      <div className="flex w-full  items-center justify-between  bg-gradient-to-r from-black/80 via-black/20 to-zinc-800  rounded-t-md text-white border-b border-zinc-600 text-[11px] draggable">
        <div className="flex items-center p-1 ">
          <div className="flex items-center  gap-1 font-medium rounded-full bg-blend-multiply scale-95 bg-gradient-to-r from-black/60 to-zinc-900  px-2 py-[2px] border border-gray-400/20">
            <BsSendFill /> PC Share
          </div>
        </div>
        <div className="flex items-center space-x-2 non-draggable">
          <div
            className="flex items-center px-2 py-[2px] bg-gradient-to-r from-blue-600 to-blue-400 rounded-full hover:from-blue-700 hover:to-blue-500 shadow-lg
         text-[8px] text-white cursor-pointer"
          >
            <CgMinimize className="text-white mr-1 text-[8px] " /> MINI MODE
          </div>
          <Popover
            placement="bottom-right"
            trigger={
              <div
                className="flex items-center px-2 py-[2px] border border-gray-600 rounded-full
              bg-gradient-to-r from-yellow-600 to-yellow-400 cursor-pointer hover:from-yellow-700 hover:to-yellow-500 shadow-lg
         text-[8px] text-white cursor-pointer"
              >
                <MdOutlineWhatshot className="text-white mr-1 text-[8px] " /> BETA
              </div>
            }
          >
            <div
              className="flex items-center px-2 py-1 border border-gray-400/20 rounded-md uppercase bg-yellow-300/20
         text-[8px] text-white cursor-pointer"
            >
              <MdSubscriptions className="text-white mr-1 text-[10px] " /> BETA
            </div>
            <div className="flex w-full items-center justify-between mt-5 text-[9px]">
              <p>Welcome to PC Share BETA Version 1.0.0 </p>
            </div>
          </Popover>
          <div
            className="flex items-center p-1 rounded-full bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-colors duration-200"
            onClick={HandleOpen}
          >
            <BsQuestionCircle size={10} />
          </div>

          <NavigationButtons />
        </div>
      </div>
      {open && (
        <div
          className="flex items-center justify-center px-2 py-[2px] 
              bg-gradient-to-r from-red-600 to-violet-400 
         text-[8px] text-white cursor-pointer"
        >
          Welcome to PC Share v1.0.0
        </div>
      )}
    </div>
  )
}

export default Header
