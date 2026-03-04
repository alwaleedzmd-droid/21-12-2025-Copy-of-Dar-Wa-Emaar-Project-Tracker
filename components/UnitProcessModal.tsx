/**
 * UnitProcessModal - نافذة تفاصيل الوحدة (Drill-down Popup)
 * تعرض: Timeline + Manager Profile + Document Viewer
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Clock, User, FileText, Download, AlertTriangle, 
  CheckCircle2, ArrowLeft, Loader2, ExternalLink,
  Calendar, MapPin, Building2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UnitStatus, STATUS_COLORS } from '../services/unitStatusService';

interface UnitProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  unitStatus: UnitStatus;
  technicalRequests: any[];
  clearanceRequests: any[];
  projectWorks: any[];
}

interface TimelineEvent {
  id: number;
  date: string;
  title: string;
  description: string;
  type: 'created' | 'updated' | 'completed' | 'assigned';
  actor?: string;
}

// خريطة أسماء الموظفين لعرض البروفايل
const EMPLOYEE_PROFILES: Record<string, { name: string; role: string; avatar: string }> = {
  'صالح اليحيى': { name: 'صالح اليحيى', role: 'علاقات عامة', avatar: '👤' },
  'الوليد الدوسري': { name: 'الوليد الدوسري', role: 'مدير النظام', avatar: '👨‍💼' },
  'نورة المالكي': { name: 'نورة المالكي', role: 'إفراغات', avatar: '👩‍💼' },
  'مساعد العقيل': { name: 'مساعد العقيل', role: 'علاقات عامة', avatar: '👤' },
  'محمد الشمري': { name: 'محمد الشمري', role: 'علاقات عامة', avatar: '👤' },
  'محمد البحري': { name: 'محمد البحري', role: 'علاقات عامة', avatar: '👤' },
  'سيد سلامة': { name: 'سيد سلامة', role: 'فني', avatar: '🔧' },
  'إسلام الملشتي': { name: 'إسلام الملشتي', role: 'فني', avatar: '🔧' },
  'محمود بحيصي': { name: 'محمود بحيصي', role: 'فني', avatar: '🔧' },
  'حمزة عقيل': { name: 'حمزة عقيل', role: 'فني', avatar: '🔧' },
  'سارة عبدالسلام': { name: 'سارة عبدالسلام', role: 'إفراغات', avatar: '👩‍💼' },
  'تماني المالكي': { name: 'تماني المالكي', role: 'إفراغات', avatar: '👩‍💼' },
  'شذى الصنعاوي': { name: 'شذى الصنعاوي', role: 'إفراغات', avatar: '👩‍💼' },
};

const UnitProcessModal: React.FC<UnitProcessModalProps> = ({
  isOpen,
  onClose,
  project,
  unitStatus,
  technicalRequests,
  clearanceRequests,
  projectWorks
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'manager' | 'documents'>('timeline');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const projectId = Number(project?.id);
  const projectName = project?.name || project?.title || 'مشروع';

  // بناء الجدول الزمني من الطلبات والأعمال
  useEffect(() => {
    if (!isOpen || !project) return;
    setLoading(true);

    const events: TimelineEvent[] = [];

    // الطلبات الفنية المرتبطة
    const relatedTech = technicalRequests.filter(r => {
      const pid = Number(r.project_id ?? r.projectId ?? -1);
      return pid === projectId;
    });

    relatedTech.forEach(r => {
      events.push({
        id: r.id,
        date: r.created_at,
        title: `طلب فني: ${r.service_type || r.scope || 'غير محدد'}`,
        description: r.details || '',
        type: 'created',
        actor: r.submitted_by || r.assigned_to || undefined
      });

      if (r.updated_at && r.updated_at !== r.created_at) {
        events.push({
          id: r.id * 1000,
          date: r.updated_at,
          title: `تحديث: ${r.service_type || r.scope || ''}`,
          description: `الحالة: ${r.status || 'غير محدد'}`,
          type: r.status?.toLowerCase() === 'completed' ? 'completed' : 'updated',
          actor: r.assigned_to || undefined
        });
      }
    });

    // أعمال المشاريع المرتبطة
    const relatedWorks = projectWorks.filter(w => {
      const wId = Number(w.projectId ?? w.projectid ?? w.project_id ?? -1);
      return wId === projectId;
    });

    relatedWorks.forEach(w => {
      events.push({
        id: w.id + 50000,
        date: w.created_at,
        title: w.task_name || 'عمل مشروع',
        description: `الجهة: ${w.authority || '-'} | الحالة: ${w.status || '-'}`,
        type: w.status === 'completed' ? 'completed' : 'created',
        actor: w.department || undefined
      });
    });

    // طلبات الإفراغ المرتبطة (البحث بالاسم)
    const relatedDeeds = clearanceRequests.filter((d: any) => {
      const dName = (d.project_name || '').trim().toLowerCase();
      const pName = projectName.trim().toLowerCase();
      return dName.includes(pName) || pName.includes(dName);
    });

    relatedDeeds.forEach((d: any) => {
      events.push({
        id: d.id + 100000,
        date: d.created_at,
        title: `إفراغ: ${d.client_name || ''}`,
        description: `وحدة ${d.unit_number || '-'} | صك: ${d.deed_number || '-'}`,
        type: 'created',
        actor: d.assigned_to || d.submitted_by || undefined
      });
    });

    // ترتيب حسب التاريخ
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTimeline(events);

    // جمع المستندات المرفقة
    const docs: any[] = [];
    [...relatedTech, ...relatedDeeds].forEach((r: any) => {
      if (r.attachment_url) {
        docs.push({
          id: r.id,
          name: r.service_type || r.client_name || 'مستند',
          url: r.attachment_url,
          type: relatedTech.includes(r) ? 'فني' : 'إفراغ',
          date: r.created_at
        });
      }
    });
    setDocuments(docs);
    setLoading(false);
  }, [isOpen, project, projectId, projectName, technicalRequests, clearanceRequests, projectWorks]);

  if (!isOpen) return null;

  const colorConfig = STATUS_COLORS[unitStatus.color] || STATUS_COLORS.gray;
  const managerProfile = unitStatus.assignedTo ? 
    EMPLOYEE_PROFILES[unitStatus.assignedTo] || { name: unitStatus.assignedTo, role: 'موظف', avatar: '👤' } 
    : null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'completed': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'updated': return <Clock size={16} className="text-blue-500" />;
      case 'assigned': return <User size={16} className="text-purple-500" />;
      default: return <Calendar size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" dir="rtl">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden font-cairo animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className={`px-8 py-6 border-b border-gray-100 ${colorConfig.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                unitStatus.color === 'blue' ? 'bg-blue-500' :
                unitStatus.color === 'yellow' ? 'bg-yellow-500' :
                unitStatus.color === 'green' ? 'bg-green-500' :
                unitStatus.color === 'red-pulse' ? 'bg-red-500 animate-pulse' :
                'bg-gray-400'
              }`}>
                <Building2 size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#1B2B48]">{projectName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border}`}>
                    {unitStatus.labelAr}
                  </span>
                  {unitStatus.isDelayed && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                      <AlertTriangle size={12} /> متأخر {unitStatus.delayHours} ساعة
                    </span>
                  )}
                  {project?.location && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={12} /> {project.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} title="إغلاق" className="p-2 hover:bg-white/60 rounded-xl transition-colors">
              <X size={24} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-8">
          {[
            { key: 'timeline' as const, label: 'سجل الحركات', icon: <Clock size={16} /> },
            { key: 'manager' as const, label: 'المسؤول', icon: <User size={16} /> },
            { key: 'documents' as const, label: 'المستندات', icon: <FileText size={16} /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all border-b-2 ${
                activeTab === tab.key 
                  ? 'border-[#E95D22] text-[#E95D22]' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[55vh] custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-gray-300" size={32} />
            </div>
          ) : (
            <>
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-1">
                  {timeline.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Clock size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">لا يوجد سجل حركات لهذا المشروع</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute right-[23px] top-4 bottom-4 w-0.5 bg-gray-200" />
                      
                      {timeline.map((event, idx) => (
                        <div key={event.id} className="relative flex items-start gap-6 py-4">
                          {/* Dot */}
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white shrink-0 ${
                            event.type === 'completed' ? 'border-green-400' :
                            event.type === 'updated' ? 'border-blue-400' :
                            'border-gray-300'
                          }`}>
                            {getEventIcon(event.type)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-[#1B2B48] text-sm">{event.title}</h4>
                              <span className="text-[10px] text-gray-400 font-bold shrink-0 mr-4">
                                {formatDate(event.date)}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-xs text-gray-500 font-bold">{event.description}</p>
                            )}
                            {event.actor && (
                              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                <User size={10} /> {event.actor}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Manager Tab */}
              {activeTab === 'manager' && (
                <div className="space-y-6">
                  {managerProfile ? (
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100 p-8 text-center">
                      <div className="w-24 h-24 rounded-full bg-[#1B2B48] text-white mx-auto flex items-center justify-center text-4xl mb-4 shadow-xl">
                        {managerProfile.avatar}
                      </div>
                      <h3 className="text-2xl font-black text-[#1B2B48]">{managerProfile.name}</h3>
                      <p className="text-sm text-gray-400 font-bold mt-1">{managerProfile.role}</p>
                      
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                          <p className="text-[10px] text-blue-400 font-bold mb-1">نوع الطلب</p>
                          <p className="font-bold text-blue-700 text-sm">
                            {unitStatus.requestType === 'technical' ? 'طلب فني' : 
                             unitStatus.requestType === 'clearance' ? 'إفراغ' : '-'}
                          </p>
                        </div>
                        <div className={`rounded-2xl p-4 border ${colorConfig.bg} ${colorConfig.border}`}>
                          <p className={`text-[10px] font-bold mb-1 ${colorConfig.text} opacity-70`}>الحالة</p>
                          <p className={`font-bold text-sm ${colorConfig.text}`}>{unitStatus.labelAr}</p>
                        </div>
                      </div>

                      {unitStatus.lastUpdated && (
                        <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                          <Clock size={12} /> آخر تحديث: {formatDate(unitStatus.lastUpdated)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-400">
                      <User size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">لا يوجد مسؤول مسند حالياً</p>
                    </div>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {documents.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <FileText size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold">لا توجد مستندات مرفقة</p>
                    </div>
                  ) : (
                    documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-[#E95D22]/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                            <FileText size={24} className="text-[#E95D22]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[#1B2B48] text-sm">{doc.name}</h4>
                            <p className="text-[10px] text-gray-400">
                              {doc.type} | {formatDate(doc.date)}
                            </p>
                          </div>
                        </div>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#1B2B48] text-white rounded-xl font-bold text-xs hover:bg-[#2a3f63] transition-colors"
                        >
                          <Download size={14} /> تحميل
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitProcessModal;
