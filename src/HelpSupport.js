import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HelpSupport.css';

function HelpSupport() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.message) {
      setStatusMessage('Please fill in all fields');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setStatusMessage('Please enter a valid email address');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsSending(true);
    setStatusMessage('');

    try {
      const response = await fetch('http://osimap-web-system.onrender.com/api/send-support-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          to: 'osimapdatabase@gmail.com'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatusMessage('Message sent successfully!');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatusMessage('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setStatusMessage('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  return (
    <div className='help-scroll-wrapper'>
      <div className="help-support-container">
        {/* Logo */}
        <img src="/signin-logo.png" alt="Logo" className="help-logo" />

        {/* Main Help Card */}
        <div className="help-card">
          <h1 className="help-title">Developer Support Page</h1>

          <div className="text-column-container">
            {/* Column One - Info */}
            <div className="columnOne">
              <h3>Need Help?</h3>
              <p className="help-text">
                We're here to assist you! If you have any questions, concerns, or need support, 
                feel free to reach out to us. Your satisfaction is our priority, and we're committed 
                to resolving your issues as quickly as possible.
              </p>

              {/* Address */}
              <div className="text-column">
                <svg className="help-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                    <path d="M7 18c-1.829.412-3 1.044-3 1.754C4 20.994 7.582 22 12 22s8-1.006 
                    8-2.246c0-.71-1.171-1.342-3-1.754m-2.5-9a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0"/>
                    <path d="M13.257 17.494a1.813 1.813 0 0 1-2.514 0c-3.089-2.993-7.228-6.336-5.21-11.19C6.626 
                    3.679 9.246 2 12 2s5.375 1.68 6.467 4.304c2.016 4.847-2.113 8.207-5.21 11.19"/>
                  </g>
                </svg>
                <p className="help-details">
                  <b>Our Address</b><br />
                  Pampanga State University - Bacolor<br />
                  Pampanga, PH
                </p>
              </div>

              {/* Contact */}
              <div className="text-column">
                <svg className="help-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                  d="M15.6 14.521c-2.395 2.521-8.504-3.533-6.1-6.063c1.468-1.545-.19-3.31-1.108-4.609
                  c-1.723-2.435-5.504.927-5.39 3.066c.363 6.746 7.66 14.74 14.726 14.042c2.21-.218 4.75-4.21 2.214-5.669
                  c-1.267-.73-3.008-2.17-4.342-.767ZM14 3a7 7 0 0 1 7 7m-7-3a3 3 0 0 1 3 3"/>
                </svg>
                <p className="help-details">
                  <b>Contact</b><br />
                  Phone: +63 999 1508 859<br />
                  Email: osimapdatabase@gmail.com
                </p>
              </div>

              {/* Working Hours */}
              <div className="text-column">
                <svg className="help-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1664 1664">
                  <path fill="currentColor" d="M1088 768H904q-29-32-72-32h-5L475 384q-19-19-45.5-19T384 384
                  t-19 45.5t19 45.5l352 352v5q0 40 28 68t68 28q43 0 72-32h184q26 0 45-19t19-45t-19-45t-45-19zM832 
                  256q26 0 45 19t19 45t-19 45t-45 19t-45-19t-19-45t19-45t45-19z"/>
                </svg>
                <p className="help-details">
                  <b>Working Hours</b><br />
                  Monday - Friday: 8:00 - 17:00<br />
                  Saturday & Sunday: 8:00 - 12:00
                </p>
              </div>
            </div>

            {/* Column Two - Form */}
            <div className="columnTwo">
              <h3>Ready to get started?</h3>

              {statusMessage && (
                <div className={`status-message ${statusMessage.includes('successfully') ? 'success' : 'error'}`}>
                  {statusMessage}
                </div>
              )}

              <form className="help-form" onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Your Name" 
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isSending}
                />
                <input 
                  type="email" 
                  name="email" 
                  placeholder="Your Email Address" 
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSending}
                />
                <textarea 
                  className="message-input" 
                  name="message" 
                  placeholder="Your Message" 
                  value={formData.message}
                  onChange={handleInputChange}
                  disabled={isSending}
                />
                <div className="form-buttons">
                  <button 
                    type="button" 
                    className="help-btn primary-btn" 
                    onClick={() => navigate('/')}
                    disabled={isSending}
                  >
                    Go Back Home
                  </button>
                  <button 
                    type="submit" 
                    className="help-btn secondary-btn"
                    disabled={isSending}
                  >
                    {isSending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpSupport;
