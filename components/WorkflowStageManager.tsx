import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, ArrowUp, ArrowDown, 
  ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Modal from './Modal';

interface WorkflowStage {
  id?: number;
  local_id?: string;
  workflow_route_id: number;
  stage_order: number;
  stage_title: string;
  stage_description: string;
  responsible_party: string;
  platform_name: string;
  expected_output: string;
  is_active: boolean;
}

interface WorkflowStageManagerProps {
  workflowRouteId: number;
  workflowLabel: string;
  onClose: () => void;
}

// --- حفظ واسترجاع المراحل من localStorage ---
const getStagesLocalKey = (routeId: number) => `dar_workflow_stages_${routeId}`;

const saveStagesToLocal = (routeId: number, stages: WorkflowStage[]) => {
  try {
    localStorage.setItem(getStagesLocalKey(routeId), JSON.stringify(stages));
    console.log('💾 تم حفظ المراحل محلياً:', stages.length);
  } catch (e) { console.error('خطأ حفظ محلي:', e); }
};

const loadStagesFromLocal = (routeId: number): WorkflowStage[] | null => {
  try {
    const data = localStorage.getItem(getStagesLocalKey(routeId));
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { console.error('خطأ قراءة:', e); }
  return null;
};

const generateStageLocalId = () => `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const WorkflowStageManager: React.FC<WorkflowStageManagerProps> = ({ 
  workflowRouteId, 
  workflowLabel,
  onClose 
}) => {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [formData, setFormData] = useState<Partial<WorkflowStage>>({
    stage_order: 1,
    stage_title: '',
    stage_description: '',
    responsible_party: '',
    platform_name: '',
    expected_output: '',
    is_active: true
  });

  useEffect(() => {
    fetchStages();
  }, [workflowRouteId]);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_stages')
        .select('*')
        .eq('workflow_route_id', workflowRouteId)
        .order('stage_order', { ascending: true });

      if (error) {
        console.warn('⚠️ فشل جلب المراحل من Supabase:', error.message);
        const localStages = loadStagesFromLocal(workflowRouteId);
        setStages(localStages || []);
      } else if ((data || []).length > 0) {
        setStages(data!);
        saveStagesToLocal(workflowRouteId, data!);
      } else {
        // لا مراحل في Supabase - تحقق محلياً
        const localStages = loadStagesFromLocal(workflowRouteId);
        setStages(localStages || []);
      }
    } catch (err) {
      console.error('خطأ جلب المراحل:', err);
      const localStages = loadStagesFromLocal(workflowRouteId);
      setStages(localStages || []);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStage(null);
    setFormData({
      stage_order: stages.length + 1,
      stage_title: '',
      stage_description: '',
      responsible_party: '',
      platform_name: '',
      expected_output: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (stage: WorkflowStage) => {
    setEditingStage(stage);
    setFormData({
      stage_order: stage.stage_order,
      stage_title: stage.stage_title,
      stage_description: stage.stage_description,
      responsible_party: stage.responsible_party,
      platform_name: stage.platform_name,
      expected_output: stage.expected_output,
      is_active: stage.is_active
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.stage_title || !formData.responsible_party) {
      alert('العنوان والمسؤول مطلوبان');
      return;
    }

    const stageData = {
      workflow_route_id: workflowRouteId,
      stage_order: formData.stage_order || stages.length + 1,
      stage_title: formData.stage_title!,
      stage_description: formData.stage_description || '',
      responsible_party: formData.responsible_party!,
      platform_name: formData.platform_name || '',
      expected_output: formData.expected_output || '',
      is_active: formData.is_active !== false
    };

    let savedToSupabase = false;

    try {
      if (editingStage?.id && !editingStage.local_id) {
        // تحديث في Supabase
        const { error } = await supabase
          .from('workflow_stages')
          .update(stageData)
          .eq('id', editingStage.id);

        if (error) throw error;
        savedToSupabase = true;
        console.log('✅ تم تحديث المرحلة في Supabase');
      } else if (!editingStage?.local_id) {
        // إضافة في Supabase
        const { error } = await supabase
          .from('workflow_stages')
          .insert([stageData]);

        if (error) throw error;
        savedToSupabase = true;
        console.log('✅ تم إضافة المرحلة في Supabase');
      }
    } catch (err: any) {
      console.warn('⚠️ فشل الحفظ في Supabase:', err.message);
    }

    // حفظ محلي
    try {
      let currentStages = [...stages];
      
      if (editingStage) {
        const idx = currentStages.findIndex(s => 
          (s.id && s.id === editingStage.id) || 
          (s.local_id && s.local_id === editingStage.local_id)
        );
        if (idx !== -1) {
          currentStages[idx] = { ...currentStages[idx], ...stageData };
        }
      } else {
        currentStages.push({
          ...stageData,
          local_id: generateStageLocalId()
        } as WorkflowStage);
      }
      
      // ترتيب حسب stage_order
      currentStages.sort((a, b) => a.stage_order - b.stage_order);
      
      setStages(currentStages);
      saveStagesToLocal(workflowRouteId, currentStages);
    } catch (localErr) {
      console.error('خطأ حفظ محلي:', localErr);
    }

    if (savedToSupabase) {
      alert('✅ تم الحفظ بنجاح');
      fetchStages(); // إعادة جلب من Supabase
    } else {
      alert('✅ تم الحفظ محلياً');
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = async (stage: WorkflowStage) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${stage.stage_title}"؟`)) {
      return;
    }

    let deletedFromSupabase = false;

    try {
      if (stage.id && !stage.local_id) {
        const { error } = await supabase
          .from('workflow_stages')
          .delete()
          .eq('id', stage.id);

        if (error) throw error;
        deletedFromSupabase = true;
      }
    } catch (err: any) {
      console.warn('⚠️ فشل الحذف من Supabase:', err.message);
    }

    // حذف محلي
    const updatedStages = stages.filter(s => 
      !((s.id && s.id === stage.id) || (s.local_id && s.local_id === stage.local_id))
    );
    setStages(updatedStages);
    saveStagesToLocal(workflowRouteId, updatedStages);

    if (deletedFromSupabase) {
      alert('✅ تم الحذف بنجاح');
      fetchStages();
    } else {
      alert('✅ تم الحذف محلياً');
    }
  };

  const moveStageUp = async (stage: WorkflowStage, index: number) => {
    if (index === 0) return;
    
    const prevStage = stages[index - 1];
    const newStages = [...stages];
    
    // تبديل الترتيب
    const tempOrder = newStages[index].stage_order;
    newStages[index] = { ...newStages[index], stage_order: newStages[index - 1].stage_order };
    newStages[index - 1] = { ...newStages[index - 1], stage_order: tempOrder };
    
    // ترتيب المصفوفة
    newStages.sort((a, b) => a.stage_order - b.stage_order);
    
    // حفظ محلي فوري
    setStages(newStages);
    saveStagesToLocal(workflowRouteId, newStages);
    
    // محاولة حفظ في Supabase
    try {
      if (prevStage.id && stage.id && !prevStage.local_id && !stage.local_id) {
        await supabase
          .from('workflow_stages')
          .update({ stage_order: stage.stage_order })
          .eq('id', prevStage.id);

        await supabase
          .from('workflow_stages')
          .update({ stage_order: prevStage.stage_order })
          .eq('id', stage.id);
      }
    } catch (err) {
      console.warn('⚠️ فشل تحديث الترتيب في Supabase:', err);
    }
  };

  const moveStageDown = async (stage: WorkflowStage, index: number) => {
    if (index === stages.length - 1) return;
    
    const nextStage = stages[index + 1];
    const newStages = [...stages];
    
    // تبديل الترتيب
    const tempOrder = newStages[index].stage_order;
    newStages[index] = { ...newStages[index], stage_order: newStages[index + 1].stage_order };
    newStages[index + 1] = { ...newStages[index + 1], stage_order: tempOrder };
    
    // ترتيب المصفوفة
    newStages.sort((a, b) => a.stage_order - b.stage_order);
    
    // حفظ محلي فوري
    setStages(newStages);
    saveStagesToLocal(workflowRouteId, newStages);
    
    // محاولة حفظ في Supabase
    try {
      if (nextStage.id && stage.id && !nextStage.local_id && !stage.local_id) {
        await supabase
          .from('workflow_stages')
          .update({ stage_order: stage.stage_order })
          .eq('id', nextStage.id);

        await supabase
          .from('workflow_stages')
          .update({ stage_order: nextStage.stage_order })
          .eq('id', stage.id);
      }
    } catch (err) {
      console.warn('⚠️ فشل تحديث الترتيب في Supabase:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2B48] mx-auto mb-4"></div>
        <p className="text-gray-600 font-bold">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-[#1B2B48]">مراحل سير العمل</h2>
          <p className="text-gray-600 font-bold mt-1">{workflowLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="bg-[#1B2B48] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-[#2a3f63] transition"
          >
            <Plus size={18} />
            إضافة مرحلة
          </button>
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-300 transition"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Stages List */}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={`bg-white p-5 rounded-[20px] border shadow-sm ${
              stage.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                {/* Order Badge */}
                <div className="bg-[#1B2B48] text-white px-3 py-2 rounded-xl font-black text-lg min-w-[50px] text-center">
                  {stage.stage_order}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-black text-[#1B2B48] mb-2">
                    {stage.stage_title}
                  </h3>
                  {stage.stage_description && (
                    <p className="text-sm text-gray-600 mb-3">{stage.stage_description}</p>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 font-bold">المسؤول:</span>
                      <p className="font-bold text-[#1B2B48]">{stage.responsible_party}</p>
                    </div>
                    {stage.platform_name && (
                      <div>
                        <span className="text-gray-400 font-bold">المنصة:</span>
                        <p className="font-bold text-gray-700">{stage.platform_name}</p>
                      </div>
                    )}
                    {stage.expected_output && (
                      <div>
                        <span className="text-gray-400 font-bold">المخرج المتوقع:</span>
                        <p className="font-bold text-green-600">{stage.expected_output}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    onClick={() => moveStageUp(stage, index)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    title="تحريك لأعلى"
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
                {index < stages.length - 1 && (
                  <button
                    onClick={() => moveStageDown(stage, index)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    title="تحريك لأسفل"
                  >
                    <ArrowDown size={16} />
                  </button>
                )}
                <button
                  onClick={() => openEditModal(stage)}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                  title="تعديل"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(stage)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {stages.length === 0 && (
          <div className="bg-white p-12 rounded-[25px] border border-dashed border-gray-200 text-center">
            <Clock className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400 font-bold">لا توجد مراحل مسجلة</p>
            <button
              onClick={openAddModal}
              className="mt-4 bg-[#1B2B48] text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
            >
              <Plus size={20} />
              إضافة أول مرحلة
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStage ? 'تعديل المرحلة' : 'إضافة مرحلة جديدة'}
      >
        <div className="space-y-4" dir="rtl">
          {/* Tr Order */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              ترتيب المرحلة *
            </label>
            <input
              type="number"
              value={formData.stage_order || 1}
              onChange={(e) => setFormData({ ...formData, stage_order: parseInt(e.target.value) })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              min="1"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              عنوان المرحلة *
            </label>
            <input
              type="text"
              value={formData.stage_title || ''}
              onChange={(e) => setFormData({ ...formData, stage_title: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              placeholder="مثال: إعداد المخططات المعدلة"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              الوصف
            </label>
            <textarea
              value={formData.stage_description || ''}
              onChange={(e) => setFormData({ ...formData, stage_description: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              rows={3}
              placeholder="وصف تفصيلي للمرحلة"
            />
          </div>

          {/* Responsible Party */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              الجهة المسؤولة *
            </label>
            <input
              type="text"
              value={formData.responsible_party || ''}
              onChange={(e) => setFormData({ ...formData, responsible_party: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              placeholder="مثال: صالح اليحيى، المكتب الهندسي"
            />
          </div>

          {/* Platform Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              اسم المنصة/النظام
            </label>
            <input
              type="text"
              value={formData.platform_name || ''}
              onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              placeholder="مثال: منصة بلدي، ناجز، إتمام"
            />
          </div>

          {/* Expected Output */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              المخرج المتوقع
            </label>
            <input
              type="text"
              value={formData.expected_output || ''}
              onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-[#1B2B48] transition"
              placeholder="مثال: رخصة بناء معدلة، صك إلكتروني"
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="stage_active"
              checked={formData.is_active || false}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-[#1B2B48] focus:ring-[#1B2B48]"
            />
            <label htmlFor="stage_active" className="font-bold text-gray-700 cursor-pointer">
              مرحلة نشطة
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-[#1B2B48] text-white py-3 rounded-xl font-bold hover:bg-[#2a3f63] transition flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {editingStage ? 'حفظ التعديلات' : 'إضافة'}
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

export default WorkflowStageManager;
