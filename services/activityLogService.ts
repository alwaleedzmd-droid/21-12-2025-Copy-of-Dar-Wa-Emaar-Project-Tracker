import { supabase } from '../supabaseClient';

export type ActionType = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'assign' | 'handler_change' | 'deadline_change' | 'justify_delay' | 'complete' | 'status_change' | 'comment';
export type EntityType = 'project' | 'work' | 'deed_request' | 'technical_request' | 'assignment' | 'workflow' | 'user';

interface LogEntry {
  userId: string;
  userName: string;
  userRole: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  description: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
}

export const activityLogService = {
  /**
   * تسجيل نشاط في سجل النظام — يعمل بصمت (لا يوقف العمليات عند الفشل)
   */
  async log(entry: LogEntry) {
    try {
      await supabase.from('activity_log').insert({
        user_id: entry.userId,
        user_name: entry.userName,
        user_role: entry.userRole,
        action_type: entry.actionType,
        entity_type: entry.entityType,
        entity_id: entry.entityId || null,
        entity_name: entry.entityName || '',
        description: entry.description,
        old_value: entry.oldValue || {},
        new_value: entry.newValue || {},
        metadata: entry.metadata || {},
      });
    } catch (e) {
      console.warn('[ActivityLog] فشل تسجيل النشاط:', e);
    }
  },

  /**
   * جلب سجل نشاطات كيان محدد (مشروع، عمل، طلب)
   */
  async getForEntity(entityType: EntityType, entityId: string, limit = 50) {
    try {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch {
      return [];
    }
  },

  /**
   * جلب آخر النشاطات — للوحة المدير
   */
  async getRecent(limit = 30) {
    try {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch {
      return [];
    }
  },

  /**
   * جلب نشاطات مستخدم محدد
   */
  async getForUser(userId: string, limit = 30) {
    try {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch {
      return [];
    }
  },

  /**
   * جلب نشاطات بنوع محدد (مثلاً: كل التكليفات، كل التأخيرات)
   */
  async getByActionType(actionType: ActionType, limit = 30) {
    try {
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('action_type', actionType)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch {
      return [];
    }
  }
};
