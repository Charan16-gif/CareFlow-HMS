import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Sun, Moon, ChevronDown, Check } from 'lucide-react';

const THEMES = [
  {
    id: 'default',
    label: 'Default',
    description: 'CareFlow Obsidian & Cyan',
    icon: Sparkles,
    swatchClass: 'swatch-default',
  },
  {
    id: 'white',
    label: 'White',
    description: 'Crisp Light Glassmorphism',
    icon: Sun,
    swatchClass: 'swatch-white',
  },
  {
    id: 'black',
    label: 'Black',
    description: 'Pure Deep Glassmorphism',
    icon: Moon,
    swatchClass: 'swatch-black',
  },
];

const ThemeSwitcher = ({ currentTheme = 'default', onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
  const ActiveIcon = activeThemeObj.icon;

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation & accessibility
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  const handleSelectTheme = (themeId) => {
    if (onThemeChange) {
      onThemeChange(themeId);
    }
    setIsOpen(false);
  };

  return (
    <div className="theme-switcher-wrapper" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="theme-switcher-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Change theme. Current theme is ${activeThemeObj.label}`}
        title="Change landing page theme"
      >
        <span className={`theme-indicator-swatch ${activeThemeObj.swatchClass}`} aria-hidden="true" />
        <ActiveIcon size={13} style={{ opacity: 0.85 }} aria-hidden="true" />
        <span className="theme-switcher-label">{activeThemeObj.label}</span>
        <ChevronDown size={13} className="theme-switcher-chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="theme-switcher-dropdown"
          role="listbox"
          aria-label="Available themes"
        >
          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            const ThemeIcon = theme.icon;

            return (
              <button
                key={theme.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`theme-option-btn ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectTheme(theme.id)}
              >
                <div className="theme-option-left">
                  <span className={`theme-indicator-swatch ${theme.swatchClass}`} aria-hidden="true" />
                  <ThemeIcon size={14} style={{ opacity: 0.85 }} aria-hidden="true" />
                  <span>{theme.label}</span>
                </div>
                {isSelected && <Check size={13} color="var(--primary-cyan)" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
