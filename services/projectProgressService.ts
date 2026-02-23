/**
 * خدمة تحديث نسبة إنجاز المشروع
 * يتم تحديثها تلقائياً بناءً على عدد الأعمال المنجزة
 */

import { supabase } from '../supabaseClient';

export const updateProjectProgress = async (projectId: number) => {
  try {
    // جلب جميع الأعمال المرتبطة بالمشروع
    const { data: works, error: worksError } = await supabase
      .from('project_works')
      .select('id, status')
      .or(`projectId.eq.${projectId},projectid.eq.${projectId},project_id.eq.${projectId}`);

    if (worksError) {
      console.warn('⚠️ خطأ جلب أعمال المشروع:', worksError.message);
      return;
    }

    if (!works || works.length === 0) {
      // لا توجد أعمال، لا نعدّل الـ progress
      return;
    }

    // حساب عدد الأعمال المنجزة
    const COMPLETED_STATUSES = ['completed', 'منجز', 'مكتمل'];
    const completedCount = works.filter(w => 
      COMPLETED_STATUSES.includes(w?.status?.toLowerCase() || '')
    ).length;

    // حساب النسبة المئوية
    const progress = Math.round((completedCount / works.length) * 100);

    // تحديث المشروع بالنسبة الجديدة
    const { error: updateError } = await supabase
      .from('projects')
      .update({ progress })
      .eq('id', projectId);

    if (updateError) {
      console.warn('⚠️ خطأ تحديث نسبة إنجاز المشروع:', updateError.message);
      return;
    }

    console.log(`✅ تم تحديث نسبة إنجاز المشروع #${projectId} إلى ${progress}%`);

  } catch (err: any) {
    console.error('❌ خطأ في updateProjectProgress:', err);
  }
};

/**
 * تحديث نسب إنجاز عدة مشاريع
 */
export const updateMultipleProjectsProgress = async (projectIds: number[]) => {
  for (const projectId of projectIds) {
    await updateProjectProgress(projectId);
  }
};
