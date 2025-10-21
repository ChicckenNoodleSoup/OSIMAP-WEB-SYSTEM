import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Email service utility for sending notifications using Supabase Edge Functions

export const sendAccountStatusEmail = async (email, fullName, status) => {
  try {
    // Call the new Supabase Edge Function for account status emails
    const { data, error } = await supabase.functions.invoke('send-account-status', {
      body: {
        email: email,
        fullName: fullName,
        status: status
      }
    });

    if (error) {
      console.error('Supabase Edge Function error:', error);
      return { success: false, error: error.message };
    }

    // Check if the response indicates success
    if (data && data.success === false) {
      console.error('Edge Function returned error:', data.error);
      return { success: false, error: data.error };
    }

    console.log('Account status email sent successfully:', data);
    return { success: true, data };

  } catch (error) {
    console.error('Error sending account status email:', error);
    return { success: false, error: error.message };
  }
};