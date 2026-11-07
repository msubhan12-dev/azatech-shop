'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    setLoginError('');
    try {
      login(data);
    } catch (error) {
      setLoginError('Login gagal. Silakan coba lagi.');
    }
  };

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-900 to-slate-950 px-4 py-8 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 delay-2000"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm border border-white/20">
            {/* Header - Premium Design */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-16 text-center relative overflow-hidden">
              {/* Logo */}
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl font-black bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    A
                  </span>
                </div>
                <h1 className="text-4xl font-black text-white mb-2">Azatech Shop</h1>
                <p className="text-blue-100 font-medium text-lg">Sistem Manajemen Order Profesional</p>
              </div>
            </div>

            {/* Form Section */}
            <div className="px-8 py-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Masuk ke Akun Anda</h2>
              <p className="text-center text-gray-500 text-sm mb-8">Akses dashboard dan kelola order dengan mudah</p>

              {/* Global Error */}
              {loginError && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3 animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-semibold text-sm">Login Gagal</p>
                    <p className="text-red-700 text-xs mt-1">{loginError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-800 mb-2">
                    📧 Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register('email')}
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl transition-all focus:outline-none font-medium ${
                        errors.email
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-200'
                          : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                      placeholder="admin@azatech.id"
                    />
                  </div>
                  {errors.email && (
                    <div className="mt-2 flex items-center gap-2 text-red-600 text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email.message}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-gray-800 mb-2">
                    🔐 Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      {...register('password')}
                      className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl transition-all focus:outline-none font-medium ${
                        errors.password
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-200'
                          : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? '👁' : '👁‍🗨'}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="mt-2 flex items-center gap-2 text-red-600 text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password.message}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all duration-200 transform hover:scale-[1.02] active:scale-95 shadow-lg mt-8 flex items-center justify-center gap-2 text-lg"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="animate-spin inline-block">⚙️</span>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Masuk</span>
                    </>
                  )}
                </button>
              </form>

              {/* Demo Credentials - Enhanced */}
              <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl border-2 border-blue-100 shadow-sm">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="text-lg">💡</span> Demo Credentials
                </p>

                <div className="space-y-4">
                  {/* Admin */}
                  <div className="bg-white rounded-lg p-4 border border-blue-100 hover:shadow-md transition-shadow">
                    <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <span>👨‍💼</span> Admin
                    </p>
                    <div className="space-y-1 ml-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-600">Email:</span>
                        <code className="text-xs bg-gray-100 px-3 py-1 rounded font-mono text-gray-800">
                          admin@azatech.id
                        </code>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-600">Password:</span>
                        <code className="text-xs bg-gray-100 px-3 py-1 rounded font-mono text-gray-800">
                          Password123!
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Cashier */}
                  <div className="bg-white rounded-lg p-4 border border-indigo-100 hover:shadow-md transition-shadow">
                    <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <span>👩‍💼</span> Cashier
                    </p>
                    <div className="space-y-1 ml-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-600">Email:</span>
                        <code className="text-xs bg-gray-100 px-3 py-1 rounded font-mono text-gray-800">
                          cashier@azatech.id
                        </code>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-600">Password:</span>
                        <code className="text-xs bg-gray-100 px-3 py-1 rounded font-mono text-gray-800">
                          Password123!
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-blue-200 font-medium">🔒 Sistem Keamanan Terenkripsi</p>
            <p className="text-xs text-gray-400">© 2026 Azatech Shop. Semua hak dilindungi.</p>
          </div>
        </div>
      </div>
    </>
  );
}
