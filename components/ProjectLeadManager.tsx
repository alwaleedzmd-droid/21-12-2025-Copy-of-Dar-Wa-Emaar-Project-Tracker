/**
 * ProjectLeadManager - واجهة ترميز المسؤول على المشروع
 * ============================================================================
 * تتيح للمدير:
 *  - عرض المسؤول الحالي المرمّز
 *  - تغيير المسؤول بضغطة زر (مع نقل الطلبات المعلقة)
 *  - إزالة الترميز (العودة للتوجيه العادي)
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import { UserCheck, UserX, ChevronDown, ArrowLeftRight, Shield, Loader2 } from 'lucide-react';
import { ProjectSummary, User } from '../types';
import { assignProjectLead, removeProjectLead, getProjectLead } from '../services/projectLeadService';

interface ProjectLeadManagerProps {
  project: ProjectSummary;
  appUsers: User[];
  currentUser: User | null;
  onRefresh: () => void;
}

const ProjectLeadManager: React.FC<ProjectLeadManagerProps> = ({
  project,
  appUsers,
  currentUser,
  onRefresh
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<User | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const currentLead = getProjectLead(project);

  // قائمة الموظفين المتاحين (استبعاد المرمّز الحالي)
  const availableUsers = useMemo(() => {
    return appUsers
      .filter(u => u.id !== currentLead?.id && u.name && u.email)
      .sort((a, b) => {
        // ترتيب: PR_MANAGER أولاً، ثم TECHNICAL، ثم البقية
        const roleOrder: Record<string, number> = { PR_MANAGER: 0, TECHNICAL: 1, CONVEYANCE: 2, ADMIN: 3 };
        return (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
      });
  }, [appUsers, currentLead?.id]);

  const roleLabels: Record<string, string> = {
    ADMIN: 'مدير',
    PR_MANAGER: 'علاقات عامة',
    TECHNICAL: 'فني',
    CONVEYANCE: 'إفراغات'
  };

  const handleAssign = async (user: User) => {
    setShowConfirm(null);
    setIsLoading(true);
    setResult(null);

    const res = await assignProjectLead(project.id, user);

    if (res.success) {
      const transferMsg = res.transferredCount && res.transferredCount > 0
        ? ` | تم نقل ${res.transferredCount} طلبات معلقة`
        : '';
      setResult({ type: 'success', message: `✅ تم ترميز "${user.name}" كمسؤول${transferMsg}` });
      onRefresh();
    } else {
      setResult({ type: 'error', message: `❌ فشل الترميز: ${res.error}` });
    }

    setIsLoading(false);
    setIsDropdownOpen(false);
    setTimeout(() => setResult(null), 5000);
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setResult(null);

    const res = await removeProjectLead(project.id);

    if (res.success) {
      setResult({ type: 'success', message: '✅ تم إزالة الترميز - يعود التوجيه العادي' });
      onRefresh();
    } else {
      setResult({ type: 'error', message: `❌ فشل الإزالة: ${res.error}` });
    }

    setIsLoading(false);
    setTimeout(() => setResult(null), 5000);
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-white rounded-[25px] border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 relative overflow-visible" dir="rtl">
      {/* الشريط العلوي */}
      <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 rounded-r-[25px]" />

      <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
          <Shield size={22} />
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-800">ترميز المسؤول</h3>
          <p className="text-[10px] text-gray-400 font-bold">توجيه جميع الطلبات للموظف المُرمّز تلقائياً</p>
        </div>
      </div>

      {/* المسؤول الحالي */}
      {currentLead ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black text-sm">
              {currentLead.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-sm">{currentLead.name}</p>
              <p className="text-[10px] text-emerald-600 font-mono" dir="ltr">{currentLead.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-emerald-200 text-emerald-800 px-2 py-1 rounded-full font-black">مُرمّز ✓</span>
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all active:scale-95 disabled:opacity-50"
              title="إزالة الترميز"
            >
              <UserX size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-4 mb-4 text-center">
          <p className="text-gray-400 text-sm font-bold">لا يوجد موظف مرمّز</p>
          <p className="text-[10px] text-gray-300">التوجيه يتم عبر مصفوفة الصلاحيات العامة</p>
        </div>
      )}

      {/* زر تعيين/تغيير */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#1B2B48] text-white py-3 px-4 rounded-2xl font-bold text-sm hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              {currentLead ? <ArrowLeftRight size={16} /> : <UserCheck size={16} />}
              {currentLead ? 'تغيير المسؤول' : 'تعيين مسؤول مرمّز'}
              <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {/* قائمة الموظفين */}
        {isDropdownOpen && (
          <div className="absolute top-full mt-2 right-0 left-0 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-[300px] overflow-y-auto">
            {availableUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">لا يوجد موظفين متاحين</div>
            ) : (
              availableUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setShowConfirm(user)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-0 text-right"
                >
                  <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate" dir="ltr">{user.email}</p>
                  </div>
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold shrink-0">
                    {roleLabels[user.role] || user.role}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* نتيجة العملية */}
      {result && (
        <div className={`mt-3 px-4 py-3 rounded-xl text-sm font-bold ${
          result.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {result.message}
        </div>
      )}

      {/* مودال تأكيد */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setShowConfirm(null)}>
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl font-cairo"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ArrowLeftRight size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-gray-800">تأكيد ترميز المسؤول</h3>
              <p className="text-sm text-gray-500 mt-2">
                سيتم تعيين <strong className="text-emerald-600">{showConfirm.name}</strong> كمسؤول مرمّز على هذا المشروع
              </p>
              {currentLead && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl mt-3">
                  ⚠️ سيتم نقل جميع الطلبات المعلقة من "{currentLead.name}" إلى "{showConfirm.name}" تلقائياً
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleAssign(showConfirm)}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95"
              >
                ✓ تأكيد الترميز
              </button>
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-300 transition-all active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* إغلاق القائمة عند النقر خارجها */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
      )}
    </div>
  );
};

export default ProjectLeadManager;
