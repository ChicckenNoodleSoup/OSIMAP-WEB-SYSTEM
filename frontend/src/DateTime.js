import React, { useState, useEffect } from 'react';
import './DateTime.css';

// Component definition without memo (has internal state that updates)
function DateTimeComponent() {
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

// OPTIMIZATION: Memoize to prevent re-renders from parent
// DateTime doesn't receive props, so it only needs to re-render on its own state changes
export const DateTime = React.memo(DateTimeComponent);
