import React, { useState } from 'react';
import { 
  Download, BookOpen, Building2, Zap, FileStack, Users, Settings, 
  CheckCircle2, Shield, Bell, GitBranch, BarChart3, FileSpreadsheet,
  ArrowLeft, Printer, Sparkles, Globe, Layers, Link2, Target, 
  ClipboardList, Workflow, UserCheck, Mail, Eye, ArrowDown, ArrowLeftRight, Monitor,
  Rocket, Calendar, PenTool, Archive, Languages, BarChart2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DAR_LOGO } from '../constants';

// ─── بيانات الرسوم البيانية ────────────────────────────────────
const MODULE_DATA = [
  { name: 'إدارة المشاريع', value: 25, color: '#1B2B48' },
  { name: 'الطلبات الفنية', value: 25, color: '#3B82F6' },
  { name: 'سجل الإفراغ', value: 20, color: '#E95D22' },
  { name: 'سير الموافقات', value: 15, color: '#10B981' },
  { name: 'الإشعارات', value: 10, color: '#8B5CF6' },
  { name: 'التقارير', value: 5, color: '#F59E0B' },
];

const ROLE_PERMISSIONS_DATA = [
  { role: 'مدير النظام', permissions: 7, modules: 6, color: '#1B2B48' },
  { role: 'العلاقات العامة', permissions: 5, modules: 4, color: '#3B82F6' },
  { role: 'القسم الفني', permissions: 3, modules: 2, color: '#10B981' },
  { role: 'قسم CX', permissions: 3, modules: 2, color: '#E95D22' },
];

const FEATURE_RADAR_DATA = [
  { feature: 'الأمان', value: 95 },
  { feature: 'السرعة', value: 88 },
  { feature: 'سهولة الاستخدام', value: 90 },
  { feature: 'التكامل', value: 92 },
  { feature: 'التقارير', value: 85 },
  { feature: 'المرونة', value: 87 },
];

const BEFORE_AFTER_DATA = [
  { metric: 'وقت المعاملة', before: 100, after: 30 },
  { metric: 'دقة البيانات', before: 60, after: 95 },
  { metric: 'سرعة الموافقات', before: 40, after: 90 },
  { metric: 'شفافية التتبع', before: 30, after: 95 },
  { metric: 'تكامل الأقسام', before: 25, after: 92 },
];

const SystemGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const generateWordDocument = () => {
    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>دليل نظام دار وإعمار لتتبع المشاريع</title>
<style>
  @page { 
    margin: 2cm; 
    size: A4;
  }
  body { 
    font-family: 'Cairo', 'Segoe UI', 'Arial', sans-serif; 
    direction: rtl; 
    line-height: 2; 
    color: #1B2B48; 
    font-size: 13pt;
    max-width: 100%;
    margin: 0 auto;
  }
  .cover-page {
    text-align: center;
    padding: 80px 40px;
    page-break-after: always;
    border: 3px solid #1B2B48;
    border-radius: 0;
    margin-bottom: 30px;
  }
  .cover-page h1 {
    font-size: 32pt;
    color: #1B2B48;
    margin-bottom: 10px;
    font-weight: 900;
  }
  .cover-page .subtitle {
    font-size: 16pt;
    color: #E95D22;
    font-weight: 700;
    margin-bottom: 40px;
  }
  .cover-page .version {
    font-size: 11pt;
    color: #666;
    margin-top: 60px;
  }
  .cover-divider {
    width: 120px;
    height: 4px;
    background: #E95D22;
    margin: 20px auto;
  }
  h1 { 
    color: #1B2B48; 
    font-size: 24pt; 
    font-weight: 900; 
    border-bottom: 3px solid #E95D22; 
    padding-bottom: 10px; 
    margin-top: 40px; 
    page-break-before: always;
  }
  h1:first-of-type { page-break-before: auto; }
  h2 { 
    color: #E95D22; 
    font-size: 16pt; 
    font-weight: 800; 
    margin-top: 25px; 
    border-right: 4px solid #E95D22;
    padding-right: 12px;
  }
  h3 { 
    color: #1B2B48; 
    font-size: 14pt; 
    font-weight: 700; 
    margin-top: 20px; 
  }
  p { margin: 8px 0; text-align: justify; }
  ul, ol { margin: 10px 0; padding-right: 25px; }
  li { margin: 6px 0; }
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 15px 0; 
    font-size: 11pt;
  }
  th { 
    background: #1B2B48; 
    color: white; 
    padding: 10px 12px; 
    text-align: right; 
    font-weight: 700;
  }
  td { 
    padding: 8px 12px; 
    border: 1px solid #ddd; 
    text-align: right;
  }
  tr:nth-child(even) { background: #f8f9fa; }
  .highlight-box {
    background: #FFF3E8;
    border: 2px solid #E95D22;
    border-radius: 0;
    padding: 15px 20px;
    margin: 15px 0;
  }
  .highlight-box-blue {
    background: #EBF5FF;
    border: 2px solid #1B2B48;
    border-radius: 0;
    padding: 15px 20px;
    margin: 15px 0;
  }
  .info-box {
    background: #F0FFF4;
    border: 2px solid #10B981;
    padding: 15px 20px;
    margin: 15px 0;
  }
  .flow-step {
    background: #f8f9fa;
    border-right: 4px solid #E95D22;
    padding: 10px 15px;
    margin: 8px 0;
  }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 10pt;
    font-weight: 700;
    margin: 2px;
  }
  .badge-admin { background: #1B2B48; color: white; }
  .badge-pr { background: #3B82F6; color: white; }
  .badge-tech { background: #10B981; color: white; }
  .badge-cx { background: #E95D22; color: white; }
  .toc { page-break-after: always; }
  .toc h2 { border: none; text-align: center; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { 
    padding: 8px 0; 
    border-bottom: 1px dotted #ddd; 
    font-weight: 700;
  }
  .toc li span { float: left; color: #E95D22; }
  .footer-note {
    margin-top: 40px;
    padding-top: 15px;
    border-top: 2px solid #1B2B48;
    text-align: center;
    color: #888;
    font-size: 10pt;
  }
  .arch-grid {
    display: table;
    width: 100%;
    margin: 10px 0;
  }
  .arch-grid .arch-row {
    display: table-row;
  }
  .arch-cell {
    display: table-cell;
    width: 33%;
    text-align: center;
    padding: 12px 8px;
    background: #f8f9fa;
    border: 1px solid #e5e7eb;
    font-size: 10pt;
    font-weight: 700;
    vertical-align: middle;
  }
  .arch-cell .emoji { font-size: 18pt; display: block; margin-bottom: 4px; }
  .arch-cell .sub { font-size: 8pt; color: #888; font-weight: 400; display: block; }
  .arch-arrow {
    text-align: center;
    color: #ccc;
    font-size: 14pt;
    padding: 4px 0;
  }
  .dept-node {
    display: inline-block;
    width: 30%;
    text-align: center;
    padding: 15px 10px;
    border: 3px solid;
    border-radius: 8px;
    margin: 0 1%;
    vertical-align: top;
    background: white;
  }
  .dept-node .emoji { font-size: 24pt; display: block; margin-bottom: 6px; }
  .dept-node .name { font-size: 11pt; font-weight: 900; display: block; }
  .dept-node .code { font-size: 8pt; color: #888; display: block; }
  .platform-box {
    background: #1B2B48;
    color: white;
    text-align: center;
    padding: 20px;
    margin: 15px 0;
    border-radius: 8px;
  }
  .platform-box .title { font-size: 14pt; font-weight: 900; }
  .platform-box .subtitle { font-size: 9pt; color: #ffffff80; }
  .mini-features {
    display: table;
    width: 100%;
    margin-top: 10px;
  }
  .mini-feat {
    display: table-cell;
    width: 25%;
    text-align: center;
    background: rgba(255,255,255,0.1);
    padding: 8px 4px;
    font-size: 9pt;
    color: #ffffffcc;
    font-weight: 700;
  }
  .wf-step { 
    text-align: center; 
    padding: 12px 20px; 
    border: 2px solid; 
    border-radius: 8px;
    margin: 8px auto;
    max-width: 350px;
    font-weight: 700;
  }
  .wf-arrow { text-align: center; color: #ccc; font-size: 16pt; }
  .wf-approved { background: #F0FFF4; border-color: #86EFAC; color: #166534; }
  .wf-current { background: #EFF6FF; border-color: #93C5FD; color: #1E40AF; }
  .wf-pending { background: #F9FAFB; border-color: #E5E7EB; color: #9CA3AF; }
  .wf-start { background: #1B2B48; border-color: #1B2B48; color: white; }
  .wf-success { background: #22C55E; border-color: #16A34A; color: white; }
  .wf-rejected { background: #FEF2F2; border-color: #FCA5A5; color: #B91C1C; }
  .bar-chart-container { margin: 15px 0; }
  .bar-row { display: flex; align-items: center; margin: 8px 0; gap: 8px; }
  .bar-label { width: 100px; font-size: 10pt; font-weight: 700; text-align: right; flex-shrink: 0; }
  .bar-track { flex: 1; background: #f3f4f6; height: 24px; border-radius: 12px; overflow: hidden; position: relative; }
  .bar-fill { height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .bar-fill span { font-size: 9pt; font-weight: 900; color: white; }
  .comparison-row { display: flex; gap: 8px; margin: 6px 0; }
  .comparison-row .bar-group { flex: 1; }
  .comparison-row .bar-group .label { font-size: 9pt; font-weight: 700; margin-bottom: 2px; }

  /* ═══════ Enhanced Visual Design ═══════ */
  body { font-size: 13pt !important; line-height: 2.1; }
  h1 { font-size: 28pt; margin-top: 50px; padding-bottom: 15px; }
  h2 { font-size: 18pt; margin-top: 30px; padding-right: 16px; border-right-width: 5px; }
  p { line-height: 2.2; font-size: 12pt; }
  li { line-height: 2; margin: 8px 0; font-size: 12pt; }
  th { font-size: 12pt; padding: 14px 16px; }
  td { padding: 12px 16px; font-size: 11pt; }
  .cover-page { padding: 100px 40px; border: 5px solid #1B2B48; }
  .cover-page h1 { font-size: 38pt; letter-spacing: -1px; }
  .cover-page .subtitle { font-size: 18pt; }
  .cover-divider { width: 180px; height: 5px; }
  .toc li { font-size: 14pt; padding: 12px 8px; }
  .highlight-box { border-right: 7px solid #E95D22; padding: 20px 25px; font-size: 12pt; line-height: 2; }
  .highlight-box-blue { border-right: 7px solid #3B82F6; padding: 20px 25px; font-size: 12pt; line-height: 2; }
  .info-box { border-right: 7px solid #10B981; padding: 20px 25px; font-size: 12pt; line-height: 2; }
  .flow-step { border-right: 7px solid #E95D22; padding: 14px 22px; font-size: 12pt; margin: 12px 0; }
  .arch-cell { padding: 20px 10px; background: #f0f4fa; font-size: 11pt; }
  .arch-cell .emoji { font-size: 26pt; margin-bottom: 8px; }
  .dept-node { padding: 20px 14px; }
  .dept-node .emoji { font-size: 32pt; }
  .dept-node .name { font-size: 14pt; }
  .platform-box { padding: 28px; }
  .platform-box .title { font-size: 18pt; }
  .wf-step { padding: 16px 28px; font-size: 12pt; }
  .wf-approved { background: #DCFCE7; }
  .wf-current { background: #DBEAFE; }
  .footer-note { border-top: 4px solid #1B2B48; padding-top: 20px; font-size: 11pt; }
  .badge { padding: 4px 14px; font-size: 11pt; }
  .cover-page .version { font-size: 12pt; }

  /* ═══════ Chart Visual Styles ═══════ */
  .chart-panel { background: #f8f9fc; border: 2px solid #e5e7eb; padding: 25px; margin: 25px 0; }
  .chart-panel h3 { color: #1B2B48; font-size: 16pt; font-weight: 900; text-align: center; margin: 0 0 5px; border: none; padding: 0; }
  .chart-panel .chart-sub { color: #9ca3af; font-size: 9pt; text-align: center; margin-bottom: 18px; font-weight: 600; }
</style>
</head>
<body>

<!-- ═══════════════════════════ صفحة الغلاف ═══════════════════════════ -->
<div class="cover-page">
  <p style="font-size: 14pt; color: #888; margin-bottom: 20px;">شركة دار وإعمار للتطوير العقاري</p>
  <div class="cover-divider"></div>
  <h1>الدليل الشامل لنظام تتبع المشاريع</h1>
  <p class="subtitle">Project Tracker System - Complete Guide</p>
  <div class="cover-divider"></div>
  <p style="font-size: 13pt; color: #444; margin-top: 30px; line-height: 2.2;">
    نظام إلكتروني متكامل لإدارة وتتبع المشاريع العقارية<br/>
    مع ربط ذكي بين أقسام العلاقات العامة والقسم الفني وقسم CX<br/>
    وتسلسل موافقات آلي ومتابعة حية لحالة كل طلب
  </p>
  <p class="version">
    الإصدار 1.0 — ${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
    إعداد: إدارة تقنية المعلومات — شركة دار وإعمار
  </p>
</div>

<!-- ═══════════════════════════ فهرس المحتويات ═══════════════════════════ -->
<div class="toc">
  <h2 style="font-size: 22pt; color: #1B2B48;">فهرس المحتويات</h2>
  <ul>
    <li>1. نظرة عامة على النظام <span>3</span></li>
    <li>2. مميزات النظام <span>4</span></li>
    <li>3. الأقسام والصلاحيات <span>6</span></li>
    <li>4. الربط بين الأقسام <span>8</span></li>
    <li>5. سير الموافقات والتسلسل <span>10</span></li>
    <li>6. إدارة المشاريع <span>12</span></li>
    <li>7. الطلبات الفنية <span>13</span></li>
    <li>8. سجل الإفراغات (CX) <span>14</span></li>
    <li>9. لوحة الإحصائيات والتقارير <span>15</span></li>
    <li>10. نظام الإشعارات <span>16</span></li>
    <li>11. الفوائد والحلول <span>17</span></li>
    <li>12. دليل الاستخدام السريع <span>19</span></li>
    <li>13. التطويرات المستقبلية المقترحة <span>21</span></li>
  </ul>
</div>

<!-- ═══════════════════════════ 1. نظرة عامة ═══════════════════════════ -->
<h1>1. نظرة عامة على النظام</h1>

<p>نظام تتبع مشاريع دار وإعمار هو منصة إلكترونية متكاملة مصممة خصيصاً لإدارة ومتابعة جميع مراحل المشاريع العقارية في شركة دار وإعمار للتطوير العقاري. يوفر النظام بيئة عمل موحدة تربط بين جميع الأقسام المعنية بعمليات المشاريع.</p>

<h2>الأقسام المرتبطة بالنظام</h2>
<table>
  <tr>
    <th>القسم</th>
    <th>الرمز</th>
    <th>المهام الرئيسية</th>
  </tr>
  <tr>
    <td><span class="badge badge-admin">مدير النظام</span></td>
    <td>ADMIN</td>
    <td>إدارة كاملة للنظام، المستخدمين، سير الموافقات، والإشراف الشامل</td>
  </tr>
  <tr>
    <td><span class="badge badge-pr">العلاقات العامة</span></td>
    <td>PR_MANAGER</td>
    <td>إدارة المشاريع، المراجعات الفنية، التنسيق مع الجهات الحكومية</td>
  </tr>
  <tr>
    <td><span class="badge badge-tech">القسم الفني (المشاريع)</span></td>
    <td>TECHNICAL</td>
    <td>تنفيذ الطلبات الفنية، إصدار الرخص، متابعة الكهرباء والبناء</td>
  </tr>
  <tr>
    <td><span class="badge badge-cx">قسم CX (الإفراغات)</span></td>
    <td>CONVEYANCE</td>
    <td>إدارة إفراغ الصكوك، نقل ملكية العدادات، خدمة العملاء</td>
  </tr>
</table>

<h2>التقنيات المستخدمة</h2>
<ul>
  <li><strong>الواجهة الأمامية:</strong> React 19 + TypeScript 5 مع تصميم Tailwind CSS حديث</li>
  <li><strong>قاعدة البيانات:</strong> Supabase (PostgreSQL) مع تحديثات لحظية (Real-time)</li>
  <li><strong>النشر:</strong> Vercel / Netlify مع HTTPS مؤمّن</li>
  <li><strong>الأمان:</strong> تحكم بالصلاحيات حسب الدور (RBAC) مع تشفير كلمات المرور</li>
  <li><strong>اللغة:</strong> واجهة ثنائية اللغة (العربية RTL / الإنجليزية LTR)</li>
</ul>

<h2>بنية النظام التقنية</h2>
<div class="arch-grid">
  <div class="arch-row">
    <div class="arch-cell"><span class="emoji">🖥️</span>الواجهة<span class="sub">React 19 + TypeScript</span></div>
    <div class="arch-cell"><span class="emoji">🎨</span>التصميم<span class="sub">Tailwind CSS + RTL</span></div>
    <div class="arch-cell"><span class="emoji">📊</span>الرسوم البيانية<span class="sub">Recharts</span></div>
  </div>
</div>
<div class="arch-arrow">▼</div>
<div class="arch-grid">
  <div class="arch-row">
    <div class="arch-cell"><span class="emoji">🔐</span>المصادقة<span class="sub">Supabase Auth</span></div>
    <div class="arch-cell"><span class="emoji">🗄️</span>قاعدة البيانات<span class="sub">PostgreSQL</span></div>
    <div class="arch-cell"><span class="emoji">⚡</span>الوقت الحقيقي<span class="sub">Realtime API</span></div>
  </div>
</div>
<div class="arch-arrow">▼</div>
<div class="arch-grid">
  <div class="arch-row">
    <div class="arch-cell"><span class="emoji">☁️</span>الاستضافة<span class="sub">Vercel / Netlify</span></div>
    <div class="arch-cell"><span class="emoji">🤖</span>الذكاء الاصطناعي<span class="sub">Gemini AI</span></div>
    <div class="arch-cell"><span class="emoji">📧</span>الإشعارات<span class="sub">Notification Service</span></div>
  </div>
</div>

<!-- ═══ بطاقات إحصائية ═══ -->
<table style="width:100%; border-collapse:separate; border-spacing:8px; margin:25px 0;">
<tr>
  <td style="width:25%; text-align:center; padding:20px 10px; border:2px solid #DBEAFE; background:#EFF6FF;">
    <span style="font-size:28pt; display:block; margin-bottom:5px;">🛡️</span>
    <span style="font-size:20pt; font-weight:900; color:#1B2B48; display:block;">4 أدوار</span>
    <span style="font-size:9pt; color:#6b7280; font-weight:700;">تحكم بالصلاحيات</span>
  </td>
  <td style="width:25%; text-align:center; padding:20px 10px; border:2px solid #D1FAE5; background:#F0FDF4;">
    <span style="font-size:28pt; display:block; margin-bottom:5px;">🏗️</span>
    <span style="font-size:20pt; font-weight:900; color:#1B2B48; display:block;">شاملة</span>
    <span style="font-size:9pt; color:#6b7280; font-weight:700;">إدارة المشاريع</span>
  </td>
  <td style="width:25%; text-align:center; padding:20px 10px; border:2px solid #FED7AA; background:#FFF7ED;">
    <span style="font-size:28pt; display:block; margin-bottom:5px;">🔄</span>
    <span style="font-size:20pt; font-weight:900; color:#1B2B48; display:block;">ذكي</span>
    <span style="font-size:9pt; color:#6b7280; font-weight:700;">سير موافقات</span>
  </td>
  <td style="width:25%; text-align:center; padding:20px 10px; border:2px solid #E9D5FF; background:#FAF5FF;">
    <span style="font-size:28pt; display:block; margin-bottom:5px;">🔔</span>
    <span style="font-size:20pt; font-weight:900; color:#1B2B48; display:block;">فورية</span>
    <span style="font-size:9pt; color:#6b7280; font-weight:700;">إشعارات</span>
  </td>
</tr>
</table>

<!-- ═══ رسم بياني: توزيع وحدات النظام ═══ -->
<div class="chart-panel">
  <h3>📊 توزيع وحدات النظام</h3>
  <p class="chart-sub">نسبة مئوية من الوظائف الأساسية</p>
  <table style="width:100%; border-collapse:collapse; margin-bottom:10px;">
    <tr>
      <td style="width:25%; background:#1B2B48; color:white; text-align:center; padding:14px 4px; font-weight:900; font-size:16pt; border:2px solid white;">25%</td>
      <td style="width:25%; background:#3B82F6; color:white; text-align:center; padding:14px 4px; font-weight:900; font-size:16pt; border:2px solid white;">25%</td>
      <td style="width:20%; background:#E95D22; color:white; text-align:center; padding:14px 4px; font-weight:900; font-size:16pt; border:2px solid white;">20%</td>
      <td style="width:15%; background:#10B981; color:white; text-align:center; padding:14px 4px; font-weight:900; font-size:14pt; border:2px solid white;">15%</td>
      <td style="width:10%; background:#8B5CF6; color:white; text-align:center; padding:14px 4px; font-weight:900; font-size:12pt; border:2px solid white;">10%</td>
      <td style="width:5%; background:#F59E0B; color:white; text-align:center; padding:14px 4px; font-weight:900; font-size:10pt; border:2px solid white;">5%</td>
    </tr>
    <tr>
      <td style="text-align:center; font-size:9pt; padding:6px 2px; font-weight:700; color:#1B2B48;">إدارة المشاريع</td>
      <td style="text-align:center; font-size:9pt; padding:6px 2px; font-weight:700; color:#3B82F6;">الطلبات الفنية</td>
      <td style="text-align:center; font-size:9pt; padding:6px 2px; font-weight:700; color:#E95D22;">سجل الإفراغ</td>
      <td style="text-align:center; font-size:9pt; padding:6px 2px; font-weight:700; color:#10B981;">سير الموافقات</td>
      <td style="text-align:center; font-size:9pt; padding:6px 2px; font-weight:700; color:#8B5CF6;">الإشعارات</td>
      <td style="text-align:center; font-size:9pt; padding:6px 2px; font-weight:700; color:#F59E0B;">التقارير</td>
    </tr>
  </table>
</div>

<!-- ═══════════════════════════ 2. مميزات النظام ═══════════════════════════ -->
<h1>2. مميزات النظام</h1>

<!-- ═══ رسم بياني: تقييم أداء النظام ═══ -->
<div class="chart-panel">
  <h3>⚡ تقييم أداء النظام</h3>
  <p class="chart-sub">نسبة مئوية من 100</p>
  <table style="width:100%; border-collapse:collapse;">
    <tr><td style="width:22%; padding:10px 12px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">🛡️ الأمان</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:95%; background:#E95D22; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">95%</td><td style="width:5%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
    <tr><td style="padding:10px 12px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">⚡ السرعة</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:88%; background:#3B82F6; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">88%</td><td style="width:12%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
    <tr><td style="padding:10px 12px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">🤝 سهولة الاستخدام</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:92%; background:#10B981; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">92%</td><td style="width:8%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
    <tr><td style="padding:10px 12px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">📊 التقارير</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:85%; background:#8B5CF6; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">85%</td><td style="width:15%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
    <tr><td style="padding:10px 12px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">🔗 التكامل</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:90%; background:#1B2B48; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">90%</td><td style="width:10%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
    <tr><td style="padding:10px 12px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">🔄 المرونة</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:87%; background:#F59E0B; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">87%</td><td style="width:13%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
  </table>
</div>

<!-- ═══ بطاقات المميزات ═══ -->
<table style="width:100%; border-collapse:separate; border-spacing:0 8px; margin:15px 0;">
  <tr><td style="width:45px; text-align:center; padding:14px 8px; font-size:22pt; vertical-align:top; background:#FFF7ED; border:1px solid #FED7AA;">📦</td><td style="padding:14px 16px; border-bottom:1px solid #f3f4f6;"><span style="font-size:13pt; font-weight:900; color:#1B2B48; display:block;">إدارة مشاريع متكاملة</span><span style="font-size:10pt; color:#6b7280; font-weight:600;">بطاقات مشاريع تفاعلية مع نسب إنجاز حية، سجل أعمال، تعليقات، واستيراد/تصدير إكسل</span></td></tr>
  <tr><td style="text-align:center; padding:14px 8px; font-size:22pt; vertical-align:top; background:#FFF7ED; border:1px solid #FED7AA;">🔄</td><td style="padding:14px 16px; border-bottom:1px solid #f3f4f6;"><span style="font-size:13pt; font-weight:900; color:#1B2B48; display:block;">سير موافقات ذكي ومتسلسل</span><span style="font-size:10pt; color:#6b7280; font-weight:600;">تسلسل موافقات قابل للتخصيص. الطلب ينتقل تلقائياً من مسؤول لآخر مع تتبع بصري</span></td></tr>
  <tr><td style="text-align:center; padding:14px 8px; font-size:22pt; vertical-align:top; background:#FFF7ED; border:1px solid #FED7AA;">🔔</td><td style="padding:14px 16px; border-bottom:1px solid #f3f4f6;"><span style="font-size:13pt; font-weight:900; color:#1B2B48; display:block;">نظام إشعارات متقدم</span><span style="font-size:10pt; color:#6b7280; font-weight:600;">إشعارات فورية داخل النظام عند كل تحديث، موجهة ذكياً حسب دور المستخدم</span></td></tr>
  <tr><td style="text-align:center; padding:14px 8px; font-size:22pt; vertical-align:top; background:#FFF7ED; border:1px solid #FED7AA;">📥</td><td style="padding:14px 16px; border-bottom:1px solid #f3f4f6;"><span style="font-size:13pt; font-weight:900; color:#1B2B48; display:block;">استيراد وتصدير إكسل</span><span style="font-size:10pt; color:#6b7280; font-weight:600;">استيراد بيانات من Excel بنقرة واحدة مع تصدير التقارير بتنسيق احترافي</span></td></tr>
  <tr><td style="text-align:center; padding:14px 8px; font-size:22pt; vertical-align:top; background:#FFF7ED; border:1px solid #FED7AA;">✨</td><td style="padding:14px 16px; border-bottom:1px solid #f3f4f6;"><span style="font-size:13pt; font-weight:900; color:#1B2B48; display:block;">إكمال تلقائي ذكي</span><span style="font-size:10pt; color:#6b7280; font-weight:600;">إدخال رقم الهوية يملأ بيانات العميل تلقائياً من الأرشيف</span></td></tr>
  <tr><td style="text-align:center; padding:14px 8px; font-size:22pt; vertical-align:top; background:#FFF7ED; border:1px solid #FED7AA;">📊</td><td style="padding:14px 16px; border-bottom:1px solid #f3f4f6;"><span style="font-size:13pt; font-weight:900; color:#1B2B48; display:block;">لوحة إحصائيات شاملة</span><span style="font-size:10pt; color:#6b7280; font-weight:600;">رسوم بيانية ونسبية مع تحديثات لحظية لتوزيع الحالات</span></td></tr>
  <tr><td style="text-align:center; padding:14px 8px; font-size:22pt; vertical-align:top; background:#FFF7ED; border:1px solid #FED7AA;">🛡️</td><td style="padding:14px 16px; border-bottom:1px solid #f3f4f6;"><span style="font-size:13pt; font-weight:900; color:#1B2B48; display:block;">أمان وصلاحيات متقدمة</span><span style="font-size:10pt; color:#6b7280; font-weight:600;">تحكم كامل بصلاحيات الوصول حسب الدور مع تشفير SHA-256</span></td></tr>
  <tr><td style="text-align:center; padding:14px 8px; font-size:22pt; vertical-align:top; background:#FFF7ED; border:1px solid #FED7AA;">🤖</td><td style="padding:14px 16px; border-bottom:1px solid #f3f4f6;"><span style="font-size:13pt; font-weight:900; color:#1B2B48; display:block;">مساعد ذكي AI</span><span style="font-size:10pt; color:#6b7280; font-weight:600;">مساعد يعمل بتقنية Gemini AI للإجابة على استفسارات المشاريع</span></td></tr>
</table>

<h2>2.1 إدارة المشاريع المتكاملة</h2>
<ul>
  <li>لوحة تحكم مركزية لجميع المشاريع مع نسب الإنجاز الحية</li>
  <li>بطاقات مشاريع تفاعلية تعرض الحالة والتفاصيل بنقرة واحدة</li>
  <li>إمكانية تثبيت المشاريع المهمة في أعلى القائمة</li>
  <li>سجل أعمال تفصيلي لكل مشروع مع إمكانية التعليق</li>
  <li>حساب نسبة الإنجاز تلقائياً بناءً على الأعمال المنجزة</li>
</ul>

<h2>2.2 سير موافقات ذكي ومتسلسل</h2>
<div class="highlight-box">
  <strong>🔄 ميزة التسلسل الذكي:</strong> عند إنشاء طلب جديد، يتم تعيينه تلقائياً للمسؤول الأول في سلسلة الموافقات. بعد موافقته، ينتقل تلقائياً للمسؤول التالي وهكذا حتى الموافقة النهائية أو الرفض.
</div>
<ul>
  <li>تسلسل موافقات قابل للتخصيص بالكامل من قبل المدير</li>
  <li>إمكانية إضافة عدد غير محدود من المسؤولين في السلسلة</li>
  <li>تتبع بصري لحالة كل خطوة (وافق ✅ / بانتظار ⏳ / لم يصل ⚪)</li>
  <li>تسجيل تلقائي لتاريخ ووقت كل موافقة أو رفض</li>
  <li>نسخة للعلم (CC) مع إشعارات بريدية للأطراف المعنية</li>
</ul>

<h2>2.3 نظام إشعارات متقدم</h2>
<ul>
  <li>إشعارات فورية داخل النظام عند كل تحديث</li>
  <li>إشعارات ذكية تُوجَّه حسب دور المستخدم</li>
  <li>جرس إشعارات في الشريط العلوي مع عداد للإشعارات غير المقروءة</li>
  <li>ربط كل إشعار برابط مباشر للطلب أو المشروع المعني</li>
</ul>

<h2>2.4 استيراد وتصدير البيانات</h2>
<ul>
  <li>استيراد من ملفات إكسل (Excel) لكل من: المشاريع، الطلبات الفنية، والإفراغات</li>
  <li>تصدير إلى إكسل بتنسيق احترافي مع أسماء أعمدة عربية</li>
  <li>إكمال تلقائي ذكي: عند إدخال رقم هوية العميل يتم جلب بياناته آلياً من الأرشيف</li>
</ul>

<h2>2.5 لوحة إحصائيات شاملة</h2>
<ul>
  <li>رسوم بيانية دائرية ونسبية لتوزيع الحالات</li>
  <li>إحصائيات منفصلة لكل قسم (فني، إفراغات، مشاريع)</li>
  <li>تحديثات فورية عند أي تغيير في البيانات</li>
  <li>عرض أحدث التحديثات والأنشطة في الوقت الفعلي</li>
</ul>

<h2>2.6 أمان وصلاحيات متقدمة</h2>
<ul>
  <li>تحكم كامل بصلاحيات الوصول حسب الدور الوظيفي</li>
  <li>كل مستخدم يرى فقط الأقسام المصرح له بالوصول إليها</li>
  <li>تغيير كلمة المرور الذاتي مع تشفير SHA-256</li>
  <li>جلسات مؤمنة عبر Supabase Auth مع التخزين المحلي</li>
</ul>

<h2>2.7 مساعد ذكي (AI Assistant)</h2>
<ul>
  <li>مساعد ذكي يعمل بتقنية Gemini AI</li>
  <li>يجيب على استفسارات المشاريع والطلبات بلغة طبيعية</li>
  <li>يقترح إجراءات وتحسينات بناءً على تحليل البيانات</li>
  <li>متاح لمدير النظام ومدير العلاقات العامة فقط</li>
</ul>

<!-- ═══════════════════════════ 3. الأقسام والصلاحيات ═══════════════════════════ -->
<h1>3. الأقسام والصلاحيات</h1>

<!-- ═══ رسم بياني: مقارنة الصلاحيات بين الأدوار ═══ -->
<div class="chart-panel">
  <h3>📊 مقارنة الصلاحيات بين الأدوار</h3>
  <p class="chart-sub">عدد الصلاحيات والأقسام المتاحة لكل دور</p>
  <table style="width:100%; border-collapse:collapse;">
    <tr style="background:#1B2B48; color:white;"><th style="padding:12px; text-align:right;">الدور</th><th style="padding:12px; text-align:center;">الصلاحيات</th><th style="padding:12px; text-align:center;">الأقسام</th><th style="padding:12px;">مستوى الوصول</th></tr>
    <tr><td style="padding:10px 14px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;"><span style="background:#1B2B48; color:white; padding:3px 12px; font-size:10pt;">مدير النظام</span></td><td style="text-align:center; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:100%; background:#1B2B48; color:white; padding:6px; text-align:center; font-weight:900; border:none;">7 صلاحيات</td></tr></table></td><td style="text-align:center; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:100%; background:rgba(27,43,72,0.3); padding:6px; text-align:center; font-weight:900; border:none;">6 أقسام</td></tr></table></td><td style="padding:10px; font-weight:700; text-align:center; border:1px solid #e5e7eb; color:#1B2B48;">⭐⭐⭐⭐⭐</td></tr>
    <tr style="background:#f8f9fc;"><td style="padding:10px 14px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;"><span style="background:#3B82F6; color:white; padding:3px 12px; font-size:10pt;">العلاقات العامة</span></td><td style="text-align:center; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:71%; background:#3B82F6; color:white; padding:6px; text-align:center; font-weight:900; border:none;">5 صلاحيات</td><td style="width:29%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="text-align:center; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:67%; background:rgba(59,130,246,0.3); padding:6px; text-align:center; font-weight:900; border:none;">4 أقسام</td><td style="width:33%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="padding:10px; font-weight:700; text-align:center; border:1px solid #e5e7eb; color:#3B82F6;">⭐⭐⭐⭐</td></tr>
    <tr><td style="padding:10px 14px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;"><span style="background:#10B981; color:white; padding:3px 12px; font-size:10pt;">القسم الفني</span></td><td style="text-align:center; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:43%; background:#10B981; color:white; padding:6px; text-align:center; font-weight:900; border:none;">3 صلاحيات</td><td style="width:57%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="text-align:center; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:33%; background:rgba(16,185,129,0.3); padding:6px; text-align:center; font-weight:900; border:none;">2 قسم</td><td style="width:67%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="padding:10px; font-weight:700; text-align:center; border:1px solid #e5e7eb; color:#10B981;">⭐⭐⭐</td></tr>
    <tr style="background:#f8f9fc;"><td style="padding:10px 14px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;"><span style="background:#E95D22; color:white; padding:3px 12px; font-size:10pt;">قسم CX</span></td><td style="text-align:center; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:43%; background:#E95D22; color:white; padding:6px; text-align:center; font-weight:900; border:none;">3 صلاحيات</td><td style="width:57%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="text-align:center; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:33%; background:rgba(233,93,34,0.3); padding:6px; text-align:center; font-weight:900; border:none;">2 قسم</td><td style="width:67%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="padding:10px; font-weight:700; text-align:center; border:1px solid #e5e7eb; color:#E95D22;">⭐⭐⭐</td></tr>
  </table>
</div>

<h2>3.1 مدير النظام (ADMIN)</h2>
<table>
  <tr><th>الصلاحية</th><th>الوصف</th></tr>
  <tr><td>لوحة الإحصائيات</td><td>عرض شامل لجميع إحصائيات النظام</td></tr>
  <tr><td>إدارة المشاريع</td><td>إنشاء وتعديل وحذف المشاريع</td></tr>
  <tr><td>الطلبات الفنية</td><td>عرض وإدارة جميع الطلبات الفنية</td></tr>
  <tr><td>سجل الإفراغ</td><td>عرض وإدارة جميع طلبات الإفراغ</td></tr>
  <tr><td>إدارة المستخدمين</td><td>إضافة وتعديل وحذف حسابات الموظفين</td></tr>
  <tr><td>سير الموافقات</td><td>تخصيص تسلسل الموافقات لكل نوع طلب</td></tr>
  <tr><td>الموافقة على الطلبات</td><td>صلاحية الموافقة/الرفض على أي طلب</td></tr>
</table>

<h2>3.2 العلاقات العامة (PR_MANAGER)</h2>
<table>
  <tr><th>الصلاحية</th><th>الوصف</th></tr>
  <tr><td>لوحة الإحصائيات</td><td>عرض إحصائيات المشاريع والطلبات</td></tr>
  <tr><td>إدارة المشاريع</td><td>إنشاء وتعديل المشاريع وإضافة أعمال</td></tr>
  <tr><td>الطلبات الفنية</td><td>إنشاء وتعديل ومتابعة الطلبات الفنية</td></tr>
  <tr><td>سجل الإفراغ</td><td>عرض ومتابعة طلبات الإفراغ</td></tr>
</table>

<h2>3.3 القسم الفني / المشاريع (TECHNICAL)</h2>
<table>
  <tr><th>الصلاحية</th><th>الوصف</th></tr>
  <tr><td>الطلبات الفنية</td><td>عرض وتنفيذ الطلبات الفنية المعينة عليه</td></tr>
  <tr><td>الموافقة الفنية</td><td>موافقة/رفض الطلبات المعينة عليه في السلسلة</td></tr>
</table>

<h2>3.4 قسم CX / الإفراغات (CONVEYANCE)</h2>
<table>
  <tr><th>الصلاحية</th><th>الوصف</th></tr>
  <tr><td>سجل الإفراغ</td><td>إنشاء وإدارة طلبات الإفراغ ونقل الملكية</td></tr>
  <tr><td>الموافقة على الإفراغ</td><td>موافقة/رفض الطلبات المعينة عليه في السلسلة</td></tr>
</table>

<!-- ═══════════════════════════ 4. الربط بين الأقسام ═══════════════════════════ -->
<h1>4. الربط بين الأقسام</h1>

<div class="highlight-box-blue">
  <strong>💡 الفكرة الأساسية:</strong> يعمل النظام كجسر رقمي يربط بين أقسام الشركة الثلاثة (العلاقات العامة PR، القسم الفني Technical، وقسم CX) في منصة واحدة، مما يلغي الحاجة لتبادل الملفات عبر البريد أو برامج محادثات غير رسمية.
</div>

<h2>خريطة تدفق البيانات بين الأقسام</h2>
<div style="text-align: center; margin: 20px 0;">
  <div class="dept-node" style="border-color: #3B82F6;"><span class="emoji">📋</span><span class="name" style="color: #3B82F6;">العلاقات العامة</span><span class="code">PR_MANAGER</span></div>
  <div class="dept-node" style="border-color: #10B981;"><span class="emoji">⚙️</span><span class="name" style="color: #10B981;">القسم الفني</span><span class="code">TECHNICAL</span></div>
  <div class="dept-node" style="border-color: #E95D22;"><span class="emoji">🏠</span><span class="name" style="color: #E95D22;">قسم CX</span><span class="code">CONVEYANCE</span></div>
</div>
<div class="arch-arrow">▼ طلبات ▼ موافقات ▼ إفراغات</div>
<div class="platform-box">
  <div class="title">نظام تتبع مشاريع دار وإعمار</div>
  <div class="subtitle">منصة مركزية موحدة</div>
  <div class="mini-features">
    <div class="mini-feat">إشعارات</div>
    <div class="mini-feat">تتبع حي</div>
    <div class="mini-feat">تسلسل</div>
    <div class="mini-feat">تقارير</div>
  </div>
</div>
<div class="arch-arrow">▼</div>
<div style="text-align: center;"><div class="dept-node" style="border-color: #1B2B48; width: 40%;"><span class="emoji">👑</span><span class="name" style="color: #1B2B48;">مدير النظام</span><span class="code">ADMIN — إشراف شامل</span></div></div>

<h2>4.1 مسار الطلب الفني (PR ↔ Technical)</h2>
<div class="flow-step">
  <strong>الخطوة 1:</strong> يقوم قسم العلاقات العامة (PR) بإنشاء طلب فني جديد (رخصة بناء، طلب كهرباء، شهادة إتمام بناء، إلخ)
</div>
<div class="flow-step">
  <strong>الخطوة 2:</strong> يُعيَّن الطلب تلقائياً للمسؤول الأول في سلسلة الموافقات المُحددة مسبقاً
</div>
<div class="flow-step">
  <strong>الخطوة 3:</strong> يتلقى القسم الفني إشعاراً فورياً بالطلب الجديد
</div>
<div class="flow-step">
  <strong>الخطوة 4:</strong> يقوم المسؤول بالموافقة → ينتقل تلقائياً للمسؤول التالي (أو رفض → يتوقف التسلسل)
</div>
<div class="flow-step">
  <strong>الخطوة 5:</strong> عند الموافقة النهائية يتم إنشاء بند عمل مشروع (ProjectWork) تلقائياً
</div>
<div class="flow-step">
  <strong>الخطوة 6:</strong> تُحدَّث نسبة إنجاز المشروع تلقائياً
</div>

<h2>4.2 مسار طلب الإفراغ (CX ↔ PR ↔ Admin)</h2>
<div class="flow-step">
  <strong>الخطوة 1:</strong> يقوم قسم CX بتسجيل طلب إفراغ/نقل ملكية جديد مع بيانات العميل
</div>
<div class="flow-step">
  <strong>الخطوة 2:</strong> يتم الإكمال التلقائي لبيانات العميل من أرشيف العملاء (بإدخال رقم الهوية فقط)
</div>
<div class="flow-step">
  <strong>الخطوة 3:</strong> يُعيَّن الطلب للمسؤول الأول في السلسلة ويُرسل إشعار
</div>
<div class="flow-step">
  <strong>الخطوة 4:</strong> يتنقل الطلب عبر سلسلة الموافقات (قد يشمل CX → PR → Admin)
</div>
<div class="flow-step">
  <strong>الخطوة 5:</strong> عند الموافقة النهائية يتم إنشاء بند عمل مشروع ورفع حالة الطلب لـ "مقبول"
</div>

<h2>4.3 مصفوفة الربط بين الأقسام</h2>
<table>
  <tr>
    <th>نوع العملية</th>
    <th>القسم المُنشئ</th>
    <th>قسم المراجعة</th>
    <th>قسم الاعتماد</th>
    <th>الإشعارات</th>
  </tr>
  <tr>
    <td>طلب فني (رخصة/كهرباء)</td>
    <td>PR / Technical</td>
    <td>Technical</td>
    <td>حسب السلسلة</td>
    <td>PR + Technical + Admin</td>
  </tr>
  <tr>
    <td>طلب إفراغ صك</td>
    <td>CX</td>
    <td>PR</td>
    <td>حسب السلسلة</td>
    <td>PR + CX + Admin</td>
  </tr>
  <tr>
    <td>نقل ملكية عداد</td>
    <td>CX</td>
    <td>CX / PR</td>
    <td>حسب السلسلة</td>
    <td>PR + CX + Admin</td>
  </tr>
  <tr>
    <td>إضافة عمل مشروع</td>
    <td>PR / Admin</td>
    <td>-</td>
    <td>PR / Admin</td>
    <td>PR + Admin</td>
  </tr>
  <tr>
    <td>تعليقات وملاحظات</td>
    <td>أي قسم</td>
    <td>-</td>
    <td>-</td>
    <td>الأقسام المعنية بالطلب</td>
  </tr>
</table>

<!-- ═══════════════════════════ 5. سير الموافقات ═══════════════════════════ -->
<h1>5. سير الموافقات والتسلسل</h1>

<h2>5.1 آلية عمل تسلسل الموافقات</h2>
<p>يعتمد النظام على آلية موافقات متسلسلة قابلة للتخصيص بالكامل. لكل نوع طلب يمكن تحديد:</p>
<ul>
  <li><strong>المسؤولون المباشرون (TO):</strong> قائمة مرتبة من الأشخاص، يمر الطلب على كل واحد بالترتيب</li>
  <li><strong>النسخ (CC):</strong> أشخاص يتلقون إشعاراً بكل تحديث دون الحاجة لموافقتهم</li>
  <li><strong>الأدوار المستقبلة للإشعارات:</strong> أقسام كاملة تتلقى الإشعارات</li>
</ul>

<h2>مخطط تسلسل الموافقات</h2>
<div class="wf-step wf-start">📝 إنشاء الطلب — يُعيَّن تلقائياً للمسؤول الأول</div>
<div class="wf-arrow">▼</div>
<div class="wf-step wf-approved">✅ المسؤول الأول — نورة المالكي (CX) — وافقت</div>
<div class="wf-arrow">▼</div>
<div class="wf-step wf-current">⏳ المسؤول الثاني — تهاني المالكي (CX) — بانتظار الموافقة</div>
<div class="wf-arrow">▼</div>
<div class="wf-step wf-pending">⚪ المسؤول الثالث — الوليد الدوسري (Admin) — لم يصل بعد</div>
<div class="wf-arrow">▼</div>
<div style="display: flex; gap: 15px; justify-content: center;">
  <div class="wf-step wf-success" style="flex: 1;">✓ موافقة نهائية — الحالة = مقبول</div>
  <div class="wf-step wf-rejected" style="flex: 1;">✗ رفض — يتوقف التسلسل</div>
</div>

<h2>5.2 حالات الموافقة</h2>
<table>
  <tr>
    <th>الحالة</th>
    <th>الرمز</th>
    <th>الوصف</th>
  </tr>
  <tr>
    <td style="color: green;">✅ تمت الموافقة</td>
    <td>approved</td>
    <td>المسؤول وافق على الطلب</td>
  </tr>
  <tr>
    <td style="color: blue;">⏳ بانتظار الموافقة</td>
    <td>current</td>
    <td>الطلب عند هذا المسؤول حالياً</td>
  </tr>
  <tr>
    <td style="color: gray;">⚪ لم يصل بعد</td>
    <td>pending</td>
    <td>الطلب لم يصل لهذا المسؤول في السلسلة</td>
  </tr>
  <tr>
    <td style="color: red;">❌ مرفوض</td>
    <td>rejected</td>
    <td>تم رفض الطلب (يتوقف التسلسل فوراً)</td>
  </tr>
</table>

<h2>5.3 مثال عملي على التسلسل</h2>
<div class="info-box">
  <strong>مثال: طلب إفراغ صك</strong><br/>
  <strong>السلسلة:</strong> نورة المالكي (CX) → تهاني المالكي (CX) → الوليد الدوسري (Admin)<br/><br/>
  1. يتم إنشاء الطلب ← يُعيَّن تلقائياً لـ <strong>نورة المالكي</strong><br/>
  2. نورة توافق ← يتحول تلقائياً لـ <strong>تهاني المالكي</strong> مع تسجيل تعليق<br/>
  3. تهاني توافق ← يتحول تلقائياً لـ <strong>الوليد الدوسري</strong><br/>
  4. الوليد يوافق ← <strong>موافقة نهائية</strong>، الحالة = "مقبول"<br/><br/>
  ⚠️ <strong>في حال الرفض:</strong> في أي مرحلة، إذا رفض أي مسؤول يتوقف التسلسل والحالة = "مرفوض"
</div>

<h2>5.4 تخصيص سير الموافقات</h2>
<p>يمكن لمدير النظام تعديل سير الموافقات من خلال:</p>
<ol>
  <li>الدخول إلى قائمة "سير الموافقات" من القائمة الجانبية</li>
  <li>اختيار نوع الطلب المراد تعديل سلسلة موافقاته</li>
  <li>إعادة ترتيب المسؤولين بالسحب للأعلى/الأسفل أو إضافة/إزالة مسؤولين</li>
  <li>تحديد أسماء النسخ للعلم (CC) والأدوار المستقبلة للإشعارات</li>
  <li>حفظ التغييرات (تُطبق فوراً على الطلبات الجديدة)</li>
</ol>

<!-- ═══════════════════════════ 6. إدارة المشاريع ═══════════════════════════ -->
<h1>6. إدارة المشاريع</h1>

<h2>6.1 إنشاء مشروع جديد</h2>
<ul>
  <li>يمكن لقسم PR أو المدير إنشاء مشروع جديد مع بياناته الأساسية</li>
  <li>يتضمن: الاسم، الموقع، المقاول، المهندس المشرف، عدد الوحدات</li>
  <li>يمكن رفع صورة المشروع وبيانات المقاولين (كهرباء، مياه)</li>
</ul>

<h2>6.2 سجل أعمال المشروع</h2>
<ul>
  <li>كل مشروع يحتوي على سجل أعمال مفصّل</li>
  <li>يمكن إضافة أعمال يدوياً أو استيرادها من إكسل</li>
  <li>يتم إنشاء أعمال تلقائياً عند الموافقة على طلبات فنية أو إفراغ</li>
  <li>نسبة الإنجاز تُحسب تلقائياً = (المنجز ÷ الإجمالي) × 100</li>
</ul>

<h2>6.3 عرض الطلبات المرتبطة</h2>
<p>عند فتح صفحة أي مشروع، يعرض النظام تلقائياً جميع:</p>
<ul>
  <li>الطلبات الفنية المرتبطة بهذا المشروع</li>
  <li>طلبات الإفراغ ونقل الملكية المرتبطة</li>
  <li>أعمال المشروع مع حالة كل منها</li>
</ul>

<!-- ═══════════════════════════ 7. الطلبات الفنية ═══════════════════════════ -->
<h1>7. الطلبات الفنية</h1>

<h2>7.1 أنواع الطلبات</h2>
<table>
  <tr><th>النوع</th><th>الوصف</th></tr>
  <tr><td>إصدار رخصة</td><td>طلب إصدار رخصة بناء من الجهات المختصة</td></tr>
  <tr><td>طلب كهرباء</td><td>طلب توصيل أو نقل خدمة كهرباء</td></tr>
  <tr><td>شهادة إتمام بناء</td><td>طلب استخراج شهادة إتمام بناء من البلدية</td></tr>
  <tr><td>رسوم</td><td>طلبات متعلقة بالرسوم الحكومية</td></tr>
</table>

<h2>7.2 دورة حياة الطلب الفني</h2>
<p>جديد → متابعة → قيد التنفيذ → تحت المراجعة → معتمد/مرفوض → منجز</p>

<h2>7.3 جهات المراجعة</h2>
<p>يدعم النظام التعامل مع أكثر من 15 جهة حكومية منها:</p>
<ul>
  <li>الشركة السعودية للكهرباء</li>
  <li>شركة المياه الوطنية</li>
  <li>أمانة منطقة الرياض / البلديات</li>
  <li>وزارة الإسكان / الشركة الوطنية للإسكان</li>
  <li>الدفاع المدني</li>
  <li>وغيرها...</li>
</ul>

<!-- ═══════════════════════════ 8. سجل الإفراغات ═══════════════════════════ -->
<h1>8. سجل الإفراغات (CX)</h1>

<h2>8.1 أنواع طلبات الإفراغ</h2>
<table>
  <tr><th>النوع</th><th>الوصف</th></tr>
  <tr><td>طلب إفراغ صك</td><td>نقل ملكية الصك العقاري من الشركة للعميل</td></tr>
  <tr><td>نقل ملكية عداد كهرباء/مياه</td><td>نقل ملكية العدادات باسم العميل</td></tr>
</table>

<h2>8.2 بيانات الطلب</h2>
<p>يشمل كل طلب إفراغ:</p>
<ul>
  <li><strong>بيانات المستفيد:</strong> الاسم، رقم الهوية، الجوال، تاريخ الميلاد</li>
  <li><strong>بيانات العقار:</strong> المشروع، الوحدة، رقم المخطط، المنطقة، المدينة</li>
  <li><strong>بيانات التمويل:</strong> البنك، قيمة الوحدة، نوع العقد، الرقم الضريبي</li>
  <li><strong>بيانات الصك:</strong> رقم الصك القديم/الجديد، التواريخ</li>
</ul>

<h2>8.3 الإكمال التلقائي الذكي</h2>
<div class="highlight-box">
  <strong>✨ ميزة فريدة:</strong> عند إدخال رقم هوية العميل (10 أرقام)، يقوم النظام تلقائياً بالبحث في أرشيف العملاء وملء جميع البيانات المتوفرة (الاسم، الجوال، المشروع، الوحدة، البنك، إلخ)، مما يوفر وقتاً كبيراً ويقلل الأخطاء.
</div>

<!-- ═══════════════════════════ 9. الإحصائيات ═══════════════════════════ -->
<h1>9. لوحة الإحصائيات والتقارير</h1>

<!-- ═══ رسم بياني: توزيع حالات الطلبات ═══ -->
<div class="chart-panel">
  <h3>📊 نموذج: توزيع حالات الطلبات</h3>
  <p class="chart-sub">نسبة مئوية من إجمالي الطلبات</p>
  <table style="width:100%; border-collapse:collapse; margin-bottom:10px;">
    <tr>
      <td style="width:45%; background:#10B981; color:white; text-align:center; padding:18px 4px; font-weight:900; font-size:18pt; border:3px solid white;">45%<br/><span style="font-size:10pt; font-weight:700;">منجز ✅</span></td>
      <td style="width:30%; background:#3B82F6; color:white; text-align:center; padding:18px 4px; font-weight:900; font-size:18pt; border:3px solid white;">30%<br/><span style="font-size:10pt; font-weight:700;">قيد الإجراء ⏳</span></td>
      <td style="width:15%; background:#F59E0B; color:white; text-align:center; padding:18px 4px; font-weight:900; font-size:16pt; border:3px solid white;">15%<br/><span style="font-size:9pt; font-weight:700;">جديد 🆕</span></td>
      <td style="width:10%; background:#EF4444; color:white; text-align:center; padding:18px 4px; font-weight:900; font-size:14pt; border:3px solid white;">10%<br/><span style="font-size:9pt; font-weight:700;">مرفوض ❌</span></td>
    </tr>
  </table>
</div>

<!-- ═══ رسم بياني: إحصائيات الأقسام ═══ -->
<div class="chart-panel">
  <h3>📈 إحصائيات الأقسام</h3>
  <p class="chart-sub">عدد العناصر في كل قسم</p>
  <table style="width:100%; border-collapse:collapse;">
    <tr><td style="width:25%; padding:10px 14px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">🏗️ المشاريع</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:8%; background:#1B2B48; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">24</td><td style="width:92%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
    <tr><td style="padding:10px 14px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">⚙️ الطلبات الفنية</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:28%; background:#3B82F6; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">87</td><td style="width:72%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
    <tr><td style="padding:10px 14px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">🏠 الإفراغات</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:50%; background:#E95D22; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">156</td><td style="width:50%; background:#f3f4f6; border:none;"></td></tr></table></td></tr>
    <tr><td style="padding:10px 14px; font-weight:800; font-size:12pt; border:1px solid #e5e7eb;">📋 الأعمال</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:100%; background:#10B981; color:white; padding:8px; text-align:center; font-weight:900; font-size:11pt; border:none;">312</td></tr></table></td></tr>
  </table>
</div>

<h2>9.1 إحصائيات عامة</h2>
<ul>
  <li>عدد المشاريع النشطة ونسب الإنجاز الإجمالية</li>
  <li>عدد الطلبات الفنية (منجزة / قيد الإجراء / مرفوضة)</li>
  <li>عدد طلبات الإفراغ (مكتملة / قيد الإجراء / مرفوضة)</li>
</ul>

<h2>9.2 الرسوم البيانية</h2>
<ul>
  <li>دوائر نسبية لتوزيع الحالات في كل قسم</li>
  <li>قائمة أحدث التحديثات والأنشطة</li>
  <li>بطاقات إحصائية بارزة بألوان مميزة</li>
</ul>

<!-- ═══════════════════════════ 10. الإشعارات ═══════════════════════════ -->
<h1>10. نظام الإشعارات</h1>

<h2>10.1 أنواع الإشعارات</h2>
<table>
  <tr><th>الحدث</th><th>المستقبلون</th></tr>
  <tr><td>طلب فني جديد</td><td>القسم الفني + العلاقات العامة + المدير</td></tr>
  <tr><td>طلب إفراغ جديد</td><td>العلاقات العامة + CX + المدير</td></tr>
  <tr><td>موافقة/رفض على طلب</td><td>الأدوار المُحددة في سير الموافقات</td></tr>
  <tr><td>تحويل طلب لمسؤول تالي</td><td>جميع الأطراف المعنية</td></tr>
  <tr><td>تعليق جديد</td><td>القسم المعني بالطلب</td></tr>
  <tr><td>استيراد إكسل</td><td>القسم المعني</td></tr>
</table>

<!-- ═══════════════════════════ 11. الفوائد والحلول ═══════════════════════════ -->
<h1>11. الفوائد والحلول</h1>

<h2>11.1 المشاكل التي يحلها النظام</h2>
<table>
  <tr>
    <th>المشكلة السابقة</th>
    <th>الحل في النظام</th>
  </tr>
  <tr>
    <td>تشتت البيانات بين إيميلات وملفات إكسل متفرقة</td>
    <td>قاعدة بيانات مركزية موحدة يصل إليها الجميع حسب صلاحياته</td>
  </tr>
  <tr>
    <td>عدم وضوح مسؤولية كل طلب ومن يتابعه</td>
    <td>تسلسل موافقات واضح مع تعيين تلقائي للمسؤول المباشر</td>
  </tr>
  <tr>
    <td>تأخر الموافقات وضياع الطلبات بين الأقسام</td>
    <td>إشعارات فورية + تتبع بصري لموقع الطلب في السلسلة</td>
  </tr>
  <tr>
    <td>صعوبة تتبع نسب إنجاز المشاريع</td>
    <td>حساب آلي للإنجاز مع ربط تلقائي بين الأعمال والمشاريع</td>
  </tr>
  <tr>
    <td>إعادة إدخال البيانات يدوياً في كل مرة</td>
    <td>إكمال تلقائي من الأرشيف + استيراد إكسل</td>
  </tr>
  <tr>
    <td>عدم وجود سجل لقرارات الموافقة والرفض</td>
    <td>تسجيل تلقائي لكل موافقة/رفض مع اسم المسؤول والتاريخ والسبب</td>
  </tr>
  <tr>
    <td>صعوبة التواصل بين الأقسام بشأن الطلبات</td>
    <td>نظام تعليقات مباشر داخل كل طلب + إشعارات لحظية</td>
  </tr>
  <tr>
    <td>عدم وجود تقارير إدارية شاملة</td>
    <td>لوحة إحصائيات بيانية + تصدير إكسل</td>
  </tr>
</table>

<h2>مقارنة الأداء: قبل وبعد النظام</h2>
<div class="chart-panel">
  <h3>📊 مقارنة الأداء: قبل وبعد النظام</h3>
  <p class="chart-sub">نسبة مئوية من 100</p>
  <table style="width:100%; border-collapse:collapse;">
    <tr style="background:#1B2B48; color:white;"><th style="padding:12px; text-align:right; width:25%;">المعيار</th><th style="padding:12px; text-align:center;">🔴 قبل النظام</th><th style="padding:12px; text-align:center;">🟢 بعد النظام</th><th style="padding:12px; text-align:center; width:10%;">التحسن</th></tr>
    <tr><td style="padding:10px 14px; font-weight:800; border:1px solid #e5e7eb;">⏱ وقت المعاملة</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:100%; background:#EF4444; color:white; padding:6px; text-align:center; font-weight:900; border:none;">100%</td></tr></table></td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:30%; background:#10B981; color:white; padding:6px; text-align:center; font-weight:900; border:none;">30%</td><td style="width:70%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="text-align:center; font-weight:900; color:#10B981; font-size:14pt; border:1px solid #e5e7eb;">↓70%</td></tr>
    <tr style="background:#f8f9fc;"><td style="padding:10px 14px; font-weight:800; border:1px solid #e5e7eb;">📊 دقة البيانات</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:60%; background:#EF4444; color:white; padding:6px; text-align:center; font-weight:900; border:none;">60%</td><td style="width:40%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:95%; background:#10B981; color:white; padding:6px; text-align:center; font-weight:900; border:none;">95%</td><td style="width:5%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="text-align:center; font-weight:900; color:#10B981; font-size:14pt; border:1px solid #e5e7eb;">↑35%</td></tr>
    <tr><td style="padding:10px 14px; font-weight:800; border:1px solid #e5e7eb;">⚡ سرعة الموافقات</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:40%; background:#EF4444; color:white; padding:6px; text-align:center; font-weight:900; border:none;">40%</td><td style="width:60%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:90%; background:#10B981; color:white; padding:6px; text-align:center; font-weight:900; border:none;">90%</td><td style="width:10%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="text-align:center; font-weight:900; color:#10B981; font-size:14pt; border:1px solid #e5e7eb;">↑50%</td></tr>
    <tr style="background:#f8f9fc;"><td style="padding:10px 14px; font-weight:800; border:1px solid #e5e7eb;">👁️ شفافية التتبع</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:30%; background:#EF4444; color:white; padding:6px; text-align:center; font-weight:900; border:none;">30%</td><td style="width:70%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:95%; background:#10B981; color:white; padding:6px; text-align:center; font-weight:900; border:none;">95%</td><td style="width:5%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="text-align:center; font-weight:900; color:#10B981; font-size:14pt; border:1px solid #e5e7eb;">↑65%</td></tr>
    <tr><td style="padding:10px 14px; font-weight:800; border:1px solid #e5e7eb;">🔗 تكامل الأقسام</td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:25%; background:#EF4444; color:white; padding:6px; text-align:center; font-weight:900; border:none;">25%</td><td style="width:75%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="padding:0; border:1px solid #e5e7eb;"><table style="width:100%; border-collapse:collapse;"><tr><td style="width:92%; background:#10B981; color:white; padding:6px; text-align:center; font-weight:900; border:none;">92%</td><td style="width:8%; background:#f3f4f6; border:none;"></td></tr></table></td><td style="text-align:center; font-weight:900; color:#10B981; font-size:14pt; border:1px solid #e5e7eb;">↑67%</td></tr>
  </table>
</div>

<h2>11.2 الفوائد الاستراتيجية</h2>
<ul>
  <li><strong>⏱ توفير الوقت:</strong> الإكمال التلقائي والتسلسل الذكي يُقلّصان وقت المعاملات بنسبة تصل لـ 70%</li>
  <li><strong>📊 شفافية كاملة:</strong> كل طلب موثّق بالمسؤول والتاريخ والقرار</li>
  <li><strong>🔗 تكامل الأقسام:</strong> إزالة الحواجز بين CX والعلاقات العامة والمشاريع</li>
  <li><strong>📈 تحسين الأداء:</strong> إحصائيات حية تساعد الإدارة في اتخاذ قرارات مبنية على بيانات</li>
  <li><strong>🔒 أمان المعلومات:</strong> كل مستخدم يرى فقط ما يحتاجه حسب دوره</li>
  <li><strong>🌐 سهولة الوصول:</strong> النظام يعمل عبر المتصفح دون أي تثبيت</li>
  <li><strong>📱 تصميم متجاوب:</strong> يعمل على الكمبيوتر والجوال والتابلت</li>
  <li><strong>🔄 بيانات لحظية:</strong> أي تحديث يظهر فوراً لجميع المستخدمين المعنيين</li>
</ul>

<h2>11.3 قيمة الربط بين الأقسام</h2>
<div class="highlight-box">
  <strong>قبل النظام:</strong> كل قسم يعمل بشكل منفصل عبر إكسل + إيميل + واتساب = تأخير + ضياع طلبات + عدم وضوح
</div>
<div class="info-box">
  <strong>بعد النظام:</strong> منصة واحدة = رؤية شاملة + تسلسل واضح + إشعارات فورية + سجل كامل = سرعة + شفافية + حوكمة
</div>

<!-- ═══════════════════════════ 12. دليل الاستخدام ═══════════════════════════ -->
<h1>12. دليل الاستخدام السريع</h1>

<h2>12.1 تسجيل الدخول</h2>
<ol>
  <li>افتح رابط النظام في المتصفح</li>
  <li>أدخل البريد الإلكتروني وكلمة المرور</li>
  <li>سيتم توجيهك تلقائياً للصفحة المناسبة حسب دورك</li>
</ol>

<h2>12.2 تقديم طلب فني جديد</h2>
<ol>
  <li>اذهب إلى "الطلبات الفنية" من القائمة الجانبية</li>
  <li>انقر على "إضافة طلب"</li>
  <li>اختر المشروع ← نوع الطلب ← جهة المراجعة</li>
  <li>أضف الوصف ← انقر "حفظ البيانات"</li>
  <li>سيتم تعيين الطلب تلقائياً حسب سير الموافقات</li>
</ol>

<h2>12.3 تسجيل طلب إفراغ جديد</h2>
<ol>
  <li>اذهب إلى "سجل الإفراغ" من القائمة الجانبية</li>
  <li>انقر على "تسجيل صك جديد"</li>
  <li>أدخل رقم هوية المستفيد (10 أرقام) ← ستتملأ البيانات تلقائياً</li>
  <li>أكمل أو عدّل البيانات ← انقر "حفظ البيانات"</li>
</ol>

<h2>12.4 الموافقة أو الرفض على طلب</h2>
<ol>
  <li>افتح الطلب المعين عليك (ستجده مميزاً باللون الأزرق "بانتظار الموافقة")</li>
  <li>راجع التفاصيل وسير الموافقات</li>
  <li>في لوحة الاعتماد: اكتب سبباً (اختياري للموافقة، مهم عند الرفض)</li>
  <li>انقر "موافقة" أو "رفض"</li>
  <li>سيتم التحويل تلقائياً للمسؤول التالي أو إنهاء الطلب</li>
</ol>

<h2>12.5 متابعة سير الموافقات</h2>
<ol>
  <li>افتح أي طلب (فني أو إفراغ)</li>
  <li>ستجد قسم "سير الموافقات" يعرض كل خطوة بوضوح:</li>
  <li>• نقطة خضراء = تمت الموافقة</li>
  <li>• نقطة زرقاء نابضة = الطلب عند هذا المسؤول حالياً</li>
  <li>• نقطة رمادية = لم يصل بعد</li>
</ol>

<h2>12.6 تغيير كلمة المرور</h2>
<ol>
  <li>انقر على أيقونة "تغيير كلمة المرور" في أسفل القائمة الجانبية</li>
  <li>أدخل كلمة المرور الحالية ← الجديدة ← تأكيد الجديدة</li>
  <li>انقر "تحديث كلمة المرور"</li>
</ol>

<!-- ═══════════════════════════ 13. التطويرات المستقبلية ═══════════════════════════ -->
<div style="page-break-before: always;"></div>
<h1>13. التطويرات المستقبلية المقترحة</h1>

<p>يتضمن النظام خارطة طريق للتطويرات المستقبلية مقسمة إلى أربع مراحل متتالية لضمان التحسين المستمر وتلبية احتياجات الشركة المتنامية.</p>

<!-- المرحلة 1 -->
<table style="width:100%; border-collapse:collapse; margin:20px 0;">
  <tr><td colspan="3" style="background:#3B82F6; color:white; padding:14px 20px; font-weight:900; font-size:15pt; border:none;">
    <span style="display:inline-block; background:white; color:#3B82F6; width:32px; height:32px; text-align:center; line-height:32px; font-size:16pt; font-weight:900; margin-left:10px;">1</span>
    المرحلة الأولى — تحسينات أساسية
    <span style="background:rgba(255,255,255,0.2); padding:3px 12px; font-size:9pt; margin-right:10px;">أولوية قصوى</span>
  </td></tr>
  <tr><th style="background:#DBEAFE; color:#1E40AF;">التطوير</th><th style="background:#DBEAFE; color:#1E40AF;">الوصف</th><th style="background:#DBEAFE; color:#1E40AF;">الأثر المتوقع</th></tr>
  <tr><td style="padding:12px 14px; font-weight:800; border:1px solid #e5e7eb; font-size:12pt;">🌍 دعم الإنجليزية (i18n)</td><td style="border:1px solid #e5e7eb; padding:12px;">واجهة إنجليزية كاملة مع إمكانية التبديل بين اللغتين</td><td style="border:1px solid #e5e7eb; padding:12px;">توسيع قاعدة المستخدمين وتسهيل التعامل مع شركاء أجانب</td></tr>
  <tr style="background:#f8f9fc;"><td style="padding:12px 14px; font-weight:800; border:1px solid #e5e7eb; font-size:12pt;">📧 إشعارات البريد الإلكتروني</td><td style="border:1px solid #e5e7eb; padding:12px;">إرسال تنبيهات تلقائية عبر البريد عند كل تغيير أو موافقة</td><td style="border:1px solid #e5e7eb; padding:12px;">ضمان عدم فوات أي إجراء مطلوب</td></tr>
</table>

<!-- المرحلة 2 -->
<table style="width:100%; border-collapse:collapse; margin:20px 0;">
  <tr><td colspan="3" style="background:#10B981; color:white; padding:14px 20px; font-weight:900; font-size:15pt; border:none;">
    <span style="display:inline-block; background:white; color:#10B981; width:32px; height:32px; text-align:center; line-height:32px; font-size:16pt; font-weight:900; margin-left:10px;">2</span>
    المرحلة الثانية — تحليلات متقدمة
    <span style="background:rgba(255,255,255,0.2); padding:3px 12px; font-size:9pt; margin-right:10px;">تطوير تحليلي</span>
  </td></tr>
  <tr><th style="background:#D1FAE5; color:#166534;">التطوير</th><th style="background:#D1FAE5; color:#166534;">الوصف</th><th style="background:#D1FAE5; color:#166534;">الأثر المتوقع</th></tr>
  <tr><td style="padding:12px 14px; font-weight:800; border:1px solid #e5e7eb; font-size:12pt;">📊 لوحة تحليلات متقدمة</td><td style="border:1px solid #e5e7eb; padding:12px;">رسوم بيانية تفاعلية متقدمة مع تقارير قابلة للتصدير وتحليل الاتجاهات</td><td style="border:1px solid #e5e7eb; padding:12px;">دعم اتخاذ القرارات ببيانات دقيقة ومحدثة</td></tr>
</table>

<!-- المرحلة 3 -->
<table style="width:100%; border-collapse:collapse; margin:20px 0;">
  <tr><td colspan="3" style="background:#E95D22; color:white; padding:14px 20px; font-weight:900; font-size:15pt; border:none;">
    <span style="display:inline-block; background:white; color:#E95D22; width:32px; height:32px; text-align:center; line-height:32px; font-size:16pt; font-weight:900; margin-left:10px;">3</span>
    المرحلة الثالثة — أتمتة وأرشفة
    <span style="background:rgba(255,255,255,0.2); padding:3px 12px; font-size:9pt; margin-right:10px;">أتمتة العمليات</span>
  </td></tr>
  <tr><th style="background:#FED7AA; color:#9A3412;">التطوير</th><th style="background:#FED7AA; color:#9A3412;">الوصف</th><th style="background:#FED7AA; color:#9A3412;">الأثر المتوقع</th></tr>
  <tr><td style="padding:12px 14px; font-weight:800; border:1px solid #e5e7eb; font-size:12pt;">✍️ توقيع رقمي للموافقات</td><td style="border:1px solid #e5e7eb; padding:12px;">اعتماد التوقيع الإلكتروني لتسريع دورة الموافقات وتوثيقها</td><td style="border:1px solid #e5e7eb; padding:12px;">تقليص وقت الموافقات وزيادة الموثوقية</td></tr>
  <tr style="background:#f8f9fc;"><td style="padding:12px 14px; font-weight:800; border:1px solid #e5e7eb; font-size:12pt;">🗄️ نظام أرشفة المستندات</td><td style="border:1px solid #e5e7eb; padding:12px;">أرشفة ذكية مع بحث متقدم وتصنيف تلقائي</td><td style="border:1px solid #e5e7eb; padding:12px;">حفظ آمن وسهولة استرجاع الوثائق</td></tr>
</table>

<!-- المرحلة 4 -->
<table style="width:100%; border-collapse:collapse; margin:20px 0;">
  <tr><td colspan="3" style="background:#7C3AED; color:white; padding:14px 20px; font-weight:900; font-size:15pt; border:none;">
    <span style="display:inline-block; background:white; color:#7C3AED; width:32px; height:32px; text-align:center; line-height:32px; font-size:16pt; font-weight:900; margin-left:10px;">4</span>
    المرحلة الرابعة — تقارير آلية
    <span style="background:rgba(255,255,255,0.2); padding:3px 12px; font-size:9pt; margin-right:10px;">تقارير ذكية</span>
  </td></tr>
  <tr><th style="background:#E9D5FF; color:#6B21A8;">التطوير</th><th style="background:#E9D5FF; color:#6B21A8;">الوصف</th><th style="background:#E9D5FF; color:#6B21A8;">الأثر المتوقع</th></tr>
  <tr><td style="padding:12px 14px; font-weight:800; border:1px solid #e5e7eb; font-size:12pt;">📋 تقارير دورية آلية</td><td style="border:1px solid #e5e7eb; padding:12px;">إنشاء وإرسال تقارير أسبوعية وشهرية تلقائياً للإدارة</td><td style="border:1px solid #e5e7eb; padding:12px;">توفير وقت الإعداد اليدوي وتحسين متابعة الأداء</td></tr>
</table>

<!-- ملخص خارطة الطريق -->
<table style="width:100%; border-collapse:collapse; margin:25px 0; background:#1B2B48; color:white;">
  <tr><td colspan="4" style="padding:15px; text-align:center; font-weight:900; font-size:15pt; border:none;">🚀 ملخص خارطة الطريق</td></tr>
  <tr>
    <td style="width:25%; text-align:center; padding:18px 8px; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.1);"><span style="font-size:24pt; font-weight:900; display:block;">2</span><span style="font-size:10pt; font-weight:700; opacity:0.8;">المرحلة 1</span><br/><span style="font-size:8pt; opacity:0.5;">تحسينات أساسية</span></td>
    <td style="width:25%; text-align:center; padding:18px 8px; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.1);"><span style="font-size:24pt; font-weight:900; display:block;">1</span><span style="font-size:10pt; font-weight:700; opacity:0.8;">المرحلة 2</span><br/><span style="font-size:8pt; opacity:0.5;">تحليلات متقدمة</span></td>
    <td style="width:25%; text-align:center; padding:18px 8px; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.1);"><span style="font-size:24pt; font-weight:900; display:block;">2</span><span style="font-size:10pt; font-weight:700; opacity:0.8;">المرحلة 3</span><br/><span style="font-size:8pt; opacity:0.5;">أتمتة وأرشفة</span></td>
    <td style="width:25%; text-align:center; padding:18px 8px; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.1);"><span style="font-size:24pt; font-weight:900; display:block;">1</span><span style="font-size:10pt; font-weight:700; opacity:0.8;">المرحلة 4</span><br/><span style="font-size:8pt; opacity:0.5;">تقارير آلية</span></td>
  </tr>
  <tr><td colspan="4" style="text-align:center; padding:10px; font-size:11pt; font-weight:700; opacity:0.7; border:none;">إجمالي 6 تطويرات مخططة عبر 4 مراحل</td></tr>
</table>

<div class="footer-note">
  <p>شركة دار وإعمار للتطوير العقاري — نظام تتبع المشاريع الإلكتروني</p>
  <p>الإصدار 1.0 — ${new Date().getFullYear()}</p>
  <p>جميع الحقوق محفوظة ©</p>
</div>

</body>
</html>`;

    // تحويل إلى Word عبر MIME type
    const blob = new Blob(
      ['\ufeff', htmlContent],
      { type: 'application/msword;charset=utf-8' }
    );
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `دليل_نظام_دار_وإعمار_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sections = [
    { id: 'overview', label: 'نظرة عامة', icon: <BookOpen size={18} /> },
    { id: 'features', label: 'مميزات النظام', icon: <Sparkles size={18} /> },
    { id: 'roles', label: 'الأقسام والصلاحيات', icon: <Shield size={18} /> },
    { id: 'integration', label: 'الربط بين الأقسام', icon: <Link2 size={18} /> },
    { id: 'workflow', label: 'سير الموافقات', icon: <GitBranch size={18} /> },
    { id: 'projects', label: 'إدارة المشاريع', icon: <Building2 size={18} /> },
    { id: 'technical', label: 'الطلبات الفنية', icon: <Zap size={18} /> },
    { id: 'deeds', label: 'سجل الإفراغات', icon: <FileStack size={18} /> },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 size={18} /> },
    { id: 'benefits', label: 'الفوائد والحلول', icon: <Target size={18} /> },
    { id: 'roadmap', label: 'التطويرات المستقبلية', icon: <Rocket size={18} /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-cairo text-right" dir="rtl">
      {/* هيدر الصفحة */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-[#1B2B48] flex items-center gap-3">
            <BookOpen size={28} className="text-[#E95D22]" />
            الدليل الشامل للنظام
          </h2>
          <p className="text-gray-400 text-sm font-bold mt-2">دليل المستخدم ومميزات ووثائق نظام تتبع مشاريع دار وإعمار</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
          >
            <Printer size={18} className="text-gray-500" />
            طباعة
          </button>
          <button
            onClick={generateWordDocument}
            className="flex items-center gap-2 px-6 py-3 bg-[#E95D22] text-white rounded-xl font-black text-sm hover:brightness-110 shadow-lg active:scale-95 transition-all"
          >
            <Download size={18} />
            تحميل وورد
          </button>
        </div>
      </div>

      {/* القائمة الجانبية + المحتوى */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* التنقل */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[25px] border border-gray-100 shadow-sm p-4 sticky top-28">
            <h3 className="text-sm font-black text-[#1B2B48] mb-4 px-2">المحتويات</h3>
            <div className="space-y-1">
              {sections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeSection === sec.id
                      ? 'bg-[#E95D22] text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-[#1B2B48]'
                  }`}
                >
                  {sec.icon}
                  {sec.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* المحتوى */}
        <div className="lg:col-span-3 space-y-6">
          {/* نظرة عامة */}
          {activeSection === 'overview' && (
            <GuideSection title="نظرة عامة على النظام" icon={<BookOpen />}>
              <p className="text-gray-600 font-bold leading-loose">
                نظام تتبع مشاريع دار وإعمار هو منصة إلكترونية متكاملة مصممة لإدارة ومتابعة جميع مراحل المشاريع العقارية. يوفر النظام بيئة عمل موحدة تربط بين أقسام العلاقات العامة (PR) والقسم الفني (Technical) وقسم الإفراغات (CX) في منصة واحدة.
              </p>
              
              {/* رسم بياني: توزيع وحدات النظام */}
              <div className="bg-gray-50 rounded-2xl p-6 mt-6 border">
                <h4 className="font-black text-[#1B2B48] mb-4 text-center">توزيع وحدات النظام</h4>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-full md:w-1/2" style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={MODULE_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                          {MODULE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 space-y-2">
                    {MODULE_DATA.map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md flex-shrink-0" style={{ background: m.color }} />
                        <span className="text-sm font-bold text-gray-700 flex-1">{m.name}</span>
                        <span className="text-sm font-black" style={{ color: m.color }}>{m.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* مخطط هندسة النظام */}
              <div className="bg-gradient-to-br from-[#1B2B48] to-[#2d4a6f] rounded-2xl p-6 mt-6 text-white">
                <h4 className="font-black mb-5 text-center text-lg">بنية النظام التقنية</h4>
                <div className="grid grid-cols-3 gap-3">
                  <ArchBlock icon="🖥️" title="الواجهة" sub="React 19 + TypeScript" />
                  <ArchBlock icon="🎨" title="التصميم" sub="Tailwind CSS + RTL" />
                  <ArchBlock icon="📊" title="الرسوم البيانية" sub="Recharts" />
                </div>
                <div className="flex justify-center my-3">
                  <div className="flex items-center gap-2 text-white/40">
                    <div className="w-16 h-px bg-white/20" />
                    <ArrowDown size={16} />
                    <div className="w-16 h-px bg-white/20" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ArchBlock icon="🔐" title="المصادقة" sub="Supabase Auth" />
                  <ArchBlock icon="🗄️" title="قاعدة البيانات" sub="PostgreSQL" />
                  <ArchBlock icon="⚡" title="الوقت الحقيقي" sub="Realtime API" />
                </div>
                <div className="flex justify-center my-3">
                  <div className="flex items-center gap-2 text-white/40">
                    <div className="w-16 h-px bg-white/20" />
                    <ArrowDown size={16} />
                    <div className="w-16 h-px bg-white/20" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ArchBlock icon="☁️" title="الاستضافة" sub="Vercel / Netlify" />
                  <ArchBlock icon="🤖" title="الذكاء الاصطناعي" sub="Gemini AI" />
                  <ArchBlock icon="📧" title="الإشعارات" sub="Notification Service" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <StatCard icon={<Shield size={24} />} label="تحكم بالصلاحيات" value="4 أدوار" color="bg-blue-50 text-blue-700" />
                <StatCard icon={<Building2 size={24} />} label="إدارة المشاريع" value="شاملة" color="bg-green-50 text-green-700" />
                <StatCard icon={<GitBranch size={24} />} label="سير موافقات" value="ذكي" color="bg-orange-50 text-orange-700" />
                <StatCard icon={<Bell size={24} />} label="إشعارات" value="فورية" color="bg-purple-50 text-purple-700" />
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 mt-6 border">
                <h4 className="font-black text-[#1B2B48] mb-3">الأقسام المرتبطة</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <RoleBadge label="مدير النظام" code="ADMIN" color="bg-[#1B2B48]" />
                  <RoleBadge label="العلاقات العامة" code="PR" color="bg-blue-600" />
                  <RoleBadge label="القسم الفني" code="TECH" color="bg-green-600" />
                  <RoleBadge label="قسم CX" code="CX" color="bg-[#E95D22]" />
                </div>
              </div>
            </GuideSection>
          )}

          {/* مميزات النظام */}
          {activeSection === 'features' && (
            <GuideSection title="مميزات النظام" icon={<Sparkles />}>
              {/* رسم بياني رادار: تقييم مميزات النظام */}
              <div className="bg-gray-50 rounded-2xl p-6 border mb-6">
                <h4 className="font-black text-[#1B2B48] mb-2 text-center">تقييم أداء النظام</h4>
                <p className="text-[10px] text-gray-400 font-bold text-center mb-4">نسبة مئوية من 100</p>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={FEATURE_RADAR_DATA} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="feature" tick={{ fontSize: 11, fontWeight: 700, fill: '#1B2B48', fontFamily: 'Cairo' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="النظام" dataKey="value" stroke="#E95D22" fill="#E95D22" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4">
                <FeatureCard icon={<Layers />} title="إدارة مشاريع متكاملة" description="بطاقات مشاريع تفاعلية مع نسب إنجاز حية، سجل أعمال، تعليقات، واستيراد/تصدير إكسل" />
                <FeatureCard icon={<GitBranch />} title="سير موافقات ذكي ومتسلسل" description="تسلسل موافقات قابل للتخصيص بالكامل. الطلب ينتقل تلقائياً من مسؤول لآخر مع تتبع بصري لكل خطوة" />
                <FeatureCard icon={<Bell />} title="نظام إشعارات متقدم" description="إشعارات فورية داخل النظام عند كل تحديث، موجهة ذكياً حسب دور المستخدم" />
                <FeatureCard icon={<FileSpreadsheet />} title="استيراد وتصدير إكسل" description="استيراد بيانات من ملفات Excel بنقرة واحدة مع تصدير التقارير بتنسيق احترافي" />
                <FeatureCard icon={<Sparkles />} title="إكمال تلقائي ذكي" description="إدخال رقم الهوية يملأ بيانات العميل تلقائياً من الأرشيف" />
                <FeatureCard icon={<BarChart3 />} title="لوحة إحصائيات شاملة" description="رسوم بيانية ونسبية مع تحديثات لحظية لتوزيع الحالات" />
                <FeatureCard icon={<Shield />} title="أمان وصلاحيات متقدمة" description="تحكم كامل بصلاحيات الوصول حسب الدور مع تشفير SHA-256" />
                <FeatureCard icon={<Globe />} title="مساعد ذكي AI" description="مساعد يعمل بتقنية Gemini AI للإجابة على استفسارات المشاريع" />
              </div>
            </GuideSection>
          )}

          {/* الأقسام والصلاحيات */}
          {activeSection === 'roles' && (
            <GuideSection title="الأقسام والصلاحيات" icon={<Shield />}>
              {/* رسم بياني: عدد الصلاحيات لكل دور */}
              <div className="bg-gray-50 rounded-2xl p-6 border mb-6">
                <h4 className="font-black text-[#1B2B48] mb-2 text-center">مقارنة الصلاحيات بين الأدوار</h4>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ROLE_PERMISSIONS_DATA} layout="vertical" margin={{ right: 30, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" domain={[0, 8]} tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                      <YAxis type="category" dataKey="role" tick={{ fontSize: 11, fontWeight: 700, fontFamily: 'Cairo' }} width={100} />
                      <Tooltip contentStyle={{ fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }} />
                      <Bar dataKey="permissions" name="الصلاحيات" radius={[0, 8, 8, 0]}>
                        {ROLE_PERMISSIONS_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                      <Bar dataKey="modules" name="الأقسام" radius={[0, 8, 8, 0]} fillOpacity={0.4}>
                        {ROLE_PERMISSIONS_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <RoleSection title="مدير النظام (ADMIN)" color="bg-[#1B2B48]" permissions={['لوحة الإحصائيات', 'إدارة المشاريع', 'الطلبات الفنية', 'سجل الإفراغ', 'إدارة المستخدمين', 'سير الموافقات', 'الموافقة على أي طلب']} />
                <RoleSection title="العلاقات العامة (PR_MANAGER)" color="bg-blue-600" permissions={['لوحة الإحصائيات', 'إدارة المشاريع', 'الطلبات الفنية', 'سجل الإفراغ (عرض ومتابعة)']} />
                <RoleSection title="القسم الفني (TECHNICAL)" color="bg-green-600" permissions={['الطلبات الفنية المعينة عليه', 'الموافقة/الرفض على الطلبات في السلسلة']} />
                <RoleSection title="قسم CX (CONVEYANCE)" color="bg-[#E95D22]" permissions={['سجل الإفراغ ونقل الملكية', 'الموافقة/الرفض على الطلبات في السلسلة']} />
              </div>
            </GuideSection>
          )}

          {/* الربط بين الأقسام */}
          {activeSection === 'integration' && (
            <GuideSection title="الربط بين الأقسام" icon={<Link2 />}>
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-6">
                <p className="text-blue-800 font-bold text-sm leading-loose">
                  💡 يعمل النظام كجسر رقمي يربط بين أقسام الشركة الثلاثة في منصة واحدة، مما يلغي تبادل الملفات عبر البريد أو المحادثات غير الرسمية.
                </p>
              </div>

              {/* مخطط الربط بين الأقسام */}
              <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl p-6 border mb-6">
                <h4 className="font-black text-[#1B2B48] mb-5 text-center text-lg">خريطة تدفق البيانات بين الأقسام</h4>
                <div className="relative">
                  {/* الصف العلوي: الأقسام الثلاثة */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <DeptNode color="#3B82F6" label="العلاقات العامة" sub="PR_MANAGER" icon="📋" />
                    <DeptNode color="#10B981" label="القسم الفني" sub="TECHNICAL" icon="⚙️" />
                    <DeptNode color="#E95D22" label="قسم CX" sub="CONVEYANCE" icon="🏠" />
                  </div>
                  {/* الأسهم */}
                  <div className="flex justify-center gap-8 my-3">
                    <div className="flex flex-col items-center">
                      <div className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">طلبات فنية</div>
                      <div className="w-px h-4 bg-blue-300" />
                      <ArrowDown size={14} className="text-blue-400" />
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-[9px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">موافقات</div>
                      <div className="w-px h-4 bg-green-300" />
                      <ArrowDown size={14} className="text-green-400" />
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">إفراغات</div>
                      <div className="w-px h-4 bg-orange-300" />
                      <ArrowDown size={14} className="text-orange-400" />
                    </div>
                  </div>
                  {/* المنصة المركزية */}
                  <div className="bg-[#1B2B48] text-white rounded-2xl p-5 text-center shadow-lg">
                    <Monitor size={28} className="mx-auto mb-2 text-[#E95D22]" />
                    <p className="font-black text-sm">نظام تتبع مشاريع دار وإعمار</p>
                    <p className="text-[10px] text-white/50 font-bold">منصة مركزية موحدة</p>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      <MiniFeature label="إشعارات" />
                      <MiniFeature label="تتبع حي" />
                      <MiniFeature label="تسلسل" />
                      <MiniFeature label="تقارير" />
                    </div>
                  </div>
                  {/* الأسهم السفلية */}
                  <div className="flex justify-center my-3">
                    <div className="flex flex-col items-center">
                      <ArrowDown size={14} className="text-gray-400" />
                      <div className="w-px h-4 bg-gray-300" />
                    </div>
                  </div>
                  {/* مدير النظام */}
                  <div className="flex justify-center">
                    <DeptNode color="#1B2B48" label="مدير النظام" sub="ADMIN — إشراف شامل" icon="👑" />
                  </div>
                </div>
              </div>

              <h4 className="font-black text-[#1B2B48] mb-3">مسار الطلب الفني (PR ↔ Technical)</h4>
              <div className="space-y-2 mb-6">
                <FlowStep step={1} text="قسم PR يُنشئ طلباً فنياً جديداً" />
                <FlowStep step={2} text="يُعيَّن تلقائياً للمسؤول الأول في سلسلة الموافقات" />
                <FlowStep step={3} text="القسم الفني يتلقى إشعاراً فورياً" />
                <FlowStep step={4} text="المسؤول يوافق → ينتقل للتالي (أو يرفض → يتوقف)" />
                <FlowStep step={5} text="عند الموافقة النهائية: يُنشأ بند عمل مشروع تلقائياً" />
              </div>
              <h4 className="font-black text-[#1B2B48] mb-3 mt-6">مسار طلب الإفراغ (CX ↔ PR ↔ Admin)</h4>
              <div className="space-y-2">
                <FlowStep step={1} text="قسم CX يُسجّل طلب إفراغ جديد مع بيانات العميل" />
                <FlowStep step={2} text="الإكمال التلقائي يملأ البيانات من الأرشيف" />
                <FlowStep step={3} text="يُعيَّن للمسؤول الأول في السلسلة" />
                <FlowStep step={4} text="يتنقل عبر سلسلة الموافقات (CX → PR → Admin)" />
                <FlowStep step={5} text="عند الموافقة النهائية: الحالة = مقبول + إنشاء بند عمل" />
              </div>
            </GuideSection>
          )}

          {/* سير الموافقات */}
          {activeSection === 'workflow' && (
            <GuideSection title="سير الموافقات والتسلسل" icon={<GitBranch />}>
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 mb-6">
                <p className="text-orange-800 font-bold text-sm leading-loose">
                  🔄 عند إنشاء طلب، يُعيَّن تلقائياً للمسؤول الأول. بعد موافقته ينتقل تلقائياً للتالي حتى الموافقة النهائية أو الرفض.
                </p>
              </div>

              {/* مخطط تسلسل الموافقات البصري */}
              <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl p-6 border mb-6">
                <h4 className="font-black text-[#1B2B48] mb-5 text-center text-lg">مخطط تسلسل الموافقات</h4>
                <div className="flex flex-col items-center gap-1">
                  <WorkflowNode status="start" label="إنشاء الطلب" sub="يُعيَّن تلقائياً للمسؤول الأول" />
                  <WorkflowArrow />
                  <WorkflowNode status="approved" label="المسؤول الأول" sub="نورة المالكي (CX)" extra="✅ وافقت" />
                  <WorkflowArrow />
                  <WorkflowNode status="current" label="المسؤول الثاني" sub="تهاني المالكي (CX)" extra="⏳ بانتظار" />
                  <WorkflowArrow />
                  <WorkflowNode status="pending" label="المسؤول الثالث" sub="الوليد الدوسري (Admin)" extra="⚪ لم يصل" />
                  <WorkflowArrow />
                  <div className="flex gap-4">
                    <WorkflowNode status="success" label="موافقة نهائية" sub="الحالة = مقبول ✓" />
                    <WorkflowNode status="rejected" label="رفض" sub="يتوقف التسلسل ✗" />
                  </div>
                </div>
              </div>

              <h4 className="font-black text-[#1B2B48] mb-3">حالات الموافقة</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatusBadge color="bg-green-500" label="تمت الموافقة ✅" />
                <StatusBadge color="bg-blue-500 animate-pulse" label="بانتظار الموافقة ⏳" />
                <StatusBadge color="bg-gray-300" label="لم يصل بعد ⚪" />
                <StatusBadge color="bg-red-500" label="مرفوض ❌" />
              </div>
              <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                <h4 className="font-black text-green-800 mb-2">مثال عملي: طلب إفراغ صك</h4>
                <p className="text-green-700 font-bold text-sm leading-loose">
                  السلسلة: نورة المالكي → تهاني المالكي → الوليد الدوسري<br />
                  1. إنشاء الطلب ← يُعيَّن لنورة المالكي<br />
                  2. نورة توافق ← يتحول تلقائياً لتهاني المالكي<br />
                  3. تهاني توافق ← يتحول للوليد الدوسري<br />
                  4. الوليد يوافق ← موافقة نهائية ✓
                </p>
              </div>
            </GuideSection>
          )}

          {/* المشاريع */}
          {activeSection === 'projects' && (
            <GuideSection title="إدارة المشاريع" icon={<Building2 />}>
              <div className="space-y-4">
                <InfoBlock title="إنشاء مشروع" items={['الاسم والموقع', 'المقاول والمهندس المشرف', 'عدد الوحدات', 'صورة المشروع وبيانات المقاولين']} />
                <InfoBlock title="سجل أعمال المشروع" items={['إضافة أعمال يدوياً أو استيراد من إكسل', 'إنشاء أعمال تلقائياً عند الموافقة على الطلبات', 'حساب نسبة الإنجاز تلقائياً', 'نظام تعليقات لكل عمل']} />
                <InfoBlock title="الطلبات المرتبطة بالمشروع" items={['عرض جميع الطلبات الفنية المرتبطة', 'عرض طلبات الإفراغ ونقل الملكية', 'ربط تلقائي عند الموافقة على الطلبات']} />
              </div>
            </GuideSection>
          )}

          {/* الطلبات الفنية */}
          {activeSection === 'technical' && (
            <GuideSection title="الطلبات الفنية" icon={<Zap />}>
              <h4 className="font-black text-[#1B2B48] mb-3">أنواع الطلبات</h4>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <TypeCard label="إصدار رخصة" desc="رخص بناء من الجهات المختصة" />
                <TypeCard label="طلب كهرباء" desc="توصيل أو نقل خدمة كهرباء" />
                <TypeCard label="شهادة إتمام بناء" desc="من البلدية أو الجهة المعنية" />
                <TypeCard label="رسوم" desc="رسوم حكومية متنوعة" />
              </div>
              <h4 className="font-black text-[#1B2B48] mb-3">جهات المراجعة</h4>
              <p className="text-gray-600 font-bold text-sm leading-loose">
                يدعم النظام أكثر من 15 جهة: الشركة السعودية للكهرباء، شركة المياه الوطنية، أمانة الرياض، وزارة الإسكان، الدفاع المدني، وغيرها.
              </p>
            </GuideSection>
          )}

          {/* الإفراغات */}
          {activeSection === 'deeds' && (
            <GuideSection title="سجل الإفراغات (CX)" icon={<FileStack />}>
              <h4 className="font-black text-[#1B2B48] mb-3">أنواع الطلبات</h4>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <TypeCard label="طلب إفراغ صك" desc="نقل ملكية الصك العقاري" />
                <TypeCard label="نقل ملكية عداد" desc="نقل عدادات كهرباء/مياه" />
              </div>
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                <h4 className="font-black text-orange-800 mb-2 flex items-center gap-2">
                  <Sparkles size={16} /> الإكمال التلقائي الذكي
                </h4>
                <p className="text-orange-700 font-bold text-sm leading-loose">
                  عند إدخال رقم هوية العميل (10 أرقام)، يجلب النظام تلقائياً جميع البيانات المتوفرة من الأرشيف: الاسم، الجوال، المشروع، الوحدة، البنك.
                </p>
              </div>
            </GuideSection>
          )}

          {/* الإحصائيات */}
          {activeSection === 'stats' && (
            <GuideSection title="لوحة الإحصائيات والتقارير" icon={<BarChart3 />}>
              {/* رسوم بيانية توضيحية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-2xl p-5 border">
                  <h4 className="font-black text-[#1B2B48] mb-2 text-center text-sm">نموذج: توزيع حالات الطلبات</h4>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{ name: 'منجز', value: 45 }, { name: 'قيد الإجراء', value: 30 }, { name: 'جديد', value: 15 }, { name: 'مرفوض', value: 10 }]} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                          <Cell fill="#10B981" /><Cell fill="#3B82F6" /><Cell fill="#F59E0B" /><Cell fill="#EF4444" />
                        </Pie>
                        <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {[{ l:'منجز', c:'#10B981' }, { l:'قيد الإجراء', c:'#3B82F6' }, { l:'جديد', c:'#F59E0B' }, { l:'مرفوض', c:'#EF4444' }].map((x,i) => (
                      <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background: x.c}} /><span className="text-[10px] font-bold text-gray-600">{x.l}</span></div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-5 border">
                  <h4 className="font-black text-[#1B2B48] mb-2 text-center text-sm">نموذج: إحصائيات الأقسام</h4>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'المشاريع', count: 24 }, { name: 'الطلبات الفنية', count: 87 }, { name: 'الإفراغات', count: 156 }, { name: 'الأعمال', count: 312 }]} margin={{ right: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fontFamily: 'Cairo' }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }} />
                        <Bar dataKey="count" name="العدد" fill="#1B2B48" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <InfoBlock title="إحصائيات عامة" items={['عدد المشاريع ونسب الإنجاز', 'الطلبات الفنية (منجز / قيد الإجراء / مرفوض)', 'طلبات الإفراغ (مكتمل / قيد الإجراء / مرفوض)']} />
                <InfoBlock title="الرسوم البيانية" items={['دوائر نسبية لتوزيع الحالات', 'أحدث التحديثات والأنشطة', 'بطاقات إحصائية بألوان مميزة']} />
                <InfoBlock title="التصدير" items={['تصدير إلى Excel بتنسيق عربي', 'طباعة التقارير مباشرة']} />
              </div>
            </GuideSection>
          )}

          {/* الفوائد */}
          {activeSection === 'benefits' && (
            <GuideSection title="الفوائد والحلول" icon={<Target />}>
              {/* رسم بياني: مقارنة قبل وبعد */}
              <div className="bg-gray-50 rounded-2xl p-6 border mb-6">
                <h4 className="font-black text-[#1B2B48] mb-2 text-center">مقارنة الأداء: قبل وبعد النظام</h4>
                <p className="text-[10px] text-gray-400 font-bold text-center mb-4">نسبة مئوية من 100</p>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={BEFORE_AFTER_DATA} margin={{ right: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="metric" tick={{ fontSize: 10, fontWeight: 700, fontFamily: 'Cairo' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }} />
                      <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 11, fontWeight: 700 }} />
                      <Bar dataKey="before" name="قبل النظام" fill="#EF4444" radius={[8, 8, 0, 0]} fillOpacity={0.7} />
                      <Bar dataKey="after" name="بعد النظام" fill="#10B981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <h4 className="font-black text-[#1B2B48] mb-4">المشاكل والحلول</h4>
              <div className="space-y-3 mb-8">
                <ProblemSolution problem="تشتت البيانات بين إيميلات وملفات متفرقة" solution="قاعدة بيانات مركزية موحدة يصل إليها الجميع حسب صلاحياته" />
                <ProblemSolution problem="عدم وضوح مسؤولية كل طلب" solution="تسلسل موافقات واضح مع تعيين تلقائي للمسؤول" />
                <ProblemSolution problem="تأخر الموافقات وضياع الطلبات" solution="إشعارات فورية + تتبع بصري لموقع الطلب" />
                <ProblemSolution problem="صعوبة تتبع نسب الإنجاز" solution="حساب آلي للإنجاز مع ربط بين الأعمال والمشاريع" />
                <ProblemSolution problem="إعادة إدخال البيانات يدوياً" solution="إكمال تلقائي من الأرشيف + استيراد إكسل" />
                <ProblemSolution problem="عدم وجود سجل للقرارات" solution="تسجيل كل موافقة/رفض مع الاسم والتاريخ والسبب" />
              </div>
              <h4 className="font-black text-[#1B2B48] mb-4">الفوائد الاستراتيجية</h4>
              <div className="grid grid-cols-2 gap-3">
                <BenefitCard icon="⏱" title="توفير الوقت" desc="تقليص وقت المعاملات حتى 70%" />
                <BenefitCard icon="📊" title="شفافية كاملة" desc="توثيق كامل بالمسؤول والتاريخ" />
                <BenefitCard icon="🔗" title="تكامل الأقسام" desc="إزالة الحواجز بين CX و PR والمشاريع" />
                <BenefitCard icon="📈" title="تحسين الأداء" desc="إحصائيات حية لاتخاذ قرارات مبنية على بيانات" />
                <BenefitCard icon="🔒" title="أمان المعلومات" desc="كل مستخدم يرى فقط ما يحتاجه" />
                <BenefitCard icon="🌐" title="سهولة الوصول" desc="يعمل عبر المتصفح دون أي تثبيت" />
              </div>
            </GuideSection>
          )}

          {/* ═══════════ التطويرات المستقبلية ═══════════ */}
          {activeSection === 'roadmap' && (
            <GuideSection title="التطويرات المستقبلية المقترحة" icon={<Rocket size={24} />}>
              <p className="text-gray-500 font-bold text-sm mb-8 leading-relaxed">
                خارطة طريق النظام مقسمة إلى أربع مراحل متتالية لضمان التحسين المستمر وتلبية احتياجات الشركة المتنامية.
              </p>

              <div className="space-y-6">
                {/* المرحلة 1 */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg">1</div>
                    <div>
                      <h4 className="font-black text-[#1B2B48] text-lg">المرحلة الأولى — تحسينات أساسية</h4>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">أولوية قصوى</span>
                    </div>
                  </div>
                  <div className="mr-5 border-r-2 border-blue-200 pr-8 pb-6 space-y-3">
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <Languages size={20} className="text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-black text-[#1B2B48] text-sm">دعم اللغة الإنجليزية (i18n)</p>
                        <p className="text-gray-500 text-xs font-bold mt-1">واجهة إنجليزية كاملة مع إمكانية التبديل بين اللغتين — توسيع قاعدة المستخدمين</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <Mail size={20} className="text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-black text-[#1B2B48] text-sm">إشعارات البريد الإلكتروني</p>
                        <p className="text-gray-500 text-xs font-bold mt-1">تنبيهات تلقائية عبر البريد عند كل تغيير أو موافقة — ضمان عدم فوات أي إجراء</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* المرحلة 2 */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-lg">2</div>
                    <div>
                      <h4 className="font-black text-[#1B2B48] text-lg">المرحلة الثانية — تحليلات متقدمة</h4>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">تطوير تحليلي</span>
                    </div>
                  </div>
                  <div className="mr-5 border-r-2 border-emerald-200 pr-8 pb-6 space-y-3">
                    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                      <BarChart2 size={20} className="text-emerald-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-black text-[#1B2B48] text-sm">لوحة تحليلات متقدمة</p>
                        <p className="text-gray-500 text-xs font-bold mt-1">رسوم بيانية تفاعلية متقدمة مع تقارير قابلة للتصدير وتحليل الاتجاهات</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* المرحلة 3 */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-lg">3</div>
                    <div>
                      <h4 className="font-black text-[#1B2B48] text-lg">المرحلة الثالثة — أتمتة وأرشفة</h4>
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">أتمتة العمليات</span>
                    </div>
                  </div>
                  <div className="mr-5 border-r-2 border-orange-200 pr-8 pb-6 space-y-3">
                    <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-2xl p-4">
                      <PenTool size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-black text-[#1B2B48] text-sm">توقيع رقمي للموافقات</p>
                        <p className="text-gray-500 text-xs font-bold mt-1">اعتماد التوقيع الإلكتروني لتسريع دورة الموافقات وتوثيقها رسمياً</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-2xl p-4">
                      <Archive size={20} className="text-orange-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-black text-[#1B2B48] text-sm">نظام أرشفة المستندات</p>
                        <p className="text-gray-500 text-xs font-bold mt-1">أرشفة ذكية مع بحث متقدم وتصنيف تلقائي — حفظ آمن وسهولة استرجاع</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* المرحلة 4 */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-lg">4</div>
                    <div>
                      <h4 className="font-black text-[#1B2B48] text-lg">المرحلة الرابعة — تقارير آلية</h4>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">تقارير ذكية</span>
                    </div>
                  </div>
                  <div className="mr-5 border-r-2 border-purple-200 pr-8 pb-6 space-y-3">
                    <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-2xl p-4">
                      <Calendar size={20} className="text-purple-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-black text-[#1B2B48] text-sm">تقارير دورية آلية</p>
                        <p className="text-gray-500 text-xs font-bold mt-1">إنشاء وإرسال تقارير أسبوعية وشهرية تلقائياً للإدارة — توفير وقت الإعداد اليدوي</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ملخص بصري */}
              <div className="mt-8 bg-gradient-to-l from-[#1B2B48] to-[#2d4a7a] rounded-2xl p-6 text-white">
                <h4 className="font-black text-lg mb-4 flex items-center gap-2"><Rocket size={20} /> ملخص خارطة الطريق</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">2</p>
                    <p className="text-[10px] font-bold opacity-80">المرحلة 1</p>
                    <p className="text-[9px] opacity-60">تحسينات أساسية</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">1</p>
                    <p className="text-[10px] font-bold opacity-80">المرحلة 2</p>
                    <p className="text-[9px] opacity-60">تحليلات متقدمة</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">2</p>
                    <p className="text-[10px] font-bold opacity-80">المرحلة 3</p>
                    <p className="text-[9px] opacity-60">أتمتة وأرشفة</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">1</p>
                    <p className="text-[10px] font-bold opacity-80">المرحلة 4</p>
                    <p className="text-[9px] opacity-60">تقارير آلية</p>
                  </div>
                </div>
                <p className="text-center text-xs font-bold mt-4 opacity-70">إجمالي 6 تطويرات مخططة عبر 4 مراحل</p>
              </div>
            </GuideSection>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── مكونات فرعية ────────────────────────────────────────────

const GuideSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white rounded-[30px] border border-gray-100 shadow-sm p-8">
    <h3 className="text-2xl font-black text-[#1B2B48] flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
      <span className="text-[#E95D22]">{icon}</span>
      {title}
    </h3>
    {children}
  </div>
);

const StatCard = ({ icon, label, value, color }: any) => (
  <div className={`${color} rounded-2xl p-4 border text-center`}>
    <div className="flex justify-center mb-2">{icon}</div>
    <p className="text-xl font-black">{value}</p>
    <p className="text-[10px] font-bold opacity-70">{label}</p>
  </div>
);

const RoleBadge = ({ label, code, color }: any) => (
  <div className={`${color} text-white rounded-xl p-3 text-center`}>
    <p className="font-black text-sm">{label}</p>
    <p className="text-[10px] opacity-70">{code}</p>
  </div>
);

const FeatureCard = ({ icon, title, description }: any) => (
  <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#E95D22]/30 transition-colors">
    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#E95D22] flex-shrink-0">
      {icon}
    </div>
    <div>
      <h4 className="font-black text-[#1B2B48] text-sm">{title}</h4>
      <p className="text-gray-500 font-bold text-xs mt-1 leading-relaxed">{description}</p>
    </div>
  </div>
);

const RoleSection = ({ title, color, permissions }: { title: string; color: string; permissions: string[] }) => (
  <div className="bg-gray-50 rounded-2xl p-5 border">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-3 h-8 rounded-full ${color}`} />
      <h4 className="font-black text-[#1B2B48]">{title}</h4>
    </div>
    <div className="flex flex-wrap gap-2">
      {permissions.map((p, i) => (
        <span key={i} className="text-[10px] px-3 py-1.5 bg-white rounded-lg border font-bold text-gray-600">
          ✓ {p}
        </span>
      ))}
    </div>
  </div>
);

const FlowStep = ({ step, text }: { step: number; text: string }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border-r-4 border-[#E95D22]">
    <span className="w-7 h-7 rounded-full bg-[#E95D22] text-white flex items-center justify-center text-xs font-black flex-shrink-0">
      {step}
    </span>
    <p className="text-sm font-bold text-[#1B2B48]">{text}</p>
  </div>
);

const StatusBadge = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <span className="text-xs font-bold text-gray-700">{label}</span>
  </div>
);

const InfoBlock = ({ title, items }: { title: string; items: string[] }) => (
  <div className="bg-gray-50 rounded-2xl p-5 border">
    <h4 className="font-black text-[#1B2B48] mb-3">{title}</h4>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm font-bold text-gray-600">
          <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const TypeCard = ({ label, desc }: { label: string; desc: string }) => (
  <div className="bg-gray-50 rounded-xl p-4 border">
    <p className="font-black text-[#1B2B48] text-sm">{label}</p>
    <p className="text-[10px] text-gray-500 font-bold mt-1">{desc}</p>
  </div>
);

const ProblemSolution = ({ problem, solution }: { problem: string; solution: string }) => (
  <div className="grid grid-cols-2 gap-3">
    <div className="bg-red-50 rounded-xl p-3 border border-red-100">
      <p className="text-xs font-bold text-red-700">❌ {problem}</p>
    </div>
    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
      <p className="text-xs font-bold text-green-700">✅ {solution}</p>
    </div>
  </div>
);

const BenefitCard = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="bg-gray-50 rounded-xl p-4 border hover:border-[#E95D22]/30 transition-colors">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-lg">{icon}</span>
      <h4 className="font-black text-[#1B2B48] text-sm">{title}</h4>
    </div>
    <p className="text-[10px] text-gray-500 font-bold">{desc}</p>
  </div>
);

// ─── مكونات بصرية جديدة ────────────────────────────────────────

const ArchBlock = ({ icon, title, sub }: { icon: string; title: string; sub: string }) => (
  <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10 hover:bg-white/15 transition-colors">
    <span className="text-xl block mb-1">{icon}</span>
    <p className="font-black text-xs">{title}</p>
    <p className="text-[9px] text-white/50 font-bold">{sub}</p>
  </div>
);

const DeptNode = ({ color, label, sub, icon }: { color: string; label: string; sub: string; icon: string }) => (
  <div className="rounded-2xl p-4 text-center border-2 shadow-sm bg-white" style={{ borderColor: color }}>
    <span className="text-2xl block mb-1">{icon}</span>
    <p className="font-black text-sm" style={{ color }}>{label}</p>
    <p className="text-[9px] text-gray-400 font-bold">{sub}</p>
  </div>
);

const MiniFeature = ({ label }: { label: string }) => (
  <div className="bg-white/10 rounded-lg py-1.5 px-2 text-center">
    <span className="text-[9px] font-bold text-white/70">{label}</span>
  </div>
);

const WorkflowNode = ({ status, label, sub, extra }: { status: string; label: string; sub: string; extra?: string }) => {
  const styles: Record<string, string> = {
    start: 'bg-[#1B2B48] text-white border-[#1B2B48]',
    approved: 'bg-green-50 text-green-800 border-green-300',
    current: 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-200 ring-offset-2',
    pending: 'bg-gray-50 text-gray-500 border-gray-200',
    success: 'bg-green-500 text-white border-green-600',
    rejected: 'bg-red-50 text-red-700 border-red-300',
  };
  return (
    <div className={`rounded-2xl px-6 py-3 border-2 text-center min-w-[200px] ${styles[status] || styles.pending}`}>
      <p className="font-black text-sm">{label}</p>
      <p className="text-[10px] font-bold opacity-70">{sub}</p>
      {extra && <p className="text-[10px] font-black mt-1">{extra}</p>}
    </div>
  );
};

const WorkflowArrow = () => (
  <div className="flex flex-col items-center py-1">
    <div className="w-px h-3 bg-gray-300" />
    <ArrowDown size={14} className="text-gray-400" />
  </div>
);

export default SystemGuide;
