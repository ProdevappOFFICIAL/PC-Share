import React, { useEffect, useState } from 'react';
import { BiX } from 'react-icons/bi';
import { createPortal } from 'react-dom';

const Dialog = ({ im, title, onClose, children, other }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Add effect to prevent background scrolling when dialog is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // Set visible after mounting for animation to work
    setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Create portal to render dialog directly to body
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center text-gray-300 transition-opacity duration-300 ease-in-out rounded-md">
      {/* Backdrop with blur */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-md transition-all rounded-md duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      ></div>

      {/* Dialog content with animation */}
      <div
        className={`relative w-full sm:w-96  rounded-md shadow-xl border   border-gray-400/20 max-w-xs transition-all duration-300 transform ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-400/20">
          <div className="flex items-center space-x-2 px-3 py-2  text-xs">
            {im} <p className="font-medium">{title}</p>
          </div>

          <div className="flex items-center text-xs">
            {other}
            <div
              className="p-1 m-1 rounded-full hover:bg-zinc-800  transition-colors cursor-pointer"
              onClick={onClose}
            >
              <BiX className="text-gray-600  " size={16} />
            </div>
          </div>
        </div>
        
        <div 
          className={`transition-all duration-1000 ease-out transform ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Dialog;