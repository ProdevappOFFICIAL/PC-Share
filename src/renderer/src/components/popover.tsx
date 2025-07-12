import { useState, useRef, useEffect } from "react";
import React from "react";

const placements = {
  top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
  "top-left": "bottom-full left-0 mb-2",
  "top-left-live": "bottom-full right-0 mr-1 mb-2",
  "top-left-notify": "bottom-full right-1/2 mb-2 ",
  "top-right": "bottom-full right-0 mb-2",
  "top-right-live": "bottom-full left-0 ml-1 mb-2",

  bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
  "buttom-left-live": "top-full left-0 ml-0 transform -translate-x-1/2 mt-4",
  "bottom-left": "top-full left-0 mt-2",
  "bottom-right": "top-full right-0 mt-2",

  left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
  "left-top": "right-full top-0 mt-2",
  "left-bottom": "right-full bottom-0 pt-2 mb-2",

  right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  "right-top": "left-full top-0 mt-2",
  "right-bottom": "left-full bottom-0 mb-2",
};

const Popover = ({ trigger, children, placement = "bottom", className = "" }) => {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close popover when clicking outside (but not inside)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block">
      {/* Popover Trigger */}
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>

      {/* Popover Content */}
      {open && (
        <div
          ref={popoverRef}
          className={`absolute z-50 w-64 p-4 bg-black shadow rounded-md border border-gray-800 
                    ${placements[placement]} ${className}
                    transition-all duration-200 ease-in-out 
                    transform origin-top scale-100 opacity-100
                    animate-fadeIn`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Define the custom animation in your Tailwind CSS setup
// If custom animations aren't set up, you can add this to your CSS or tailwind config
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-5px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-in-out forwards;
  }
`;
document.head.appendChild(style);

export default Popover;