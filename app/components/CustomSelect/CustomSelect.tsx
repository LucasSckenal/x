'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './CustomSelect.module.scss';

interface Option {
  value: string;
  label: string;
  icon: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const CustomSelect = ({ options, value, onChange, placeholder }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Lógica para fechar o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref]);
  
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={styles.customSelectContainer} ref={ref}>
      <button 
        type="button"
        className={`${styles.selectTrigger} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.selectedValue}>
          {selectedOption ? (
            <>{selectedOption.icon} {selectedOption.label}</>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </span>
        <span className={`${styles.arrow} ${isOpen ? styles.open : ''}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.94 5.72a.75.75 0 011.06 0L8 7.69l1.97-1.97a.75.75 0 111.06 1.06l-2.5 2.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 010-1.06z"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdownOptions}>
          {options.map(option => (
            <div 
              key={option.value} 
              className={styles.dropdownOption}
              onClick={() => handleSelect(option.value)}
            >
              {option.icon} {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;