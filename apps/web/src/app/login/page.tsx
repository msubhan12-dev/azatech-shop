'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    login(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">A</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Azatech Shop</h1>
            <p className="text-blue-100">Sistem Manajemen Order Profesional</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Masuk ke Akun Anda</h2>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg transition-all focus:outline-none ${
                      errors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    } focus:ring-4`}
                    placeholder="admin@azatech.id"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1" role="alert">
                    <span>⚠</span> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register('password')}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg transition-all focus:outline-none ${
                      errors.password
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                    } focus:ring-4`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1" role="alert">
                    <span>⚠</span> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg mt-6"
              >
                {isLoggingIn ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Memproses...
                  </span>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>ℹ</span> Demo Akun
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <p className="font-semibold text-gray-800">👨‍💼 Admin</p>
                  <p className="font-mono text-xs text-gray-600 ml-1">admin@azatech.id</p>
                  <p className="font-mono text-xs text-gray-600 ml-1">Password123!</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">👩‍💼 Kasir</p>
                  <p className="font-mono text-xs text-gray-600 ml-1">cashier@azatech.id</p>
                  <p className="font-mono text-xs text-gray-600 ml-1">Password123!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          © 2026 Azatech Shop. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
