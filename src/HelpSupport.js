import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HelpSupport.css';

function HelpSupport() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Get authenticated user data
  useEffect(() => {
    const adminData = localStorage.getItem('adminData');
    if (adminData) {
      setUserData(JSON.parse(adminData));
    }
  }, []);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Validation
    if (!message) {
      setStatusMessage('Please enter a message');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    if (!userData || !userData.email || !userData.full_name) {
      setStatusMessage('User information not found. Please log in again.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsSending(true);
    setStatusMessage('');

    try {
      const response = await fetch('http://localhost:3002/api/send-support-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.full_name,
          email: userData.email,
          message: message,
          to: 'osimapdatabase@gmail.com'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatusMessage('Message sent successfully!');
        // Clear message
        setMessage('');
        setTimeout(() => setStatusMessage(''), 5000);
      } else {
        setStatusMessage('Failed to send message. Please try again.');
        setTimeout(() => setStatusMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setStatusMessage('Failed to send message. Please try again.');
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className='help-scroll-wrapper'>
      <div className="help-support-container">
        {/* Logo at the top */}
        <img src="/signin-logo.png" alt="Logo" className="help-logo" />

        {/* Help card below */}
        <div className="help-card">
          <h1 className="help-title">Developer Support Page</h1>

          <div className="text-column-container">
            {/* Column One */}
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
                  <b>Our Address</b> <br />
                  Pampanga State University - Bacolor <br />
                  Pampanga, PH
                </p>
              </div>

              {/* Contact */}
              <div className="text-column">
                <svg className="help-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.6 14.521c-2.395 
                  2.521-8.504-3.533-6.1-6.063c1.468-1.545-.19-3.31-1.108-4.609c-1.723-2.435-5.504.927-5.39 3.066c.363 
                  6.746 7.66 14.74 14.726 14.042c2.21-.218 4.75-4.21 2.214-5.669c-1.267-.73-3.008-2.17-4.342-.767ZM14 
                  3a7 7 0 0 1 7 7m-7-3a3 3 0 0 1 3 3"/>
                </svg>
                <p className="help-details">
                  <b>Contact</b> <br />
                  Phone: +63 999 1508 859 <br />
                  Email: osimapdatabase@gmail.com 
                </p>
              </div>

              {/* Working Hours */}
              <div className="text-column">
                <svg className="help-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1664 1664">
                  <path fill="currentColor" d="M1088 768H904q-29-32-72-32h-5L475 
                  384q-19-19-45.5-19T384 384t-19 45.5t19 45.5l352 352v5q0 40 28 68t68 28q43 0 72-32h184q26 
                  0 45-19t19-45t-19-45t-45-19zM832 256q26 0 45 19t19 45t-19 45t-45 19t-45-19t-19-45t19-45t45-19zm0 
                  1024q26 0 45 19t19 45t-19 45t-45 19t-45-19t-19-45t19-45t45-19zM320 768q26 0 45 19t19 45t-19 
                  45t-45 19t-45-19t-19-45t19-45t45-19zm1024 0q26 0 45 19t19 45t-19 45t-45 19t-45-19t-19-45t19-45t45-19zM832 
                  0Q663 0 508.5 66T243 243T66 508.5T0 832t66 323.5T243 1421t265.5 177t323.5 
                  66t323.5-66t265.5-177t177-265.5t66-323.5t-66-323.5T1421 243T1155.5 66T832 0zm0 128q143 0 273.5 
                  55.5t225 150t150 225T1536 832t-55.5 273.5t-150 225t-225 150T832 1536t-273.5-55.5t-225-150t-150-225T128 
                  832t55.5-273.5t150-225t225-150T832 128z"/>
                </svg>
                <p className="help-details">
                  <b>Working Hours</b> <br />
                  Monday - Friday: 8:00 - 17:00 <br />
                  Saturday & Sunday: 8:00 - 12:00
                </p>
              </div>
            </div>

            {/* Column Two */}
            <div className="columnTwo">
              <h3>Ready to get started?</h3>
              
              {userData && (
                <div className="user-info">
                  <p><strong>Name:</strong> {userData.full_name}</p>
                  <p><strong>Email:</strong> {userData.email}</p>
                </div>
              )}

              {statusMessage && (
                <div className={`status-message ${statusMessage.includes('success') ? 'success' : 'error'}`}>
                  {statusMessage}
                </div>
              )}

              <form className="help-form" onSubmit={handleSendMessage}>
                <label htmlFor="message-textarea" className="message-label">Your Message</label>
                <textarea 
                  id="message-textarea"
                  className="message-input" 
                  name="message"
                  placeholder="Type your message here..." 
                  value={message}
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
