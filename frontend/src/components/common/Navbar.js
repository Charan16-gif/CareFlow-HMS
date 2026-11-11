import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import ThemeSwitcher from './ThemeSwitcher';
import {
  LogIn,
  UserPlus,
  Menu,
  X,
  ChevronRight,
  Home,
  Building2,
  Stethoscope,
  Users,
  PhoneCall,
  Activity,
  ShieldCheck,
} from 'lucide-react';

const navLinks = [
  {
    path: '/',
    hash: 'home',
    label: 'Home',
    icon: Home,
    description: 'Welcome & portal overview',
    isDirectRoute: false,
  },
  {
    path: '/about',
    hash: 'about',
    label: 'About',
    icon: Building2,
    description: 'Mission, architecture & modules',
    isDirectRoute: true,
  },
  {
    path: '/#services',
    hash: 'services',
    label: 'Services',
    icon: Stethoscope,
    description: 'Clinical & pharmacy care',
    isDirectRoute: false,
  },
  {
    path: '/#how-it-works',
    hash: 'how-it-works',
    label: 'How It Works',
    icon: Activity,
    description: 'Seamless patient journey',
    isDirectRoute: false,
  },
  {
    path: '/#our-team',
    hash: 'our-team',
    label: 'Our Team',
    icon: Users,
    description: 'Specialists & medical staff',
    isDirectRoute: false,
  },
  {
    path: '/contact',
    hash: 'contact',
    label: 'Contact',
    icon: PhoneCall,
    description: 'Project support & inquiries',
    isDirectRoute: true,
  },
];

const Navbar = ({
  currentTheme = 'default',
  onThemeChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Automatically close mobile menu if viewport expands to laptop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on Escape key and prevent background scroll while open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handle navigation click for both direct routes and in-page hash anchors
  const handleNavClick = (e, item) => {
    setIsMobileMenuOpen(false);

    if (item.isDirectRoute) {
      // Let React Router Link do its work
      return;
    }

    if (isHome) {
      e.preventDefault();
      const targetElement = document.getElementById(item.hash);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      } else if (item.hash === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // If we are on /about, /contact, etc., navigate to home with hash
      e.preventDefault();
      navigate(`/#${item.hash}`);
    }
  };

  return (
    <header className="glass-navbar">
      <div className="glass-navbar-container">
        {/* Left: Brand Logo */}
        <div className="navbar-brand-wrapper">
          <Link
            to="/"
            style={{ textDecoration: 'none' }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Logo size="md" animated={true} />
          </Link>
        </div>

        {/* Center: Desktop Navigation Links (hidden on tablet/mobile) */}
        <nav className="navbar-desktop-nav" aria-label="Desktop Navigation">
          {navLinks.map((item) => {
            if (item.isDirectRoute) {
              return (
                <Link
                  key={item.hash}
                  to={item.path}
                  className={`navbar-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, item)}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <a
                key={item.hash}
                href={isHome ? `#${item.hash}` : `/#${item.hash}`}
                className="navbar-nav-link"
                onClick={(e) => handleNavClick(e, item)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right: Desktop Actions (Theme Switcher, Login, Register) */}
        <div className="navbar-desktop-actions">
          <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

          <Link
            to="/login"
            className="glass-btn glass-btn-secondary"
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.875rem' }}
          >
            <LogIn size={15} color="var(--primary-cyan)" />
            <span>Login</span>
          </Link>

          <Link
            to="/register"
            className="glass-btn glass-btn-primary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}
          >
            <UserPlus size={15} />
            <span>Register</span>
          </Link>
        </div>

        {/* Mobile & Tablet Header Controls (Theme Switcher + Hamburger Toggle Button) */}
        <div className="navbar-mobile-controls">
          <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

          <button
            type="button"
            className={`navbar-mobile-toggle ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer / Floating Glass Card */}
        <div
          id="mobile-nav-drawer"
          className={`navbar-mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`}
          aria-hidden={!isMobileMenuOpen}
        >
          <div className="navbar-mobile-drawer-header">
            <span className="navbar-mobile-badge">
              <span className="navbar-mobile-badge-pulse" />
              <span>CareFlow Healthcare Portal</span>
            </span>
          </div>

          <ul className="navbar-mobile-links">
            {navLinks.map((item) => {
              const Icon = item.icon;
              if (item.isDirectRoute) {
                return (
                  <li key={item.hash} className="navbar-mobile-item">
                    <Link
                      to={item.path}
                      className="navbar-mobile-link"
                      onClick={(e) => handleNavClick(e, item)}
                    >
                      <div className="navbar-mobile-link-content">
                        <div className="navbar-mobile-icon-box">
                          <Icon size={18} />
                        </div>
                        <div className="navbar-mobile-text-group">
                          <span className="navbar-mobile-label">{item.label}</span>
                          <span className="navbar-mobile-subtext">{item.description}</span>
                        </div>
                      </div>
                      <div className="navbar-mobile-arrow">
                        <ChevronRight size={16} />
                      </div>
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.hash} className="navbar-mobile-item">
                  <a
                    href={isHome ? `#${item.hash}` : `/#${item.hash}`}
                    className="navbar-mobile-link"
                    onClick={(e) => handleNavClick(e, item)}
                  >
                    <div className="navbar-mobile-link-content">
                      <div className="navbar-mobile-icon-box">
                        <Icon size={18} />
                      </div>
                      <div className="navbar-mobile-text-group">
                        <span className="navbar-mobile-label">{item.label}</span>
                        <span className="navbar-mobile-subtext">{item.description}</span>
                      </div>
                    </div>
                    <div className="navbar-mobile-arrow">
                      <ChevronRight size={16} />
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="navbar-mobile-divider" />

          <div className="navbar-mobile-actions">
            <Link
              to="/login"
              className="glass-btn glass-btn-secondary navbar-mobile-btn navbar-mobile-btn-login"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LogIn size={16} color="var(--primary-cyan)" />
              <span>Sign In to Portal</span>
            </Link>

            <Link
              to="/register"
              className="glass-btn glass-btn-primary navbar-mobile-btn navbar-mobile-btn-register"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <UserPlus size={16} />
              <span>Register as Patient</span>
            </Link>
          </div>

          <div className="navbar-mobile-footer-status">
            <div className="navbar-mobile-status-item">
              <Activity size={13} className="navbar-mobile-status-icon" />
              <span>Centralized Healthcare Platform</span>
            </div>
            <div className="navbar-mobile-status-item">
              <ShieldCheck size={13} className="navbar-mobile-status-icon" />
              <span>Role-Based Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop overlay for mobile menu drawer */}
      <div
        className={`navbar-mobile-backdrop ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />
    </header>
  );
};

export default Navbar;
