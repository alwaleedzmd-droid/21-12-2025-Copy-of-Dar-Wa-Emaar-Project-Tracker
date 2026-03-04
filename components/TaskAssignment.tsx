import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, UserCheck, Plus, Loader2, Search, 
  CheckCircle2, Clock, AlertTriangle, Users, Building2,
  FileText, Timer, Sparkles, X as XIcon
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';
import { ProjectWork } from '../types';
import Modal from './Modal';
import { notificationService } from '../services/notificationService';

const TaskAssignment: React.FC = () => {
  const { projectWorks, projects, appUsers, currentUser, refreshData } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  
  const [assignModalWork, setAssignModalWork] = useState<ProjectWork | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignDescription, setAssignDescription] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    task_name: '', project_id: '', authority: '', department: '',
    notes: '', assigned_to: '', assignment_description: '',
  });

  const [selectedWorks, setSelectedWorks] = useState<Set<number>>(new Set());
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkUserId, setBulkUserId] = useState('');
  const [bulkDescription, setBulkDescription] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const getUserName = (userId: string) => appUsers.find(u => u.id === userId)?.name || '';
  const getRoleName = (role: string) => role === 'ADMIN' ? 'مدير النظام' : role === 'PR_MANAGER' ? 'PR' : role === 'TECHNICAL' ? 'المشاريع' : 'CX';

  const getAssignmentAge = (work: ProjectWork) => {
    if (!work.assigned_at) return null;
    return Math.round((Date.now() - new Date(work.assigned_at).getTime()) / (1000 * 60 * 60));
  };

  const getEffectiveStatus = (work: ProjectWork): string => {
    if (work.assignment_status === 'completed' || work.status === 'completed') return 'completed';
    if (work.assigned_at) {
      const hours = (Date.now() - new Date(work.assigned_at).getTime()) / (1000 * 60 * 60);
      if (hours >= 48) return 'overdue';
    }
    return work.assignment_status || (work.assigned_to ? 'pending' : '');
  };

  const filteredWorks = useMemo(() => {
    let result = [...(projectWorks || [])];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w => 
        w.task_name?.toLowerCase().includes(q) || w.project_name?.toLowerCase().includes(q) ||
        w.authority?.toLowerCase().includes(q) || w.assigned_to_name?.toLowerCase().includes(q) ||
        w.assignment_description?.toLowerCase().includes(q)
      );
    }
    if (filterProject) result = result.filter(w => String(w.projectId) === filterProject || w.project_name === filterProject);
    if (filterStatus === 'overdue') {
      result = result.filter(w => {
        if (w.assignment_status === 'completed' || w.status === 'completed') return false;
        if (!w.assigned_at) return false;
        return (Date.now() - new Date(w.assigned_at).getTime()) / (1000 * 60 * 60) >= 48;
      });
    } else if (filterStatus) {
      result = result.filter(w => w.status === filterStatus || w.assignment_status === filterStatus);
    }
    if (filterAssigned === 'unassigned') result = result.filter(w => !w.assigned_to);
    else if (filterAssigned === 'assigned') result = result.filter(w => !!w.assigned_to);
    else if (filterAssigned) result = result.filter(w => w.assigned_to === filterAssigned);
    return result;
  }, [projectWorks, searchQuery, filterProject, filterStatus, filterAssigned]);

  const stats = useMemo(() => {
    const total = projectWorks?.length || 0;
    const assigned = projectWorks?.filter(w => w.assigned_to).length || 0;
    const unassigned = total - assigned;
    const completed = projectWorks?.filter(w => w.status === 'completed' || w.assignment_status === 'completed').length || 0;
    const inProgress = projectWorks?.filter(w => w.assignment_status === 'in_progress').length || 0;
    const overdue = projectWorks?.filter(w => {
      if (w.assignment_status === 'completed' || w.status === 'completed') return false;
      if (!w.assigned_at) return false;
      return (Date.now() - new Date(w.assigned_at).getTime()) / (1000 * 60 * 60) >= 48;
    }).length || 0;
    const userCounts: Record<string, number> = {};
    projectWorks?.forEach(w => { if (w.assigned_to) userCounts[w.assigned_to] = (userCounts[w.assigned_to] || 0) + 1; });
    return { total, assigned, unassigned, completed, inProgress, overdue, userCounts };
  }, [projectWorks]);

  const handleAssign = async () => {
    if (!assignModalWork || !selectedUserId) return;
    setIsAssigning(true);
    try {
      const userName = getUserName(selectedUserId);
      const { error } = await supabase.from('project_works').update({ 
        assigned_to: selectedUserId, assigned_to_name: userName,
        assignment_description: assignDescription || null,
        assigned_at: new Date().toISOString(), assignment_status: 'pending',
      }).eq('id', assignModalWork.id);
      if (error) throw error;
      const assignedUser = appUsers.find(u => u.id === selectedUserId);
      if (assignedUser) {
        notificationService.send(assignedUser.role,
          `📋 تم إسناد مهمة إليك: ${assignModalWork.task_name}${assignDescription ? ` — ${assignDescription}` : ''}`,
          `/my-tasks`, currentUser?.name);
      }
      alert(`✅ تم إسناد "${assignModalWork.task_name}" إلى ${userName} بنجاح`);
      setAssignModalWork(null); setSelectedUserId(''); setAssignDescription('');
      refreshData();
    } catch (err: any) { alert('فشل الإسناد: ' + err.message); }
    finally { setIsAssigning(false); }
  };

  const handleBulkAssign = async () => {
    if (!bulkUserId || selectedWorks.size === 0) return;
    setIsBulkAssigning(true);
    try {
      const userName = getUserName(bulkUserId);
      const ids = Array.from(selectedWorks);
      const { error } = await supabase.from('project_works').update({
        assigned_to: bulkUserId, assigned_to_name: userName,
        assignment_description: bulkDescription || null,
        assigned_at: new Date().toISOString(), assignment_status: 'pending',
      }).in('id', ids);
      if (error) throw error;
      const assignedUser = appUsers.find(u => u.id === bulkUserId);
      if (assignedUser) {
        notificationService.send(assignedUser.role,
          `📋 تم إسناد ${ids.length} مهمة إليك${bulkDescription ? ` — ${bulkDescription}` : ''}`,
          `/my-tasks`, currentUser?.name);
      }
      alert(`✅ تم إسناد ${ids.length} مهمة إلى ${userName} بنجاح`);
      setIsBulkAssignOpen(false); setSelectedWorks(new Set()); setBulkUserId(''); setBulkDescription('');
      refreshData();
    } catch (err: any) { alert('فشل الإسناد الجماعي: ' + err.message); }
    finally { setIsBulkAssigning(false); }
  };

  const handleUnassign = async (work: ProjectWork) => {
    if (!window.confirm(`إلغاء إسناد "${work.task_name}" من ${work.assigned_to_name}؟`)) return;
    try {
      const { error } = await supabase.from('project_works').update({ 
        assigned_to: null, assigned_to_name: null, assignment_description: null,
        assigned_at: null, assignment_status: null,
      }).eq('id', work.id);
      if (error) throw error;
      refreshData();
    } catch (err: any) { alert('فشل إلغاء الإسناد: ' + err.message); }
  };

  const handleCreateTask = async () => {
    if (!newTaskForm.task_name || !newTaskForm.project_id) { alert('يرجى تعبئة اسم المهمة واختيار المشروع'); return; }
    setIsCreating(true);
    try {
      const project = projects.find(p => String(p.id) === newTaskForm.project_id);
      const projectName = project?.name || project?.title || project?.client || '';
      const assignedName = newTaskForm.assigned_to ? getUserName(newTaskForm.assigned_to) : null;
      const insertData: any = {
        task_name: newTaskForm.task_name, project_name: projectName,
        projectId: Number(newTaskForm.project_id),
        authority: newTaskForm.authority || null, department: newTaskForm.department || null,
        notes: newTaskForm.notes || null, status: 'in_progress',
      };
      if (newTaskForm.assigned_to) {
        insertData.assigned_to = newTaskForm.assigned_to;
        insertData.assigned_to_name = assignedName;
        insertData.assignment_description = newTaskForm.assignment_description || null;
        insertData.assigned_at = new Date().toISOString();
        insertData.assignment_status = 'pending';
      }
      const { error } = await supabase.from('project_works').insert(insertData);
      if (error) throw error;
      notificationService.send('PR_MANAGER',
        `🆕 مهمة جديدة: ${newTaskForm.task_name} - ${projectName}${assignedName ? ` (مسندة إلى ${assignedName})` : ''}`,
        `/projects/${newTaskForm.project_id}`, currentUser?.name);
      if (newTaskForm.assigned_to) {
        const assignedUser = appUsers.find(u => u.id === newTaskForm.assigned_to);
        if (assignedUser) {
          notificationService.send(assignedUser.role,
            `📋 مهمة جديدة مُسندة إليك: ${newTaskForm.task_name}${newTaskForm.assignment_description ? ` — ${newTaskForm.assignment_description}` : ''}`,
            `/my-tasks`, currentUser?.name);
        }
      }
      alert('✅ تم إنشاء المهمة بنجاح');
      setIsNewTaskOpen(false);
      setNewTaskForm({ task_name: '', project_id: '', authority: '', department: '', notes: '', assigned_to: '', assignment_description: '' });
      refreshData();
    } catch (err: any) { alert('فشل الإنشاء: ' + err.message); }
    finally { setIsCreating(false); }
  };

  const toggleWorkSelection = (id: number) => {
    const next = new Set(selectedWorks);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedWorks(next);
  };

  const uniqueProjects = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => map.set(String(p.id), p.name || p.title || p.client || `مشروع ${p.id}`));
    return Array.from(map.entries());
  }, [projects]);

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#1B2B48] flex items-center gap-3">
            <ClipboardList size={28} className="text-[#E95D22]" />
            إسناد المهام والأعمال
          </h2>
          <p className="text-gray-400 text-sm font-bold mt-1">إدارة وتوزيع الأعمال على الموظفين — صلاحية مدير النظام</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && selectedWorks.size > 0 && (
            <button onClick={() => setIsBulkAssignOpen(true)}
              className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
              <Users size={18} /> إسناد جماعي ({selectedWorks.size})
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setIsNewTaskOpen(true)}
              className="bg-[#E95D22] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 transition-all">
              <Plus size={20} /> مهمة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'إجمالي', value: stats.total, icon: <ClipboardList size={16} />, color: 'text-[#1B2B48]', iconColor: 'text-blue-600' },
          { label: 'مُسندة', value: stats.assigned, icon: <UserCheck size={16} />, color: 'text-green-600', iconColor: 'text-green-600' },
          { label: 'غير مُسندة', value: stats.unassigned, icon: <AlertTriangle size={16} />, color: 'text-orange-600', iconColor: 'text-orange-600' },
          { label: 'تحت الإجراء', value: stats.inProgress, icon: <Clock size={16} />, color: 'text-blue-500', iconColor: 'text-blue-500' },
          { label: 'منجزة', value: stats.completed, icon: <CheckCircle2 size={16} />, color: 'text-emerald-600', iconColor: 'text-emerald-600' },
          { label: 'متأخرة ⚠️', value: stats.overdue, icon: <Sparkles size={16} />, color: 'text-red-600', iconColor: 'text-red-500', highlight: stats.overdue > 0 },
        ].map((s, i) => (
          <div key={i} className={`bg-white p-4 rounded-[20px] border shadow-sm ${s.highlight ? 'border-red-300 bg-red-50' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={s.iconColor}>{s.icon}</span>
              <span className="text-gray-400 text-[10px] font-bold">{s.label}</span>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Employee Workload */}
      {Object.keys(stats.userCounts).length > 0 && (
        <div className="bg-white p-5 rounded-[25px] border shadow-sm">
          <h3 className="font-black text-[#1B2B48] mb-3 flex items-center gap-2 text-sm">
            <Users size={18} className="text-[#E95D22]" /> توزيع الأعمال
          </h3>
          <div className="flex flex-wrap gap-2">
            {appUsers.filter(u => stats.userCounts[u.id]).sort((a, b) => (stats.userCounts[b.id] || 0) - (stats.userCounts[a.id] || 0))
              .map(user => (
                <button key={user.id} onClick={() => setFilterAssigned(filterAssigned === user.id ? '' : user.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    filterAssigned === user.id ? 'bg-[#1B2B48] text-white border-[#1B2B48]' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                  }`}>
                  <span className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] ${filterAssigned === user.id ? 'bg-white/20 text-white' : 'bg-[#1B2B48] text-white'}`}>{user.name[0]}</span>
                  {user.name}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${filterAssigned === user.id ? 'bg-white/20' : 'bg-[#E95D22]/10 text-[#E95D22]'}`}>{stats.userCounts[user.id]}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-[20px] border shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border rounded-xl font-bold text-sm outline-none focus:border-[#E95D22]"
              placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <select title="تصفية المشروع" className="px-3 py-2.5 bg-gray-50 border rounded-xl font-bold text-sm outline-none focus:border-[#E95D22]" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">كل المشاريع</option>
            {uniqueProjects.map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
          </select>
          <select title="تصفية الحالة" className="px-3 py-2.5 bg-gray-50 border rounded-xl font-bold text-sm outline-none focus:border-[#E95D22]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="in_progress">قيد المتابعة</option>
            <option value="completed">منجز</option>
            <option value="overdue">متأخر ⚠️</option>
          </select>
          <select title="تصفية الإسناد" className="px-3 py-2.5 bg-gray-50 border rounded-xl font-bold text-sm outline-none focus:border-[#E95D22]" value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
            <option value="">الكل</option>
            <option value="assigned">مُسندة</option>
            <option value="unassigned">غير مُسندة</option>
          </select>
          {(searchQuery || filterProject || filterStatus || filterAssigned) && (
            <button onClick={() => { setSearchQuery(''); setFilterProject(''); setFilterStatus(''); setFilterAssigned(''); }}
              className="px-3 py-2.5 text-red-500 bg-red-50 rounded-xl font-bold text-sm hover:bg-red-100">مسح</button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-[30px] border shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              {isAdmin && <th className="p-4 w-10"><input type="checkbox" title="تحديد الكل" className="rounded"
                checked={selectedWorks.size === filteredWorks.length && filteredWorks.length > 0}
                onChange={() => setSelectedWorks(selectedWorks.size === filteredWorks.length ? new Set() : new Set(filteredWorks.map(w => w.id)))} /></th>}
              <th className="p-4 font-black text-gray-400 text-xs">المهمة</th>
              <th className="p-4 font-black text-gray-400 text-xs">المشروع</th>
              <th className="p-4 font-black text-gray-400 text-xs">الحالة</th>
              <th className="p-4 font-black text-gray-400 text-xs">المسنَد إليه</th>
              <th className="p-4 font-black text-gray-400 text-xs">الوقت</th>
              {isAdmin && <th className="p-4 font-black text-gray-400 text-xs">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredWorks.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 5} className="p-12 text-center text-gray-400 font-bold">
                <ClipboardList size={36} className="mx-auto mb-2 text-gray-300" /> لا توجد مهام مطابقة
              </td></tr>
            ) : filteredWorks.map(work => {
              const es = getEffectiveStatus(work); const age = getAssignmentAge(work);
              return (
                <tr key={work.id} className={`hover:bg-gray-50 transition-colors ${es === 'overdue' ? 'bg-red-50/50' : ''}`}>
                  {isAdmin && <td className="p-4"><input type="checkbox" className="rounded" checked={selectedWorks.has(work.id)} onChange={() => toggleWorkSelection(work.id)} /></td>}
                  <td className="p-4">
                    <p className="font-bold text-[#1B2B48] text-sm">{work.task_name}</p>
                    {work.assignment_description && (
                      <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1"><FileText size={10} className="text-[#E95D22]" />
                        {work.assignment_description.length > 50 ? work.assignment_description.slice(0, 50) + '...' : work.assignment_description}</p>
                    )}
                    {work.authority && <p className="text-[10px] text-gray-400 font-bold">{work.authority}</p>}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-black flex items-center gap-1 w-fit">
                      <Building2 size={10} /> {work.project_name || '-'}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black ${
                      es === 'completed' ? 'bg-green-50 text-green-700' : es === 'overdue' ? 'bg-red-50 text-red-700' :
                      es === 'in_progress' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                      {es === 'completed' ? 'منجز ✅' : es === 'overdue' ? 'متأخر ⚠️' : es === 'in_progress' ? 'تحت الإجراء ▶️' : work.assigned_to ? 'بانتظار البدء ⏳' : 'قيد المتابعة'}
                    </span>
                  </td>
                  <td className="p-4">
                    {work.assigned_to_name ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 bg-[#1B2B48] text-white rounded flex items-center justify-center font-black text-[9px]">{work.assigned_to_name[0]}</span>
                        <span className="font-bold text-xs text-[#1B2B48]">{work.assigned_to_name}</span>
                      </div>
                    ) : <span className="text-gray-400 text-[10px] font-bold">—</span>}
                  </td>
                  <td className="p-4">
                    {age !== null ? (
                      <div className="flex items-center gap-1">
                        <Timer size={12} className={age >= 48 ? 'text-red-500' : age >= 36 ? 'text-amber-500' : 'text-gray-400'} />
                        <span className={`text-[10px] font-bold ${age >= 48 ? 'text-red-600' : age >= 36 ? 'text-amber-600' : 'text-gray-500'}`}>
                          {age >= 24 ? `${Math.round(age / 24)}ي` : `${age}س`}</span>
                      </div>
                    ) : <span className="text-gray-300 text-[10px]">—</span>}
                  </td>
                  {isAdmin && (
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setAssignModalWork(work); setSelectedUserId(work.assigned_to || ''); setAssignDescription(work.assignment_description || ''); }}
                          className="px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 flex items-center gap-1">
                          <UserCheck size={12} /> {work.assigned_to ? 'تغيير' : 'إسناد'}
                        </button>
                        {work.assigned_to && (
                          <button onClick={() => handleUnassign(work)} title="إلغاء الإسناد"
                            className="px-2 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-100">
                            <XIcon size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredWorks.length > 0 && (
          <div className="bg-gray-50 px-4 py-2 border-t text-[10px] text-gray-400 font-bold">عرض {filteredWorks.length} من {projectWorks?.length || 0}</div>
        )}
      </div>

      {/* Assign Modal */}
      <Modal isOpen={!!assignModalWork} onClose={() => { setAssignModalWork(null); setSelectedUserId(''); setAssignDescription(''); }} title="إسناد المهمة لموظف">
        <div className="space-y-5 pt-2" dir="rtl">
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
            <p className="font-black text-[#1B2B48] mb-1">{assignModalWork?.task_name}</p>
            <p className="text-sm text-gray-500 font-bold">{assignModalWork?.project_name}</p>
            {assignModalWork?.assigned_to_name && <p className="text-xs text-blue-600 font-bold mt-2">المسنَد إليه حالياً: {assignModalWork.assigned_to_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-black text-gray-600 mb-2">اختر الموظف</label>
            <select title="اختيار الموظف" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]"
              value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              <option value="">-- اختر موظف --</option>
              {appUsers.map(user => (<option key={user.id} value={user.id}>{user.name} ({getRoleName(user.role)}){stats.userCounts[user.id] ? ` - ${stats.userCounts[user.id]} مهمة` : ''}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-black text-gray-600 mb-2"><FileText size={14} className="inline ml-1 text-[#E95D22]" /> وصف الإسناد</label>
            <textarea className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none min-h-[80px] focus:border-[#E95D22] text-sm"
              placeholder="اكتب وصف أو تعليمات للموظف حول هذه المهمة..." value={assignDescription} onChange={e => setAssignDescription(e.target.value)} />
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center gap-2">
            <Timer size={16} className="text-amber-600" />
            <p className="text-xs font-bold text-amber-700">سيتم متابعة الإنجاز تلقائياً — تذكير بعد 48 ساعة من تاريخ الإسناد عبر الذكاء الاصطناعي</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAssign} disabled={isAssigning || !selectedUserId}
              className="flex-1 bg-[#1B2B48] text-white py-4 rounded-2xl font-black shadow-xl hover:bg-[#2a3f63] disabled:opacity-50">
              {isAssigning ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'تأكيد الإسناد'}</button>
            <button onClick={() => { setAssignModalWork(null); setSelectedUserId(''); setAssignDescription(''); }}
              className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Assign Modal */}
      <Modal isOpen={isBulkAssignOpen} onClose={() => setIsBulkAssignOpen(false)} title={`إسناد ${selectedWorks.size} مهمة جماعياً`}>
        <div className="space-y-5 pt-2" dir="rtl">
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
            <p className="font-bold text-sm text-purple-700">تم تحديد {selectedWorks.size} مهمة للإسناد الجماعي</p>
          </div>
          <div>
            <label className="block text-sm font-black text-gray-600 mb-2">اختر الموظف</label>
            <select title="اختيار الموظف" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]"
              value={bulkUserId} onChange={e => setBulkUserId(e.target.value)}>
              <option value="">-- اختر موظف --</option>
              {appUsers.map(user => (<option key={user.id} value={user.id}>{user.name} ({getRoleName(user.role)})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-black text-gray-600 mb-2">وصف الإسناد</label>
            <textarea className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none min-h-[80px] focus:border-[#E95D22] text-sm"
              placeholder="وصف مشترك لجميع المهام المحددة..." value={bulkDescription} onChange={e => setBulkDescription(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleBulkAssign} disabled={isBulkAssigning || !bulkUserId}
              className="flex-1 bg-[#1B2B48] text-white py-4 rounded-2xl font-black shadow-xl hover:bg-[#2a3f63] disabled:opacity-50">
              {isBulkAssigning ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'تأكيد الإسناد الجماعي'}</button>
            <button onClick={() => setIsBulkAssignOpen(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* New Task Modal */}
      <Modal isOpen={isNewTaskOpen} onClose={() => setIsNewTaskOpen(false)} title="إنشاء مهمة جديدة وإسنادها">
        <div className="space-y-4 pt-2" dir="rtl">
          <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]"
            placeholder="اسم المهمة *" value={newTaskForm.task_name} onChange={e => setNewTaskForm({ ...newTaskForm, task_name: e.target.value })} />
          <select title="المشروع" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]"
            value={newTaskForm.project_id} onChange={e => setNewTaskForm({ ...newTaskForm, project_id: e.target.value })}>
            <option value="">-- اختر المشروع * --</option>
            {uniqueProjects.map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]"
              placeholder="جهة المراجعة" value={newTaskForm.authority} onChange={e => setNewTaskForm({ ...newTaskForm, authority: e.target.value })} />
            <input className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]"
              placeholder="القسم الداخلي" value={newTaskForm.department} onChange={e => setNewTaskForm({ ...newTaskForm, department: e.target.value })} />
          </div>
          <textarea className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none min-h-[60px] focus:border-[#E95D22]"
            placeholder="ملاحظات..." value={newTaskForm.notes} onChange={e => setNewTaskForm({ ...newTaskForm, notes: e.target.value })} />
          <div className="border-t pt-4 space-y-3">
            <label className="block text-sm font-black text-gray-600"><UserCheck size={14} className="inline ml-1 text-[#E95D22]" /> إسناد إلى موظف</label>
            <select title="الموظف" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none focus:border-[#E95D22]"
              value={newTaskForm.assigned_to} onChange={e => setNewTaskForm({ ...newTaskForm, assigned_to: e.target.value })}>
              <option value="">-- بدون إسناد --</option>
              {appUsers.map(user => (<option key={user.id} value={user.id}>{user.name} ({getRoleName(user.role)})</option>))}
            </select>
            {newTaskForm.assigned_to && (
              <textarea className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none min-h-[60px] focus:border-[#E95D22] text-sm"
                placeholder="وصف الإسناد — تعليمات تفصيلية للموظف..."
                value={newTaskForm.assignment_description} onChange={e => setNewTaskForm({ ...newTaskForm, assignment_description: e.target.value })} />
            )}
          </div>
          <button onClick={handleCreateTask} disabled={isCreating || !newTaskForm.task_name || !newTaskForm.project_id}
            className="w-full bg-[#1B2B48] text-white py-4 rounded-2xl font-black shadow-xl hover:bg-[#2a3f63] disabled:opacity-50">
            {isCreating ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'إنشاء المهمة'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default TaskAssignment;
