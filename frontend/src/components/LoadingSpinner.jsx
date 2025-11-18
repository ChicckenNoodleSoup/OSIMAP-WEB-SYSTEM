import React from 'react';
import '../Spinner.css';

/**
 * Reusable Loading Spinner Component
 * 
 * @param {string} text - Loading message to display (default: "Loading...")
 * @param {string} variant - Size variant: "full-height", "compact", or "inline" (default: "full-height")
 * @param {string} className - Additional CSS classes
 */
export const LoadingSpinner = ({ 
  text = "Loading...", 
  variant = "full-height",
  className = "" 
}) => {
  return (
    <div 
      className={`loading-center ${variant} ${className}`} 
      role="status" 
      aria-live="polite"
    >
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
        <svg 
          className="loading-spinner" 
          viewBox="-13 -13 45 45" 
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle className="box5631" cx="13" cy="1" r="5"/>
          <circle className="box5631" cx="25" cy="1" r="5"/>
          <circle className="box5631" cx="1" cy="13" r="5"/>
          <circle className="box5631" cx="13" cy="13" r="5"/>
          <circle className="box5631" cx="25" cy="13" r="5"/>
          <circle className="box5631" cx="1" cy="25" r="5"/>
          <circle className="box5631" cx="13" cy="25" r="5"/>
          <circle className="box5631" cx="25" cy="25" r="5"/>
          <circle className="box5631" cx="1" cy="1" r="5"/>
        </svg>
        <div className="loading-text">{text}</div>
      </div>
    </div>
  );
};

// OPTIMIZATION: Memoize to prevent unnecessary re-renders
export default React.memo(LoadingSpinner);

