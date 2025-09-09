import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type AuthView = 'login' | 'signup' | 'forgot';

export function AuthContainer() {
  const [currentView, setCurrentView] = useState<AuthView>('login');

  switch (currentView) {
    case 'login':
      return (
        <LoginForm
          onSwitchToSignup={() => setCurrentView('signup')}
          onSwitchToForgot={() => setCurrentView('forgot')}
        />
      );
    case 'signup':
      return (
        <SignupForm
          onSwitchToLogin={() => setCurrentView('login')}
        />
      );
    case 'forgot':
      return (
        <ForgotPasswordForm
          onSwitchToLogin={() => setCurrentView('login')}
        />
      );
    default:
      return null;
  }
}