import { supabase } from '../supabaseClient';

interface SyncApprovedRequestToWorkParams {
  requestId: number;
  projectId?: number | null;
  projectName?: string | null;
  taskName: string;
  authority?: string | null;
  department?: string | null;
  notes: string;
  matchKeywords?: string[];
}

const normalize = (value: unknown): string => String(value || '').trim().toLowerCase();

const resolveProjectIdByName = async (projectName?: string | null): Promise<number | null> => {
  const name = String(projectName || '').trim();
  if (!name) return null;

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, title')
    .limit(500);

  if (error || !data) return null;

  const target = normalize(name);
  const exact = data.find((p: any) => normalize(p?.name) === target || normalize(p?.title) === target);
  return exact?.id ?? null;
};

/**
 * جلب أعمال المشروع بطرق متعددة تستوعب كل أسماء الأعمدة الممكنة
 * ملاحظة: نستخدم select('*') بدلاً من تحديد أسماء أعمدة بحروف كبيرة لتفادي مشاكل حساسية الحالة
 */
const fetchProjectWorks = async (projectId: number, projectName?: string | null): Promise<any[]> => {
  // محاولة 1: باستخدام eq مع projectId
  const attempt1 = await supabase
    .from('project_works')
    .select('*')
    .eq('projectId', projectId);

  if (!attempt1.error && attempt1.data && attempt1.data.length > 0) {
    return attempt1.data;
  }

  // محاولة 2: باستخدام eq مع project_id (snake_case)
  const attempt2 = await supabase
    .from('project_works')
    .select('*')
    .eq('project_id', projectId);

  if (!attempt2.error && attempt2.data && attempt2.data.length > 0) {
    return attempt2.data;
  }

  // محاولة 3: جلب الكل وتصفية في JavaScript (الأكثر موثوقية)
  const attempt3 = await supabase
    .from('project_works')
    .select('*')
    .order('id', { ascending: false })
    .limit(2000);

  if (!attempt3.error && attempt3.data) {
    const projectNames = [projectName, `مشروع #${projectId}`].filter(Boolean).map(n => normalize(n!));
    return attempt3.data.filter((w: any) => {
      const wId = Number(w.projectId ?? w.projectid ?? w.project_id ?? -1);
      if (wId === projectId) return true;
      if (projectName && projectNames.includes(normalize(w.project_name))) return true;
      return false;
    });
  }

  return [];
};

export const syncApprovedRequestToProjectWork = async ({
  requestId,
  projectId,
  projectName,
  taskName,
  authority,
  department,
  notes,
  matchKeywords = [],
}: SyncApprovedRequestToWorkParams): Promise<void> => {
  const resolvedProjectId = Number(projectId) || (await resolveProjectIdByName(projectName));
  if (!resolvedProjectId) {
    console.warn('⚠️ syncApprovedRequestToProjectWork: لم يتم تحديد projectId');
    return;
  }

  const works = await fetchProjectWorks(resolvedProjectId, projectName);

  const exactTag = `رقم الطلب: #${requestId}`;
  const serviceTypeKeyword = matchKeywords[0] ? normalize(matchKeywords[0]) : '';

  const matchedWork = works.find((w: any) => {
    const notesText = normalize(w?.notes);
    const taskText = normalize(w?.task_name);

    // الأولوية 1: وسم مرجعي دقيق في الملاحظات
    if (notesText.includes(normalize(exactTag))) {
      return true;
    }

    // الأولوية 2: اسم المهمة يحتوي على نوع الخدمة (بدون غموض)
    if (serviceTypeKeyword && serviceTypeKeyword.length >= 4 && taskText.includes(serviceTypeKeyword)) {
      return true;
    }

    return false;
  });

  if (matchedWork) {
    const existingNotes = String(matchedWork?.notes || '');
    const mergedNotes = existingNotes.includes(exactTag)
      ? existingNotes
      : `${existingNotes}${existingNotes ? ' | ' : ''}${exactTag} | تمت الموافقة النهائية`;

    const { error: updateError } = await supabase
      .from('project_works')
      .update({ status: 'completed', notes: mergedNotes })
      .eq('id', matchedWork.id);

    if (updateError) {
      console.error('❌ فشل تحديث سجل عمل المشروع:', updateError.message);
    } else {
      console.log(`✅ تم تحديث سجل عمل المشروع #${matchedWork.id} → منجز`);
    }
    return;
  }

  // لا يوجد سجل مطابق — إنشاء سجل جديد
  // ملاحظة مهمة: لا نُدرج created_at يدوياً — نترك قاعدة البيانات تضعها تلقائياً
  // نُحاول أولاً بـ projectId ثم بـ project_id كبديل (لتوافق أسماء الأعمدة)
  const baseInsertPayload: any = {
    task_name: taskName,
    project_name: projectName || `مشروع #${resolvedProjectId}`,
    status: 'completed',
    authority: authority || 'غير محدد',
    department: department || 'عام',
    notes,
  };

  // محاولة 1: مع projectId (camelCase)
  let { error: insertError } = await supabase.from('project_works').insert({
    ...baseInsertPayload,
    projectId: resolvedProjectId,
  });

  if (!insertError) {
    console.log(`✅ تم إنشاء سجل عمل المشروع (projectId) للمشروع #${resolvedProjectId}`);
    return;
  }

  // محاولة 2: مع project_id (snake_case)
  console.warn('⚠️ فشل الإدراج بـ projectId – إعادة المحاولة بـ project_id:', insertError.message);
  const { error: retryError } = await supabase.from('project_works').insert({
    ...baseInsertPayload,
    project_id: resolvedProjectId,
  });

  if (retryError) {
    const errMsg = `فشل إنشاء سجل عمل المشروع للمشروع #${resolvedProjectId}: ${retryError.message}`;
    console.error('❌', errMsg);
    throw new Error(errMsg);
  }

  console.log(`✅ تم إنشاء سجل عمل المشروع (project_id) للمشروع #${resolvedProjectId}`);
};
