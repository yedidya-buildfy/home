import { useState } from 'react';
import { sendInvitationEmailEnhanced, sendInvitationEmail, sendInvitationEmailFallback, isEmailServiceConfigured } from '../lib/emailService';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { CheckCircle, XCircle, AlertCircle, Mail } from 'lucide-react';

export function EmailDebug() {
  const [email, setEmail] = useState('yedidyadan33@gmail.com');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const testEmailService = async (method: 'main' | 'fallback' | 'enhanced') => {
    setSending(true);
    addResult(`🔄 Testing ${method} method...`);

    const emailData = {
      to_email: email,
      to_name: email.split('@')[0],
      home_name: 'בית הבדיקה',
      inviter_name: 'מנהל המערכת',
      invitation_code: 'DEBUG123',
      app_url: window.location.origin
    };

    try {
      let result = false;
      
      switch (method) {
        case 'main':
          result = await sendInvitationEmail(emailData);
          break;
        case 'fallback':
          result = await sendInvitationEmailFallback(emailData);
          break;
        case 'enhanced':
          result = await sendInvitationEmailEnhanced(emailData);
          break;
      }

      if (result) {
        addResult(`✅ ${method} method succeeded!`);
      } else {
        addResult(`❌ ${method} method failed!`);
      }
    } catch (error: any) {
      addResult(`💥 ${method} method error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const configStatus = isEmailServiceConfigured();

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="text-blue-600" size={28} />
            <h1 className="text-2xl font-bold">בדיקת שירות האימייל</h1>
          </div>

          {/* Configuration Status */}
          <div className="mb-6 p-4 rounded-lg border" style={{
            backgroundColor: configStatus ? '#d1fae5' : '#fee2e2',
            borderColor: configStatus ? '#6ee7b7' : '#fca5a5'
          }}>
            <div className="flex items-center gap-2">
              {configStatus ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <XCircle className="text-red-600" size={20} />
              )}
              <span className={configStatus ? 'text-green-800' : 'text-red-800'}>
                סטטוס הגדרה: {configStatus ? 'מוגדר ✅' : 'לא מוגדר ❌'}
              </span>
            </div>
          </div>

          {/* Test Controls */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              אימייל לבדיקה:
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="הכנס אימייל לבדיקה"
            />
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Button
              onClick={() => testEmailService('main')}
              disabled={sending}
              className="flex items-center justify-center gap-2"
            >
              <Mail size={18} />
              בדיקה רגילה
            </Button>

            <Button
              onClick={() => testEmailService('fallback')}
              disabled={sending}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <AlertCircle size={18} />
              בדיקה חלופית
            </Button>

            <Button
              onClick={() => testEmailService('enhanced')}
              disabled={sending}
              className="bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              בדיקה משופרת
            </Button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">תוצאות בדיקה:</h3>
            <Button
              onClick={clearResults}
              variant="outline"
              size="sm"
            >
              נקה תוצאות
            </Button>
          </div>

          {/* Results */}
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center">לחץ על אחד מכפתורי הבדיקה כדי להתחיל</p>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded ${
                      result.includes('✅') ? 'bg-green-100 text-green-800' :
                      result.includes('❌') || result.includes('💥') ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">הוראות לבדיקה:</h4>
            <ol className="text-yellow-700 text-sm space-y-1">
              <li>1. וודא שהגדרת Template ב-EmailJS עם ID: template_home_invitation</li>
              <li>2. פתח את הקונסול (F12) לראות פרטים נוספים</li>
              <li>3. נסה את השיטות השונות כדי לזהות את הבעיה</li>
              <li>4. בדוק את תיבת הדואר של האימייל שהזנת</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}