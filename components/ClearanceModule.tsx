import React, { useState } from 'react';
import { 
  Plus, CheckCircle2, XCircle, AlertCircle, ShieldCheck, Activity, 
  Smartphone, User as UserIcon, Building2, MapPin, 
  Hash, CreditCard, Upload, Download, UserCheck, Trash2, FileSpreadsheet, FileText
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, ClearanceRequest, ProjectSummary } from '../types';
import { BANKS_LIST } from '../constants';
import Modal from './Modal';
import ManageRequestModal from './ManageRequestModal';
import * as XLSX from 'xlsx';

interface ClearanceModuleProps {
  requests: ClearanceRequest[];
  projects: ProjectSummary[];
  currentUser: User | null;
  usersList: any[];
  onRefresh: () => void;
  filteredByProject?: string;
}

const ClearanceModule: React.FC<ClearanceModuleProps> = ({ 
  requests, projects, currentUser, usersList, onRefresh, filteredByProject 
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ClearanceRequest | null>(null);

  // وضع الإدخال: 'individual' (فردي) أو 'bulk' (جماعي/إكسل)
  const [entryMode, setEntryMode] = useState<'individual' | 'bulk'>('individual');

  const [clearForm, setClearForm] = useState({
    client_name: '', mobile: '', id_number: '', project_id: '', project_name: filteredByProject || '', 
    plot_number: '', deal_value: '', bank_name: '', deed_number: ''
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // للمرفق الفردي
  const [excelFile, setExcelFile] = useState<File | null>(null); // لملف الإكسل
  const [uploading, setUploading] = useState(false);

  const canAction = (roles: string[]) => currentUser && roles.includes(currentUser.role);

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'completed': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> منجز</span>;
        case 'rejected': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><XCircle size={12}/> مرفوض</span>;
        case 'pending_modification': return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><AlertCircle size={12}/> مطلوب تعديل</span>;
        case 'pending': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><Activity size={12}/> متابعة</span>;
        case 'new': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><Activity size={12}/> جديد</span>;
        default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-[10px] font-bold w-fit">{status}</span>;
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = fileName;
      const { error: uploadError } = await supabase.storage.from('clearance-files').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('clearance-files').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Upload Error:', error);
      return null;
    }
  };

  // --- دالة المعالجة الرئيسية ---
  const handleMainSubmit = async () => {
    setUploading(true);

    try {
      // 1️⃣ الحالة الأولى: رفع ملف إكسل (جماعي)
      if (entryMode === 'bulk') {
        if (!excelFile) { alert("يرجى اختيار ملف Excel"); setUploading(false); return; }

        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsName = wb.SheetNames[0];
            const ws = wb.Sheets[wsName];
            const rawData = XLSX.utils.sheet_to_json(ws);

            if (rawData.length === 0) { alert("الملف فارغ!"); setUploading(false); return; }

            const formattedData = rawData.map((row: any) => {
              const projNameFromExcel = row['المشروع'] || row['project'] || row['Project'] || '';
              const foundProject = projects.find(p => p.client === projNameFromExcel || p.title === projNameFromExcel);

              // ✅ دالة لتنظيف الأرقام (تمنع الخطأ invalid input syntax)
              const cleanNumber = (val: any) => {
                 if (!val) return 0;
                 // إزالة الفواصل والنصوص وترك الأرقام فقط
                 const strVal = val.toString().replace(/[^0-9.]/g, ''); 
                 return parseFloat(strVal) || 0;
              };

              // ✅ دالة لتنظيف النصوص (مثل الجوال)
              const cleanString = (val: any) => val ? val.toString().trim() : '';

              return {
                client_name: row['اسم العميل'] || row['Client Name'] || 'غير محدد',
                mobile: cleanString(row['رقم الجوال'] || row['Mobile']),
                id_number: cleanString(row['رقم الهوية'] || row['ID']),
                // استخدام دالة التنظيف هنا:
                deal_value: cleanNumber(row['قيمة الصفقة'] || row['Value']), 
                bank_name: row['البنك'] || row['Bank'] || '',
                deed_number: cleanString(row['رقم الصك'] || row['Deed No']),
                plot_number: cleanString(row['رقم القطعة'] || row['Plot No']),
                project_name: foundProject ? (foundProject.client || foundProject.title) : (projNameFromExcel || 'غير محدد'),
                project_id: foundProject ? foundProject.id.toString() : null,
                submitted_by: currentUser?.name || 'استيراد Excel',
                status: 'new'
              };
            });

            const { error } = await supabase.from('clearance_requests').insert(formattedData);
            if (error) throw error;

            alert(`تم إنشاء ${formattedData.length} طلب بنجاح! ✅`);
            setIsAddModalOpen(false);
            setExcelFile(null);
            onRefresh();

          } catch (err: any) {
            console.error(err);
            alert("فشل الاستيراد: " + err.message);
          } finally {
            setUploading(false);
          }
        };
        reader.readAsBinaryString(excelFile);
        return; // الخروج لانتظار الـ Reader
      }

      // 2️⃣ الحالة الثانية: إدخال فردي (يدوي)
      if (!clearForm.client_name || (!clearForm.project_id && !clearForm.project_name)) {
        alert("الاسم والمشروع مطلوبان"); setUploading(false); return;
      }

      let finalProjectId = clearForm.project_id;
      let finalProjectName = clearForm.project_name;

      if (!finalProjectId && filteredByProject) {
          const p = projects.find(proj => proj.client === filteredByProject || proj.title === filteredByProject);
          if (p) { finalProjectId = p.id.toString(); finalProjectName = p.client || p.title; }
      }

      let attachmentUrl = null;
      if (selectedFile) {
        attachmentUrl = await handleFileUpload(selectedFile);
        if (!attachmentUrl) { setUploading(false); return; }
      }

      const { error } = await supabase.from('clearance_requests').insert([{
        ...clearForm, 
        project_id: finalProjectId, 
        project_name: finalProjectName,
        submitted_by: currentUser?.name, 
        status: 'new', 
        attachment_url: attachmentUrl
      }]);

      if (!error) {
        alert("تمت الإضافة بنجاح");
        setIsAddModalOpen(false);
        setClearForm({
          client_name: '', mobile: '', id_number: '', project_id: '', project_name: filteredByProject || '', 
          plot_number: '', deal_value: '', bank_name: '', deed_number: ''
        });
        setSelectedFile(null);
        onRefresh();
      } else {
        alert(error.message);
      }

    } catch (error: any) {
      alert("حدث خطأ غير متوقع: " + error.message);
    } finally {
      if (entryMode === 'individual') setUploading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!activeRequest) return;
    const { error } = await supabase.from('clearance_requests').update({ status: newStatus }).eq('id', activeRequest.id);
    if (!error) {
      setActiveRequest({ ...activeRequest, status: newStatus } as any);
      onRefresh();
    }
  };

  const updateDelegation = async (assignedTo: string) => {
    if (!activeRequest) return;
    const { error } = await supabase.from('clearance_requests').update({ assigned_to: assignedTo }).eq('id', activeRequest.id);
    if (!error) {
      setActiveRequest({ ...activeRequest, assigned_to: assignedTo } as any);
      onRefresh();
    }
  };

  const removeSelectedFile = (e: React.MouseEvent, type: 'individual' | 'excel') => {
    e.stopPropagation(); e.preventDefault();
    if (type === 'individual') setSelectedFile(null);
    else setExcelFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-[#1B2B48]">
          {filteredByProject ? `إفراغات مشروع ${filteredByProject}` : 'سجل الإفراغات'}
        </h2>
        <div className="flex gap-4">
          {canAction(['ADMIN', 'CONVEYANCE', 'PR_MANAGER']) && (
            <button onClick={() => setIsAddModalOpen(true)} className="bg-[#1B2B48] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-md hover:brightness-110 transition-all">
              <Plus size={18} /> تسجيل إفراغ جديد
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-6 text-xs text-gray-400">العميل</th>
              {!filteredByProject && <th className="p-6 text-xs text-gray-400">المشروع</th>}
              <th className="p-6 text-xs text-gray-400">بواسطة</th>
              <th className="p-6 text-xs text-gray-400">رقم الصك</th>
              <th className="p-6 text-xs text-gray-400">قيمة الصفقة</th>
              <th className="p-6 text-xs text-gray-400">المرفقات</th>
              <th className="p-6 text-xs text-gray-400">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {requests.map(r => (
              <tr key={r.id} onClick={() => { setActiveRequest(r); setIsManageModalOpen(true); }} className="hover:bg-gray-50 cursor-pointer transition-colors">
                <td className="p-6">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#1B2B48]">{r.client_name}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1"><Smartphone size={10}/> {r.mobile}</span>
                  </div>
                </td>
                {!filteredByProject && <td className="p-6 text-sm font-bold text-gray-500">{r.project_name}</td>}
                <td className="p-6">
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><UserCheck size={12} /></div>
                      <span className="text-xs font-bold text-[#1B2B48]">{r.submitted_by || 'غير محدد'}</span>
                   </div>
                </td>
                <td className="p-6 text-xs font-mono text-gray-400">{r.deed_number || '-'}</td>
                <td className="p-6 text-sm font-bold text-green-600">{r.deal_value ? `${parseFloat(r.deal_value).toLocaleString()} ر.س` : '-'}</td>
                <td className="p-6" onClick={(e) => e.stopPropagation()}>
                  {r.attachment_url ? (
                    <a href={r.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors w-fit">
                      <Download size={14} /> تحميل
                    </a>
                  ) : <span className="text-gray-300 text-xs">-</span>}
                </td>
                <td className="p-6">{getStatusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="تسجيل طلب إفراغ جديد">
        <div className="space-y-4 text-right">
            
            {/* ✅ تبويبات الاختيار (فردي / إكسل) */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
               <button onClick={() => setEntryMode('individual')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${entryMode === 'individual' ? 'bg-white text-[#1B2B48] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  <UserIcon size={16} /> فردي
               </button>
               <button onClick={() => setEntryMode('bulk')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${entryMode === 'bulk' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  <FileSpreadsheet size={16} /> ملف Excel (جماعي)
               </button>
            </div>

            {/* --- نموذج الإدخال الفردي --- */}
            {entryMode === 'individual' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">اسم العميل</label>
                    <div className="relative"><UserIcon className="absolute right-3 top-4 text-gray-300 w-4 h-4" /><input className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="الاسم الكامل" value={clearForm.client_name} onChange={e => setClearForm({...clearForm, client_name: e.target.value})} /></div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">رقم الجوال</label>
                    <div className="relative"><Smartphone className="absolute right-3 top-4 text-gray-300 w-4 h-4" /><input className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="05xxxxxxxx" value={clearForm.mobile} onChange={e => setClearForm({...clearForm, mobile: e.target.value})} /></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">المشروع</label>
                    <div className="relative"><Building2 className="absolute right-3 top-4 text-gray-300 w-4 h-4" />
                    <select className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold appearance-none" value={clearForm.project_id} onChange={e => {const selected = projects.find(p => p.id.toString() === e.target.value); setClearForm({...clearForm, project_id: e.target.value, project_name: selected?.client || selected?.title || ''});}} disabled={!!filteredByProject}>
                      <option value="">اختر المشروع...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.client || p.title}</option>)}
                    </select></div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">رقم القطعة</label>
                    <div className="relative"><MapPin className="absolute right-3 top-4 text-gray-300 w-4 h-4" /><input className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="مثال: 10/أ" value={clearForm.plot_number} onChange={e => setClearForm({...clearForm, plot_number: e.target.value})} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-gray-400 font-bold block mb-1">قيمة الصفقة</label><div className="relative"><CreditCard className="absolute right-3 top-4 text-gray-300 w-4 h-4" /><input type="number" className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="القيمة" value={clearForm.deal_value} onChange={e => setClearForm({...clearForm, deal_value: e.target.value})} /></div></div>
                    <div><label className="text-xs text-gray-400 font-bold block mb-1">البنك</label><div className="relative"><CreditCard className="absolute right-3 top-4 text-gray-300 w-4 h-4" /><select className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold appearance-none" value={clearForm.bank_name} onChange={e => setClearForm({...clearForm, bank_name: e.target.value})}><option value="">اختر البنك...</option>{BANKS_LIST.map(b => <option key={b} value={b}>{b}</option>)}</select></div></div>
                </div>

                <div><label className="text-xs text-gray-400 font-bold block mb-1">رقم الصك</label><div className="relative"><Hash className="absolute right-3 top-4 text-gray-300 w-4 h-4" /><input className="w-full p-4 pr-10 bg-gray-50 rounded-2xl border outline-none font-bold" placeholder="رقم الصك" value={clearForm.deed_number} onChange={e => setClearForm({...clearForm, deed_number: e.target.value})} /></div></div>

                <div className={`p-4 rounded-2xl border ${selectedFile ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'} hover:bg-gray-100 transition-colors cursor-pointer relative`}>
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} disabled={!!selectedFile} />
                    <div className="text-center">
                        {selectedFile ? (
                            <div className="flex items-center justify-between px-4">
                              <div className="flex items-center gap-2 text-green-700 font-bold">
                                  <CheckCircle2 size={24} />
                                  <span className="text-sm">{selectedFile.name}</span>
                              </div>
                              <button onClick={(e) => removeSelectedFile(e, 'individual')} className="z-10 p-2 bg-white rounded-full text-red-500 hover:bg-red-50 shadow-sm transition-all hover:scale-110">
                                  <XCircle size={20} />
                              </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                              <Upload size={24} className="mb-2" />
                              <span className="text-xs font-bold">اضغط هنا لإرفاق صورة الصك أو الهوية</span>
                            </div>
                        )}
                    </div>
                </div>
              </>
            )}

            {/* --- نموذج رفع الإكسل (الجماعي) --- */}
            {entryMode === 'bulk' && (
              <div className="space-y-4 py-6">
                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-800 text-xs font-bold leading-relaxed">
                    ℹ️ تأكد من أن ملف الإكسل يحتوي على الأعمدة: <br/>
                    (اسم العميل، رقم الجوال، المشروع، قيمة الصفقة، البنك، رقم الصك، رقم القطعة)
                 </div>

                 <div className={`p-10 rounded-3xl border-2 ${excelFile ? 'border-green-500 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'} hover:bg-gray-100 transition-all cursor-pointer relative flex flex-col items-center justify-center gap-4`}>
                    <input type="file" accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => e.target.files && setExcelFile(e.target.files[0])} disabled={!!excelFile} />
                    
                    {excelFile ? (
                        <>
                           <FileSpreadsheet size={48} className="text-green-600" />
                           <p className="font-bold text-[#1B2B48] text-lg">{excelFile.name}</p>
                           <button onClick={(e) => removeSelectedFile(e, 'excel')} className="z-10 px-4 py-2 bg-white rounded-full text-red-500 border border-red-100 font-bold hover:bg-red-50 shadow-sm transition-all">
                              إزالة الملف
                           </button>
                        </>
                    ) : (
                        <>
                           <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 mb-2">
                              <FileText size={32} />
                           </div>
                           <div className="text-center">
                              <p className="font-bold text-[#1B2B48] text-lg">اضغط لرفع ملف Excel</p>
                              <p className="text-xs text-gray-400 mt-1">يجب أن يكون الامتداد .xlsx أو .xls</p>
                           </div>
                        </>
                    )}
                 </div>
              </div>
            )}

            <button onClick={handleMainSubmit} disabled={uploading} className="w-full bg-[#1B2B48] text-white py-5 rounded-[25px] font-black shadow-xl mt-4 hover:brightness-110 transition-all disabled:opacity-50">
                {uploading ? (entryMode === 'bulk' ? "جاري استيراد البيانات..." : "جاري الرفع والحفظ...") : (entryMode === 'bulk' ? "استيراد وإنشاء الطلبات" : "حفظ الطلب وإرسال")}
            </button>
        </div>
      </Modal>

      <ManageRequestModal 
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        request={activeRequest}
        currentUser={currentUser}
        usersList={usersList}
        onUpdateStatus={updateStatus}
        onUpdateDelegation={updateDelegation}
      />
    </div>
  );
};

export default ClearanceModule;