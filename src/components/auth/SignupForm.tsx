import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Mail, Lock, User, Home } from 'lucide-react';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  // Check for pending invitation
  React.useEffect(() => {
    const pendingInvite = sessionStorage.getItem('pendingInvite');
    if (pendingInvite) {
      const { email: inviteEmail } = JSON.parse(pendingInvite);
      setEmail(inviteEmail);
    }
  }, []);

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !name) {
      setError('נא למלא את כל השדות');
      return false;
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return false;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password, name);
      
      // After successful signup, check if there's a pending invite
      const pendingInvite = sessionStorage.getItem('pendingInvite');
      if (pendingInvite) {
        const { code, email: inviteEmail } = JSON.parse(pendingInvite);
        sessionStorage.removeItem('pendingInvite');
        window.location.href = `/invite?code=${code}&email=${encodeURIComponent(inviteEmail)}`;
      }
    } catch (err) {
      setError('שגיאה ביצירת החשבון. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

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
              הצטרפות לבית החדש
            </h2>
            <p className="mt-3 text-center text-gray-600 font-medium">
              יצירת חשבון חדש
            </p>
          </div>
        
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
            
            <div className="space-y-5">
            <div className="relative">
              <User className="absolute right-4 top-12 h-5 w-5 text-gray-400" />
              <Input
                label="שם מלא"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pr-12"
                placeholder="הכנס שם מלא"
                required
              />
            </div>
            
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
            
            <div className="relative">
              <Lock className="absolute right-4 top-12 h-5 w-5 text-gray-400" />
              <Input
                label="סיסמה"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
                placeholder="הכנס סיסמה (לפחות 6 תווים)"
                required
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute right-4 top-12 h-5 w-5 text-gray-400" />
              <Input
                label="אישור סיסמה"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-12"
                placeholder="הכנס סיסמה שוב"
                required
              />
            </div>
          </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'יוצר חשבון...' : 'צור חשבון'}
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-gray-100">
              <div className="text-sm">
                <span className="text-gray-600">יש לך כבר חשבון? </span>
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-blue-600 hover:text-blue-700 font-bold transition-colors"
                >
                  התחבר כאן
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}