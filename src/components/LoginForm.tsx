import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface LoginFormProps {
  onLogin: (password: string) => void;
  error?: string;
}

export function LoginForm({ onLogin, error }: LoginFormProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="w-full max-w-md mx-auto mt-20">
      <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-black flex items-center justify-center rounded-none mb-4">
            <Lock size={32} className="text-[#D4FF00]" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-black">
            Admin Access
          </h2>
          <p className="text-neutral-500 text-xs font-black uppercase tracking-widest mt-2">
            Restricted System Area
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-neutral-500 mb-2 uppercase tracking-widest">
              Passcode
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border-2 border-black focus:border-[#D4FF00] focus:ring-2 focus:ring-[#D4FF00] text-black px-4 py-3 outline-none transition-colors uppercase font-black text-sm text-center tracking-widest" 
              placeholder="ENTER PASSCODE" 
            />
            {error && <p className="text-red-500 text-xs font-black uppercase tracking-widest mt-2 text-center">{error}</p>}
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#D4FF00] hover:bg-black hover:text-white text-black font-black uppercase tracking-widest py-4 border-2 border-black transition-colors"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
