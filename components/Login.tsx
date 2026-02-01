import React, { useState } from 'react';
import { ShoppingBagIcon } from './Icons';
import { supabase } from '../supabase';

interface LoginProps {
  theme?: 'light' | 'dark';
}

const Login: React.FC<LoginProps> = ({ theme = 'light' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        if (!name || !email || !password || !confirmPassword) {
          setError('Por favor, preencha todos os campos.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('As senhas não coincidem!');
          setIsLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });

        if (signUpError) {
          setError(`Erro no cadastro: ${signUpError.message}`);
        } else {
          setSuccessMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
        }
      } else {
        if (email && password) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (signInError) {
            setError(signInError.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : signInError.message);
          }
        } else {
          setError('Por favor, preencha todos os campos.');
        }
      }
    } catch (err: any) {
      setError(`Erro inesperado: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border transition-all duration-300 ${isDark ? 'bg-gray-800 border-gray-700 shadow-black' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col items-center mb-8">
          <div className={`p-5 rounded-[1.25rem] mb-4 ${isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600'}`}>
            <ShoppingBagIcon className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-center">Lista Rápida</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">
            {isRegistering ? 'Crie sua conta gratuitamente' : 'Faça login para continuar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border font-semibold focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                placeholder="Seu nome"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border font-semibold focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border font-semibold focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
              placeholder="••••••••"
              required
            />
          </div>

          {isRegistering && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border font-semibold focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 mt-2 rounded-xl font-bold text-white shadow-lg shadow-green-200/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-green-600 hover:bg-green-700 shadow-none' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isLoading ? 'Aguarde...' : (isRegistering ? 'Cadastrar agora' : 'Entrar')}
          </button>

          {error && (
            <div className={`mt-4 p-3 rounded-xl border text-sm font-bold text-center animate-in fade-in zoom-in duration-300 ${isDark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-100 text-red-600'}`}>
              {error}
            </div>
          )}
        </form>


        <p className="text-center text-xs text-gray-400 mt-8">
          {isRegistering ? (
            <>
              Já tem uma conta? <button onClick={() => setIsRegistering(false)} className="text-green-500 font-bold hover:underline">Faça Login</button>
            </>
          ) : (
            <>
              Não tem uma conta? <button onClick={() => setIsRegistering(true)} className="text-green-500 font-bold hover:underline">Cadastre-se</button>
            </>
          )}
        </p>
      </div>

      {/* Success Modal */}
      {successMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300 ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600'}`}>
              <ShoppingBagIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Sucesso!</h3>
            <p className="text-sm text-gray-400 text-center mb-8">{successMessage}</p>

            <button
              onClick={() => {
                setSuccessMessage(null);
                setIsRegistering(false);
              }}
              className="w-full py-4 font-bold text-white bg-green-500 rounded-2xl shadow-lg shadow-green-200/50 transition-all active:scale-95"
            >
              Ok, entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
