import React, { useState } from 'react';
import { Plus, UserPlus, Shield, Mail, Trash2, Edit2, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';
import Modal from './Modal';

const UserManagement = () => {
  const { appUsers, refreshData, currentUser } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CONVEYANCE', department: '' });

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) return alert("البريد وكلمة المرور مطلوبة");
    setIsLoading(true);
    try {
      // استدعاء وظيفة SQL التي أصلحناها سابقاً لمنع الأخطاء
      const { data, error } = await supabase.rpc('create_new_user', {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.name,
        user_role: newUser.role,
        user_dept: newUser.department
      });

      if (error) throw error;
      
      alert("تمت إضافة المستخدم بنجاح ✅");
      setIsAddModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'CONVEYANCE', department: '' });
      refreshData();
    } catch (err: any) {
      alert("فشل الحفظ: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1B2B48]">إدارة المستخدمين</h2>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg">
          <UserPlus size={20} /> إضافة موظف
        </button>
      </div>

      <div className="bg-white rounded-[35px] border shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-5 font-black text-gray-400 text-xs">الموظف</th>
              <th className="p-5 font-black text-gray-400 text-xs">الدور الوظيفي</th>
              <th className="p-5 font-black text-gray-400 text-xs">القسم</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {appUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1B2B48] text-white rounded-xl flex items-center justify-center font-black">{user.name[0]}</div>
                    <div>
                      <p className="font-bold text-[#1B2B48]">{user.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-5">
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black">{user.role}</span>
                </td>
                <td className="p-5 font-bold text-sm text-gray-600">{user.department || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة موظف جديد">
        <div className="space-y-4 pt-2">
          <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" placeholder="الاسم الكامل" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
          <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" placeholder="البريد الإلكتروني" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
          <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" type="password" placeholder="كلمة المرور" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
          <select className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
            <option value="ADMIN">مدير نظام</option>
            <option value="PR_MANAGER">مدير علاقات عامة</option>
            <option value="TECHNICAL">القسم الفني</option>
            <option value="CONVEYANCE">مسؤول إفراغات CX</option>
          </select>
          <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]" placeholder="القسم (اختياري)" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} />
          <button onClick={handleAddUser} disabled={isLoading} className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-black shadow-xl">
            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "حفظ البيانات"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;