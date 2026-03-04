import { supabase } from '../supabaseClient';

export const statisticsSnapshotService = {
  /**
   * حفظ لقطة يومية — يُستدعى تلقائياً عند فتح لوحة الإحصائيات
   * يحفظ لقطة واحدة فقط لكل يوم (UNIQUE constraint)
   */
  async saveDaily() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // تحقق من وجود لقطة اليوم
      const { data: existing } = await supabase
        .from('statistics_snapshots')
        .select('id')
        .eq('snapshot_date', today)
        .maybeSingle();

      if (existing) return; // لقطة اليوم موجودة مسبقاً

      // جلب جميع البيانات بالتوازي
      const [projectsRes, worksRes, techRes, deedsRes] = await Promise.all([
        supabase.from('projects').select('id, status, name'),
        supabase.from('project_works').select('id, status, assigned_to, expected_completion_date'),
        supabase.from('technical_requests').select('id, status'),
        supabase.from('deeds_requests').select('id, status'),
      ]);

      const projects = projectsRes.data || [];
      const works = worksRes.data || [];
      const tech = techRes.data || [];
      const deeds = deedsRes.data || [];

      const now = new Date();

      // حساب الأعمال المتأخرة
      const overdueWorks = works.filter((w: any) => {
        if (!w.expected_completion_date) return false;
        if (w.status === 'مكتمل' || w.status === 'منجز') return false;
        return new Date(w.expected_completion_date) < now;
      });

      // توزيع حالات المشاريع
      const projectStatuses: Record<string, number> = {};
      projects.forEach((p: any) => {
        const s = p.status || 'غير محدد';
        projectStatuses[s] = (projectStatuses[s] || 0) + 1;
      });

      // توزيع حالات الأعمال
      const workStatuses: Record<string, number> = {};
      works.forEach((w: any) => {
        const s = w.status || 'غير محدد';
        workStatuses[s] = (workStatuses[s] || 0) + 1;
      });

      const snapshot = {
        snapshot_date: today,
        total_projects: projects.length,
        active_projects: projects.filter((p: any) => p.status !== 'مكتمل').length,
        completed_projects: projects.filter((p: any) => p.status === 'مكتمل').length,
        total_works: works.length,
        completed_works: works.filter((w: any) => w.status === 'مكتمل' || w.status === 'منجز').length,
        overdue_works: overdueWorks.length,
        total_technical_requests: tech.length,
        completed_technical_requests: tech.filter((t: any) => t.status === 'مكتمل').length,
        total_deed_requests: deeds.length,
        completed_deed_requests: deeds.filter((d: any) => d.status === 'مكتمل').length,
        total_assignments: works.filter((w: any) => w.assigned_to).length,
        pending_assignments: works.filter((w: any) => w.assigned_to && w.status !== 'مكتمل' && w.status !== 'منجز').length,
        raw_data: {
          project_statuses: projectStatuses,
          work_statuses: workStatuses,
          overdue_work_ids: overdueWorks.map((w: any) => w.id),
        }
      };

      await supabase.from('statistics_snapshots').insert(snapshot);
      console.log('[Snapshot] ✅ تم حفظ لقطة يوم:', today);
    } catch (e) {
      console.warn('[Snapshot] فشل حفظ اللقطة:', e);
    }
  },

  /**
   * جلب لقطات آخر N يوم — لرسم المخططات البيانية
   */
  async getLastDays(days = 30): Promise<any[]> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data } = await supabase
        .from('statistics_snapshots')
        .select('*')
        .gte('snapshot_date', fromDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      return data || [];
    } catch {
      return [];
    }
  },

  /**
   * مقارنة بين فترتين — لتقرير الأداء
   */
  async compare(date1: string, date2: string) {
    try {
      const { data } = await supabase
        .from('statistics_snapshots')
        .select('*')
        .in('snapshot_date', [date1, date2])
        .order('snapshot_date', { ascending: true });

      if (!data || data.length < 2) return null;

      const [old, current] = data;
      return {
        old,
        current,
        changes: {
          projects: current.total_projects - old.total_projects,
          completedWorks: current.completed_works - old.completed_works,
          overdueWorks: current.overdue_works - old.overdue_works,
          assignments: current.total_assignments - old.total_assignments,
          techRequests: current.total_technical_requests - old.total_technical_requests,
          deedRequests: current.total_deed_requests - old.total_deed_requests,
        }
      };
    } catch {
      return null;
    }
  }
};
