
export const DAR_LOGO = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodz0iNTAwIiByeD0iNTAiIGZpbGw9IiMxQjJCODAiLz4KPHBhdGggZD0iTTI1MCAxMDBMMTAwIDIyMFY0MDBIMjAwVjMwMEgzMDBWNDAwSDQwMFYyMjBMMjUwIDEwMFoiIGZpbGw9IiNFMzVEMjIiLz4KPHBhdGggZD0iTTI1MCAxNTBMMTUwIDIzMFYzNzBIMjMwVjI3MEgyNzBWMzcwSDM1MFYyMzBMMjUwIDEwMFoiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8cGF0aCBkPSJNMjUwIDgwTDE1MCAxNjBWMjQwaDIwMHYtODBMMjUwIDgwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+";

export const TECHNICAL_ENTITY_MAPPING: Record<string, string[]> = {
  'الشركة السعودية للكهرباء': [
    'نقل ملكية عدادات', 
    'طلب فتح خدمة', 
    'مقاول الكهرباء', 
    'فحص الجهد', 
    'إطلاق تيار كهربائي',
    'طلب تقوية عداد'
  ],
  'شركة المياه الوطنية': [
    'شبكة الري', 
    'ربط شبكة المياه', 
    'تركيب عدادات', 
    'التقديم على خدمات المياه',
    'تصريف سيول'
  ],
  'أمانة منطقة الرياض/البلديات': [
    'نظام البناء', 
    'إصدار رخص بناء', 
    'تعديل بيانات المالك', 
    'شهادة امتثال', 
    'تسوية أرض',
    'إطلاق شهادة إتمام بناء'
  ],
  'وزارة الإسكان': [
    'استخراج صكوك', 
    'فرز صكوك', 
    'فرز وحدات عقارية', 
    'شهادات الأشغال', 
    'طلب استثناء'
  ],
  'الشركة الوطنية للإسكان (NHC)': [
    'تعاقدات البيع على الخارطة', 
    'استلام الوحدات',
    'منصة وافي'
  ],
  'وزارة الشؤون الإسلامية': [
    'اعتماد جامع', 
    'رخصة بناء مسجد'
  ],
  'الدفاع المدني': [
    'رخصة سلامة', 
    'شهادة استيفاء متطلبات'
  ],
  'الشرطة': [
    'بلاغ سرقة كيابل', 
    'بلاغ تعدي'
  ]
};

export const BANKS_LIST = [
  'مصرف الراجحي',
  'بنك البلاد',
  'بنك الإنماء',
  'البنك الأهلي السعودي',
  'بنك الرياض',
  'البنك السعودي الفرنسي',
  'البنك العربي الوطني',
  'بنك الجزيرة',
  'بنك الاستثمار السعودي',
  'أخرى'
];

export const LOCATIONS_ORDER = [
  'الرياض',
  'جدة',
  'المدينة المنورة',
  'المنطقة الشرقية',
  'القطيف'
];
