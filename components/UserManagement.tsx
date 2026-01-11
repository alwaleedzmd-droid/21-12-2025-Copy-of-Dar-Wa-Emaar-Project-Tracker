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
  'ADMIN': { label: 'مدير نظام', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
  'PR_MANAGER': { label: 'مدير علاقات عامة', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
  'CONVEYANCE': { label: 'مسؤول إفراغات', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
  'TECHNICAL': { label: 'مهندس فني', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  'FINANCE': { label: 'مالية', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' },
  'PR_OFFICER': { label: 'موظف علاقات', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
  'DEEDS_OFFICER': { label: 'موظف صكوك', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' }
};

const UserManagement: React.FC = () => {
  const { currentUser, refreshData, logActivity } = useData();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // فورم المستخدم الجديد / تعديل
  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    email: '',
    role: 'PR_OFFICER' as UserRole,
    department: '',
    password: '' // تستخدم فقط في حالة الإضافة الجديدة (للتوضيح)
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

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setUserForm({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: (user.role as UserRole) || 'PR_OFFICER',
      department: user.department || '',
      password: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setUserForm({
      id: '',
      name: '',
      email: '',
      role: 'PR_OFFICER',
      department: '',
      password: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (selectedUser) {
        // تحديث الصلاحيات والبيانات
        const { error } = await supabase
          .from('profiles')
          .update({
            name: userForm.name,
            role: userForm.role,
            department: userForm.department
          })
          .eq('id', selectedUser.id);
        
        if (error) throw error;
        logActivity?.('تحديث صلاحيات مستخدم', `${userForm.name} -> ${ROLE_CONFIG[userForm.role].label}`, 'text-blue-500');
      } else {
        /**
         * ملاحظة: إنشاء مستخدم Auth حقيقي يحتاج إلى Supabase Admin API (Service Role)
         * هنا نقوم بإضافة السجل في جدول profiles. في النظام المتكامل، يتم ربط هذا بمعالج 
         * التسجيل في صفحة الدخول أو عبر لوحة تحكم سوبابيس الرئيسية.
         */
        const { error } = await supabase
          .from('profiles')
          .insert([{
            name: userForm.name,
            email: userForm.email,
            role: userForm.role,
            department: userForm.department
          }]);
        
        if (error) throw error;
        logActivity?.('إضافة مستخدم للنظام', userForm.name, 'text-green-500');
      }

      await fetchProfiles();
      await refreshData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert("حدث خطأ أثناء حفظ البيانات: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser?.id) return alert("لا يمكنك حذف حسابك الحالي.");
    if (!window.confirm(`هل أنت متأكد من حذف حساب "${name}" نهائياً من سجلات النظام؟`)) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      logActivity?.('حذف مستخدم', name, 'text-orange-500');
      fetchProfiles();
    } catch (err: any) {
      alert("فشل الحذف: " + err.message);
    }
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500 font-cairo">
        <div className="bg-red-50 p-6 rounded-3xl text-red-500 mb-6 border border-red-100 shadow-sm">
          <ShieldAlert size={64} />
        </div>
        <h2 className="text-3xl font-black text-[#1B2B48] mb-4">وصول غير مصرح</h2>
        <p className="text-gray-500 font-bold max-w-md">عذراً، هذه الصفحة مخصصة حصرياً لمديري النظام.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-50 text-[#1B2B48] rounded-2xl shadow-sm">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1B2B48]">إدارة المستخدمين والصلاحيات</h2>
            <p className="text-gray-400 text-[10px] font-black mt-1 uppercase tracking-widest">توزيع الأدوار وإدارة فريق عمل دار وإعمار</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-[#E95D22] text-white rounded-2xl font-black text-sm hover:brightness-110 shadow-xl shadow-orange-100 active:scale-95 transition-all w-full md:w-auto"
        >
          <UserPlus size={18} /> إضافة عضو جديد
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[30px] border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">إجمالي المستخدمين</p>
             <h3 className="text-2xl font-black text-[#1B2B48]">{profiles.length}</h3>
           </div>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-[30px] border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">مديرو النظام</p>
             <h3 className="text-2xl font-black text-[#1B2B48]">{profiles.filter(p => p.role === 'ADMIN').length}</h3>
           </div>
           <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><ShieldCheck size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-[30px] border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">فريق الإفراغ</p>
             <h3 className="text-2xl font-black text-[#1B2B48]">{profiles.filter(p => p.role === 'CONVEYANCE' || p.role === 'DEEDS_OFFICER').length}</h3>
           </div>
           <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><FileText size={20}/></div>
        </div>
        <div className="bg-white p-5 rounded-[30px] border border-gray-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">المهندسين الفنيين</p>
             <h3 className="text-2xl font-black text-[#1B2B48]">{profiles.filter(p => p.role === 'TECHNICAL').length}</h3>
           </div>
           <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Zap size={20}/></div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text" 
            placeholder="البحث بالاسم، البريد، أو القسم..." 
            className="w-full pr-12 pl-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-[#1B2B48] focus:bg-white transition-all outline-none font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th className="p-6">المستخدم</th>
                <th className="p-6">الصلاحية / الدور</th>
                <th className="p-6">القسم</th>
                <th className="p-6 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-gray-300"/></td></tr>
              ) : filteredProfiles.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-gray-300 font-bold italic">لا توجد بيانات مستخدمين</td></tr>
              ) : (
                filteredProfiles.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-blue-50 text-[#1B2B48] rounded-2xl flex items-center justify-center font-black text-lg border border-blue-100">
                          {user.name?.[0]}
                        </div>
                        <div>
                          <p className="font-black text-[#1B2B48] text-sm">{user.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Mail size={10} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border ${
                        ROLE_CONFIG[user.role as UserRole]?.bg || 'bg-gray-50'
                      } ${ROLE_CONFIG[user.role as UserRole]?.color || 'text-gray-500'}`}>
                        <Shield size={10} />
                        {ROLE_CONFIG[user.role as UserRole]?.label || user.role}
                      </span>
                    </td>
                    <td className="p-6">
                       <div className="flex items-center gap-1.5 text-gray-500 font-bold text-xs">
                          <Building2 size={12} className="text-gray-300" />
                          {user.department || 'غير محدد'}
                       </div>
                    </td>
                    <td className="p-6 text-left">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm"
                          title="تعديل"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                        <ChevronLeft size={16} className="text-gray-200" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedUser ? "تعديل صلاحيات المستخدم" : "إضافة مستخدم جديد للنظام"}
      >
        <form onSubmit={handleSave} className="space-y-6 text-right font-cairo">
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-2 flex items-center gap-3">
             {/* Use Info icon from lucide-react */}
             <Info className="text-[#E95D22]" size={20} />
             <p className="text-[10px] font-black text-[#1B2B48] leading-relaxed">
               {selectedUser ? "تعديل الصلاحيات سيؤثر على ما يمكن للمستخدم رؤيته في النظام فور الحفظ." : "عند إضافة مستخدم جديد، يجب التأكد من وجود بريد إلكتروني مطابق في حسابات Supabase Auth ليتمكن من الدخول."}
             </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-black mr-1">الاسم الكامل</label>
              <input 
                required
                className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22] transition-all"
                value={userForm.name}
                onChange={e => setUserForm({...userForm, name: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-black mr-1">البريد الإلكتروني</label>
              <input 
                required
                type="email"
                disabled={!!selectedUser}
                className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22] transition-all ${selectedUser ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50'}`}
                value={userForm.email}
                onChange={e => setUserForm({...userForm, email: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-black mr-1">صلاحية النظام</label>
                <select 
                  className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22] cursor-pointer"
                  value={userForm.role}
                  onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
                >
                  {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                    <option key={role} value={role}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-black mr-1">القسم / الإدارة</label>
                <input 
                  className="w-full p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]"
                  value={userForm.department}
                  placeholder="مثال: الإفراغات، الهندسة..."
                  onChange={e => setUserForm({...userForm, department: e.target.value})}
                />
              </div>
            </div>

            {!selectedUser && (
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-black mr-1">كلمة المرور المؤقتة</label>
                <div className="relative">
                  <Key size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input 
                    type="password"
                    placeholder="••••••••"
                    className="w-full p-4 pr-12 bg-gray-50 rounded-2xl border outline-none font-bold text-sm focus:border-[#E95D22]"
                    value={userForm.password}
                    onChange={e => setUserForm({...userForm, password: e.target.value})}
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isSaving ? <Loader2 className="animate-spin" size={24} /> : (selectedUser ? <CheckCircle2 size={24}/> : <UserPlus size={24}/>)}
            {selectedUser ? "تحديث البيانات" : "إنشاء الحساب فوراً"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;