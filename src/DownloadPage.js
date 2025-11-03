import React, { useEffect, useState, useRef } from 'react';
import './DownloadPage.css';

function DownloadPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Enable scrolling on body when component mounts
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';

    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.header-nav')) {
        setMenuOpen(false);
      }
    };

    // Trigger video playback on scroll
    const handleScroll = () => {
      if (videoRef.current) {
        const rect = videoRef.current.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.75 && rect.bottom > 0;
        
        if (isVisible && !videoPlaying) {
          videoRef.current.play();
          setVideoPlaying(true);
        } else if (!isVisible && videoPlaying) {
          videoRef.current.pause();
          setVideoPlaying(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll);

    // Cleanup: restore original styles when component unmounts
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [menuOpen, videoPlaying]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <div className="download-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-container">
          <img src="/osimap-logo.svg" alt="OSIMAP Logo" className="header-logo" />
          
          <nav className="header-nav">
            <button 
              className={`hamburger-menu ${menuOpen ? 'active' : ''}`}
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            {/* Menu Dropdown - Only About and Features */}
            <div className={`menu-dropdown ${menuOpen ? 'open' : ''}`}>
              <a href="#features" className="menu-link" onClick={closeMenu}>Features</a>
              <a href="#about" className="menu-link" onClick={closeMenu}>About</a>
              
              {/* Download Button in Mobile Menu */}
              <a 
                href="/osimap-latest.apk" 
                className="nav-button"
                id="download" 
                download
                onClick={closeMenu}
              >
                Download APK
              </a>
            </div>

            {/* Desktop Download Button */}
            <a 
              href="/osimap-latest.apk" 
              className="nav-button download-button" 
              download
            >
              <span className="download-icon">↓</span>
              <span className="download-button-text">Download APK</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <h1 className="hero-title">
            Road trip, but <span className="highlight-blue">safer.</span>
          </h1>
          <p className="hero-subtitle">
            Stop guessing where the danger is,<br />get real time accident hotspot alerts.
          </p>
          <a href="/osimap-latest.apk" className="download-btn-hero" download>
            Download OSIMAP
          </a>
          <div className="phones-showcase">
            <div className="phone-mockup phone-left">
              <img src="/sidebar.png" alt="Statistics Screen" className="phone-img" />
            </div>
            <div className="phone-mockup phone-center">
              <img src="/map.png" alt="Map Interface" className="phone-img" />
            </div>
            <div className="phone-mockup phone-right">
              <img src="/welcome.png" alt="Profile/Home Screen" className="phone-img" />
            </div>
          </div>
        </div>
      </section>

      {/* Free Co-pilot Section */}
      <section className="section-copilot" id="features">
        <div className="section-container">
          <div className="section-content-left">
            <h2 className="section-title">
              OSIMAP is your <span className="highlight-yellow">co-pilot when driving.</span>
            </h2>
            <p className="section-text">
              Optimized Spatial Information Map for Accident Prevention analyzes thousands of historical road traffic accidents with advanced clustering techniques.
            </p>
          </div>
          <div className="section-content-right">
            <div className="phone-mockup">
              <img src="/stats.png" alt="Statistics Screen" className="screen-img" />
              
              {/* Floating Notification Messages */}
              <div className="floating-notification notification-1">
                <div className="notification-icon">⚠️</div>
                <div className="notification-text">
                  <div className="notification-title">Warning</div>
                  <div className="notification-message">Danger zone ahead</div>
                </div>
              </div>
              
              <div className="floating-notification notification-2">
                <div className="notification-icon">🚨</div>
                <div className="notification-text">
                  <div className="notification-title">Alert</div>
                  <div className="notification-message">Accident hotspot detected</div>
                </div>
              </div>
              
              <div className="floating-notification notification-3">
                <div className="notification-icon">⚠️</div>
                <div className="notification-text">
                  <div className="notification-title">Caution</div>
                  <div className="notification-message">High risk area</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Alerts Section */}
      <section className="section-voice-alerts">
        <div className="section-container">
          <div className="section-content-left">
            <h2 className="section-title">
              As you drive, the app delivers <span className="highlight-red">voice alerts.</span>
            </h2>
            <p className="section-text-small">
              You can also easily view the same dynamic heat maps that local authorities use to upload road traffic accidents.
            </p>
          </div>
          <div className="section-content-right">
            <div className="screen-mockup-large">
              <video 
                ref={videoRef}
                src="/OSIMAP-vid.mov" 
                alt="Map with Alerts" 
                className="screen-img"
                controls
                loop
                muted
              />
            </div>
          </div>
        </div>
      </section>

      {/* Student Researchers Section */}
      <section className="section-researchers" id="about">
        <div className="section-container">
          <div className="section-content-left">
            <div className="screen-mockup">
              <img src="/students.png" alt="Support Center" className="screen-img" />
            </div>
          </div>
          <div className="section-content-right">
            <h2 className="section-title">
              OSIMAP was brought to life by a team of <span className="highlight-blue">student researchers</span>.
            </h2>
            <p className="section-text">
              Transforming complex data into a real-world safety solution for the City of San Fernando, Pampanga.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="footer-container">
          <div className="footer-content">
            <p className="footer-tagline">
              <img src="/signin-logo.png" alt="OSIMAP Logo" className="footer-img" />
            </p>
            
            <div className="footer-links">
              <a href="/osimap-latest.apk" className="footer-link" download>Download</a>
              <a href="#features" className="footer-link">Features</a>
              <a href="#about" className="footer-link">About</a>
              <a href="mailto:osimapdatabase@gmail.com" className="footer-link">Contact</a>
            </div>
          </div>

          <div className="footer-divider"></div>

          <div className="footer-bottom">
            <p className="footer-copyright">
              &copy; 2025 OSIMAP. All rights reserved.
            </p>
            
            <div className="footer-socials">
              <a href="https://facebook.com/osimap" className="footer-social-link" title="Facebook" target="_blank" rel="noopener noreferrer">f</a>
              <a href="https://twitter.com/osimap" className="footer-social-link" title="Twitter" target="_blank" rel="noopener noreferrer">𝕏</a>
              <a href="https://linkedin.com/company/osimap" className="footer-social-link" title="LinkedIn" target="_blank" rel="noopener noreferrer">in</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DownloadPage;
