import React, { useState } from 'react';
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, provider, signInWithPopup } from '../lib/firebase';
import { X, Mail, Lock } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Google sign in failed');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md border-4 border-black relative">
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-black text-white w-8 h-8 flex items-center justify-center hover:bg-[#D4FF00] hover:text-black transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-black uppercase mb-6">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>

          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 mb-6 text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-100 border-2 border-black focus:outline-none focus:bg-white text-sm font-bold"
                  placeholder="hello@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-neutral-100 border-2 border-black focus:outline-none focus:bg-white text-sm font-bold"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-[#D4FF00] hover:text-black transition-colors"
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-0.5 bg-neutral-200"></div>
            <span className="text-xs font-black uppercase text-neutral-500 tracking-widest">OR</span>
            <div className="flex-1 h-0.5 bg-neutral-200"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full mt-6 bg-white border-2 border-black py-4 font-black uppercase tracking-widest hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
          >
            Google Sign In
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-black underline"
            >
              {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
