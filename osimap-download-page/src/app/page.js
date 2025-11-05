'use client';

import { useState, useEffect, useRef } from 'react';
import './page.css';

export default function DownloadPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);
  const headerRef = useRef(null);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpen]);

  // Handle video auto-play on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (videoRef.current) {
        const rect = videoRef.current.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.75;
        if (isVisible && !videoPlaying) {
          videoRef.current.play();
          setVideoPlaying(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [videoPlaying]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const faqItems = [
    {
      question: 'How do I download and install OSIMAP?',
      answer: 'You can download OSIMAP from the App Store or Google Play Store by searching "OSIMAP". Simply tap Install, and the app will be ready to use within seconds.'
    },
    {
      question: 'Is OSIMAP really free?',
      answer: 'Yes! OSIMAP is completely free to download and use. We\'re committed to making accident reporting and safety information accessible to everyone.'
    },
    {
      question: 'How does the voice alert system work?',
      answer: 'OSIMAP uses advanced AI to process voice recordings of accidents and automatically extracts key information like location, time, and severity to alert nearby drivers and authorities.'
    },
    {
      question: 'Can I report accidents anonymously?',
      answer: 'Yes, you can report accidents anonymously through OSIMAP. Your privacy is important to us, and we never store personally identifiable information without consent.'
    },
    {
      question: 'How accurate are the accident predictions?',
      answer: 'Our AI model is trained on historical accident data from the Philippines and uses machine learning to identify high-risk areas. Accuracy improves as we collect more data.'
    },
    {
      question: 'Is my data secure on OSIMAP?',
      answer: 'Absolutely. We use industry-standard encryption for all data transmission and storage. Your location and personal information are never shared with third parties without your permission.'
    }
  ];

  return (
    <div className="download-page">
      {/* Header */}
      <header className="page-header-download" ref={headerRef}>
        <div className="header-container-download">
          <div className="logo-brand">
            <img src="/osimap-logo.svg" alt="OSIMAP" className="header-logo-download" />
          </div>
          <nav className="header-nav-download">
            <button
              className={`hamburger-menu-download ${menuOpen ? 'active' : ''}`}
              onClick={toggleMenu}
              aria-label="Toggle navigation menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className={`menu-dropdown ${menuOpen ? 'open' : ''}`}>
              <a href="#features" className="menu-link" onClick={() => setMenuOpen(false)}>
                Features
              </a>
              <a href="#voice-alerts" className="menu-link" onClick={() => setMenuOpen(false)}>
                Voice Alerts
              </a>
              <a href="#about" className="menu-link" onClick={() => setMenuOpen(false)}>
                About
              </a>
              <a href="#faq" className="menu-link" onClick={() => setMenuOpen(false)}>
                FAQ
              </a>
              <a href="#footer" className="nav-button" onClick={() => setMenuOpen(false)}>
                Get Started
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <h1 className="hero-title">
            Stay Safe on <span className="highlight-blue">Philippine Roads</span>
          </h1>
          <p className="hero-subtitle">
            Real-time accident alerts, AI-powered safety predictions, and voice-activated reporting for smarter commuting.
          </p>
          <a href="#features" className="download-btn-hero">
            Explore Features
          </a>
          <div className="phones-showcase">
            <div className="phone-mockup phone-left">
              <img
                src="/welcome.png"
                alt="Welcome Screen"
                className="phone-img"
              />
            </div>
            <div className="phone-mockup phone-center">
              <img
                src="/map.png"
                alt="Map View"
                className="phone-img"
              />
            </div>
            <div className="phone-mockup phone-right">
              <img
                src="/stats.png"
                alt="Statistics"
                className="phone-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Copilot/Features Section */}
      <section id="features" className="section-copilot">
        <div className="section-container">
          <div className="section-content-left">
            <h2 className="section-title">Your <span className="highlight-yellow">AI Copilot</span></h2>
            <p className="section-text">
              Our advanced AI system analyzes accident patterns in real-time to provide personalized safety recommendations and help you avoid high-risk areas.
            </p>
            <p className="section-text-small">
              Machine learning algorithms trained on thousands of accident reports continuously learn and improve, making OSIMAP smarter every day.
            </p>
          </div>
          <div className="section-content-right">
            <div className="phone-section-wrapper">
              <img src="/road.png" alt="Road Background" className="road-background" />
              <div className="screen-mockup">
                <img src="/students.png" alt="Student Users" className="screen-img" />
              </div>
              <div className="floating-notification notification-1">
                <div className="notification-icon">⚠️</div>
                <div className="notification-text">
                  <div className="notification-title">ALERT</div>
                  <div className="notification-message">Accident ahead on C3</div>
                </div>
              </div>
              <div className="floating-notification notification-2">
                <div className="notification-icon">🛣️</div>
                <div className="notification-text">
                  <div className="notification-title">ROUTE</div>
                  <div className="notification-message">Take Edsa instead</div>
                </div>
              </div>
              <div className="floating-notification notification-3">
                <div className="notification-icon">✅</div>
                <div className="notification-text">
                  <div className="notification-title">SAFE</div>
                  <div className="notification-message">Route optimized</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Alerts Section */}
      <section id="voice-alerts" className="section-voice-alerts">
        <div className="section-container">
          <div className="section-content-left">
            <div className="screen-mockup-large">
              <img src="/map.png" alt="Voice Alerts Map" className="screen-img" />
            </div>
          </div>
          <div className="section-content-right">
            <h2 className="section-title">
              Voice Alerts, <span className="highlight-red">Hands-Free Safety</span>
            </h2>
            <p className="section-text">
              Simply speak your report. Our AI instantly transcribes your voice, extracts critical accident details, and broadcasts alerts to nearby drivers.
            </p>
            <p className="section-text-small">
              No typing required. No distractions. Just natural speech that saves lives. Report while driving with complete safety.
            </p>
          </div>
        </div>
      </section>

      {/* About/Researchers Section */}
      <section id="about" className="section-researchers">
        <div className="section-container">
          <div className="section-content-left">
            <h2 className="section-title">Built by <span className="highlight-blue">Researchers</span></h2>
            <p className="section-text">
              OSIMAP is developed by a dedicated team of data scientists, traffic engineers, and safety experts from leading Philippine universities.
            </p>
            <p className="section-text-small">
              Our mission is to leverage technology and research to make Philippine roads safer for everyone, from daily commuters to professional drivers.
            </p>
          </div>
          <div className="section-content-right">
            <div className="screen-mockup">
              <img src="/sidebar.png" alt="Sidebar Navigation" className="screen-img" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="section-faq">
        <div className="section-container">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqItems.map((item, index) => (
              <div key={index} className="faq-item">
                <button
                  className={`faq-question ${expandedFAQ === index ? 'active' : ''}`}
                  onClick={() => toggleFAQ(index)}
                >
                  <span>{item.question}</span>
                  <span className="faq-toggle">+</span>
                </button>
                {expandedFAQ === index && (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="footer-section">
        <div className="footer-container">
          <img src="/osimap-logo.svg" alt="OSIMAP" className="footer-img" />
          <div className="footer-content">
            <p className="footer-tagline">
              Making Philippine roads safer through AI-powered accident alerts and real-time driver assistance.
            </p>
            <div className="footer-links">
              <a href="https://twitter.com" className="footer-link" target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
              <a href="https://facebook.com" className="footer-link" target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
              <a href="https://instagram.com" className="footer-link" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
              <a href="mailto:support@osimap.ph" className="footer-link">
                Email
              </a>
            </div>
          </div>
          <div className="footer-divider"></div>
          <div className="footer-bottom">
            <p className="footer-copyright">© 2024 OSIMAP. All rights reserved.</p>
            <div className="footer-socials">
              <a href="https://twitter.com" className="footer-social-link" target="_blank" rel="noopener noreferrer">
                𝕏
              </a>
              <a href="https://facebook.com" className="footer-social-link" target="_blank" rel="noopener noreferrer">
                f
              </a>
              <a href="https://instagram.com" className="footer-social-link" target="_blank" rel="noopener noreferrer">
                📷
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
