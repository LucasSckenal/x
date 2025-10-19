'use client';

import styles from './Switch.module.scss';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Switch = ({ 
  checked, 
  onChange, 
  disabled = false, 
  size = 'medium',
  className = '' 
}: SwitchProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange(e.target.checked);
  };

  const sizeClass = {
    small: styles.switchSmall,
    medium: '',
    large: styles.switchLarge
  }[size];

  return (
    <label 
      className={`${styles.switch} ${sizeClass} ${className}`}
      aria-disabled={disabled}
    >
      <input
        type="checkbox"
        className={styles.switchInput}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        aria-checked={checked}
        role="switch"
      />
      <span className={styles.slider} />
    </label>
  );
};

export default Switch;