import React, { useState } from 'react';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { DAR_LOGO } from '../constants';

const LoginPage: React.FC = () => {
  const { login } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.toLowerCase().trim(), password);
      // لا حاجة لإعادة تحميل الصفحة - React يعيد الرسم تلقائياً عند تغيير currentUser
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B2B48] to-[#2c4362] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={DAR_LOGO} alt="Dar Wa Emaar" className="h-20 object-contain" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black text-[#1B2B48] text-center mb-2">
          نظام متابعة المشاريع
        </h1>
        <p className="text-gray-500 text-center mb-8 font-bold">
          دار وإعمار للتطوير العقاري
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1B2B48] font-bold"
              placeholder="example@darwaemaar.com"
              required
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1B2B48] font-bold"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B2B48] text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-[#2c4362] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                جارٍ تسجيل الدخول...
              </>
            ) : (
              <>
                <LogIn size={20} />
                تسجيل الدخول
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8 font-bold">
          © 2026 دار وإعمار للتطوير العقاري
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
