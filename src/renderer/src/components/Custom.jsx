import React, {
  useState, useEffect, useRef, useCallback
} from 'react';

const EnhancedScrollbar = ({
  children,
  className = '',
  barColor = '#6B7280',
  barWidth = 8,
  trackColor = 'rgba(243, 244, 246, 0.1)',
  autoHide = true,
  hideDelay = 1000,
  scrollbarPosition = 'right'
}) => {
  const containerRef = useRef(null);
  const [thumbHeight, setThumbHeight] = useState(30);
  const [thumbTop, setThumbTop] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const lastY = useRef(0);
  const hideTimeout = useRef(null);

  const updateThumb = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollHeight, clientHeight, scrollTop } = container;
    if (scrollHeight <= clientHeight) {
      setThumbHeight(0);
      return;
    }

    const height = Math.max((clientHeight / scrollHeight) * clientHeight, 20);
    const maxThumbTop = clientHeight - height;
    const maxScroll = scrollHeight - clientHeight;
    const top = (scrollTop / maxScroll) * maxThumbTop;

    setThumbHeight(height);
    setThumbTop(top);
  }, []);

  const handleScroll = useCallback(() => {
    updateThumb();
    if (autoHide) {
      setIsVisible(true);
      clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => {
        if (!isHovered && !isDragging) setIsVisible(false);
      }, hideDelay);
    }
  }, [updateThumb, autoHide, hideDelay, isHovered, isDragging]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    lastY.current = e.clientY;
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - lastY.current;
    lastY.current = e.clientY;

    const container = containerRef.current;
    const maxThumbTop = container.clientHeight - thumbHeight;
    let newTop = Math.max(0, Math.min(thumbTop + deltaY, maxThumbTop));
    const scrollRatio = newTop / maxThumbTop;
    container.scrollTop = scrollRatio * (container.scrollHeight - container.clientHeight);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.userSelect = '';
      if (autoHide && !isHovered) {
        hideTimeout.current = setTimeout(() => setIsVisible(false), hideDelay);
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateThumb();
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateThumb);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateThumb);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleScroll, updateThumb, handleMouseMove, handleMouseUp]);

  const showScrollbar = thumbHeight > 0;
  const visible = showScrollbar && (isVisible || !autoHide || isDragging);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => { setIsHovered(true); setIsVisible(true); }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (autoHide && !isDragging) {
          hideTimeout.current = setTimeout(() => setIsVisible(false), hideDelay);
        }
      }}
    >
      <div
        ref={containerRef}
        className="h-full overflow-y-auto pr-2 scrollbar-none"
        style={{
          paddingRight: showScrollbar ? `${barWidth + 2}px` : undefined,
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {children}
      </div>

      {showScrollbar && (
        <div
          className={`absolute top-0 bottom-0 ${scrollbarPosition === 'left' ? 'left-0' : 'right-0'} transition-opacity duration-200`}
          style={{
            width: `${barWidth}px`,
            backgroundColor: trackColor,
            opacity: visible ? 1 : 0,
          }}
          onClick={(e) => {
            if (e.target !== e.currentTarget || !containerRef.current) return;
            const offset = e.clientY - e.currentTarget.getBoundingClientRect().top;
            const ratio = offset / containerRef.current.clientHeight;
            containerRef.current.scrollTo({
              top: ratio * (containerRef.current.scrollHeight - containerRef.current.clientHeight),
              behavior: 'smooth'
            });
          }}
        >
          <div
            className="absolute rounded-full bg-opacity-80 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            style={{
              height: `${thumbHeight}px`,
              width: `${barWidth}px`,
              top: `${thumbTop}px`,
              backgroundColor: barColor,
              [scrollbarPosition]: 0,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedScrollbar;
