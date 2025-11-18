import React, { useState, useRef, useEffect } from 'react';

const Tooltip = ({ id, text, children }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const tooltipTimer = useRef(null);

  const handleMouseEnter = () => {
    tooltipTimer.current = setTimeout(() => {
      setActiveTooltip(id);
    }, 600); // Show tooltip after 600ms
  };

  const handleMouseLeave = () => {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
    }
    setActiveTooltip(null);
  };

  useEffect(() => {
    return () => {
      if (tooltipTimer.current) {
        clearTimeout(tooltipTimer.current);
      }
    };
  }, []);

  return (
    <div 
      className="tooltip-wrapper" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {activeTooltip === id && <div className="tooltip-text">{text}</div>}
    </div>
  );
};

export default Tooltip;

