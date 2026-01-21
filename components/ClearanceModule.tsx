import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, CheckCircle, Clock, AlertCircle, FileStack, 
  FileText, Sheet, Search, Filter, User as UserIcon, 
  ChevronLeft, MoreHorizontal, Download, Printer, MapPin, Smartphone, Hash, Loader2
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
  const [isSearching, setIsSearching] = useState(false);

  // حالة نموذج إضافة إفراغ جديد
  const [addForm, setAddForm] = useState({
    client_name: '',
    id_number: '',
    project_name: '',
    mobile: '',
    building_number: '',
    unit_number: '',
    district: 'الرياض',
    city: 'الرياض'
  });

  // --- محرك البحث التلقائي بمجرد كتابة رقم الهوية ---
  useEffect(() => {
    const lookupClient = async () => {
      if (addForm.id_number.length === 10) {
        setIsSearching(true);
        try {
          // البحث في قاعدة البيانات عن بيانات العميل السابقة لضمان "نزول البيانات تلقائياً"
          const { data, error } = await supabase
            .from('deeds_requests')
            .select('*')
            .eq('id_number', addForm.id_number)
            .maybeSingle();

          if (data) {
            setAddForm(prev => ({
              ...prev,
              client_name: data.beneficiary_name || data.client_name,
              project_name: data.project_name,
              mobile: data.mobile,
              building_number: data.building_number,
              unit_number: data.unit_number,
              district: data.district || 'الرياض',
              city: data.city || 'الرياض'
            }));
          }
        } catch (err) {
          console.error("Lookup error:", err);
        } finally {
          setIsSearching(false);
        }
      }
    };
    lookupClient();
  }, [addForm.id_number]);

  const filteredData = useMemo(() => {
    return requests.filter(r => 
      (r.client_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.id_number?.includes(searchTerm)) ||
      (r.project_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [requests, searchTerm]);

  const kpis = useMemo(() => ({
    total: requests.length,
    completed: requests.filter(r => r.status === 'completed' || r.status === 'منجز').length,
    processing: requests.filter(r => r.status === 'pending' || r.status === 'new').length,
    alert: requests.filter(r => r.status === 'pending_modification' || r.status === 'rejected').length
  }), [requests]);

  const handleAddNew = async () => {
    if (!addForm.client_name || !addForm.id_number) return alert("الاسم ورقم الهوية مطلوبان");
    
    const { error } = await supabase.from('deeds_requests').insert([{
      client_name: addForm.client_name,
      id_number: addForm.id_number,
      project_name: addForm.project_name,
      mobile: addForm.mobile,
      building_number: addForm.building_number,
      unit_number: addForm.unit_number,
      status: 'new',
      created_at: new Date().toISOString()
    }]);

    if (!error) {
      alert("تم تسجيل طلب الإفراغ بنجاح ✅");
      setIsAddModalOpen(false);
      onRefresh();
    } else {
      alert("خطأ في الحفظ: " + error.message);
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'completed': case 'منجز': return 'bg-green-50 text-green-700 border-green-100';
      case 'pending_modification': case 'rejected': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'completed': return 'منجز';
      case 'new': return 'جديد';
      default: return 'قيد المعالجة';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo" dir="rtl">
      {/* الرأس والأزرار */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#1B2B48]">سجل الإفراغات</h2>
          <p className="text-gray-400 text-sm mt-1">إدارة وتتبع طلبات إفراغ الوحدات العقارية</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[#E95D22] text-white rounded-xl font-black text-sm hover:brightness-110 shadow-lg shadow-orange-200 transition-all active:scale-95">
          <Plus size={20} /> تسجيل إفراغ جديد
        </button>
      </div>

      {/* لوحة المؤشرات (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="إجمالي الطلبات" value={kpis.total} icon={<FileStack size={24} />} color="text-[#1B2B48]" bg="bg-gray-50" />
        <KPICard title="منجز" value={kpis.completed} icon={<CheckCircle size={24} />} color="text-green-600" bg="bg-green-50/50" />
        <KPICard title="قيد المعالجة" value={kpis.processing} icon={<Clock size={24} />} color="text-blue-600" bg="bg-blue-50/50" />
        <KPICard title="تتطلب إجراء" value={kpis.alert} icon={<AlertCircle size={24} />} color="text-red-600" bg="bg-red-50/50" />
      </div>

      {/* شريط البحث */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
          <input type="text" placeholder="البحث باسم العميل، رقم الهوية، أو المشروع..." className="w-full pr-12 pl-4 py-3 bg-gray-50 rounded-xl outline-none font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* الجدول الرئيسي */}
      <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="p-6 text-xs font-black text-gray-400 uppercase">العميل</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase">رقم الهوية</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase">المشروع</th>
                <th className="p-6 text-xs font-black text-gray-400 uppercase">الحالة</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setActiveRequest(req); setIsManageModalOpen(true); }}>
                  <td className="p-6 font-black text-[#1B2B48] text-sm">{req.client_name}</td>
                  <td className="p-6 text-sm font-mono text-gray-500 font-bold">{req.id_number}</td>
                  <td className="p-6 text-sm font-bold text-gray-600">{req.project_name}</td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${getStatusStyle(req.status)}`}>
                      {getStatusLabel(req.status)}
                    </span>
                  </td>
                  <td className="p-6 text-left"><ChevronLeft size={20} className="text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال إضافة إفراغ جديد مع ميزة البحث التلقائي */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="تسجيل إفراغ جديد">
        <div className="space-y-4 font-cairo">
          <div className="relative">
            <label className="text-xs font-bold text-gray-400 block mb-1">رقم الهوية</label>
            <input type="text" maxLength={10} className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none font-bold focus:border-[#E95D22]" value={addForm.id_number} onChange={e => setAddForm({...addForm, id_number: e.target.value})} placeholder="أدخل 10 أرقام..." />
            {isSearching && <Loader2 className="absolute left-4 top-10 animate-spin text-orange-500" size={20} />}
          </div>
          <InputGroup label="اسم العميل" value={addForm.client_name} onChange={v => setAddForm({...addForm, client_name: v})} icon={<UserIcon size={18}/>} />
          <div className="grid grid-cols-2 gap-4">
            <InputGroup label="رقم المبنى" value={addForm.building_number} onChange={v => setAddForm({...addForm, building_number: v})} icon={<Hash size={18}/>} />
            <InputGroup label="رقم الوحدة" value={addForm.unit_number} onChange={v => setAddForm({...addForm, unit_number: v})} icon={<Hash size={18}/>} />
          </div>
          <InputGroup label="المشروع" value={addForm.project_name} onChange={v => setAddForm({...addForm, project_name: v})} icon={<MapPin size={18}/>} />
          <InputGroup label="رقم الجوال" value={addForm.mobile} onChange={v => setAddForm({...addForm, mobile: v})} icon={<Smartphone size={18}/>} />
          <button onClick={handleAddNew} className="w-full bg-[#1B2B48] text-white py-4 rounded-xl font-black shadow-lg hover:brightness-110 mt-2 transition">حفظ بيانات الإفراغ</button>
        </div>
      </Modal>

      <ManageRequestModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} request={activeRequest} currentUser={currentUser} usersList={usersList} onUpdateStatus={onRefresh} onUpdateDelegation={() => {}} />
    </div>
  );
};

const KPICard = ({ title, value, icon, color, bg }: any) => (
  <div className={`p-6 rounded-[25px] ${bg} border border-white shadow-sm flex items-center justify-between hover:-translate-y-1 transition-all`}>
    <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">{title}</p><h3 className={`text-3xl font-black ${color}`}>{value}</h3></div>
    <div className={`p-4 rounded-2xl bg-white shadow-sm ${color}`}>{icon}</div>
  </div>
);

const InputGroup = ({ label, value, onChange, icon }: any) => (
  <div>
    <label className="text-xs font-bold text-gray-400 block mb-1">{label}</label>
    <div className="relative">
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">{icon}</div>
      <input type="text" className="w-full p-4 pr-12 bg-gray-50 rounded-xl border border-gray-200 outline-none font-bold focus:border-[#1B2B48] transition" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  </div>
);

export default ClearanceModule;