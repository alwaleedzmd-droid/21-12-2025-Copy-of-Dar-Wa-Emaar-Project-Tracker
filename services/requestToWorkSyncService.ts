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
  if (!resolvedProjectId) return;

  const { data: works, error: worksError } = await supabase
    .from('project_works')
    .select('id, task_name, notes, status')
    .or(`projectId.eq.${resolvedProjectId},projectid.eq.${resolvedProjectId},project_id.eq.${resolvedProjectId}`)
    .order('id', { ascending: false });

  if (worksError) throw worksError;

  const refLabel = `#${requestId}`;
  const normalizedKeywords = matchKeywords.map(k => normalize(k)).filter(Boolean);

  const matchedWork = (works || []).find((w: any) => {
    const notesText = normalize(w?.notes);
    const taskText = normalize(w?.task_name);

    if (notesText.includes(refLabel.toLowerCase()) || notesText.includes(`رقم الطلب: ${refLabel}`)) {
      return true;
    }

    return normalizedKeywords.some(k => taskText.includes(k) || notesText.includes(k));
  });

  if (matchedWork) {
    const existingNotes = String(matchedWork?.notes || '');
    const approvalStamp = `تمت الموافقة النهائية على الطلب #${requestId}`;
    const mergedNotes = existingNotes.includes(approvalStamp)
      ? existingNotes
      : `${existingNotes}${existingNotes ? ' | ' : ''}${approvalStamp}`;

    const { error: updateError } = await supabase
      .from('project_works')
      .update({
        status: 'completed',
        notes: mergedNotes,
      })
      .eq('id', matchedWork.id);

    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from('project_works').insert({
    projectId: resolvedProjectId,
    project_name: projectName || `مشروع #${resolvedProjectId}`,
    task_name: taskName,
    status: 'completed',
    authority: authority || 'غير محدد',
    department: department || 'عام',
    notes,
    created_at: new Date().toISOString(),
  });

  if (insertError) throw insertError;
};
