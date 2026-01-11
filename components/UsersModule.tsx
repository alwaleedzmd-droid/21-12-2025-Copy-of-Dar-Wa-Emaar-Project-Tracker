
import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, Search, Mail, Shield, 
  Trash2, Edit3, Briefcase, ChevronLeft, 
  UserPlus, MoreHorizontal, X, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, UserRole } from '../types';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';

// Fix: Added missing 'GUEST' property to satisfy Record<UserRole, string>
const ROLE_LABELS: Record<UserRole, string> = {
  'ADMIN': 'مدير نظام',
  'PR_MANAGER': 'مدير علاقات عامة',
  'CONVEYANCE': 'مسؤول إفراغات',
  'TECHNICAL': 'مهندس فني',
  'FINANCE': 'مالية',
  'PR_OFFICER': 'موظف علاقات',
  'DEEDS_OFFICER': 'موظف صكوك',
  'GUEST': 'زائر'
};

const UsersModule: React.FC = () => {
  const { appUsers, refreshData, currentUser, logActivity } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // --- Filtering ---
  const filteredUsers = useMemo(() => {
    return appUsers.filter(u => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [appUsers, searchTerm]);

  // --- Handlers ---
  const handleOpenAdd = () => {
    setSelectedUser({ name: '', email: '', role: 'PR_OFFICER', department: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟")) return;
    
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      
      logActivity('حذف مستخدم', appUsers.find(u => u.id === id)?.name || 'مستخدم غير معروف', 'text-orange-500');
      await refreshData();
    } catch (err: any) {
      alert("فشل الحذف: " + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.email || !selectedUser?.name) return;
    
    setFormLoading(true);
    try {
      const isNew = !selectedUser.id;
      
      if (isNew) {
        // Note: Creating actual Auth users requires Admin API, 
        // here we insert into the profiles table as per UI management logic.
        const { error } = await supabase.from('profiles').insert([{
          name: selectedUser.name,
          email: selectedUser.email,
          role: selectedUser.role,
          department: selectedUser.department
        }]);
        if (error) throw error;
        logActivity('إضافة مستخدم جديد', selectedUser.name!, 'text-green-500');
      } else {
        const { error } = await supabase.from('profiles').update({
          name: selectedUser.name,
          role: selectedUser.role,
          department: selectedUser.department
        }).eq('id', selectedUser.id);
        if (error) throw error;
        logActivity('تعديل بيانات مستخدم', selectedUser.name!, 'text-blue-500');
      }

      await refreshData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert("خطأ في حفظ البيانات: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-6 bg-red-50 text-red-500 rounded-full">
           <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-black text-[#1B2B48]">صلاحية محدودة</h2>
        <p className="text-gray-400 font-bold">عذراً، هذه الصفحة مخصصة لمديري النظام فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1B2B48]">إدارة فريق العمل</h2>
            <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">إدارة الصلاحيات والمستخدمين في النظام</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-[#E95D22] text-white rounded-2xl font-black text-sm hover:brightness-110 shadow-xl shadow-orange-100 active:scale-95 transition-all w-full md:w-auto"
        >
          <UserPlus size={18} /> إضافة عضو جديد
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <input 
            type="text" 
            placeholder="بحث بالاسم، البريد، أو القسم..." 
            className="w-full pr-12 pl-4 py-3.5 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-[#E95D22]/10 transition-all"
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
                <th className="p-6">العضو</th>
                <th className="p-6">الصلاحية</th>
                <th className="p-6">القسم</th>
                <th className="p-6 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-gray-300 font-bold italic">
                    لا يوجد أعضاء مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg border border-blue-100">
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
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border ${
                        user.role === 'ADMIN' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        <Shield size={10} />
                        {ROLE_LABELS[user.role as UserRole] || user.role}
                      </span>
                    </td>
                    <td className="p-6">
                       <div className="flex items-center gap-1.5 text-gray-500 font-bold text-xs">
                          <Briefcase size={12} className="text-gray-300" />
                          {user.department || 'غير محدد'}
                       </div>
                    </td>
                    <td className="p-6 text-left">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="تعديل البيانات"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          disabled={isDeleting === user.id}
                          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="حذف المستخدم"
                        >
                          {isDeleting === user.id ? <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"/> : <Trash2 size={18} />}
                        </button>
                        <div className="w-10 flex justify-center">
                          <MoreHorizontal size={18} className="text-gray-200" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedUser?.id ? "تعديل بيانات العضو" : "إضافة عضو جديد للفريق"}
      >
        <form onSubmit={handleSubmit} className="space-y-5 font-cairo text-right">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 mr-1 uppercase">الاسم الكامل</label>
            <input 
              required
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[20px] outline-none focus:border-[#E95D22] focus:bg-white text-sm font-bold transition-all shadow-sm"
              value={selectedUser?.name || ''}
              onChange={e => setSelectedUser({...selectedUser, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 mr-1 uppercase">البريد الإلكتروني</label>
            <input 
              required
              type="email"
              disabled={!!selectedUser?.id}
              className={`w-full p-4 border border-gray-100 rounded-[20px] outline-none focus:border-[#E95D22] text-sm font-bold transition-all shadow-sm ${selectedUser?.id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50'}`}
              value={selectedUser?.email || ''}
              onChange={e => setSelectedUser({...selectedUser, email: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 mr-1 uppercase">الصلاحية</label>
              <select 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[20px] outline-none focus:border-[#E95D22] text-sm font-bold cursor-pointer"
                value={selectedUser?.role || 'PR_OFFICER'}
                onChange={e => setSelectedUser({...selectedUser, role: e.target.value as UserRole})}
              >
                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 mr-1 uppercase">القسم</label>
              <input 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-[20px] outline-none focus:border-[#E95D22] text-sm font-bold"
                value={selectedUser?.department || ''}
                onChange={e => setSelectedUser({...selectedUser, department: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={formLoading}
            className="w-full bg-[#1B2B48] text-white py-5 rounded-[22px] font-black shadow-xl mt-6 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {formLoading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/> : <CheckCircle2 size={20}/>}
            {selectedUser?.id ? 'تحديث البيانات' : 'تأكيد الإضافة'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default UsersModule;
