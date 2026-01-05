
import React, { useState, useMemo } from 'react';
import { 
  Plus, CheckCircle, Clock, AlertCircle, FileStack, 
  FileText, Sheet, Search, Filter, User as UserIcon, 
  ChevronLeft, MoreHorizontal, Download, Printer
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, ClearanceRequest, ProjectSummary } from '../types';
import Modal from './Modal';
import ManageRequestModal from './ManageRequestModal';

interface ClearanceModuleProps {
  requests: ClearanceRequest[];
  projects: ProjectSummary[];
  currentUser: User | null;
  usersList: any[];
  onRefresh: () => void;
  filteredByProject?: string;
}

const ClearanceModule: React.FC<ClearanceModuleProps> = ({ 
  requests, 
  projects, 
  currentUser, 
  usersList, 
  onRefresh, 
  filteredByProject 
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ClearanceRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Logic ---
  const filteredData = useMemo(() => {
    return requests.filter(r => 
      r.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id_number?.includes(searchTerm) ||
      r.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

  const kpis = useMemo(() => {
    return {
      total: requests.length,
      completed: requests.filter(r => r.status === 'completed' || r.status === 'منجز').length,
      processing: requests.filter(r => r.status === 'pending' || r.status === 'new').length,
      alert: requests.filter(r => r.status === 'pending_modification' || r.status === 'rejected').length
    };
  }, [requests]);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'completed': 
      case 'منجز':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'pending_modification':
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'new':
      case 'جديد':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'completed': return 'منجز';
      case 'pending': return 'قيد المعالجة';
      case 'new': return 'جديد';
      case 'pending_modification': return 'مطلوب تعديل';
      case 'rejected': return 'مرفوض';
      default: return status || 'غير محدد';
    }
  };

  // Add handleUpdateStatus to properly update clearance request status in Supabase
  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeRequest?.id) return;
    
    try {
      const updatePayload: any = { status: newStatus };
      if (newStatus === 'completed' || newStatus === 'منجز') {
        updatePayload.progress = 100;
      }

      const { error } = await supabase
        .from('clearance_requests')
        .update(updatePayload)
        .eq('id', activeRequest.id);

      if (error) throw error;
      
      onRefresh();
      // Update local state to reflect changes in the UI immediately
      setActiveRequest(prev => prev ? { ...prev, ...updatePayload } : null);
    } catch (err: any) {
      console.error("Error updating clearance status:", err);
      alert("فشل تحديث الحالة: " + (err?.message || "خطأ في قاعدة البيانات"));
      throw err;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo" dir="rtl">
      
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#1B2B48]">سجل الإفراغات</h2>
          <p className="text-gray-400 text-sm mt-1">إدارة وتتبع طلبات إفراغ الوحدات العقارية</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm">
            <Sheet size={18} className="text-green-600" />
            تصدير Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm">
            <Printer size={18} className="text-blue-600" />
            تصدير PDF
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#E95D22] text-white rounded-xl font-black text-sm hover:brightness-110 shadow-lg shadow-orange-200 transition-all active:scale-95"
          >
            <Plus size={20} />
            تسجيل إفراغ جديد
          </button>
        </div>
      </div>

      {/* 2. Dashboard KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="إجمالي الطلبات" 
          value={kpis.total} 
          icon={<FileStack size={24} />} 
          color="text-[#1B2B48]" 
          bg="bg-gray-50"
        />
        <KPICard 
          title="مكتمل / منجز" 
          value={kpis.completed} 
          icon={<CheckCircle size={24} />} 
          color="text-green-600" 
          bg="bg-green-50/50"
        />
        <KPICard 
          title="قيد المعالجة" 
          value={kpis.processing} 
          icon={<Clock size={24} />} 
          color="text-blue-600" 
          bg="bg-blue-50/50"
        />
        <KPICard 
          title="تتطلب إجراء" 
          value={kpis.alert} 
          icon={<AlertCircle size={24} />} 
          color="text-red-600" 
          bg="bg-red-50/50"
        />
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input 
            type="text"
            placeholder="البحث باسم العميل، رقم الهوية، أو المشروع..."
            className="w-full pr-12 pl-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-[#1B2B48] focus:bg-white transition-all outline-none font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all w-full md:w-auto">
          <Filter size={18} />
          تصفية متقدمة
        </button>
      </div>

      {/* 4. Main Data Table */}
      <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">العميل</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">رقم الهوية</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">المشروع</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">الحالة</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">تاريخ التحديث</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-300 gap-4">
                      <FileText size={64} strokeWidth={1} />
                      <p className="text-xl font-bold">لا توجد طلبات إفراغ حالياً</p>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="text-[#E95D22] text-sm font-bold hover:underline"
                      >
                        اضغط هنا لإضافة أول طلب
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((req) => (
                  <tr 
                    key={req.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => { setActiveRequest(req); setIsManageModalOpen(true); }}
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1B2B48] flex items-center justify-center font-black text-xs border border-blue-100">
                          {req.client_name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-black text-[#1B2B48] text-sm">{req.client_name}</p>
                          <p className="text-[10px] text-gray-400 font-bold tracking-wider">{req.mobile || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-sm font-mono text-gray-500 font-bold">
                      {req.id_number || '-'}
                    </td>
                    <td className="p-6">
                      <span className="text-sm font-bold text-gray-600">{req.project_name || '-'}</span>
                    </td>
                    <td className="p-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${getStatusStyle(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="p-6 text-[11px] text-gray-400 font-bold" dir="ltr">
                      {req.updated_at ? new Date(req.updated_at).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="p-6 text-left">
                      <button className="p-2 text-gray-300 hover:text-[#1B2B48] hover:bg-white rounded-lg transition-all group-hover:bg-white">
                        <ChevronLeft size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals Integration */}
      <ManageRequestModal 
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        request={activeRequest}
        currentUser={currentUser}
        usersList={usersList}
        onUpdateStatus={handleUpdateStatus} // Correctly typed as (newStatus: string) => Promise<void>
        onUpdateDelegation={(d) => {}}
      />
      
      {/* ... Add New Request Modal Placeholder ... */}
    </div>
  );
};

// --- Sub-components ---

const KPICard = ({ title, value, icon, color, bg }: any) => (
  <div className={`p-6 rounded-[25px] ${bg} border border-white shadow-sm flex items-center justify-between group hover:-translate-y-1 transition-all duration-300`}>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
    </div>
    <div className={`p-4 rounded-2xl bg-white shadow-sm ${color}`}>
      {icon}
    </div>
  </div>
);

export default ClearanceModule;
