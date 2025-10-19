import React, { useState, useRef, useEffect } from 'react';
import './MultiSelectDropdown.css';

const MultiSelectDropdown = ({ 
  options = [], 
  selectedValues = [], 
  onChange, 
  placeholder = "Select...",
  allLabel = "All"
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

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectAll = () => {
    // Empty array means "all"
    onChange([]);
    setIsOpen(false);
  };

  const handleOptionClick = (value) => {
    let newValues;
    
    // Convert value to string for consistent comparison
    const valueStr = String(value);
    
    if (selectedValues.includes(valueStr)) {
      // Remove value
      newValues = selectedValues.filter(v => v !== valueStr);
    } else {
      // Add value
      newValues = [...selectedValues, valueStr];
    }

    onChange(newValues);
  };

  // Display text
  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return allLabel;
    } else if (selectedValues.length === 1) {
      return selectedValues[0];
    } else if (selectedValues.length <= 3) {
      return selectedValues.join(', ');
    } else {
      return `${selectedValues.length} selected`;
    }
  };

  return (
    <div className="multi-select-dropdown" ref={dropdownRef}>
      <div className="multi-select-trigger" onClick={handleToggle}>
        <span className="multi-select-text">{getDisplayText()}</span>
        <span className={`multi-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      
      {isOpen && (
        <div className="multi-select-options">
          <div 
            className={`multi-select-option ${selectedValues.length === 0 ? 'selected' : ''}`}
            onClick={handleSelectAll}
          >
            <input 
              type="checkbox" 
              checked={selectedValues.length === 0}
              readOnly
            />
            <span>{allLabel}</span>
          </div>
          
          {options.map((option) => {
            const optionStr = String(option);
            return (
              <div 
                key={option}
                className={`multi-select-option ${selectedValues.includes(optionStr) ? 'selected' : ''}`}
                onClick={() => handleOptionClick(option)}
              >
                <input 
                  type="checkbox" 
                  checked={selectedValues.includes(optionStr)}
                  readOnly
                />
                <span>{option}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;