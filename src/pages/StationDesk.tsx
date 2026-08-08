import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import './station-desk-theme.css';
import crest from '../assets/rangers-crest.png';
import { alumnosApi } from '@/features/alumnos/alumnos_api';
import { gruposApi } from '@/features/grupos/api';
import { pagosApi } from '@/features/pagos/api';
import { dashboardApi } from '@/features/dashboard/api';
import type { Grupo } from '@/types';

/**
 * STATION DESK — Rangers Academy admin dashboard
 *
 * This is a visual port of the Claude Design mockup. STATS, PAYMENTS,
 * BIRTHDAYS and TIMETABLE/On-Duty are now wired to real API data
 * (Alumnos, Pagos, Grupos, Dashboard). LEADS and ROLL_NAMES are still
 * placeholder/mock data — see the notes above each block for why.
 * Search input, sidebar nav links, and "+ New Invoice" are not wired
 * to routing/actions yet — this is the visual layer only.
 */

// LEADS has no dedicated api.ts of its own — CRMPage.tsx calls the leads
// endpoint inline, and sharing it cleanly here would be scope creep for
// this pass. Left as mock data.
const LEADS = [
  { name: 'Andrea Souto', note: 'Asked about FCE prep', age: '5d' },
  { name: 'Familia Pombo', note: 'Trial class scheduled', age: '2d' },
  { name: 'Diego Camba', note: 'Adult conversation inquiry', age: '9d' },
];

// ROLL_NAMES (and the attendance quick-check roll state below) requires
// multi-call assembly plus attendance-writing logic that's out of scope
// for this pass. Left as mock data.
const ROLL_NAMES = ['Marcos Vidal', 'Sofía Lago', 'Iago Fernández', 'Noa Rey'];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Paid: { bg: 'var(--pine-100)', color: 'var(--pine-700)' },
  Pending: { bg: 'var(--brass-300)', color: 'var(--brass-700)' },
  Partial: { bg: 'var(--brass-300)', color: 'var(--brass-700)' },
};

const ESTADO_LABEL: Record<string, string> = {
  pagado: 'Paid',
  pendiente: 'Pending',
  parcial: 'Partial',
};

const eur = (n: number) => `€${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// TEMP: teacher assignment is heuristic (no teacher field on Grupo
// yet). Revisit once a real teacher FK/field exists.
function teacherForGrupo(g: Grupo): 'Teacher Cami' | 'Teacher Cande' {
  const label = `${g.nivel ?? ''} ${g.nombre ?? ''}`.toUpperCase();
  if (label.includes('IB') || label.includes('ADULT') || label.includes('CONVERSATION') || label.includes('CONVERSACIÓN') || label.includes('CONVERSACION')) {
    return 'Teacher Cami';
  }
  if (/\b(FCE|CAE|CPE|KET|PET)\b/.test(label) || label.includes('RANGERS') || label.includes('KIDS')) {
    return 'Teacher Cande';
  }
  return 'Teacher Cande';
}

const DOT_BY_TEACHER: Record<string, string> = {
  'Teacher Cande': 'var(--brass-500)',
  'Teacher Cami': 'var(--rust-500)',
};

const NAV_SECTIONS: { label: string; items: string[] }[] = [
  { label: 'Front Desk', items: ['Overview', 'Students', 'Payers', 'Companies'] },
  { label: 'Trail Ops', items: ['Groups', 'Attendance', 'Rates', 'CRM'] },
  { label: 'Ledger', items: ['Payments', 'Invoicing', 'WhatsApp', 'Birthdays'] },
];

type RollStatus = 'present' | 'absent' | null;

function buildCalendarDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventDays = [3, 7, 12, 18, 22, 27];

  const cells: { num: number | ''; isToday: boolean; hasEvent: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ num: '', isToday: false, hasEvent: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ num: d, isToday: d === today, hasEvent: eventDays.includes(d) });
  }
  return cells;
}

export default function StationDesk() {
  const [clock, setClock] = useState(() => new Date());
  const [roll, setRoll] = useState<Record<string, RollStatus>>({
    'Marcos Vidal': 'present',
    'Sofía Lago': 'present',
    'Iago Fernández': null,
    'Noa Rey': 'absent',
  });

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const mark = (name: string, status: Exclude<RollStatus, null>) => {
    setRoll((s) => ({ ...s, [name]: s[name] === status ? null : status }));
  };

  const calendarDays = buildCalendarDays();
  const weekdayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = clock.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const calendarMonth = clock.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const clockTime = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // ── live data ────────────────────────────────────────────────────────────

  const { data: alumnos, isLoading: alumnosLoading, isError: alumnosError } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => alumnosApi.list().then((r) => r.data),
  });

  const { data: grupos, isLoading: gruposLoading, isError: gruposError } = useQuery({
    queryKey: ['grupos'],
    queryFn: () => gruposApi.list().then((r) => r.data),
  });

  const { data: pagos, isLoading: pagosLoading, isError: pagosError } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => pagosApi.list().then((r) => r.data),
  });

  const { data: reception, isLoading: receptionLoading, isError: receptionError } = useQuery({
    queryKey: ['dashboard-reception-summary'],
    queryFn: () => dashboardApi.receptionSummary().then((r) => r.data),
  });

  const statsLoading = alumnosLoading || gruposLoading || pagosLoading;
  const statsError = alumnosError || gruposError || pagosError;

  const revenue = (pagos ?? []).filter((p) => p.estado === 'pagado').reduce((sum, p) => sum + Number(p.total), 0);
  const outstanding = (pagos ?? []).filter((p) => p.estado !== 'pagado').reduce((sum, p) => sum + Number(p.total), 0);
  const outstandingCount = (pagos ?? []).filter((p) => p.estado !== 'pagado').length;

  const STATS = [
    { label: 'Active Students', value: String(alumnos?.length ?? 0), delta: '' },
    { label: 'Outstanding Invoices', value: eur(outstanding), delta: `${outstandingCount} pending` },
    { label: 'Groups Running', value: String(grupos?.length ?? 0), delta: '' },
    { label: "This Month's Revenue", value: eur(revenue), delta: '' },
  ];

  const PAYMENTS = (pagos ?? []).slice(0, 6).map((p) => ({
    invoice: p.num_doc,
    student: p.alumno_nombre ?? '—',
    method: p.metodo,
    amount: eur(Number(p.total)),
    status: ESTADO_LABEL[p.estado] ?? p.estado,
  }));

  const BIRTHDAYS = (reception?.cumpleanos ?? []).map((b) => ({
    name: b.nombre,
    date: b.dias_para_cumpleanos === 0 ? 'Today' : `in ${b.dias_para_cumpleanos}d`,
  }));

  // Monday-first day-of-week index (0=Mon .. 6=Sun) to match Grupo.horarios' `dia`.
  const todayDow = (clock.getDay() + 6) % 7;
  const TIMETABLE = (grupos ?? [])
    .flatMap((g) =>
      g.horarios
        .filter((h) => h.dia === todayDow)
        .map((h) => {
          const teacher = teacherForGrupo(g);
          return { time: h.ini, group: g.nombre, teacher, room: g.aula, dot: DOT_BY_TEACHER[teacher] };
        })
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  const onDutyTeachers = Array.from(new Set(TIMETABLE.map((t) => t.teacher)));
  const ON_DUTY = [
    { name: 'Teacher Cami', blurb: 'IB, Rangers Adults & Teens' },
    { name: 'Teacher Cande', blurb: 'Cambridge Adults, Teens & Kids' },
  ].filter((t) => onDutyTeachers.length === 0 || onDutyTeachers.includes(t.name as 'Teacher Cami' | 'Teacher Cande'));

  return (
    <div className="sd-root" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: 250,
          flexShrink: 0,
          background: 'var(--pine-900)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '4px solid var(--brass-500)',
        }}
      >
        <div style={{ position: 'relative', padding: '34px 22px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <svg viewBox="0 0 250 90" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 82, opacity: 0.5, pointerEvents: 'none' }}>
            <path d="M0 90 L30 38 L55 68 L85 18 L115 60 L150 28 L185 65 L215 34 L250 62 L250 90 Z" fill="var(--pine-700)" />
            <path d="M0 90 L45 60 L75 75 L110 44 L140 72 L175 52 L210 75 L250 55 L250 90 Z" fill="var(--pine-800)" />
          </svg>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <img src={crest} alt="Rangers Academy" style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 19, color: 'var(--khaki-100)', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
              RANGERS
              <br />
              <span style={{ fontSize: 11, letterSpacing: 2, color: 'var(--brass-300)', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
                STATION DESK
              </span>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brass-300)', padding: '14px 8px 8px' }}>
                {section.label}
              </div>
              {section.items.map((item) => (
                <a key={item} href="#" className={`sd-navlink${item === 'Overview' ? ' sd-navlink--active' : ''}`}>
                  {item}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brass-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', color: 'var(--pine-900)', fontSize: 14 }}>
            C
          </div>
          <div style={{ fontSize: 13, color: 'var(--khaki-200)', fontWeight: 600 }}>
            Front Desk
            <br />
            <span style={{ fontSize: 11, color: 'var(--khaki-300)' }}>Cami&amp;Co · Admin</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* TOP BAR */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 28px', background: 'var(--khaki-100)', borderBottom: '3px solid var(--pine-800)', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flexShrink: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
              {today}
            </div>
            <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 400, fontSize: 26, color: 'var(--pine-800)', margin: '6px 0 0', whiteSpace: 'nowrap' }}>
              Station Overview
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--pine-800)', color: 'var(--khaki-100)', padding: '8px 14px', borderRadius: 5, flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 18, lineHeight: 1 }}>{clockTime}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brass-300)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                Trail Time
              </span>
            </div>
            {/* TODO: wire to a real search across invoices, dates, classes, payments, lessons, companies, groups, rates, birthdays */}
            <input placeholder="Search…" className="sd-search" />
            <button className="sd-header-btn">+ New Invoice</button>
          </div>
        </header>

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* STAT LEDGER */}
          {statsError ? (
            <div style={{ padding: '14px 18px', marginBottom: 28, background: 'var(--rust-100)', color: 'var(--rust-600)', border: '2px solid var(--pine-800)', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
              Error loading data
            </div>
          ) : statsLoading ? (
            <div style={{ padding: '14px 18px', marginBottom: 28, color: 'var(--ink-soft)', fontSize: 13 }}>Loading…</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
                background: 'var(--khaki-100)',
                border: '2px solid var(--pine-800)',
                borderRadius: 6,
                marginBottom: 28,
                overflow: 'hidden',
              }}
            >
              {STATS.map((s) => (
                <div key={s.label} style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRight: '1px solid var(--paper-line)', borderBottom: '1px solid var(--paper-line)' }}>
                  <div style={{ width: 4, alignSelf: 'stretch', background: 'var(--brass-500)', borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--ink-soft)', lineHeight: 1.25 }}>
                      {s.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, color: 'var(--pine-800)', whiteSpace: 'nowrap' }}>{s.value}</div>
                      {s.delta && <div style={{ fontSize: 10.5, color: 'var(--pine-700)', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.delta}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CALENDAR + TIMETABLE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, marginBottom: 32 }}>
            <div style={{ position: 'relative', background: 'var(--pine-800)', border: '2px solid var(--pine-800)', borderRadius: 6, padding: '20px 20px 18px', overflow: 'hidden' }}>
              <svg viewBox="0 0 200 160" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none' }}>
                <circle cx="100" cy="80" r="20" fill="none" stroke="var(--khaki-100)" strokeWidth={2} />
                <circle cx="100" cy="80" r="40" fill="none" stroke="var(--khaki-100)" strokeWidth={2} />
                <circle cx="100" cy="80" r="60" fill="none" stroke="var(--khaki-100)" strokeWidth={2} />
                <circle cx="100" cy="80" r="80" fill="none" stroke="var(--khaki-100)" strokeWidth={2} />
              </svg>
              <div style={{ position: 'relative', fontSize: 11, fontWeight: 700, color: 'var(--brass-300)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                🧭 Trail Log
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, color: 'var(--khaki-100)', letterSpacing: '0.02em', lineHeight: 1.3 }}>
                  {calendarMonth}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, color: 'var(--khaki-200)', fontSize: 13, cursor: 'pointer' }}>‹</span>
                  <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, color: 'var(--khaki-200)', fontSize: 13, cursor: 'pointer' }}>›</span>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--khaki-300)', textAlign: 'center', marginBottom: 8 }}>
                {weekdayLetters.map((l, i) => <div key={i}>{l}</div>)}
              </div>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
                {calendarDays.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12.5,
                      borderRadius: '50%',
                      color: d.num === '' ? 'transparent' : d.isToday ? 'var(--pine-900)' : 'var(--khaki-100)',
                      background: d.isToday ? 'var(--brass-500)' : 'transparent',
                      fontWeight: d.isToday ? 800 : 500,
                      border: d.num === '' || d.isToday ? 'none' : '1px solid rgba(255,255,255,0.12)',
                      position: 'relative',
                    }}
                  >
                    {d.num}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 1,
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: d.hasEvent && !d.isToday ? 'var(--brass-300)' : 'transparent',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--khaki-100)', border: '2px solid var(--pine-800)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: 'var(--pine-800)', fontFamily: 'var(--font-head)', fontSize: 16, color: 'var(--khaki-100)' }}>
                🧭 Today's Timetable
              </div>
              <div style={{ padding: '8px 20px 16px' }}>
                {gruposError ? (
                  <div style={{ padding: '12px 0', color: 'var(--rust-600)', fontSize: 13, fontWeight: 600 }}>Error loading data</div>
                ) : gruposLoading ? (
                  <div style={{ padding: '12px 0', color: 'var(--ink-soft)', fontSize: 13 }}>Loading…</div>
                ) : TIMETABLE.length === 0 ? (
                  <div style={{ padding: '12px 0', color: 'var(--ink-soft)', fontSize: 13 }}>No classes scheduled today.</div>
                ) : (
                  TIMETABLE.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: '1px solid var(--paper-line)' }}>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, color: 'var(--pine-700)', width: 64, flexShrink: 0 }}>{t.time}</div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{t.group}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.teacher} · {t.room}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* PAYMENTS LEDGER TABLE */}
            <div style={{ background: 'var(--khaki-100)', border: '2px solid var(--pine-800)', borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--pine-800)' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, color: 'var(--khaki-100)' }}>📖 Recent Ledger Entries</div>
                <a href="#" style={{ fontSize: 13, fontWeight: 700, color: 'var(--brass-300)' }}>View all →</a>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Invoice', 'Student', 'Method', 'Amount', 'Status'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)', padding: '10px 14px', borderBottom: '2px solid var(--pine-800)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagosError ? (
                    <tr><td colSpan={5} style={{ padding: '16px 14px', color: 'var(--rust-600)', fontSize: 13, fontWeight: 600 }}>Error loading data</td></tr>
                  ) : pagosLoading ? (
                    <tr><td colSpan={5} style={{ padding: '16px 14px', color: 'var(--ink-soft)', fontSize: 13 }}>Loading…</td></tr>
                  ) : (
                    PAYMENTS.map((p) => {
                      const s = STATUS_STYLE[p.status];
                      return (
                        <tr key={p.invoice}>
                          <td style={{ padding: '13px 14px', fontSize: 14.5, borderBottom: '1px solid var(--paper-line)', fontWeight: 700, color: 'var(--pine-800)' }}>{p.invoice}</td>
                          <td style={{ padding: '13px 14px', fontSize: 14.5, borderBottom: '1px solid var(--paper-line)' }}>{p.student}</td>
                          <td style={{ padding: '13px 14px', fontSize: 14.5, borderBottom: '1px solid var(--paper-line)', color: 'var(--ink-soft)' }}>{p.method}</td>
                          <td style={{ padding: '13px 14px', fontSize: 14.5, borderBottom: '1px solid var(--paper-line)', fontWeight: 700 }}>{p.amount}</td>
                          <td style={{ padding: '13px 14px', fontSize: 14.5, borderBottom: '1px solid var(--paper-line)' }}>
                            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '4px 10px', borderRadius: 3, background: s.bg, color: s.color }}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* SIDE PANELS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* ATTENDANCE QUICK CHECK */}
              <div style={{ background: 'var(--khaki-100)', border: '2px solid var(--pine-800)', borderRadius: 6, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, color: 'var(--pine-800)' }}>✅ Attendance{TIMETABLE[0] ? ` — ${TIMETABLE[0].group}` : ''}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
                  {TIMETABLE[0] ? `${TIMETABLE[0].time} · ${TIMETABLE[0].teacher} · ${TIMETABLE[0].room}` : 'No class scheduled right now.'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ROLL_NAMES.map((name) => {
                    const status = roll[name];
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => mark(name, 'present')}
                            className="sd-roll-btn"
                            style={{
                              border: '2px solid var(--pine-700)',
                              background: status === 'present' ? 'var(--pine-700)' : 'transparent',
                              color: status === 'present' ? 'var(--khaki-100)' : 'var(--pine-700)',
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => mark(name, 'absent')}
                            className="sd-roll-btn"
                            style={{
                              border: '2px solid var(--rust-500)',
                              background: status === 'absent' ? 'var(--rust-500)' : 'transparent',
                              color: status === 'absent' ? 'var(--khaki-100)' : 'var(--rust-500)',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="sd-save-btn">Save Roll Call</button>
              </div>

              {/* TEACHERS */}
              <div style={{ background: 'var(--khaki-100)', border: '2px solid var(--pine-800)', borderRadius: 6, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, color: 'var(--pine-800)', marginBottom: 14 }}>🎓 On Duty</div>
                {gruposError ? (
                  <div style={{ color: 'var(--rust-600)', fontSize: 13, fontWeight: 600 }}>Error loading data</div>
                ) : gruposLoading ? (
                  <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Loading…</div>
                ) : ON_DUTY.length === 0 ? (
                  <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>No one on duty today.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {ON_DUTY.map((t) => (
                      <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: t.name === 'Teacher Cami' ? 'var(--pine-700)' : 'var(--brass-500)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-head)',
                            color: t.name === 'Teacher Cami' ? 'var(--khaki-100)' : 'var(--pine-900)',
                            fontSize: 14,
                          }}
                        >
                          C
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.blurb}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CRM FOLLOW-UPS */}
              <div style={{ background: 'var(--khaki-100)', border: '2px solid var(--pine-800)', borderRadius: 6, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, color: 'var(--pine-800)', marginBottom: 14 }}>🎯 Needs Follow-up</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {LEADS.map((l) => (
                    <div key={l.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--paper-line)' }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{l.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{l.note}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--rust-600)', background: 'var(--rust-100)', padding: '3px 8px', borderRadius: 3 }}>
                        {l.age}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* BIRTHDAYS */}
              <div style={{ background: 'var(--khaki-100)', border: '2px solid var(--pine-800)', borderRadius: 6, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, color: 'var(--pine-800)', marginBottom: 12 }}>🎂 Upcoming Birthdays</div>
                {receptionError ? (
                  <div style={{ color: 'var(--rust-600)', fontSize: 13, fontWeight: 600 }}>Error loading data</div>
                ) : receptionLoading ? (
                  <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Loading…</div>
                ) : BIRTHDAYS.length === 0 ? (
                  <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>No upcoming birthdays.</div>
                ) : (
                  <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                    {BIRTHDAYS.map((b, i) => (
                      <div key={i}>{b.name} — {b.date}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
