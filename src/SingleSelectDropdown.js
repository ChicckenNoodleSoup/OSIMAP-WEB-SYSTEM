import React, { useState, useRef, useEffect } from 'react';
import './SingleSelectDropdown.css';

const SingleSelectDropdown = ({ 
  options = [], 
  selectedValue = "all", 
  onChange, 
  placeholder = "Select...",
  allLabel = "All",
  allValue = "all"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent parent scroll interference - NEW
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const optionsElement = dropdownRef.current.querySelector('.single-select-options');
      if (optionsElement) {
        const handleWheel = (e) => {
          e.stopPropagation();
        };
        optionsElement.addEventListener('wheel', handleWheel, { passive: true });
        return () => optionsElement.removeEventListener('wheel', handleWheel);
      }
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (value) => {
    onChange(value);
    setIsOpen(false);
  };

  // Display text
  const getDisplayText = () => {
    if (selectedValue === allValue) {
      return allLabel;
    }
    return selectedValue;
  };

  return (
    <div className="single-select-dropdown" ref={dropdownRef}>
      <div 
        className="single-select-trigger" 
        onClick={handleToggle}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <span className="single-select-text">{getDisplayText()}</span>
        <span className={`single-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      
      {isOpen && (
        <div className="single-select-options" role="listbox">
          <div 
            className={`single-select-option ${selectedValue === allValue ? 'selected' : ''}`}
            onClick={() => handleOptionClick(allValue)}
            role="option"
            aria-selected={selectedValue === allValue}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOptionClick(allValue);
              }
            }}
          >
            <span>{allLabel}</span>
          </div>
          
          {options.map((option) => (
            <div 
              key={option}
              className={`single-select-option ${selectedValue === option ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
              role="option"
              aria-selected={selectedValue === option}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOptionClick(option);
                }
              }}
            >
              <span>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SingleSelectDropdown;