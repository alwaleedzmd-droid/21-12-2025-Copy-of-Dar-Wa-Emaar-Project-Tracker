import React, { useState } from 'react';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { DAR_LOGO } from '../constants';
import Modal from './Modal';

const LoginPage: React.FC = () => {
  const { login, setTempPassword } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);
  const [tempPassword, setTempPasswordInput] = useState('');
  const [tempConfirm, setTempConfirm] = useState('');
  const [tempError, setTempError] = useState('');
  const [tempLoading, setTempLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.toLowerCase().trim(), password);
      // لا حاجة لإعادة تحميل الصفحة - React يعيد الرسم تلقائياً عند تغيير currentUser
    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.code === 'TEMP_PASSWORD_REQUIRED') {
        setIsTempModalOpen(true);
        setTempError('');
      } else {
        setError(err.message || 'فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetTempPassword = async () => {
    setTempError('');
    if (!tempPassword || !tempConfirm) {
      setTempError('يرجى تعبئة جميع الحقول');
      return;
    }
    if (tempPassword.length < 6) {
      setTempError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (tempPassword !== tempConfirm) {
      setTempError('كلمتا المرور غير متطابقتين');
      return;
    }

    setTempLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      await setTempPassword(normalizedEmail, tempPassword);
      await login(normalizedEmail, tempPassword);
      setIsTempModalOpen(false);
      setTempPasswordInput('');
      setTempConfirm('');
    } catch (err: any) {
      setTempError(err.message || 'فشل حفظ كلمة المرور المؤقتة');
    } finally {
      setTempLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#E95D22]/10 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-gray-100/80 blur-3xl" />
      <div className="absolute -bottom-32 -right-20 w-[360px] h-[360px] rounded-full bg-[#E95D22]/8 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(233,93,34,0.03),_white_70%)]" />
      <div className="relative bg-white rounded-[28px] shadow-2xl p-8 md:p-12 max-w-md w-full border border-gray-200">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
            <img src={DAR_LOGO} alt="Dar Wa Emaar" className="h-14 object-contain" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black text-[#1B2B48] text-center mb-2">
          نظام متابعة المشاريع
        </h1>
        <p className="text-gray-600 text-center mb-8 font-bold">
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
            className="w-full bg-[#E95D22] text-white py-4 rounded-xl font-black text-lg shadow-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      <Modal isOpen={isTempModalOpen} onClose={() => setIsTempModalOpen(false)} title="إعداد كلمة مرور مؤقتة">
        <div className="space-y-4 pt-2" dir="rtl">
          <p className="text-sm text-gray-500 font-bold">
            لم يتم إعداد كلمة مرور لهذا الحساب. الرجاء إنشاء كلمة مرور مؤقتة.
          </p>
          {tempError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm font-bold">{tempError}</p>
            </div>
          )}
          <input
            type="password"
            value={tempPassword}
            onChange={(e) => setTempPasswordInput(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1B2B48] font-bold"
            placeholder="كلمة المرور المؤقتة"
          />
          <input
            type="password"
            value={tempConfirm}
            onChange={(e) => setTempConfirm(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1B2B48] font-bold"
            placeholder="تأكيد كلمة المرور"
          />
          <button
            onClick={handleSetTempPassword}
            disabled={tempLoading}
            className="w-full bg-[#1B2B48] text-white py-3 rounded-xl font-black shadow-lg disabled:opacity-50"
          >
            {tempLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'حفظ والمتابعة'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default LoginPage;
