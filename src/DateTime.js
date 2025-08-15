import React, { useState, useEffect } from 'react';
import './DateTime.css';

export function DateTime() {   // <-- Named export
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const options = { 
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  };

  return (
    <span className="date-time">
      {currentTime.toLocaleString('en-US', options)}
    </span>
  );
}
