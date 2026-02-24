import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, Users, UserCheck, 
  Mail, AlertCircle, CheckCircle2, Settings, ArrowDown, ArrowUp, List
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';
import WorkflowStageManager from './WorkflowStageManager';
import { UserRole } from '../types';

interface WorkflowRoute {
  id?: number;
  request_type: string;
  request_type_label: string;
  assigned_to: string; // JSON array of emails in sequence
  cc_list: string; // Comma-separated emails
  notify_roles: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface WorkflowManagementProps {
  currentUser: any;
}

// أنواع الطلبات المحددة مسبقاً
const REQUEST_TYPES = [
  { value: 'TECHNICAL_SECTION', label: 'طلب تقني' },
  { value: 'DEED_CLEARANCE', label: 'طلب إفراغ/تصفية' },
  { value: 'METER_TRANSFER', label: 'طلب نقل ملكية عداد كهرباء' },
  { value: 'WATER_METER_TRANSFER', label: 'طلب نقل ملكية عداد مياه' },
  { value: 'SEWAGE_CONNECTION', label: 'طلب توصيل صرف صحي' },
  { value: 'BUILDING_PERMIT', label: 'طلب رخصة بناء' },
  { value: 'CUSTOM', label: 'نوع مخصص (حدد يدوياً)' }
];

const WorkflowManagement: React.FC<WorkflowManagementProps> = ({ currentUser }) => {
  const [workflows, setWorkflows] = useState<WorkflowRoute[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRoute | null>(null);
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [customRequestType, setCustomRequestType] = useState<string>('');
  const [assignedToSequence, setAssignedToSequence] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<WorkflowRoute>>({
    request_type: '',
    request_type_label: '',
    assigned_to: '',
    cc_list: '',
    notify_roles: 'ADMIN',
    is_active: true
  });
  const [selectedWorkflowForStages, setSelectedWorkflowForStages] = useState<WorkflowRoute | null>(null);

  // التحقق من الصلاحيات
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchWorkflows();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .order('name', { ascending: true });

      if (error) {
        console.error('خطأ جلب المستخدمين:', error);
      } else {
        // إزالة التكرار بناءً على الإيميل
        const uniqueUsers = (data || []).reduce((acc: AppUser[], user: AppUser) => {
          if (!acc.find(u => u.email === user.email)) {
            acc.push(user);
          }
          return acc;
        }, []);
        setUsers(uniqueUsers);
      }
    } catch (err) {
      console.error('خطأ:', err);
    }
  };

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      console.log('🔍 جلب سير الموافقات من قاعدة البيانات...');
      
      const { data, error } = await supabase
        .from('workflow_routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ خطأ جلب البيانات:', error);
        // إذا الجدول غير موجود، استخدم بيانات افتراضية
        console.log('⚠️ استخدام البيانات الافتراضية...');
        setWorkflows(getDefaultWorkflows());
      } else {
        const workflows = data || [];
        console.log(`📊 تم جلب ${workflows.length} نوع طلب`);
        
        // إذا لا توجد بيانات، اعرض رسالة
        if (workflows.length === 0) {
          console.warn('⚠️ لا توجد أنواع مسجلة في قاعدة البيانات');
          console.warn('📝 الرجاء تنفيذ Migration في Supabase SQL Editor:');
          console.warn('   1. 20260224_create_workflow_routes_table.sql');
          console.warn('   2. 20260224_insert_default_workflow_routes.sql');
          console.warn('   3. 20260224_create_workflow_stages_system.sql');
          
          // استخدم البيانات الافتراضية للعرض فقط
          setWorkflows(getDefaultWorkflows());
        } else {
          setWorkflows(workflows);
        }
      }
    } catch (err) {
      console.error('❌ خطأ عام:', err);
      setWorkflows(getDefaultWorkflows());
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultWorkflows = async () => {
    const defaultWorkflows = getDefaultWorkflows();
    
    try {
      console.log('🔄 جاري إضافة الأنواع الافتراضية...');
      
      for (const workflow of defaultWorkflows) {
        // تحقق إذا كان النوع موجود مسبقاً
        const { data: existing, error: checkError } = await supabase
          .from('workflow_routes')
          .select('id')
          .eq('request_type', workflow.request_type)
          .maybeSingle();

        if (checkError) {
          console.error(`خطأ في التحقق من ${workflow.request_type}:`, checkError);
          continue;
        }

        if (!existing) {
          // أضف النوع إذا لم يكن موجود
          console.log(`✅ إضافة ${workflow.request_type_label}...`);
          const { error: insertError } = await supabase
            .from('workflow_routes')
            .insert([{
              request_type: workflow.request_type,
              request_type_label: workflow.request_type_label,
              assigned_to: workflow.assigned_to,
              cc_list: workflow.cc_list,
              notify_roles: workflow.notify_roles,
              is_active: workflow.is_active
            }]);

          if (insertError) {
            console.error(`❌ فشل إضافة ${workflow.request_type}:`, insertError);
          } else {
            console.log(`✅ تمت إضافة ${workflow.request_type_label}`);
          }
        } else {
          console.log(`ℹ️ ${workflow.request_type_label} موجود بالفعل`);
        }
      }
      
      console.log('✅ اكتمل تهيئة الأنواع الافتراضية');
    } catch (err) {
      console.error('❌ خطأ في إضافة الأنواع الافتراضية:', err);
    }
  };

  const getDefaultWorkflows = (): WorkflowRoute[] => [
    {
      id: 1,
      request_type: 'TECHNICAL_SECTION',
      request_type_label: 'طلب تقني',
      assigned_to: '["ssalyahya@darwaemaar.com"]',
      cc_list: 'adaldawsari@darwaemaar.com, malageel@darwaemaar.com',
      notify_roles: 'ADMIN,PR_MANAGER,TECHNICAL',
      is_active: true
    },
    {
      id: 2,
      request_type: 'DEED_CLEARANCE',
      request_type_label: 'إفراغ/تصفية',
      assigned_to: '["adaldawsari@darwaemaar.com"]',
      cc_list: 'malageel@darwaemaar.com',
      notify_roles: 'ADMIN,CONVEYANCE',
      is_active: true
    },
    {
      id: 3,
      request_type: 'METER_TRANSFER',
      request_type_label: 'نقل ملكية عداد',
      assigned_to: '["nalmalki@darwaemaar.com"]',
      cc_list: 'malageel@darwaemaar.com',
      notify_roles: 'ADMIN,CONVEYANCE',
      is_active: true
    }
  ];

  const openAddModal = () => {
    setEditingWorkflow(null);
    setSelectedRequestType('');
    setCustomRequestType('');
    setAssignedToSequence([]);
    setCcEmails([]);
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
    
    // Parse assigned_to JSON if it exists
    let parsedAssignedTo: string[] = [];
    try {
      parsedAssignedTo = JSON.parse(workflow.assigned_to);
      if (!Array.isArray(parsedAssignedTo)) {
        parsedAssignedTo = [workflow.assigned_to];
      }
    } catch {
      parsedAssignedTo = [workflow.assigned_to];
    }
    
    // Parse cc_list
    const parsedCcList = workflow.cc_list ? workflow.cc_list.split(',').map(e => e.trim()) : [];
    
    // Find if request_type matches predefined types
    const matchedType = REQUEST_TYPES.find(rt => rt.value === workflow.request_type);
    
    setSelectedRequestType(matchedType ? workflow.request_type : 'CUSTOM');
    setCustomRequestType(matchedType ? '' : workflow.request_type);
    setAssignedToSequence(parsedAssignedTo);
    setCcEmails(parsedCcList);
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
    // Determine request_type
    const finalRequestType = selectedRequestType === 'CUSTOM' 
      ? customRequestType.toUpperCase().replace(/\s/g, '_')
      : selectedRequestType;
    
    // Determine request_type_label
    const finalLabel = selectedRequestType === 'CUSTOM'
      ? formData.request_type_label
      : REQUEST_TYPES.find(rt => rt.value === selectedRequestType)?.label || formData.request_type_label;
    
    if (!finalRequestType || !finalLabel || assignedToSequence.length === 0) {
      alert('الرجاء ملء جميع الحقول المطلوبة وإضافة مسؤول واحد على الأقل');
      return;
    }

    // Build assigned_to as JSON array
    const assignedToJson = JSON.stringify(assignedToSequence);
    
    // Build cc_list as comma-separated emails
    const ccListString = ccEmails.join(', ');

    try {
      if (editingWorkflow?.id) {
        // تحديث
        const { error } = await supabase
          .from('workflow_routes')
          .update({
            request_type_label: finalLabel,
            assigned_to: assignedToJson,
            cc_list: ccListString,
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
            request_type: finalRequestType,
            request_type_label: finalLabel,
            assigned_to: assignedToJson,
            cc_list: ccListString,
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

  // دوال إدارة تسلسل المسؤولين (TO)
  const addAssignedTo = (email: string) => {
    if (email && !assignedToSequence.includes(email)) {
      setAssignedToSequence([...assignedToSequence, email]);
    }
  };

  const removeAssignedTo = (index: number) => {
    setAssignedToSequence(assignedToSequence.filter((_, i) => i !== index));
  };

  const moveAssignedToUp = (index: number) => {
    if (index > 0) {
      const newSequence = [...assignedToSequence];
      [newSequence[index - 1], newSequence[index]] = [newSequence[index], newSequence[index - 1]];
      setAssignedToSequence(newSequence);
    }
  };

  const moveAssignedToDown = (index: number) => {
    if (index < assignedToSequence.length - 1) {
      const newSequence = [...assignedToSequence];
      [newSequence[index], newSequence[index + 1]] = [newSequence[index + 1], newSequence[index]];
      setAssignedToSequence(newSequence);
    }
  };

  // دوال إدارة النسخ (CC)
  const addCcEmail = (email: string) => {
    if (email && !ccEmails.includes(email)) {
      setCcEmails([...ccEmails, email]);
    }
  };

  const removeCcEmail = (index: number) => {
    setCcEmails(ccEmails.filter((_, i) => i !== index));
  };

  // Helper to get user display name
  const getUserDisplay = (email: string): string => {
    const user = users.find(u => u.email === email);
    return user ? `${user.name} (${email})` : email;
  };

  // Helper to parse assigned_to for display
  const parseAssignedToForDisplay = (assignedTo: string): string[] => {
    try {
      const parsed = JSON.parse(assignedTo);
      return Array.isArray(parsed) ? parsed : [assignedTo];
    } catch {
      return [assignedTo];
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
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">
                          المسؤولين المباشرين (تسلسل الموافقات)
                        </p>
                        <div className="space-y-1">
                          {parseAssignedToForDisplay(workflow.assigned_to).map((email, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                                {idx + 1}
                              </span>
                              <p className="font-bold text-[#1B2B48] text-sm">{getUserDisplay(email)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-purple-50 p-2 rounded-lg">
                        <Users className="text-purple-600" size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">نسخة (CC)</p>
                        <div className="space-y-1">
                          {workflow.cc_list ? (
                            workflow.cc_list.split(',').map((email, idx) => (
                              <p key={idx} className="font-bold text-gray-600 text-xs">
                                {getUserDisplay(email.trim())}
                              </p>
                            ))
                          ) : (
                            <p className="text-gray-400 text-xs">-</p>
                          )}
                        </div>
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
                    onClick={() => setSelectedWorkflowForStages(workflow)}
                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
                    title="إدارة المراحل"
                  >
                    <List size={18} />
                  </button>

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
          {/* نوع الطلب - قائمة منسدلة */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              نوع الطلب *
            </label>
            <select
              value={selectedRequestType}
              onChange={(e) => {
                setSelectedRequestType(e.target.value);
                if (e.target.value !== 'CUSTOM') {
                  const selectedType = REQUEST_TYPES.find(rt => rt.value === e.target.value);
                  if (selectedType) {
                    setFormData({ ...formData, request_type_label: selectedType.label });
                  }
                }
              }}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              disabled={!!editingWorkflow}
            >
              <option value="">-- اختر نوع الطلب --</option>
              {REQUEST_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* حقل مخصص إذا تم اختيار CUSTOM */}
          {selectedRequestType === 'CUSTOM' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                نوع الطلب المخصص (بالإنجليزية) *
              </label>
              <input
                type="text"
                value={customRequestType}
                onChange={(e) => setCustomRequestType(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
                placeholder="مثال: NEW_REQUEST_TYPE"
              />
              <p className="text-xs text-gray-400 mt-1">استخدم أحرف إنجليزية كبيرة و underscore فقط</p>
            </div>
          )}

          {/* اسم النوع بالعربية */}
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
              disabled={selectedRequestType !== 'CUSTOM' && selectedRequestType !== ''}
            />
          </div>

          {/* المسؤولين المباشرين (تسلسل الموافقات) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              المسؤولين المباشرين (TO) - تسلسل الموافقات *
            </label>
            <div className="space-y-3">
              {/* قائمة المسؤولين الحاليين */}
              {assignedToSequence.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-xl space-y-2">
                  {assignedToSequence.map((email, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                      <span className="bg-blue-600 text-white px-2 py-1 rounded font-bold text-xs">
                        {index + 1}
                      </span>
                      <span className="flex-1 font-bold text-sm">{getUserDisplay(email)}</span>
                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => moveAssignedToUp(index)}
                            className="p-1 bg-gray-100 hover:bg-gray-200 rounded transition"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp size={14} />
                          </button>
                        )}
                        {index < assignedToSequence.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveAssignedToDown(index)}
                            className="p-1 bg-gray-100 hover:bg-gray-200 rounded transition"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAssignedTo(index)}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
                          title="حذف"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* إضافة مسؤول جديد */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addAssignedTo(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              >
                <option value="">-- إضافة مسؤول للتسلسل --</option>
                {users
                  .filter(u => !assignedToSequence.includes(u.email) && !ccEmails.includes(u.email))
                  .map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-400">
                الترتيب مهم: الشخص الأول يوافق أولاً، ثم الثاني، وهكذا
              </p>
            </div>
          </div>

          {/* النسخ (CC) - إيميلات */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              النسخ (CC) - إيميلات
            </label>
            <div className="space-y-3">
              {/* قائمة النسخ الحالية */}
              {ccEmails.length > 0 && (
                <div className="bg-purple-50 p-3 rounded-xl space-y-2">
                  {ccEmails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                      <Mail size={16} className="text-purple-600" />
                      <span className="flex-1 font-bold text-sm">{getUserDisplay(email)}</span>
                      <button
                        type="button"
                        onClick={() => removeCcEmail(index)}
                        className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
                        title="حذف"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* إضافة نسخة جديدة */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addCcEmail(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              >
                <option value="">-- إضافة نسخة (CC) --</option>
                {users
                  .filter(u => !ccEmails.includes(u.email) && !assignedToSequence.includes(u.email))
                  .map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* الأدوار المستقبلة للإشعارات */}
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

          {/* تفعيل/تعطيل */}
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

          {/* أزرار الحفظ والإلغاء */}
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

      {/* Stage Manager Modal */}
      {selectedWorkflowForStages && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedWorkflowForStages(null)}
          title=""
        >
          <WorkflowStageManager
            workflowRouteId={selectedWorkflowForStages.id!}
            workflowLabel={selectedWorkflowForStages.request_type_label}
            onClose={() => setSelectedWorkflowForStages(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default WorkflowManagement;
