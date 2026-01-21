import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Shield, Trash2, Edit3, Loader2, AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string }> = {
  'ADMIN': { label: 'مدير نظام', color: 'text-purple-700', bg: 'bg-purple-50' },
  'PR_MANAGER': { label: 'مدير علاقات عامة', color: 'text-blue-700', bg: 'bg-blue-50' },
  'TECHNICAL': { label: 'القسم الفني', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  'CONVEYANCE': { label: 'مسؤول إفراغات CX', color: 'text-orange-700', bg: 'bg-orange-50' }
};

const UserManagement: React.FC = () => {
  const { currentUser, refreshData } = useData();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [userForm, setUserForm] = useState({
    id: '', name: '', email: '', role: 'PR_MANAGER' as UserRole, department: '', password: '' 
  });

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleOpenEdit = (user: any) => {
    setUserForm({
      id: user.id, name: user.name, email: user.email,
      role: user.role, department: user.department || '', password: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (userForm.id) {
        await supabase.from('profiles').update({
          name: userForm.name, role: userForm.role, department: userForm.department
        }).eq('id', userForm.id);
      } else {
        const { error } = await supabase.rpc('create_new_user', {
          email: userForm.email, password: userForm.password,
          full_name: userForm.name, user_role: userForm.role,
          user_dept: userForm.department
        });
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchProfiles();
      refreshData();
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  if (currentUser?.role !== 'ADMIN') return <div className="p-20 text-center font-black">صلاحية محدودة</div>;

  return (
    <div className="p-8 space-y-6 font-cairo text-right" dir="rtl">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-[#1B2B48]">إدارة المستخدمين</h2>
        <button onClick={() => { setUserForm({id:'', name:'', email:'', role:'PR_MANAGER', department:'', password:''}); setIsModalOpen(true); }} className="bg-[#E95D22] text-white px-6 py-3 rounded-xl font-black flex items-center gap-2">
          <UserPlus size={20} /> إضافة عضو جديد
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr className="text-gray-400 text-[10px] font-black uppercase">
              <th className="p-6 text-right">العضو</th>
              <th className="p-6 text-right">الصلاحية</th>
              <th className="p-6 text-right">القسم</th>
              <th className="p-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {profiles.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-6">
                  <p className="font-black text-sm">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${ROLE_CONFIG[user.role as UserRole]?.bg} ${ROLE_CONFIG[user.role as UserRole]?.color}`}>
                    {ROLE_CONFIG[user.role as UserRole]?.label || user.role}
                  </span>
                </td>
                <td className="p-6 text-xs font-bold text-gray-500">{user.department || '-'}</td>
                <td className="p-6 text-left">
                  <button onClick={() => handleOpenEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={userForm.id ? "تعديل مستخدم" : "إضافة مستخدم"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="الاسم" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
          <input className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="البريد" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} disabled={!!userForm.id} required />
          {!userForm.id && <input type="password" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="كلمة المرور" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} required />}
          <select className="w-full p-4 bg-gray-50 border rounded-xl font-bold" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}>
             <option value="PR_MANAGER">مدير علاقات عامة</option>
             <option value="TECHNICAL">القسم الفني</option>
             <option value="CONVEYANCE">مسؤول إفراغات CX</option>
             <option value="ADMIN">مدير نظام</option>
          </select>
          <input className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="القسم" value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})} />
          <button type="submit" className="w-full bg-[#1B2B48] text-white py-4 rounded-xl font-black">{isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}</button>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;