import React, { useState } from 'react';
import { UserRole } from '../types';
import { AudioWaveform, Lock, ArrowRight, UserCircle2, ShieldCheck, Mail } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, role: UserRole) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const lowerEmail = email.toLowerCase().trim();

    // 1. Domain Validation
    if (!lowerEmail.endsWith('@vibedistro.com')) {
      setError('Acesso restrito. Utilize um e-mail @vibedistro.com');
      return;
    }

    // 2. Credential Verification
    
    // ADMINS - Acesso Administrativo
    const admins = ['clawber.brasil@vibedistro.com', 'cassio.lemos@vibedistro.com'];
    if (admins.includes(lowerEmail)) {
      if (password === 'admin') {
        onLogin(lowerEmail, 'ADMIN');
        return;
      } else {
        setError('Senha incorreta para administrador.');
        return;
      }
    }

    // COLLABORATORS - Acesso de Colaboradores (incluindo Teste)
    const collaborators = ['kevinn.alli@vibedistro.com', 'teste@vibedistro.com'];
    if (collaborators.includes(lowerEmail)) {
      // Default password for collaborators
      if (password === 'vibe') {
        onLogin(lowerEmail, 'USER');
        return;
      } else {
        setError('Senha incorreta.');
        return;
      }
    }

    // If email allows vibedistro.com but user is not in the hardcoded list
    setError('Usuário não cadastrado no sistema.');
  };

  // Quick Login Handlers
  const handleQuickLoginCollaborator = () => {
    onLogin('teste@vibedistro.com', 'USER');
  };

  const handleQuickLoginAdmin = () => {
    onLogin('clawber.brasil@vibedistro.com', 'ADMIN');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-inter relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-fadeIn">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-8 text-center border-b border-slate-800">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/20 mx-auto mb-4">
            <AudioWaveform size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
             Vibe <span className="text-red-500">Distro</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 tracking-wide">Studio Manager Access</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@vibedistro.com"
                  className="pl-10 block w-full bg-slate-950 border border-slate-700 rounded-lg py-3 text-white placeholder-slate-600 focus:ring-red-500 focus:border-red-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 block w-full bg-slate-950 border border-slate-700 rounded-lg py-3 text-white placeholder-slate-600 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm flex items-center justify-center text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-red-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
            >
              Entrar <ArrowRight size={18} />
            </button>
          </form>

          {/* Role Info / Quick Access */}
          <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={handleQuickLoginCollaborator}
              className="text-center p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition-all group cursor-pointer"
            >
              <div className="flex justify-center mb-2 text-slate-400 group-hover:text-white transition-colors"><UserCircle2 size={20} /></div>
              <p className="text-[10px] text-slate-500 group-hover:text-slate-300 uppercase font-bold transition-colors">Colaboradores</p>
            </button>
            <button 
              type="button"
              onClick={handleQuickLoginAdmin}
              className="text-center p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-red-900/50 hover:bg-slate-900 transition-all group cursor-pointer"
            >
              <div className="flex justify-center mb-2 text-red-900 group-hover:text-red-600 transition-colors"><ShieldCheck size={20} /></div>
              <p className="text-[10px] text-slate-500 group-hover:text-red-400 uppercase font-bold transition-colors">Administradores</p>
            </button>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-slate-600 text-xs">
        &copy; {new Date().getFullYear()} Vibe Distro. Acesso restrito a funcionários.
      </p>
    </div>
  );
};

export default LoginScreen;