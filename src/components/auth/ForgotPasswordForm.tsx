import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Mail, ArrowRight, Home } from 'lucide-react';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('נא להכניס כתובת אימייל');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError('שגיאה בשליחת האימייל. אנא בדוק את הכתובת ונסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 space-y-8">
            <div className="text-center">
              <div className="flex justify-center">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-2xl shadow-lg">
                  <Home className="h-12 w-12 text-white" />
                </div>
              </div>
              <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                אימייל נשלח בהצלחה
              </h2>
              <p className="mt-3 text-gray-600 font-medium">
                נשלח אליך אימייל עם הוראות לאיפוס הסיסמה
              </p>
              <p className="mt-2 text-sm text-gray-500">
                בדוק את תיבת הדואר שלך (כולל תיקיית הספאם)
              </p>
            </div>
            
            <div>
              <Button
                onClick={onSwitchToLogin}
                className="w-full"
                size="lg"
              >
                <ArrowRight className="h-5 w-5 ml-2" />
                חזרה להתחברות
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                <Home className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              שכחת סיסמה?
            </h2>
            <p className="mt-3 text-center text-gray-600 font-medium">
              הכנס את כתובת האימייל שלך ונשלח לך הוראות לאיפוס הסיסמה
            </p>
          </div>
        
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute right-4 top-12 h-5 w-5 text-gray-400" />
              <Input
                label="כתובת אימייל"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pr-12"
                placeholder="הכנס כתובת אימייל"
                required
              />
            </div>

            <div className="space-y-4 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'שולח...' : 'שלח אימייל לאיפוס סיסמה'}
              </Button>
              
              <Button
                type="button"
                onClick={onSwitchToLogin}
                variant="outline"
                className="w-full"
              >
                <ArrowRight className="h-5 w-5 ml-2" />
                חזרה להתחברות
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}