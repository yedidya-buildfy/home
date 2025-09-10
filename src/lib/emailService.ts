import emailjs from '@emailjs/browser';

// EmailJS configuration from environment variables
const EMAIL_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_home_app';
const EMAIL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_your_template_id';
const EMAIL_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

// Debug logging for configuration
console.log('🔧 EmailJS Configuration:', {
  serviceId: EMAIL_SERVICE_ID,
  templateId: EMAIL_TEMPLATE_ID,
  publicKeyLength: EMAIL_PUBLIC_KEY.length,
  publicKeyPrefix: EMAIL_PUBLIC_KEY.substring(0, 10) + '...',
  env: import.meta.env.MODE
});

interface EmailData {
  to_email: string;
  to_name: string;
  home_name: string;
  inviter_name: string;
  invitation_code: string;
  app_url: string;
}

export const sendInvitationEmail = async (emailData: EmailData): Promise<boolean> => {
  console.log('📧 Starting email send process...');
  console.log('📋 Email data received:', {
    to: emailData.to_email,
    from: emailData.inviter_name,
    home: emailData.home_name,
    code: emailData.invitation_code
  });

  try {
    // Initialize EmailJS with public key
    console.log('🔑 Initializing EmailJS with public key...');
    emailjs.init({
      publicKey: EMAIL_PUBLIC_KEY,
    });

    // Create invitation link
    const invitationLink = `${emailData.app_url}/invite?code=${emailData.invitation_code}&email=${encodeURIComponent(emailData.to_email)}`;
    console.log('🔗 Generated invitation link:', invitationLink);
    
    // Simplified HTML content for better compatibility
    const htmlContent = `
      <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🏡</h1>
          <h2 style="color: white; margin: 10px 0 0 0; font-weight: normal; font-size: 20px;">
            הוזמנת להצטרף לבית
          </h2>
        </div>
        
        <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
          <p style="font-size: 18px; color: #111827; margin: 0 0 10px 0;">
            שלום ${emailData.to_name || 'שם'},
          </p>
          
          <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
            <strong style="color: #111827;">${emailData.inviter_name}</strong> 
            הזמין/ה אותך להצטרף לבית 
            <strong style="color: #111827;">"${emailData.home_name}"</strong>
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${invitationLink}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 16px 40px; 
                      text-decoration: none; 
                      border-radius: 30px; 
                      display: inline-block; 
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
              לחץ כאן כדי להצטרף 🚀
            </a>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0 20px 0;">
            <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0; text-align: center;">
              מה קורה כשתלחץ על הכפתור?
            </p>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">
              • אם יש לך חשבון - תתחבר ותצטרף אוטומטית<br>
              • אם אין לך חשבון - תוכל ליצור אחד ולהצטרף<br>
              • הכל קורה אוטומטית, בלי צורך בקודים 🎉
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
              או השתמש בקוד: <strong style="color: #6b7280; font-family: monospace; font-size: 16px;">${emailData.invitation_code}</strong>
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            אפליקציית ניהול הבית 🏡
          </p>
        </div>
      </div>
    `;

    // Prepare template parameters that match template_home_invitation exactly
    const templateParams = {
      to_email: emailData.to_email,
      to_name: emailData.to_name || emailData.to_email.split('@')[0],
      from_name: emailData.inviter_name,
      home_name: emailData.home_name,
      invitation_code: emailData.invitation_code,
      invitation_link: invitationLink
    };

    console.log('📋 Exact template parameters:', templateParams);

    console.log('📨 Template parameters prepared:', {
      service: EMAIL_SERVICE_ID,
      template: EMAIL_TEMPLATE_ID,
      to: templateParams.to_email,
      subject: templateParams.subject,
      paramsCount: Object.keys(templateParams).length
    });

    // Send email using EmailJS
    console.log('🚀 Sending email via EmailJS...');
    const response = await emailjs.send(
      EMAIL_SERVICE_ID,
      EMAIL_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Email sent successfully!', {
      status: response.status,
      text: response.text
    });
    return true;
  } catch (error: any) {
    console.error('❌ Email sending failed!', {
      error: error,
      message: error?.message,
      status: error?.status,
      text: error?.text,
      stack: error?.stack
    });
    
    // Additional debug info
    console.error('🔍 Debug info:', {
      serviceId: EMAIL_SERVICE_ID,
      templateId: EMAIL_TEMPLATE_ID,
      publicKeyValid: EMAIL_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY',
      browserSupport: typeof window !== 'undefined'
    });
    
    return false;
  }
};


// Fallback email method with basic template
export const sendInvitationEmailFallback = async (emailData: EmailData): Promise<boolean> => {
  console.log('🔄 Trying fallback email method...');
  
  try {
    emailjs.init({
      publicKey: EMAIL_PUBLIC_KEY,
    });

    const invitationLink = `${emailData.app_url}/invite?code=${emailData.invitation_code}&email=${encodeURIComponent(emailData.to_email)}`;
    
    // Try multiple common template formats
    const templateFormats = [
      {
        id: 'contact_form',
        params: {
          to: emailData.to_email,
          email: emailData.to_email,
          name: emailData.to_name || emailData.to_email.split('@')[0],
          subject: `הזמנה לבית ${emailData.home_name}`,
          message: `שלום ${emailData.to_name || 'חבר/ה'},

${emailData.inviter_name} הזמין/ה אותך להצטרף לבית "${emailData.home_name}".

קוד ההזמנה שלך: ${emailData.invitation_code}

לחץ כאן להצטרפות מיידית:
${invitationLink}

בברכה,
צוות ניהול הבית`
        }
      },
      {
        id: 'template_default',
        params: {
          user_email: emailData.to_email,
          user_name: emailData.to_name || emailData.to_email.split('@')[0],
          message: `הזמנה לבית ${emailData.home_name} - קוד: ${emailData.invitation_code} - קישור: ${invitationLink}`
        }
      },
      {
        id: EMAIL_TEMPLATE_ID.replace('template_your_template_id', 'template_default'),
        params: {
          to_email: emailData.to_email,
          message: `שלום! הוזמנת לבית ${emailData.home_name}. קוד: ${emailData.invitation_code}. קישור: ${invitationLink}`
        }
      }
    ];

    for (const format of templateFormats) {
      try {
        console.log(`🔄 Trying template: ${format.id}`);
        const response = await emailjs.send(
          EMAIL_SERVICE_ID,
          format.id,
          format.params
        );

        console.log(`✅ Fallback email sent with ${format.id}!`, response);
        return true;
      } catch (err: any) {
        console.log(`❌ Template ${format.id} failed:`, err.status, err.text);
        continue;
      }
    }

    throw new Error('All fallback templates failed');
  } catch (error) {
    console.error('❌ All fallback methods failed:', error);
    return false;
  }
};

// Enhanced email service with fallback
export const sendInvitationEmailEnhanced = async (emailData: EmailData): Promise<boolean> => {
  console.log('🎯 ENHANCED: Email service starting...');
  console.log('📋 ENHANCED: Email data received:', emailData);
  
  try {
    // First try the main method
    console.log('🥇 ENHANCED: Trying main method first...');
    const mainResult = await sendInvitationEmail(emailData);
    if (mainResult) {
      console.log('✅ ENHANCED: Main method succeeded!');
      return true;
    }

    console.log('⚠️ ENHANCED: Main method failed, trying fallback...');
    
    // Try fallback method
    console.log('🥈 ENHANCED: Trying fallback method...');
    const fallbackResult = await sendInvitationEmailFallback(emailData);
    if (fallbackResult) {
      console.log('✅ ENHANCED: Fallback method succeeded!');
      return true;
    }

    console.log('❌ ENHANCED: Both methods failed');
    return false;
  } catch (error) {
    console.error('💥 ENHANCED: Exception in enhanced service:', error);
    return false;
  }
};

// Check if EmailJS is properly configured
export const isEmailServiceConfigured = (): boolean => {
  const hasPublicKey = EMAIL_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY' && EMAIL_PUBLIC_KEY.length > 0;
  const hasServiceId = EMAIL_SERVICE_ID && EMAIL_SERVICE_ID.length > 0;
  const hasTemplateId = EMAIL_TEMPLATE_ID !== 'template_your_template_id' && EMAIL_TEMPLATE_ID.length > 0;
  
  console.log('🔍 Configuration check:', {
    hasPublicKey,
    hasServiceId, 
    hasTemplateId,
    publicKey: EMAIL_PUBLIC_KEY.substring(0, 10) + '...',
    serviceId: EMAIL_SERVICE_ID,
    templateId: EMAIL_TEMPLATE_ID
  });
  
  return hasPublicKey && hasServiceId;
};