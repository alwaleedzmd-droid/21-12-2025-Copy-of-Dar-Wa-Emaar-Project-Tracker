import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, Users, UserCheck, 
  Mail, AlertCircle, CheckCircle2, Settings 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import { UserRole } from '../types';

interface WorkflowRoute {
  id?: number;
  request_type: string;
  request_type_label: string;
  assigned_to: string;
  cc_list: string;
  notify_roles: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface WorkflowManagementProps {
  currentUser: any;
}

const WorkflowManagement: React.FC<WorkflowManagementProps> = ({ currentUser }) => {
  const [workflows, setWorkflows] = useState<WorkflowRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRoute | null>(null);
  const [formData, setFormData] = useState<Partial<WorkflowRoute>>({
    request_type: '',
    request_type_label: '',
    assigned_to: '',
    cc_list: '',
    notify_roles: 'ADMIN',
    is_active: true
  });

  // التحقق من الصلاحيات
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      fetchWorkflows();
    }
  }, [isAdmin]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ جلب البيانات:', error);
        // إذا الجدول غير موجود، استخدم بيانات افتراضية
        setWorkflows(getDefaultWorkflows());
      } else {
        setWorkflows(data || []);
      }
    } catch (err) {
      console.error('خطأ:', err);
      setWorkflows(getDefaultWorkflows());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultWorkflows = (): WorkflowRoute[] => [
    {
      id: 1,
      request_type: 'TECHNICAL_SECTION',
      request_type_label: 'طلب تقني',
      assigned_to: 'صالح اليحيى',
      cc_list: 'الوليد الدوسري, مساعد العقيل, قسم PR',
      notify_roles: 'ADMIN,PR_MANAGER,TECHNICAL',
      is_active: true
    },
    {
      id: 2,
      request_type: 'DEED_CLEARANCE',
      request_type_label: 'إفراغ/تصفية',
      assigned_to: 'الوليد الدوسري',
      cc_list: 'مساعد العقيل, قسم CX',
      notify_roles: 'ADMIN,CONVEYANCE',
      is_active: true
    },
    {
      id: 3,
      request_type: 'METER_TRANSFER',
      request_type_label: 'نقل ملكية عداد',
      assigned_to: 'نورة المالكي',
      cc_list: 'مساعد العقيل, قسم CX',
      notify_roles: 'ADMIN,CONVEYANCE',
      is_active: true
    }
  ];

  const openAddModal = () => {
    setEditingWorkflow(null);
    setFormData({
      request_type: '',
      request_type_label: '',
      assigned_to: '',
      cc_list: '',
      notify_roles: 'ADMIN',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (workflow: WorkflowRoute) => {
    setEditingWorkflow(workflow);
    setFormData({
      request_type: workflow.request_type,
      request_type_label: workflow.request_type_label,
      assigned_to: workflow.assigned_to,
      cc_list: workflow.cc_list,
      notify_roles: workflow.notify_roles,
      is_active: workflow.is_active
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.request_type || !formData.request_type_label || !formData.assigned_to) {
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      if (editingWorkflow?.id) {
        // تحديث
        const { error } = await supabase
          .from('workflow_routes')
          .update({
            request_type_label: formData.request_type_label,
            assigned_to: formData.assigned_to,
            cc_list: formData.cc_list || '',
            notify_roles: formData.notify_roles || 'ADMIN',
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingWorkflow.id);

        if (error) throw error;
        alert('✅ تم التحديث بنجاح');
      } else {
        // إضافة جديد
        const { error } = await supabase
          .from('workflow_routes')
          .insert([{
            request_type: formData.request_type,
            request_type_label: formData.request_type_label,
            assigned_to: formData.assigned_to,
            cc_list: formData.cc_list || '',
            notify_roles: formData.notify_roles || 'ADMIN',
            is_active: formData.is_active,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
        alert('✅ تم الإضافة بنجاح');
      }

      setIsModalOpen(false);
      fetchWorkflows();
    } catch (err: any) {
      console.error('خطأ الحفظ:', err);
      alert('❌ فشل الحفظ: ' + err.message);
    }
  };

  const handleDelete = async (workflow: WorkflowRoute) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${workflow.request_type_label}"؟`)) {
      return;
    }

    try {
      if (workflow.id) {
        const { error } = await supabase
          .from('workflow_routes')
          .delete()
          .eq('id', workflow.id);

        if (error) throw error;
        alert('✅ تم الحذف بنجاح');
        fetchWorkflows();
      }
    } catch (err: any) {
      console.error('خطأ الحذف:', err);
      alert('❌ فشل الحذف: ' + err.message);
    }
  };

  const toggleActive = async (workflow: WorkflowRoute) => {
    try {
      if (workflow.id) {
        const { error } = await supabase
          .from('workflow_routes')
          .update({ 
            is_active: !workflow.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', workflow.id);

        if (error) throw error;
        fetchWorkflows();
      }
    } catch (err: any) {
      console.error('خطأ التحديث:', err);
      alert('❌ فشل التحديث: ' + err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-[30px] shadow-lg text-center max-w-md" dir="rtl">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-2xl font-black text-[#1B2B48] mb-2">غير مصرح</h2>
          <p className="text-gray-600 font-bold">هذه الصفحة متاحة فقط لمدير النظام</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center" dir="rtl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2B48] mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#1B2B48] to-[#2a3f63] rounded-[30px] p-8 mb-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-2xl">
                <Settings size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black">إدارة سير الموافقات</h1>
                <p className="text-white/80 font-bold mt-1">التحكم في المسؤولين والنسخ لكل نوع طلب</p>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="bg-white text-[#1B2B48] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 transition shadow-lg"
            >
              <Plus size={20} />
              إضافة نوع جديد
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">إجمالي الأنواع</p>
                <p className="text-3xl font-black text-[#1B2B48]">{workflows.length}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl">
                <Settings className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">النشطة</p>
                <p className="text-3xl font-black text-green-600">
                  {workflows.filter(w => w.is_active).length}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl">
                <CheckCircle2 className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[25px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">المعطلة</p>
                <p className="text-3xl font-black text-gray-400">
                  {workflows.filter(w => !w.is_active).length}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <AlertCircle className="text-gray-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Workflows List */}
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className={`bg-white p-6 rounded-[25px] border shadow-sm transition-all hover:shadow-md ${
                workflow.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                      workflow.is_active 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {workflow.is_active ? '✅ نشط' : '⏸️ معطل'}
                    </span>
                    <h3 className="text-xl font-black text-[#1B2B48]">{workflow.request_type_label}</h3>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-bold text-gray-500">
                      {workflow.request_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <UserCheck className="text-blue-600" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">المسؤول المباشر</p>
                        <p className="font-bold text-[#1B2B48]">{workflow.assigned_to}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-purple-50 p-2 rounded-lg">
                        <Users className="text-purple-600" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">نسخة (CC)</p>
                        <p className="font-bold text-gray-600 text-sm">
                          {workflow.cc_list || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-orange-50 p-2 rounded-lg">
                        <Mail className="text-orange-600" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">الإشعارات</p>
                        <p className="font-bold text-gray-600 text-sm">
                          {workflow.notify_roles?.split(',').join(', ') || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(workflow)}
                    className={`p-2 rounded-lg transition ${
                      workflow.is_active
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                    title={workflow.is_active ? 'تعطيل' : 'تفعيل'}
                  >
                    {workflow.is_active ? <X size={18} /> : <CheckCircle2 size={18} />}
                  </button>

                  <button
                    onClick={() => openEditModal(workflow)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                    title="تعديل"
                  >
                    <Edit size={18} />
                  </button>

                  <button
                    onClick={() => handleDelete(workflow)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {workflows.length === 0 && (
            <div className="bg-white p-12 rounded-[25px] border border-dashed border-gray-200 text-center">
              <Settings className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-400 font-bold">لا توجد أنواع طلبات مسجلة</p>
              <button
                onClick={openAddModal}
                className="mt-4 bg-[#1B2B48] text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
              >
                <Plus size={20} />
                إضافة أول نوع
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWorkflow ? 'تعديل سير الموافقة' : 'إضافة نوع طلب جديد'}
      >
        <div className="space-y-5" dir="rtl">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              نوع الطلب (بالإنجليزية) *
            </label>
            <input
              type="text"
              value={formData.request_type || ''}
              onChange={(e) => setFormData({ ...formData, request_type: e.target.value.toUpperCase().replace(/\s/g, '_') })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              placeholder="مثال: NEW_REQUEST_TYPE"
              disabled={!!editingWorkflow}
            />
            <p className="text-xs text-gray-400 mt-1">استخدم أحرف إنجليزية كبيرة و underscore فقط</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              اسم النوع (بالعربية) *
            </label>
            <input
              type="text"
              value={formData.request_type_label || ''}
              onChange={(e) => setFormData({ ...formData, request_type_label: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              placeholder="مثال: طلب جديد"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              المسؤول المباشر (TO) *
            </label>
            <input
              type="text"
              value={formData.assigned_to || ''}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              placeholder="اسم المسؤول الذي سيوجه له الطلب"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              النسخ (CC)
            </label>
            <textarea
              value={formData.cc_list || ''}
              onChange={(e) => setFormData({ ...formData, cc_list: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              rows={3}
              placeholder="اسم 1, اسم 2, قسم ما"
            />
            <p className="text-xs text-gray-400 mt-1">افصل بين الأسماء بفاصلة</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              الأدوار المستقبلة للإشعارات
            </label>
            <input
              type="text"
              value={formData.notify_roles || ''}
              onChange={(e) => setFormData({ ...formData, notify_roles: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              placeholder="ADMIN,PR_MANAGER,TECHNICAL"
            />
            <p className="text-xs text-gray-400 mt-1">أدوار مفصولة بفاصلة (ADMIN, PR_MANAGER, CONVEYANCE, TECHNICAL)</p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active || false}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-[#1B2B48] focus:ring-[#1B2B48]"
            />
            <label htmlFor="is_active" className="font-bold text-gray-700 cursor-pointer">
              نشط (سيتم استخدامه في النظام)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-[#1B2B48] text-white py-3 rounded-xl font-bold hover:bg-[#2a3f63] transition flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {editingWorkflow ? 'حفظ التعديلات' : 'إضافة'}
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkflowManagement;
