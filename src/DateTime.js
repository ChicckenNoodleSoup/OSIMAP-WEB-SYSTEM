import React, { useState, useEffect } from 'react';
import './DateTime.css';

export function DateTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const options = { 
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  };

  const formattedTime = currentTime.toLocaleString('en-US', options);

  return (
    <span className="date-time">
      {formattedTime.split('').map((char, index) => (
        <span key={index}>{char}</span>
      ))}
    </span>
  );
}
