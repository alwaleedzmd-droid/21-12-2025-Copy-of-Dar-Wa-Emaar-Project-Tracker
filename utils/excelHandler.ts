
import * as XLSX from 'xlsx';
import { User } from '../types';

/**
 * واجهة تمثل البيانات المستخرجة من الإكسل والمجهزة لقاعدة البيانات
 */
export interface ClearanceImportData {
  region: string;
  city: string;
  project_name: string;
  plan_number: string;
  unit_number: string;
  old_deed_number: string;
  deed_date: string;
  client_name: string;
  id_number: string;
  mobile: string;
  birth_date: string;
  unit_value: number;
  tax_number: string;
  bank_name: string;
  contract_type: string;
  new_deed_number: string;
  new_deed_date: string;
  sakani_support_number: string;
  status: string;
  submitted_by: string;
  project_id?: number;
}

export interface TechnicalImportData {
  project_id: number;
  service_type: string;
  reviewing_entity: string;
  details: string;
  status: string;
  scope: string;
  project_name?: string;
}

export interface ProjectWorkImportData {
  projectId: number;
  task_name: string;
  authority: string;
  department: string;
  notes: string;
  status: string;
  project_name?: string;
}

/**
 * معالج ملفات الإكسل الخاص بطلبات الإفراغ
 */
export const parseClearanceExcel = (
  file: File, 
  projectId: number | null, 
  currentUser: User | null
): Promise<ClearanceImportData[]> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("لم يتم اختيار ملف."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawData.length === 0) {
          reject(new Error("ملف الإكسل فارغ."));
          return;
        }

        const formattedData: ClearanceImportData[] = rawData.map((row) => ({
          region: row['المنطقة'] || '',
          city: row['مدينة العقار'] || '',
          project_name: row['اسم المشروع'] || '',
          plan_number: String(row['رقم المخطط'] || ''),
          unit_number: String(row['رقم الوحدة'] || ''),
          old_deed_number: String(row['رقم الصك'] || ''),
          deed_date: row['تاريخ الصك'] || '',
          client_name: row['اسم المستفيد'] || '',
          id_number: String(row['هوية المستفيد'] || ''),
          mobile: String(row['رقم جوال المستفيد'] || ''),
          birth_date: row['تاريخ الميلاد ( هجري )'] || '',
          unit_value: parseFloat(row['قيمة الوحدة'] || row['قيمة الوحده']) || 0,
          tax_number: String(row['الرقم الضريبي'] || ''),
          bank_name: row['الجهة التمويلية'] || '',
          contract_type: row['نوع العقد التمويلي'] || '',
          new_deed_number: String(row['رقم الصك الجديد'] || ''),
          new_deed_date: row['تاريخ الصك الجديد'] || '',
          sakani_support_number: String(row['رقم عقد الدعم'] || ''),
          status: 'جديد',
          submitted_by: currentUser?.name || 'نظام آلي',
          project_id: projectId || undefined
        })).filter(item => item.client_name && item.id_number);

        resolve(formattedData);
      } catch (error) {
        reject(new Error("حدث خطأ أثناء معالجة ملف الإكسل."));
      }
    };
    reader.readAsBinaryString(file);
  });
};

/**
 * معالج ملفات الإكسل للأعمال الفنية
 */
export const parseTechnicalRequestsExcel = (
  file: File,
  projectId: number | null,
  projectName: string | null
): Promise<TechnicalImportData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const formattedData: TechnicalImportData[] = rawData.map(row => ({
          project_id: projectId || parseInt(row['رقم المشروع']),
          service_type: row['بيان العمل'] || row['نوع الخدمة'],
          reviewing_entity: row['جهة المراجعة'],
          details: row['التفاصيل'] || row['الملاحظات'] || '',
          status: 'new',
          scope: row['النطاق'] || 'EXTERNAL',
          project_name: projectName || row['اسم المشروع']
        })).filter(item => item.project_id && item.service_type);

        resolve(formattedData);
      } catch (error) {
        reject(new Error("خطأ في معالجة إكسل الطلبات الفنية"));
      }
    };
    reader.readAsBinaryString(file);
  });
};

/**
 * معالج ملفات الإكسل لأعمال المشاريع
 */
export const parseProjectWorksExcel = (
  file: File,
  projectId: number,
  projectName: string
): Promise<ProjectWorkImportData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const formattedData: ProjectWorkImportData[] = rawData.map(row => ({
          projectId: projectId,
          task_name: row['بيان العمل'] || row['المهمة'],
          authority: row['الجهة'] || row['جهة المراجعة'] || '',
          department: row['القسم'] || '',
          notes: row['ملاحظات'] || '',
          status: 'in_progress',
          project_name: projectName
        })).filter(item => item.task_name);

        resolve(formattedData);
      } catch (error) {
        reject(new Error("خطأ في معالجة إكسل أعمال المشروع"));
      }
    };
    reader.readAsBinaryString(file);
  });
};
