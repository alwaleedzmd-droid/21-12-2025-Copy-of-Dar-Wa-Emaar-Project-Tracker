import React, { useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { TechnicalRequest, ClearanceRequest } from '../types';

interface ProjectRequestsViewProps {
  projectId: number;
  projectName: string;
  technicalRequests: TechnicalRequest[];
  clearanceRequests: ClearanceRequest[];
}

const ProjectRequestsView: React.FC<ProjectRequestsViewProps> = ({
  projectId,
  projectName,
  technicalRequests,
  clearanceRequests
}) => {
  // تصفية الطلبات التقنية المرتبطة بالمشروع
  const relatedTechnical = useMemo(() => {
    return (technicalRequests || []).filter(req => 
      req.project_id === projectId || 
      req.projectId === projectId ||
      (projectName && req.project_name === projectName)
    );
  }, [technicalRequests, projectId, projectName]);

  // تصفية طلبات الإفراغ المرتبطة بالمشروع
  const relatedClearance = useMemo(() => {
    return (clearanceRequests || []).filter(req =>
      projectName && req.project_name === projectName
    );
  }, [clearanceRequests, projectName]);

  // دمج وتصنيف الطلبات
  const allRequests = useMemo(() => {
    const combined: any[] = [
      ...relatedTechnical.map(req => ({
        id: req.id,
        type: 'technical',
        name: req.service_type || 'طلب تقني',
        status: req.status,
        description: req.details || req.scope || 'بدون وصف',
        createdAt: req.created_at,
        assignedTo: req.assigned_to,
        progress: req.progress || 0
      })),
      ...relatedClearance.map(req => ({
        id: req.id,
        type: 'clearance',
        name: `${req.request_type === 'METER_TRANSFER' ? 'نقل ملكية عداد' : 'إفراغ'} - ${req.client_name}`,
        status: req.status,
        description: `رقم الهوية: ${req.id_number}`,
        createdAt: req.created_at,
        assignedTo: req.assigned_to,
        progress: 0
      }))
    ];
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [relatedTechnical, relatedClearance]);

  const getStatusStyle = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';
    if (['approved', 'مقبول', 'completed', 'منجز'].includes(normalizedStatus)) {
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: CheckCircle2, label: '✅ مقبول' };
    }
    if (['rejected', 'مرفوض'].includes(normalizedStatus)) {
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: XCircle, label: '❌ مرفوض' };
    }
    if (['in_progress', 'pending', 'جديد', 'متابعة'].includes(normalizedStatus)) {
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: Clock, label: '⏳ قيد المراجعة' };
    }
    return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', icon: AlertCircle, label: '❓ غير محدد' };
  };

  if (allRequests.length === 0) {
    return (
      <div className="bg-white p-8 rounded-[25px] border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-400 text-center mb-2">لا توجد طلبات تقنية أو إفراغات مرتبطة</h3>
        <p className="text-xs text-gray-300 text-center">الطلبات الجديدة ستظهر هنا تلقائياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-black text-[#1B2B48] mb-4">الطلبات المرتبطة بالمشروع</h3>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {allRequests.map(req => {
          const statusStyle = getStatusStyle(req.status);
          const StatusIcon = statusStyle.icon;
          
          return (
            <div 
              key={`${req.type}-${req.id}`}
              className={`p-4 rounded-[18px] border transition-all hover:shadow-md ${statusStyle.bg} ${statusStyle.border}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                      req.type === 'technical' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {req.type === 'technical' ? '🔧 تقني' : '📋 إفراغ'}
                    </span>
                    <h4 className="font-bold text-[#1B2B48] truncate">{req.name}</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{req.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>📅 {new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                    {req.assignedTo && <span>👤 {req.assignedTo}</span>}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[10px] ${statusStyle.text}`}>
                    <StatusIcon size={14} />
                    {statusStyle.label}
                  </span>
                  {req.progress !== undefined && req.progress > 0 && (
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-l from-green-500 to-emerald-400 transition-all"
                        style={{ width: `${Math.min(req.progress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectRequestsView;
