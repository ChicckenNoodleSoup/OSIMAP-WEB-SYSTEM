import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Email service utility for sending notifications using Supabase Edge Functions

export const sendAccountStatusEmail = async (email, username, status) => {
  try {
    const subject = status === 'approved' 
      ? 'Account Approved - OSIMAP' 
      : 'Account Rejected - OSIMAP';
    
    const htmlMessage = status === 'approved'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Account Approved!</h2>
          <p>Dear ${username},</p>
          <p>Great news! Your account has been approved and you can now log in to the OSIMAP system.</p>
          <p>You can access the system at: <a href="${window.location.origin}/signin">${window.location.origin}/signin</a></p>
          <p>Best regards,<br>OSIMAP Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Account Rejected</h2>
          <p>Dear ${username},</p>
          <p>Unfortunately, your account request has been rejected. Please contact the administrator for more information.</p>
          <p>If you believe this is an error, please reach out to our support team.</p>
          <p>Best regards,<br>OSIMAP Team</p>
        </div>
      `;

    const textMessage = status === 'approved'
      ? `Dear ${username},\n\nYour account has been approved! You can now log in to the OSIMAP system.\n\nBest regards,\nOSIMAP Team`
      : `Dear ${username},\n\nUnfortunately, your account request has been rejected. Please contact the administrator for more information.\n\nBest regards,\nOSIMAP Team`;

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject,
        html: htmlMessage,
        text: textMessage
      }
    });

    if (error) {
      console.error('Supabase Edge Function error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };

  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Generic email sending function for other use cases
export const sendEmail = async (email, subject, html, text) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject,
        html,
        text
      }
    });

    if (error) {
      console.error('Supabase Edge Function error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};