import { useState, useEffect } from 'react';
import { ReactComponent as SunIcon } from '../assets/icons/sun.svg';
import { ReactComponent as MoonIcon } from '../assets/icons/moon.svg';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
  // Check for system preference or saved preference
  const getInitialTheme = (): 'light' | 'dark' => {
    try {
      // Check for saved theme in localStorage
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        return savedTheme;
      }
    } catch (error) {
      // Handle localStorage access errors (e.g., in incognito mode)
      console.warn('Could not access localStorage for theme preference', error);
    }
    
    // Check for system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Default to light
    return 'light';
  };
  
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme());
  
  useEffect(() => {
    // Apply theme immediately on mount
    applyTheme(theme);
    
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't explicitly set a preference
      try {
        const savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      } catch (error) {
        // If localStorage is inaccessible, update based on system preference
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    // Add event listener with compatibility check
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Older browsers support (Safari)
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      // Clean up listener with compatibility check
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Older browsers support (Safari)
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);
  
  const applyTheme = (currentTheme: 'light' | 'dark') => {
    // Update HTML element when theme changes
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
    
    // Try to store in localStorage, but handle potential errors
    try {
      localStorage.setItem('theme', currentTheme);
    } catch (error) {
      console.warn('Could not save theme preference to localStorage', error);
    }
  };
  
  useEffect(() => {
    // Apply theme whenever it changes
    applyTheme(theme);
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