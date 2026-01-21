
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Shield, 
  Trash2, Edit3, Mail, CheckCircle2, 
  AlertCircle, Loader2, Filter, Key, 
  Building2, ChevronLeft, MoreVertical,
  Calendar, ShieldCheck, ShieldAlert, FileText, Zap, Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, UserRole } from '../types';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string }> = {
  'ADMIN': { label: 'مدير نظام', color: 'text-purple-700', bg: 'bg-purple-50' },
  'PR_MANAGER': { label: 'مدير علاقات عامة', color: 'text-blue-700', bg: 'bg-blue-50' },
  'TECHNICAL': { label: 'القسم الفني', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  'CONVEYANCE': { label: 'مسؤول إفراغات CX', color: 'text-orange-700', bg: 'bg-orange-50' }
};

const UserManagement: React.FC = () => {
  const { currentUser, refreshData, logActivity } = useData();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'PR_MANAGER' as UserRole,
    department: '',
    password: '' 
  });

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error("Error fetching profiles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  const handleOpenAdd = () => {
    setUserForm({
      id: '',
      name: '',
      email: '',
      role: 'PR_MANAGER',
      department: '',
      password: ''
    });
    setIsModalOpen(true);
  };

 const handleOpenEdit = (user: any) => {
    setUserForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      password: ''
    });
    setIsModalOpen(true);
  };
    });
    setIsModalOpen(true);
  };
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      logActivity?.('حذف مستخدم', profiles.find(p => p.id === id)?.name || 'مستخدم', 'text-orange-500');
      fetchProfiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (userForm.id) {
        const { error } = await supabase.from('profiles').update({
          name: userForm.name,
          role: userForm.role,
          department: userForm.department
        }).eq('id', userForm.id);
        if (error) throw error;
        logActivity?.('تحديث بيانات مستخدم', userForm.name, 'text-blue-500');
      } else {
        if (!userForm.password || userForm.password.length < 6) {
          throw new Error("كلمة المرور يجب أن لا تقل عن 6 خانات");
        }

       // التعديل يبدأ من السطر 121
const { data, error } = await supabase.rpc('create_new_user', {
  email: userForm.email,
  password: userForm.password,
  full_name: userForm.name,
  user_role: userForm.role,
  user_dept: userForm.department // أضف هذا السطر هنا لربط القسم
});
        if (error) throw error;
        logActivity?.('إضافة مستخدم جديد', userForm.name, 'text-green-500');
      }
      
      setIsModalOpen(false);
      await fetchProfiles();
      await refreshData();
    } catch (err: any) {
      console.error("Submission error:", err);
      alert("فشل العملية: " + (err.message || "خطأ غير معروف"));
    } finally {
      setIsSaving(false);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 font-cairo" dir="rtl">
        <div className="p-6 bg-red-50 text-red-500 rounded-full">
           <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-black text-[#1B2B48]">صلاحية محدودة</h2>
        <p className="text-gray-400 font-bold">عذراً، هذه الصفحة مخصصة لمديري النظام فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl shadow-sm">
            <Users size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1B2B48]">إدارة أعضاء النظام</h2>
            <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">توزيع الأدوار والصلاحيات لفريق العمل</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-[#E95D22] text-white rounded-2xl font-black text-sm hover:brightness-110 shadow-xl transition-all active:scale-95"
        >
          <UserPlus size={20} /> إضافة عضو جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو البريد الإلكتروني..." 
            className="w-full pr-12 pl-4 py-3.5 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th className="p-6">العضو</th>
                <th className="p-6">الصلاحية</th>
                <th className="p-6">القسم</th>
                <th className="p-6">تاريخ الانضمام</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-300"/></td></tr>
              ) : filteredProfiles.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-bold italic">لا توجد نتائج مطابقة</td></tr>
              ) : (
                filteredProfiles.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 text-[#1B2B48] rounded-2xl flex items-center justify-center font-black text-xl border border-white shadow-sm">
                          {user.name?.[0]}
                        </div>
                        <div>
                          <p className="font-black text-[#1B2B48] text-sm">{user.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black ${ROLE_CONFIG[user.role as UserRole]?.bg} ${ROLE_CONFIG[user.role as UserRole]?.color}`}>
                        <Shield size={12} />
                        {ROLE_CONFIG[user.role as UserRole]?.label || user.role}
                      </span>
                    </td>
                    <td className="p-6">
                       <p className="text-xs font-bold text-gray-500">{user.department || '-'}</p>
                    </td>
                    <td className="p-6">
                       <p className="text-[10px] font-bold text-gray-400" dir="ltr">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '-'}
                       </p>
                    </td>
                    <td className="p-6 text-left">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit3 size={18}/></button>
                        <button onClick={() => handleDelete(user.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="حذف"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={userForm.id ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-1">الاسم الكامل</label>
            <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 block mb-1">البريد الإلكتروني</label>
            <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} disabled={!!userForm.id} required />
          </div>
          
          {!userForm.id && (
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1">كلمة المرور (6 خانات على الأقل)</label>
              <input 
                type="password" 
                className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" 
                value={userForm.password} 
                onChange={e => setUserForm({...userForm, password: e.target.value})} 
                required={!userForm.id} 
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-400 block mb-1">الرتبة والصلاحيات</label>
              <select 
                required
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 font-bold text-sm outline-none shadow-sm cursor-pointer"
                value={userForm.role}
                onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
              >
                <option value="PR_MANAGER">مدير علاقات عامة (إشراف كامل)</option>
                <option value="TECHNICAL">موظف القسم الفني (إدارة أعمال المشروع)</option>
                <option value="CONVEYANCE">مسؤول إفراغات CX (إدارة سجل الإفراغ)</option>
                {currentUser?.role === 'ADMIN' && <option value="ADMIN">مدير نظام</option>}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-400 block mb-1">القسم</label>
              <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})} />
            </div>
          </div>
          
          <button type="submit" disabled={isSaving} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-black mt-4 shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : (userForm.id ? 'تحديث البيانات' : 'حفظ البيانات وإنشاء الحساب')}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
