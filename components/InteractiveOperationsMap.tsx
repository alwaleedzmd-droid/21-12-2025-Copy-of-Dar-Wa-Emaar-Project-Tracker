/**
 * InteractiveOperationsMap - الخريطة التفاعلية للعمليات
 * واجهة تفاعلية بصرية مرتبطة بـ DataContext مع خريطة Leaflet حقيقية
 * تشمل: محرك الألوان + رادار المدير + تكامل المساعد الذكي
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Map as MapIcon, AlertTriangle, Eye, EyeOff, Filter, RefreshCw,
  Building2, Zap, FileStack, Clock, CheckCircle2, XCircle,
  ChevronLeft, Loader2, Search, ArrowLeft, Radar, Info,
  BarChart3, User, MapPin, Activity, Hammer, Wrench, FileSignature, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { supabase } from '../supabaseClient';
import { getUnitStatus, getAllUnitStatuses, STATUS_COLORS, UnitStatus, UnitStatusColor, WorkTypeBreakdown } from '../services/unitStatusService';
import UnitProcessModal from './UnitProcessModal';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ===== تعريف المواقع الحقيقية (lat/lng) =====
interface CityLocation {
  id: string;
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
}

const SAUDI_CITIES: CityLocation[] = [
  { id: 'riyadh', nameAr: 'الرياض', nameEn: 'Riyadh', lat: 24.7136, lng: 46.6753 },
  { id: 'jeddah', nameAr: 'جدة', nameEn: 'Jeddah', lat: 21.4858, lng: 39.1925 },
  { id: 'dammam', nameAr: 'الدمام', nameEn: 'Dammam', lat: 26.3927, lng: 49.9777 },
  { id: 'khobar', nameAr: 'الخبر', nameEn: 'Al Khobar', lat: 26.2172, lng: 50.1971 },
  { id: 'medina', nameAr: 'المدينة المنورة', nameEn: 'Medina', lat: 24.4672, lng: 39.6024 },
  { id: 'qatif', nameAr: 'القطيف', nameEn: 'Qatif', lat: 26.5196, lng: 49.9982 },
];

// ربط المشاريع بالمدن بناءً على الموقع أو الإحداثيات من قاعدة البيانات
function mapProjectToCity(project: any): string {
  // إذا المشروع لديه إحداثيات من قاعدة البيانات → نبحث عن أقرب مدينة
  // محاولة استخراج حقول الإحداثيات من أسماء متعددة
  const latCandidates = [project.latitude, project.lat, project.location_lat, project.y, project.lat_dd];
  const lngCandidates = [project.longitude, project.lng, project.location_lng, project.x, project.lon, project.lon_dd];
  const latVal = latCandidates.find(v => v !== undefined && v !== null && v !== '');
  const lngVal = lngCandidates.find(v => v !== undefined && v !== null && v !== '');
  if (latVal !== undefined && lngVal !== undefined) {
    const lat = parseFloat(String(latVal).replace(',', '.'));
    const lng = parseFloat(String(lngVal).replace(',', '.'));
    let closestCity = 'riyadh';
    let minDist = Infinity;
    SAUDI_CITIES.forEach(city => {
      const dist = Math.sqrt(Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2));
      if (dist < minDist) { minDist = dist; closestCity = city.id; }
    });
    return closestCity;
  }
  // Fallback: تحليل اسم المشروع/الموقع
  const loc = (project.location || project.name || '').toLowerCase();
  if (loc.includes('رياض') || loc.includes('riyadh')) return 'riyadh';
  if (loc.includes('جدة') || loc.includes('jeddah')) return 'jeddah';
  if (loc.includes('دمام') || loc.includes('dammam')) return 'dammam';
  if (loc.includes('خبر') || loc.includes('khobar')) return 'khobar';
  if (loc.includes('مدينة') || loc.includes('medina')) return 'medina';
  if (loc.includes('قطيف') || loc.includes('qatif')) return 'qatif';
  return 'riyadh'; // افتراضي
}

// الحصول على إحداثيات المشروع (من DB أو من المدينة)
function getProjectCoordinates(project: any, cityLookup: Map<string, CityLocation>): { lat: number; lng: number } {
  // محاولة استخراج حقول إحداثيات من أسماء متعددة
  const latCandidates = [project.latitude, project.lat, project.location_lat, project.y, project.lat_dd];
  const lngCandidates = [project.longitude, project.lng, project.location_lng, project.x, project.lon, project.lon_dd];
  const latVal = latCandidates.find(v => v !== undefined && v !== null && v !== '');
  const lngVal = lngCandidates.find(v => v !== undefined && v !== null && v !== '');
  if (latVal !== undefined && lngVal !== undefined) {
    let lat = parseFloat(String(latVal).replace(',', '.'));
    let lng = parseFloat(String(lngVal).replace(',', '.'));

    // إذا كانت القيم غير رقمية اعد الفالباك
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      // تحقق إن كانت الإحداثيات داخل حدود السعودية، وإلا جرّب التبديل lat<->lng
      const inLatRange = lat >= 15.5 && lat <= 32.5;
      const inLngRange = lng >= 34.5 && lng <= 56.0;
      if (!inLatRange || !inLngRange) {
        // جرّب تبديل القيم
        const swappedLat = lng;
        const swappedLng = lat;
        const swappedInLat = swappedLat >= 15.5 && swappedLat <= 32.5;
        const swappedInLng = swappedLng >= 34.5 && swappedLng <= 56.0;
        if (swappedInLat && swappedInLng) {
          console.warn('[Map] اكتُشِف أن إحداثيات المشروع تبدو مقلوبة (lat/lng) — سيتم تبديلها تلقائياً', project.id, project.name || project.title);
          lat = swappedLat;
          lng = swappedLng;
        } else {
          console.warn('[Map] إحداثيات المشروع خارج نطاق السعودية:', { lat, lng }, 'لم يتم تبديلها', project.id, project.name || project.title);
        }
      }
      return { lat, lng };
    }
  }

  // Fallback: إحداثيات المدينة
  const cityId = mapProjectToCity(project);
  const city = cityLookup.get(cityId);
  return city ? { lat: city.lat, lng: city.lng } : { lat: 24.7136, lng: 46.6753 };
}

// إنشاء أيقونة ماركر مخصصة بالألوان
function createColoredIcon(color: string, count: number, isDelayed: boolean): L.DivIcon {
  const pulse = isDelayed ? `
    <div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50%;border:3px solid #EF4444;animation:marker-pulse 1.5s ease-out infinite;"></div>
  ` : '';
  
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        ${pulse}
        <div style="
          width:42px;height:42px;border-radius:50%;
          background:${color};border:3px solid white;
          box-shadow:0 4px 12px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-weight:900;font-size:14px;color:white;
          font-family:Cairo,sans-serif;
          position:relative;z-index:2;
        ">${count}</div>
        <div style="
          width:0;height:0;
          border-left:8px solid transparent;
          border-right:8px solid transparent;
          border-top:10px solid ${color};
          margin-top:-2px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.2));
        "></div>
      </div>
    `,
    iconSize: [42, 54],
    iconAnchor: [21, 54],
    popupAnchor: [0, -54],
  });
}

// إنشاء أيقونة لمشروع منفرد
function createProjectIcon(color: string, isDelayed: boolean): L.DivIcon {
  const pulse = isDelayed ? `
    <div style="position:absolute;top:-3px;left:-3px;right:-3px;bottom:-3px;border-radius:50%;border:2px solid #EF4444;animation:marker-pulse 1.5s ease-out infinite;"></div>
  ` : '';
  
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        ${pulse}
        <div style="
          width:32px;height:32px;border-radius:50%;
          background:${color};border:2.5px solid white;
          box-shadow:0 3px 10px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          position:relative;z-index:2;
        ">
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M3 21V7l9-4 9 4v14H3zm2-2h14V8.3l-7-3.1L5 8.3V19zm3-2h2v-4h4v4h2v-6l-4-2.5L8 11v6z"/></svg>
        </div>
        <div style="
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid ${color};
          margin-top:-1px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.2));
        "></div>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

// حدود المملكة العربية السعودية
const SAUDI_BOUNDS: L.LatLngBoundsExpression = [
  [15.5, 34.5],  // الجنوب الغربي
  [32.5, 56.0],  // الشمال الشرقي
];

// مكون لتحديث حدود الخريطة عند تغيير المشاريع المصفاة
function MapBoundsUpdater({ projects, cityMap }: { projects: any[]; cityMap: Map<string, CityLocation> }) {
  const map = useMap();
  
  useEffect(() => {
    if (projects.length === 0) {
      // إذا لا مشاريع، اعرض السعودية كاملة
      map.fitBounds(SAUDI_BOUNDS, { animate: true, padding: [20, 20] });
      return;
    }
    const points: [number, number][] = [];
    projects.forEach(p => {
      const coords = getProjectCoordinates(p, cityMap);
      points.push([coords.lat, coords.lng]);
    });
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds.pad(0.4), { maxZoom: 9, animate: true });
    }
  }, [projects, cityMap, map]);
  
  return null;
}

// ===== المكون الرئيسي =====
const InteractiveOperationsMap: React.FC = () => {
  const navigate = useNavigate();
  const { 
    projects, technicalRequests, clearanceRequests, projectWorks, 
    currentUser, isDbLoading, refreshData 
  } = useData();

  // حالات المكون
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRadarMode, setIsRadarMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<UnitStatusColor | 'all'>('all');
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');

  // خريطة المدن بالمعرف
  const cityLookup = useMemo(() => {
    const m = new Map<string, CityLocation>();
    SAUDI_CITIES.forEach(c => m.set(c.id, c));
    return m;
  }, []);

  // حساب حالات جميع المشاريع
  const unitStatuses = useMemo(() => {
    return getAllUnitStatuses(projects, technicalRequests, clearanceRequests, projectWorks);
  }, [projects, technicalRequests, clearanceRequests, projectWorks]);

  // تجميع المشاريع حسب المدن
  const projectsByCity = useMemo(() => {
    const cityMap = new Map<string, any[]>();
    SAUDI_CITIES.forEach(c => cityMap.set(c.id, []));
    
    projects.forEach(p => {
      const cityId = mapProjectToCity(p);
      const arr = cityMap.get(cityId) || [];
      arr.push(p);
      cityMap.set(cityId, arr);
    });
    
    return cityMap;
  }, [projects]);

  // إحصائيات عامة
  const stats = useMemo(() => {
    let blue = 0, yellow = 0, green = 0, red = 0, gray = 0;
    let totalWorksAll = 0, totalCompletedAll = 0, totalActiveAll = 0;
    let totalProjectWorks = 0, totalTechRequests = 0, totalClearanceRequests = 0;
    let activeProjectWorks = 0, activeTechRequests = 0, activeClearanceRequests = 0;
    
    unitStatuses.forEach(s => {
      switch (s.color) {
        case 'blue': blue++; break;
        case 'yellow': yellow++; break;
        case 'green': green++; break;
        case 'red-pulse': red++; break;
        case 'gray': gray++; break;
      }
      totalWorksAll += s.totalWorks;
      totalCompletedAll += s.totalCompleted;
      totalActiveAll += s.totalActive;
      
      s.workBreakdown.forEach(wb => {
        if (wb.type === 'project_work') { totalProjectWorks += wb.total; activeProjectWorks += wb.active; }
        if (wb.type === 'technical') { totalTechRequests += wb.total; activeTechRequests += wb.active; }
        if (wb.type === 'clearance') { totalClearanceRequests += wb.total; activeClearanceRequests += wb.active; }
      });
    });
    return { 
      blue, yellow, green, red, gray, total: projects.length,
      totalWorksAll, totalCompletedAll, totalActiveAll,
      totalProjectWorks, totalTechRequests, totalClearanceRequests,
      activeProjectWorks, activeTechRequests, activeClearanceRequests
    };
  }, [unitStatuses, projects]);

  // تصفية المشاريع
  const filteredProjects = useMemo(() => {
    let result = [...projects];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.client || '').toLowerCase().includes(q)
      );
    }
    
    if (filterStatus !== 'all') {
      result = result.filter(p => {
        const status = unitStatuses.get(Number(p.id));
        return status?.color === filterStatus;
      });
    }

    return result;
  }, [projects, searchQuery, filterStatus, unitStatuses]);

  // إرسال إشارة للمساعد الذكي عند اختيار مشروع
  const handleProjectSelect = useCallback((project: any) => {
    setSelectedProject(project);
    setIsModalOpen(true);

    // إرسال Signal لـ AIAssistant عبر CustomEvent
    window.dispatchEvent(new CustomEvent('interactive-map-select', {
      detail: {
        projectId: project.id,
        projectName: project.name || project.title,
        status: unitStatuses.get(Number(project.id))
      }
    }));
  }, [unitStatuses]);

  // حساب لون المدينة بناءً على أسوأ حالة فيها
  const getCityStatusColor = useCallback((cityId: string) => {
    const cityProjects = projectsByCity.get(cityId) || [];
    if (cityProjects.length === 0) return STATUS_COLORS.gray;
    
    let hasRed = false, hasYellow = false, hasBlue = false, allGreen = true;
    
    cityProjects.forEach(p => {
      const status = unitStatuses.get(Number(p.id));
      if (!status || status.color !== 'green') allGreen = false;
      if (status?.color === 'red-pulse') hasRed = true;
      if (status?.color === 'yellow') hasYellow = true;
      if (status?.color === 'blue') hasBlue = true;
    });

    if (hasRed) return STATUS_COLORS['red-pulse'];
    if (hasYellow) return STATUS_COLORS.yellow;
    if (allGreen) return STATUS_COLORS.green;
    if (hasBlue) return STATUS_COLORS.blue;
    return STATUS_COLORS.gray;
  }, [projectsByCity, unitStatuses]);

  // هل المشروع يظهر في وضع الرادار؟
  const isVisibleInRadar = useCallback((projectId: number) => {
    if (!isRadarMode) return true;
    const status = unitStatuses.get(projectId);
    return status?.isDelayed === true;
  }, [isRadarMode, unitStatuses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-cairo" dir="rtl">
      {/* === Header === */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-[#1B2B48] to-[#2a4070] p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <MapIcon size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black">الخريطة التفاعلية للعمليات</h1>
                <p className="text-white/60 font-bold mt-1 text-sm">مرآة بصرية حية لحالة المشاريع والطلبات</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => refreshData()} 
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:rotate-180"
                title="تحديث البيانات"
              >
                <RefreshCw size={20} />
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all"
              >
                <ArrowLeft size={18} /> العودة
              </button>
            </div>
          </div>
        </div>

        {/* === Stats Bar === */}
        <div className="px-8 py-4 border-b border-gray-100">
          {/* صف 1: إحصائيات أنواع الأعمال الفعلية */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div onClick={() => navigate('/projects')} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors">
              <Hammer size={15} className="text-indigo-600" />
              <span className="text-xs font-bold text-indigo-700">أعمال المشاريع</span>
              <span className="text-[10px] font-black bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">{stats.activeProjectWorks} نشط / {stats.totalProjectWorks}</span>
              <ChevronLeft size={14} className="text-indigo-300" />
            </div>
            <div onClick={() => navigate('/technical')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
              <Zap size={15} className="text-blue-600" />
              <span className="text-xs font-bold text-blue-700">طلبات فنية</span>
              <span className="text-[10px] font-black bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{stats.activeTechRequests} نشط / {stats.totalTechRequests}</span>
              <ChevronLeft size={14} className="text-blue-300" />
            </div>
            <div onClick={() => navigate('/deeds')} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-xl border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors">
              <FileSignature size={15} className="text-yellow-600" />
              <span className="text-xs font-bold text-yellow-700">إفراغات / نقل ملكية</span>
              <span className="text-[10px] font-black bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">{stats.activeClearanceRequests} نشط / {stats.totalClearanceRequests}</span>
              <ChevronLeft size={14} className="text-yellow-300" />
            </div>
            <div className="flex-1" />
            <div className="text-xs text-gray-500 font-bold">
              إجمالي: <span className="text-[#1B2B48] font-black">{stats.totalWorksAll}</span> عمل |{' '}
              <span className="text-green-600 font-black">{stats.totalCompletedAll}</span> مكتمل |{' '}
              <span className="text-orange-600 font-black">{stats.totalActiveAll}</span> نشط
            </div>
          </div>
          {/* صف 2: فلاتر حالة المشاريع */}
          <div className="flex items-center gap-4 overflow-x-auto">
            {[
              { color: 'blue' as const, label: 'طلبات فنية', count: stats.blue, icon: <Zap size={16} /> },
              { color: 'yellow' as const, label: 'إفراغات', count: stats.yellow, icon: <FileStack size={16} /> },
              { color: 'green' as const, label: 'مكتمل', count: stats.green, icon: <CheckCircle2 size={16} /> },
              { color: 'red-pulse' as const, label: 'متأخر', count: stats.red, icon: <AlertTriangle size={16} /> },
              { color: 'gray' as const, label: 'بدون طلبات', count: stats.gray, icon: <XCircle size={16} /> },
            ].map(s => (
              <button
                key={s.color}
                onClick={() => setFilterStatus(filterStatus === s.color ? 'all' : s.color)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border shrink-0 ${
                  filterStatus === s.color 
                    ? `${STATUS_COLORS[s.color].bg} ${STATUS_COLORS[s.color].text} ${STATUS_COLORS[s.color].border}`
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                  filterStatus === s.color ? 'bg-white/50' : 'bg-gray-200'
                }`}>{s.count}</span>
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-xs text-gray-400 font-bold shrink-0">
              {stats.total} مشروع
            </span>
          </div>
        </div>

        {/* === Controls === */}
        <div className="px-8 py-4 flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pr-10 pl-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none font-bold text-sm focus:border-[#E95D22] transition-colors"
              placeholder="بحث عن مشروع..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Radar Mode Toggle */}
          <button
            onClick={() => setIsRadarMode(!isRadarMode)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all border ${
              isRadarMode 
                ? 'bg-red-50 text-red-700 border-red-300 shadow-lg shadow-red-100' 
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <Radar size={18} className={isRadarMode ? 'animate-pulse' : ''} />
            {isRadarMode ? 'إيقاف رادار المختنقات' : 'عرض المختنقات'}
          </button>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('map')}
              title="عرض الخريطة"
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'map' ? 'bg-white text-[#1B2B48] shadow-sm' : 'text-gray-400'
              }`}
            >
              <MapIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="عرض الشبكة"
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#1B2B48] shadow-sm' : 'text-gray-400'
              }`}
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* === Main Content Area === */}
      {isDbLoading ? (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin text-gray-300 mx-auto" size={40} />
            <p className="text-gray-400 font-bold mt-4">جاري تحميل بيانات المشاريع...</p>
          </div>
        </div>
      ) : viewMode === 'map' ? (
        /* ===== Map View - Leaflet Real Map ===== */
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden relative" style={{ isolation: 'isolate' }}>
          {/* أنماط أيقونات الماركر */}
          <style>{`
            .custom-map-marker { background: none !important; border: none !important; }
            @keyframes marker-pulse {
              0% { transform: scale(1); opacity: 1; }
              100% { transform: scale(1.8); opacity: 0; }
            }
            .leaflet-popup-content-wrapper {
              border-radius: 16px !important;
              font-family: Cairo, sans-serif !important;
              direction: rtl !important;
            }
            .leaflet-popup-content { margin: 0 !important; min-width: 220px !important; }
            .leaflet-container { font-family: Cairo, sans-serif !important; position: relative !important; z-index: 1 !important; }
            .leaflet-pane { z-index: 1 !important; }
            .leaflet-top, .leaflet-bottom { z-index: 2 !important; }
          `}</style>
          
          {/* Layer toggle */}
          <div className="relative">
            <div className="absolute top-4 left-4 z-[1000] flex gap-2">
              <button
                onClick={() => setMapLayer(mapLayer === 'street' ? 'satellite' : 'street')}
                title={mapLayer === 'street' ? 'عرض القمر الصناعي' : 'عرض الشوارع'}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-all font-bold text-xs text-gray-700"
              >
                <Layers size={16} />
                {mapLayer === 'street' ? 'قمر صناعي' : 'خريطة عادية'}
              </button>
              {isRadarMode && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/90 backdrop-blur-sm text-white rounded-xl shadow-lg font-bold text-xs">
                  <AlertTriangle size={14} className="animate-pulse" />
                  وضع رادار المختنقات
                </div>
              )}
            </div>

            {/* Legend overlay */}
            <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-4 max-w-[220px]">
              <h3 className="text-xs font-black text-[#1B2B48] mb-3">دليل الخريطة</h3>
              {/* أنواع الأعمال */}
              <p className="text-[9px] font-black text-gray-400 mb-1.5 uppercase">أنواع الأعمال</p>
              <div className="space-y-1.5 mb-3 pb-3 border-b border-gray-100">
                <div onClick={() => navigate('/technical')} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 rounded-lg px-1 py-0.5 transition-colors">
                  <span className="text-[12px]">⚡</span>
                  <span className="text-[10px] font-bold text-blue-700">طلبات فنية</span>
                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 rounded-full mr-auto">{stats.totalTechRequests}</span>
                  <ChevronLeft size={10} className="text-gray-300" />
                </div>
                <div onClick={() => navigate('/deeds')} className="flex items-center gap-2 cursor-pointer hover:bg-yellow-50 rounded-lg px-1 py-0.5 transition-colors">
                  <span className="text-[12px]">📋</span>
                  <span className="text-[10px] font-bold text-yellow-700">إفراغات / نقل ملكية</span>
                  <span className="text-[9px] font-black bg-yellow-100 text-yellow-700 px-1.5 rounded-full mr-auto">{stats.totalClearanceRequests}</span>
                  <ChevronLeft size={10} className="text-gray-300" />
                </div>
                <div onClick={() => navigate('/projects')} className="flex items-center gap-2 cursor-pointer hover:bg-indigo-50 rounded-lg px-1 py-0.5 transition-colors">
                  <span className="text-[12px]">🔨</span>
                  <span className="text-[10px] font-bold text-indigo-700">أعمال المشاريع</span>
                  <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 rounded-full mr-auto">{stats.totalProjectWorks}</span>
                  <ChevronLeft size={10} className="text-gray-300" />
                </div>
              </div>
              {/* حالات الألوان */}
              <p className="text-[9px] font-black text-gray-400 mb-1.5 uppercase">حالة المشروع</p>
              <div className="space-y-1.5">
                {[
                  { color: '#3B82F6', label: 'طلبات فنية نشطة' },
                  { color: '#EAB308', label: 'إفراغ / نقل ملكية جاري' },
                  { color: '#22C55E', label: 'مكتمل بالكامل' },
                  { color: '#EF4444', label: 'متأخر (48+ ساعة)' },
                  { color: '#9CA3AF', label: 'بدون طلبات' },
                ].map(item => (
                  <div key={item.color} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                <span className="text-[10px] text-gray-400 font-bold">{projects.length} مشروع</span>
                <span className="text-[10px] text-green-600 font-black mr-2">{stats.green} مكتمل</span>
              </div>
            </div>

            {/* Stats overlay */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-4 max-w-[220px]">
              <h3 className="text-xs font-black text-[#1B2B48] mb-2">ملخص العمليات</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-center px-2 py-1.5 bg-red-50 rounded-lg">
                  <div className="text-lg font-black text-red-600">{stats.red}</div>
                  <div className="text-[9px] font-bold text-red-500">متأخر</div>
                </div>
                <div className="text-center px-2 py-1.5 bg-green-50 rounded-lg">
                  <div className="text-lg font-black text-green-600">{stats.green}</div>
                  <div className="text-[9px] font-bold text-green-500">مكتمل</div>
                </div>
              </div>
              {/* تفصيل أنواع الأعمال */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <div onClick={() => navigate('/technical')} className="flex items-center justify-between cursor-pointer hover:bg-blue-50 rounded-lg px-1.5 py-1 transition-colors">
                  <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">⚡ فنية</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-orange-600">{stats.activeTechRequests} نشط</span>
                    <span className="text-[9px] text-gray-400">/ {stats.totalTechRequests}</span>
                    <ChevronLeft size={10} className="text-gray-300" />
                  </div>
                </div>
                <div onClick={() => navigate('/deeds')} className="flex items-center justify-between cursor-pointer hover:bg-yellow-50 rounded-lg px-1.5 py-1 transition-colors">
                  <span className="text-[10px] font-bold text-yellow-600 flex items-center gap-1">📋 إفراغ/نقل</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-orange-600">{stats.activeClearanceRequests} نشط</span>
                    <span className="text-[9px] text-gray-400">/ {stats.totalClearanceRequests}</span>
                    <ChevronLeft size={10} className="text-gray-300" />
                  </div>
                </div>
                <div onClick={() => navigate('/projects')} className="flex items-center justify-between cursor-pointer hover:bg-indigo-50 rounded-lg px-1.5 py-1 transition-colors">
                  <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">🔨 أعمال</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-orange-600">{stats.activeProjectWorks} نشط</span>
                    <span className="text-[9px] text-gray-400">/ {stats.totalProjectWorks}</span>
                    <ChevronLeft size={10} className="text-gray-300" />
                  </div>
                </div>
              </div>
            </div>

            <MapContainer
              center={[24.0, 45.0]}
              zoom={6}
              minZoom={5}
              maxZoom={13}
              scrollWheelZoom={true}
              maxBounds={SAUDI_BOUNDS}
              maxBoundsViscosity={1.0}
              className="w-full"
              style={{ height: '600px' }}
              zoomControl={true}
            >
              {/* طبقة الخريطة - أسلوب شوارع أو قمر صناعي */}
              {mapLayer === 'street' ? (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              ) : (
                <TileLayer
                  attribution='&copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              )}

              {/* تحديث حدود الخريطة */}
              <MapBoundsUpdater projects={filteredProjects} cityMap={cityLookup} />

              {/* ماركرات المدن مع عدد المشاريع */}
              {SAUDI_CITIES.map(city => {
                const cityProjects = projectsByCity.get(city.id) || [];
                const visibleProjects = cityProjects.filter(p => {
                  if (!isVisibleInRadar(Number(p.id))) return false;
                  if (filterStatus !== 'all') {
                    const s = unitStatuses.get(Number(p.id));
                    return s?.color === filterStatus;
                  }
                  return true;
                });
                
                if (visibleProjects.length === 0) return null;
                
                const hasDelayed = visibleProjects.some(p => unitStatuses.get(Number(p.id))?.isDelayed);
                const cityColor = getCityStatusColor(city.id);

                // إذا مشروع واحد أظهره مباشرة
                if (visibleProjects.length === 1) {
                  const project = visibleProjects[0];
                  const status = unitStatuses.get(Number(project.id));
                  const pColor = status ? STATUS_COLORS[status.color].fill : '#9CA3AF';
                  
                  return (
                    <Marker
                      key={`proj-${project.id}`}
                      position={[city.lat, city.lng]}
                      icon={createProjectIcon(pColor, status?.isDelayed || false)}
                      eventHandlers={{ click: () => handleProjectSelect(project) }}
                    >
                      <Popup>
                        <div className="p-3 font-cairo" dir="rtl">
                          <h3 className="font-black text-sm text-[#1B2B48] mb-1">{project.name || project.title}</h3>
                          {project.location && <p className="text-[10px] text-gray-400 mb-2">{project.location}</p>}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: pColor + '20', color: pColor }}>
                              {status?.labelAr || 'غير محدد'}
                            </span>
                            {status?.assignedTo && <span className="text-[10px] text-gray-500">{status.assignedTo}</span>}
                          </div>
                          {status?.isDelayed && (
                            <p className="text-[10px] font-bold text-red-500 mb-2">⚠️ متأخر {status.delayHours} ساعة</p>
                          )}
                          {/* تفصيل أنواع الأعمال */}
                          {(status as UnitStatus)?.workBreakdown?.length > 0 && (
                            <div className="space-y-1.5 mb-2 pt-2 border-t border-gray-100">
                              {(status as UnitStatus).workBreakdown.map(wb => {
                                const emoji = wb.type === 'technical' ? '⚡' : wb.type === 'clearance' ? '📋' : '🔨';
                                const clr = wb.type === 'technical' ? '#3B82F6' : wb.type === 'clearance' ? '#EAB308' : '#6366F1';
                                const targetRoute = wb.type === 'technical' ? '/technical' : wb.type === 'clearance' ? '/deeds' : `/projects/${project.id}`;
                                return (
                                  <div key={wb.type} onClick={(e) => { e.stopPropagation(); navigate(targetRoute); }} className="rounded-lg p-1.5 cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: clr + '10' }}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold" style={{ color: clr }}>{emoji} {wb.typeAr}</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-black text-gray-500">{wb.completed}/{wb.total}</span>
                                        <ChevronLeft size={10} className="text-gray-300" />
                                      </div>
                                    </div>
                                    {wb.items.filter(i => !['completed','منجز','مكتمل','تم الإفراغ','done','approved'].includes((i.status||'').toLowerCase())).slice(0,2).map(i => (
                                      <p key={i.id} className="text-[8px] text-gray-500 truncate pr-3">• {i.name}{i.assignedTo ? ` ← ${i.assignedTo}` : ''}{i.authority ? ` | ${i.authority}` : ''}</p>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <button
                            onClick={() => handleProjectSelect(project)}
                            className="w-full mt-1 px-3 py-1.5 bg-[#1B2B48] text-white rounded-lg text-[10px] font-bold hover:bg-[#E95D22] transition-colors"
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }

                // عدة مشاريع في نفس المدينة
                return (
                  <Marker
                    key={`city-${city.id}`}
                    position={[city.lat, city.lng]}
                    icon={createColoredIcon(cityColor.fill, visibleProjects.length, hasDelayed)}
                  >
                    <Popup>
                      <div className="p-3 font-cairo max-h-[300px] overflow-y-auto" dir="rtl">
                        <h3 className="font-black text-sm text-[#1B2B48] mb-1">{city.nameAr}</h3>
                        <p className="text-[10px] text-gray-400 mb-3">{visibleProjects.length} مشروع</p>
                        <div className="space-y-2">
                          {visibleProjects.map(project => {
                            const status = unitStatuses.get(Number(project.id));
                            const pColor = status ? STATUS_COLORS[status.color].fill : '#9CA3AF';
                            const wb = (status as UnitStatus)?.workBreakdown || [];
                            return (
                              <div
                                key={project.id}
                                onClick={() => handleProjectSelect(project)}
                                className="p-2.5 rounded-xl border border-gray-100 hover:border-[#E95D22]/50 hover:bg-orange-50/30 cursor-pointer transition-all"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
                                  <span className="font-bold text-[11px] text-[#1B2B48] truncate">{project.name || project.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 pr-4 mb-1">
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: pColor + '20', color: pColor }}>
                                    {status?.labelAr || 'غير محدد'}
                                  </span>
                                  {status?.assignedTo && <span className="text-[9px] text-gray-400">{status.assignedTo}</span>}
                                  {status?.isDelayed && <span className="text-[9px] font-bold text-red-500">⚠️ {status.delayHours}h</span>}
                                </div>
                                {/* شارات أنواع الأعمال */}
                                {wb.length > 0 && (
                                  <div className="flex items-center gap-1 pr-4 flex-wrap">
                                    {wb.map(w => {
                                      const emoji = w.type === 'technical' ? '⚡' : w.type === 'clearance' ? '📋' : '🔨';
                                      const bg = w.type === 'technical' ? '#DBEAFE' : w.type === 'clearance' ? '#FEF9C3' : '#E0E7FF';
                                      const clr = w.type === 'technical' ? '#1D4ED8' : w.type === 'clearance' ? '#A16207' : '#4338CA';
                                      const targetRoute = w.type === 'technical' ? '/technical' : w.type === 'clearance' ? '/deeds' : `/projects/${project.id}`;
                                      return (
                                        <span
                                          key={w.type}
                                          onClick={(e) => { e.stopPropagation(); navigate(targetRoute); }}
                                          className="text-[8px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer hover:opacity-70 transition-opacity"
                                          style={{ backgroundColor: bg, color: clr }}
                                        >
                                          {emoji} {w.active > 0 ? `${w.active} نشط` : `${w.completed}✓`}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      ) : null}

      {/* ===== Grid / Card View ===== */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-[#1B2B48] flex items-center gap-3">
            <Activity size={24} className="text-[#E95D22]" />
            {viewMode === 'grid' ? 'عرض المشاريع' : 'قائمة المشاريع'}
            <span className="text-sm font-bold text-gray-400 mr-2">({filteredProjects.length})</span>
          </h2>
          {isRadarMode && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-xl text-red-600 border border-red-200">
              <AlertTriangle size={16} className="animate-pulse" />
              <span className="font-bold text-xs">يتم عرض المختنقات فقط</span>
            </div>
          )}
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد مشاريع'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => {
              const status = unitStatuses.get(Number(project.id)) || {
                color: 'gray' as UnitStatusColor, labelAr: 'غير محدد', isDelayed: false, delayHours: 0, assignedTo: null,
                workBreakdown: [] as WorkTypeBreakdown[], totalWorks: 0, totalCompleted: 0, totalActive: 0
              };
              const colorConfig = STATUS_COLORS[status.color] || STATUS_COLORS.gray;
              const isVisible = isVisibleInRadar(Number(project.id));
              const isHovered = hoveredProject === Number(project.id);
              const breakdown = (status as UnitStatus).workBreakdown || [];

              return (
                <div
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  onMouseEnter={() => setHoveredProject(Number(project.id))}
                  onMouseLeave={() => setHoveredProject(null)}
                  className={`relative rounded-2xl border p-5 cursor-pointer transition-all duration-300 group ${
                    isHovered 
                      ? `border-[#E95D22]/50 shadow-lg scale-[1.02] ${colorConfig.bg}` 
                      : `border-gray-100 hover:border-gray-200 bg-white`
                  }`}
                  style={{ 
                    opacity: isVisible ? 1 : 0.1,
                    transition: 'opacity 0.5s ease, transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  {/* Status indicator bar */}
                  <div className={`absolute top-0 right-0 left-0 h-1 rounded-t-2xl`} style={{ backgroundColor: colorConfig.fill }} />

                  {/* Delayed pulse effect */}
                  {status.isDelayed && (
                    <div className="absolute top-3 left-3">
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute" />
                        <div className="w-3 h-3 rounded-full bg-red-500 relative" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorConfig.bg} ${colorConfig.text}`}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1B2B48] text-sm group-hover:text-[#E95D22] transition-colors">
                          {project.name || project.title || 'مشروع'}
                        </h3>
                        {project.location && (
                          <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {project.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronLeft size={16} className="text-gray-300 group-hover:text-[#E95D22] transition-colors" />
                  </div>

                  {/* Status badge + assigned */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}>
                      {status.labelAr}
                    </span>
                    <div className="flex items-center gap-2">
                      {status.assignedTo && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <User size={10} /> {status.assignedTo}
                        </span>
                      )}
                      {status.isDelayed && (
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                          <AlertTriangle size={10} /> {status.delayHours}h
                        </span>
                      )}
                    </div>
                  </div>

                  {/* === تفصيل أنواع الأعمال الفعلية === */}
                  {breakdown.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {breakdown.map(wb => {
                        const icon = wb.type === 'project_work' ? <Hammer size={12} className="text-indigo-500" /> :
                                     wb.type === 'technical' ? <Zap size={12} className="text-blue-500" /> :
                                     <FileSignature size={12} className="text-yellow-600" />;
                        const bgColor = wb.type === 'project_work' ? 'bg-indigo-50' :
                                        wb.type === 'technical' ? 'bg-blue-50' : 'bg-yellow-50';
                        const barColor = wb.type === 'project_work' ? 'bg-indigo-400' :
                                         wb.type === 'technical' ? 'bg-blue-400' : 'bg-yellow-400';
                        const pct = wb.total > 0 ? Math.round((wb.completed / wb.total) * 100) : 0;
                        const targetRoute = wb.type === 'technical' ? '/technical' : wb.type === 'clearance' ? '/deeds' : `/projects/${project.id}`;
                        return (
                          <div key={wb.type} onClick={(e) => { e.stopPropagation(); navigate(targetRoute); }} className={`${bgColor} rounded-xl px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700">
                                {icon} {wb.typeAr}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black text-gray-500">
                                  {wb.completed}/{wb.total} {wb.active > 0 && <span className="text-orange-600">({wb.active} نشط)</span>}
                                </span>
                                <ChevronLeft size={10} className="text-gray-300" />
                              </div>
                            </div>
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                            </div>
                            {/* أسماء أبرز الأعمال النشطة */}
                            {wb.items.filter(item => !['completed', 'منجز', 'مكتمل', 'تم الإفراغ', 'done', 'approved'].includes((item.status || '').toLowerCase())).slice(0, 2).map(item => (
                              <p key={item.id} className="text-[9px] text-gray-500 mt-0.5 truncate pr-4">
                                • {item.name} {item.assignedTo ? `← ${item.assignedTo}` : ''} {item.authority ? `| ${item.authority}` : ''}
                              </p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-300 font-bold mb-3 text-center py-2 bg-gray-50 rounded-xl">
                      لا توجد أعمال مسجلة
                    </div>
                  )}

                  {/* Progress bar */}
                  {typeof project.progress === 'number' && (
                    <div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${project.progress}%`, 
                            backgroundColor: colorConfig.fill 
                          }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold mt-1 text-left">{project.progress}%</p>
                    </div>
                  )}

                  {/* Radar warning overlay */}
                  {isRadarMode && status.isDelayed && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-red-400 pointer-events-none">
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                        <AlertTriangle size={12} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === Unit Process Modal === */}
      {selectedProject && (
        <UnitProcessModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          unitStatus={unitStatuses.get(Number(selectedProject.id)) || {
            color: 'gray' as UnitStatusColor,
            label: 'No Active Request',
            labelAr: 'لا يوجد طلب نشط',
            assignedTo: null,
            requestId: null,
            requestType: null,
            isDelayed: false,
            lastUpdated: null,
            delayHours: 0,
            workBreakdown: [],
            totalWorks: 0,
            totalCompleted: 0,
            totalActive: 0
          }}
          technicalRequests={technicalRequests}
          clearanceRequests={clearanceRequests}
          projectWorks={projectWorks}
        />
      )}
    </div>
  );
};

export default InteractiveOperationsMap;
