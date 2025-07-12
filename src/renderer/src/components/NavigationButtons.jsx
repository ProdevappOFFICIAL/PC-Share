import React, { useState } from 'react';
import { VscClose, VscChromeMaximize } from "react-icons/vsc";
import { BiInfoCircle, BiMinus } from 'react-icons/bi';
import './drag.css';
import Dialog from './dailog';

const NavigationButtons = () => {
  const minimizeWindow = () => window.api.minimizeWindow();
  const closeWindow = () => window.api.closeWindow();

  const [opp, setOpp] = useState(false);
  
  const handleClose = () => {
    setOpp(false);
  };

  return (
    <>
      <header className="flex non-draggable">
        <button
          onClick={minimizeWindow}
          className="hover:bg-gray-300/20 px-1 py-1 flex items-center justify-center rounded-full dark:text-white dark:hover:bg-gray-700 m-1"
          id="non-draggable"
        >
          <BiMinus size={16} />
        </button>
        
     
        
        <button
          onClick={() => setOpp(true)}
          className="hover:bg-red-500 hover:text-white px-1 py-1 flex items-center rounded-full justify-center dark:text-white m-1"
        >
          <VscClose size={16} />
        </button>
      </header>
      
      {opp && (
        <Dialog
          title="Close"
          onClose={handleClose}
          im={<BiInfoCircle />}
          children={
            <div className="flex flex-col border-t border-gray-400/20 text-[10px] p-3">
              Are you sure you want to close?
              <div className="flex w- justify-between pt-[10px]">
                <div></div>
                <div className="flex space-x-2">
                  <div
                    onClick={closeWindow}
                    className="non-draggable flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-full text-white text-[10px] transition-all shadow cursor-pointer"
                  >
                    EXIT
                  </div>
                </div>
              </div>
            </div>
          }
        />
      )}
    </>
  );
};

export default NavigationButtons;