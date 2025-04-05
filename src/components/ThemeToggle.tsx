import { useState, useEffect } from 'react';
import { ReactComponent as SunIcon } from '../assets/icons/sun.svg';
import { ReactComponent as MoonIcon } from '../assets/icons/moon.svg';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
  // Check for system preference or saved preference
  const getInitialTheme = (): 'light' | 'dark' => {
    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) return savedTheme;
    
    // Check for system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Default to light
    return 'light';
  };
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Default value, will be updated in useEffect
  
  useEffect(() => {
    // Set initial theme
    setTheme(getInitialTheme());
  }, []);
  
  useEffect(() => {
    // Update DOM and localStorage when theme changes
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  
  return (
    <button 
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <SunIcon className="icon-current" title="Light mode" />
      ) : (
        <MoonIcon className="icon-current" title="Dark mode" />
      )}
    </button>
  );
};

export default ThemeToggle; 