// components/CustomNumberInput.tsx
'use client';

import { useState } from 'react';

interface CustomNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
  required?: boolean;
}

export default function CustomNumberInput({ 
  value, 
  onChange, 
  placeholder = "0,00", 
  step = 0.01,
  min,
  max,
  required 
}: CustomNumberInputProps) {
  const handleIncrement = () => {
    const currentValue = parseFloat(value || '0');
    const newValue = currentValue + step;
    
    if (max !== undefined && newValue > max) return;
    
    onChange(newValue.toFixed(2));
  };

  const handleDecrement = () => {
    const currentValue = parseFloat(value || '0');
    const newValue = currentValue - step;
    
    if (min !== undefined && newValue < min) return;
    
    onChange(newValue.toFixed(2));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="number-input-wrapper">
      <input
        type="number"
        className="number-input"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        required={required}
      />
      <div className="number-controls">
        <button 
          type="button" 
          className="number-btn increment"
          onClick={handleIncrement}
          tabIndex={-1}
        />
        <button 
          type="button" 
          className="number-btn decrement"
          onClick={handleDecrement}
          tabIndex={-1}
        />
      </div>
    </div>
  );
}