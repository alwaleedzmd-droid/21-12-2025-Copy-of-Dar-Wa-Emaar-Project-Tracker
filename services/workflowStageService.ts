import { supabase } from '../supabaseClient';

/**
 * خدمة إدارة مراحل سير العمل والتحديثات
 */

export interface StageProgressData {
  request_id: number;
  request_type: string;
  stage_id: number;
  status: 'pending' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

/**
 * تحديث حالة مرحلة معينة
 */
export async function updateStageProgress(progressId: number, data: Partial<StageProgressData>) {
  try {
    const { error } = await supabase
      .from('workflow_stage_progress')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error updating stage progress:', err);
    return { success: false, error: err };
  }
}

/**
 * إنشاء مرحلة تقدم جديدة إذا لم تكن موجودة
 */
export async function createStageProgress(data: StageProgressData) {
  try {
    // تحقق من وجود المرحلة
    const { data: existing } = await supabase
      .from('workflow_stage_progress')
      .select('id')
      .eq('request_id', data.request_id)
      .eq('stage_id', data.stage_id)
      .single();

    if (existing) {
      // تحديث إن وجدت
      return updateStageProgress(existing.id, data);
    }

    // إنشاء جديدة
    const { error } = await supabase
      .from('workflow_stage_progress')
      .insert([data]);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error creating stage progress:', err);
    return { success: false, error: err };
  }
}

/**
 * إضافة تعليق على مرحلة
 */
export async function addStageComment(
  stageProgressId: number,
  userEmail: string,
  userName: string,
  comment: string
) {
  try {
    const { error } = await supabase
      .from('workflow_stage_comments')
      .insert([
        {
          stage_progress_id: stageProgressId,
          user_email: userEmail,
          user_name: userName,
          comment: comment
        }
      ]);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error adding stage comment:', err);
    return { success: false, error: err };
  }
}

/**
 * جلب تعليقات مرحلة معينة
 */
export async function getStageComments(stageProgressId: number) {
  try {
    const { data, error } = await supabase
      .from('workflow_stage_comments')
      .select('*')
      .eq('stage_progress_id', stageProgressId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching stage comments:', err);
    return [];
  }
}

/**
 * بدء تنفيذ مرحلة (تغيير الحالة من pending إلى in_progress)
 */
export async function startStage(
  progressId: number,
  completedBy: string
) {
  try {
    const { error } = await supabase
      .from('workflow_stage_progress')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        completed_by: completedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error starting stage:', err);
    return { success: false, error: err };
  }
}

/**
 * إكمال مرحلة (تغيير الحالة من in_progress إلى completed)
 */
export async function completeStage(
  progressId: number,
  completedBy: string,
  notes?: string
) {
  try {
    const { error } = await supabase
      .from('workflow_stage_progress')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: completedBy,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error completing stage:', err);
    return { success: false, error: err };
  }
}

/**
 * إعادة تعيين مرحلة (العودة إلى pending)
 */
export async function resetStage(progressId: number) {
  try {
    const { error } = await supabase
      .from('workflow_stage_progress')
      .update({
        status: 'pending',
        started_at: null,
        completed_at: null,
        completed_by: null,
        notes: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', progressId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error resetting stage:', err);
    return { success: false, error: err };
  }
}

/**
 * جلب حالة جميع مراحل طلب معين
 */
export async function getRequestStageProgress(
  requestId: number,
  requestType: string
) {
  try {
    const { data, error } = await supabase
      .from('workflow_stage_progress')
      .select('*')
      .eq('request_id', requestId)
      .eq('request_type', requestType)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching stage progress:', err);
    return [];
  }
}

/**
 * تهيئة جميع مراحل طلب جديد
 */
export async function initializeStagesForRequest(
  requestId: number,
  requestType: string,
  workflowRouteId: number
) {
  try {
    // جلب جميع المراحل المعرفة للمسار
    const { data: stages, error: stagesError } = await supabase
      .from('workflow_stages')
      .select('id')
      .eq('workflow_route_id', workflowRouteId)
      .eq('is_active', true);

    if (stagesError) throw stagesError;

    const { data: existingProgress, error: existingError } = await supabase
      .from('workflow_stage_progress')
      .select('stage_id')
      .eq('request_id', requestId)
      .eq('request_type', requestType);

    if (existingError) throw existingError;

    const existingStageIds = new Set((existingProgress || []).map((item: any) => item.stage_id));

    // إنشاء سجل تقدم لكل مرحلة
    const progressRecords = (stages || [])
      .filter((stage: any) => !existingStageIds.has(stage.id))
      .map((stage: any) => ({
        request_id: requestId,
        request_type: requestType,
        stage_id: stage.id,
        status: 'pending',
        created_at: new Date().toISOString()
      }));

    if (progressRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('workflow_stage_progress')
        .insert(progressRecords);

      if (insertError) throw insertError;
    }

    return { success: true, stageCount: progressRecords.length, skippedExisting: existingStageIds.size };
  } catch (err) {
    console.error('Error initializing stages:', err);
    return { success: false, error: err };
  }
}
