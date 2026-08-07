import { useState } from 'react';
import './rangers-theme.css';
import crest from '../assets/rangers-crest.png';

type Lang = 'en' | 'es';

const COPY = {
  en: {
    langLabel: 'ES',
    ctaTrial: 'Book a trial class',
    motto: 'Explore the World of English',
    nav: { programs: 'Programs', path: 'The Trail', testimonials: 'Field Reports', contact: 'Station' },
    hero: {
      kicker: 'Cambridge & IB Field Station · Pontevedra',
      titleLine1: 'Fluency is a trail.',
      titleLine2: "We're your rangers.",
      subtitle:
        'Rangers Academy guides kids, teens and adults from first words to Cambridge and IB fluency — waypoint by waypoint.',
      ctaPrimary: 'Book a trial class',
      ctaSecondary: 'See the trail',
    },
    trust: '★ 5.0 on Google · Cambridge & IB Exam Preparation, Pontevedra',
    programs: {
      kicker: 'Programs',
      title: 'Three trailheads, one academy.',
      p1t: 'Cambridge Exam Prep',
      p1d: 'FCE and CAE preparation with a focus on speaking and writing confidence.',
      p2t: 'IB Support',
      p2d: 'PYP and MYP English support built around Approaches to Learning and criterion-based assessment.',
      p3t: 'Adult English',
      p3d: 'Conversation, professional English and exam prep for grown-up schedules.',
    },
    path: {
      kicker: 'The Trail',
      title: 'From A1 to C1, marked at every post.',
      desc: 'Every learner hikes the same route — each level a waypoint on the way to fluency.',
    },
    testimonials: {
      kicker: 'Field Reports',
      title: 'Families who reached the summit.',
      google: '★★★★★ 5.0 rating on Google',
      q: [
        { text: 'Placeholder — real review pending from Google Business.', name: 'Parent, Pontevedra', role: 'Cambridge FCE student' },
        { text: 'Placeholder — real review pending from Google Business.', name: 'Adult learner', role: 'Professional English' },
        { text: 'Placeholder — real review pending from Google Business.', name: 'Parent', role: 'IB MYP student' },
      ],
    },
    founder: {
      kicker: 'Head Ranger',
      title: 'Founded by Cande',
      body: 'Cande has spent her career guiding students of every age toward fluency and exam success, building Rangers Academy on the belief that learning a language is a trail worth hiking with a good guide — not a straight line on a map. Deputy Ranger Cami keeps the station running day to day.',
      cta: 'Meet the team',
    },
    contact: {
      kicker: 'Station',
      title: 'Report to the trailhead.',
      desc: 'Book a trial class or ask us anything — we reply within one working day.',
      cta: 'Book a trial class',
      addressLabel: 'Address',
      address: 'Rúa dos Ferreiros, 26, bajo, 36002 Pontevedra',
      phoneLabel: 'Phone',
      phone: '613 014 124',
      emailLabel: 'Email',
      email: 'info@rangersacademy.es',
    },
  },
  es: {
    langLabel: 'EN',
    ctaTrial: 'Reserva una clase de prueba',
    motto: 'Explore the World of English',
    nav: { programs: 'Programas', path: 'La Ruta', testimonials: 'Informes', contact: 'Estación' },
    hero: {
      kicker: 'Estación Cambridge e IB · Pontevedra',
      titleLine1: 'La fluidez es una ruta.',
      titleLine2: 'Somos tus guardas.',
      subtitle:
        'Rangers Academy acompaña a niños, jóvenes y adultos desde sus primeras palabras hasta la fluidez de Cambridge e IB, punto de control a punto de control.',
      ctaPrimary: 'Reserva una clase de prueba',
      ctaSecondary: 'Ver la ruta',
    },
    trust: '★ 5.0 en Google · Preparación Cambridge e IB en Pontevedra',
    programs: {
      kicker: 'Programas',
      title: 'Tres senderos, una academia.',
      p1t: 'Preparación Cambridge',
      p1d: 'Preparación FCE y CAE con enfoque en fluidez oral y escrita.',
      p2t: 'Apoyo IB',
      p2d: 'Apoyo en inglés para PYP y MYP centrado en Approaches to Learning y evaluación por criterios.',
      p3t: 'Inglés para adultos',
      p3d: 'Conversación, inglés profesional y preparación de exámenes para horarios de adultos.',
    },
    path: {
      kicker: 'La Ruta',
      title: 'De A1 a C1, señalizado en cada poste.',
      desc: 'Cada alumno recorre la misma ruta — cada nivel, un punto de control hacia la fluidez.',
    },
    testimonials: {
      kicker: 'Informes',
      title: 'Familias que llegaron a la cima.',
      google: '★★★★★ 5.0 en Google',
      q: [
        { text: 'Reseña real pendiente de Google Business.', name: 'Madre, Pontevedra', role: 'Alumna de FCE' },
        { text: 'Reseña real pendiente de Google Business.', name: 'Alumno adulto', role: 'Inglés profesional' },
        { text: 'Reseña real pendiente de Google Business.', name: 'Padre', role: 'Alumno de IB MYP' },
      ],
    },
    founder: {
      kicker: 'Guarda Mayor',
      title: 'Fundado por Cande',
      body: 'Cande ha dedicado su carrera a guiar a alumnos de todas las edades hacia la fluidez y el éxito en los exámenes, construyendo Rangers Academy sobre la idea de que aprender un idioma es una ruta que merece recorrerse con un buen guía, no una línea recta en un mapa. La Guarda Adjunta Cami mantiene la estación en marcha cada día.',
      cta: 'Conoce al equipo',
    },
    contact: {
      kicker: 'Estación',
      title: 'Preséntate en el punto de partida.',
      desc: 'Reserva una clase de prueba o escríbenos — respondemos en un día laborable.',
      cta: 'Reserva una clase de prueba',
      addressLabel: 'Dirección',
      address: 'Rúa dos Ferreiros, 26, bajo, 36002 Pontevedra',
      phoneLabel: 'Teléfono',
      phone: '613 014 124',
      emailLabel: 'Correo',
      email: 'info@rangersacademy.es',
    },
  },
} as const;

const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function RangersHomepage() {
  const [lang, setLang] = useState<Lang>('en');
  const copy = COPY[lang];
  const toggleLang = () => setLang((l) => (l === 'en' ? 'es' : 'en'));

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', overflowX: 'hidden', fontFamily: 'var(--font-body)' }}>
      {/* HEADER */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '12px clamp(20px,5vw,64px)',
          background: 'var(--pine-900)',
          borderBottom: '5px solid var(--accent-500)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flexShrink: 1 }}>
          <img
            src={crest}
            alt="Rangers Academy crest"
            style={{ width: 64, height: 64, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))', flexShrink: 0 }}
          />
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, color: 'var(--khaki-100)', letterSpacing: 0.5, lineHeight: 1, flexShrink: 0, whiteSpace: 'nowrap' }}>
            RANGERS
            <br />
            <span style={{ fontSize: 13, letterSpacing: 2, color: 'var(--accent-300)', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
              ACADEMY
            </span>
          </div>
          <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.15)', margin: '0 4px', flexShrink: 0 }} />
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 700,
              fontStyle: 'italic',
              letterSpacing: '0.02em',
              color: 'var(--khaki-300)',
              lineHeight: 1.25,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {copy.motto}
          </div>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', rowGap: 8, justifyContent: 'flex-end' }}>
          <a href="#programs" className="rg-nav-link">{copy.nav.programs}</a>
          <a href="#path" className="rg-nav-link">{copy.nav.path}</a>
          <a href="#testimonials" className="rg-nav-link">{copy.nav.testimonials}</a>
          <a href="#contact" className="rg-nav-link">{copy.nav.contact}</a>
          <button onClick={toggleLang} className="rg-lang-btn">{copy.langLabel}</button>
          <a href="#contact" className="rg-cta-btn" style={{ marginLeft: 6 }}>{copy.ctaTrial}</a>
        </nav>
      </header>

      {/* HERO */}
      <section style={{ position: 'relative', background: 'var(--pine-900)', padding: 0, overflow: 'hidden' }}>
        <svg viewBox="0 0 1600 720" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <clipPath id="skyClip"><rect x="0" y="0" width="1600" height="720" /></clipPath>
          </defs>
          <rect width="1600" height="720" fill="var(--pine-900)" />
          <g clipPath="url(#skyClip)" opacity={0.9}>
            <g stroke="var(--accent-500)" strokeWidth={7} opacity={0.5}>
              <line x1="780" y1="90" x2="780" y2="-60" />
              {[15, -15, 30, -30, 45, -45, 60, -60].map((deg) => (
                <line key={deg} x1="780" y1="90" x2="640" y2="-40" transform={`rotate(${deg} 780 90)`} />
              ))}
            </g>
            <circle cx="780" cy="90" r="70" fill="var(--accent-500)" opacity={0.85} />
          </g>
          <path d="M0 480 L220 300 L400 430 L620 240 L840 420 L1060 260 L1280 410 L1600 280 L1600 720 L0 720 Z" fill="var(--pine-600)" opacity={0.55} />
          <path d="M0 560 L260 380 L480 500 L720 330 L960 490 L1200 350 L1600 470 L1600 720 L0 720 Z" fill="var(--pine-700)" opacity={0.85} />
          <g fill="var(--pine-800)">
            <path d="M120 720 L160 600 L200 720 Z" />
            <path d="M180 720 L215 630 L250 720 Z" />
            <path d="M260 720 L300 590 L340 720 Z" />
            <path d="M1280 720 L1320 605 L1360 720 Z" />
            <path d="M1340 720 L1378 615 L1416 720 Z" />
            <path d="M1400 720 L1440 595 L1480 720 Z" />
          </g>
        </svg>

        <div style={{ position: 'relative', zIndex: 2, padding: '110px clamp(20px,5vw,64px) 90px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', alignItems: 'center', gap: 40 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--pine-900)',
                background: 'var(--accent-500)',
                padding: '8px 16px',
                borderRadius: 3,
                marginBottom: 30,
              }}
            >
              {copy.hero.kicker}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 400,
                fontSize: 'clamp(34px,4.6vw,60px)',
                lineHeight: 1.08,
                color: 'var(--khaki-100)',
                margin: '0 0 24px',
                textShadow: '0 3px 0 var(--pine-900)',
              }}
            >
              {copy.hero.titleLine1}
              <br />
              <span style={{ color: 'var(--accent-300)' }}>{copy.hero.titleLine2}</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--khaki-200)', margin: '0 0 40px', fontWeight: 500 }}>
              {copy.hero.subtitle}
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="#contact" className="rg-cta-btn rg-cta-btn--lg">{copy.hero.ctaPrimary}</a>
              <a href="#path" className="rg-outline-btn">{copy.hero.ctaSecondary}</a>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
            <img src={crest} alt="Rangers Academy crest" style={{ width: '100%', maxWidth: 280, height: 'auto', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.45))' }} />
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div
        style={{
          background: 'var(--khaki-300)',
          textAlign: 'center',
          padding: '16px 20px',
          fontSize: 15,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--pine-800)',
          borderTop: '3px solid var(--pine-800)',
          borderBottom: '3px solid var(--pine-800)',
        }}
      >
        {copy.trust}
      </div>

      {/* PROGRAMS */}
      <section id="programs" style={{ padding: '110px clamp(20px,5vw,64px)', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 640, margin: '0 0 60px' }}>
          <div className="rg-kicker">{copy.programs.kicker}</div>
          <h2 className="rg-h2" style={{ color: 'var(--pine-800)' }}>{copy.programs.title}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 26 }}>
          {[
            { n: '01', t: copy.programs.p1t, d: copy.programs.p1d },
            { n: '02', t: copy.programs.p2t, d: copy.programs.p2d },
            { n: '03', t: copy.programs.p3t, d: copy.programs.p3d },
          ].map((card) => (
            <div key={card.n} style={{ background: 'var(--khaki-100)', border: '3px solid var(--pine-800)', borderRadius: 6, padding: '34px 30px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 12, left: 12, width: 9, height: 9, borderRadius: '50%', background: 'var(--accent-500)' }} />
              <div style={{ position: 'absolute', top: 12, right: 12, width: 9, height: 9, borderRadius: '50%', background: 'var(--accent-500)' }} />
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 34, color: 'var(--pine-700)', marginBottom: 16 }}>{card.n}</div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 21, fontWeight: 400, color: 'var(--ink)', margin: '0 0 12px' }}>{card.t}</h3>
              <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--ink-soft)', margin: 0 }}>{card.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PATH / LEVELS */}
      <section id="path" style={{ position: 'relative', padding: '110px clamp(20px,5vw,64px) 130px', background: 'var(--pine-800)', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 0 80px' }}>
          <div className="rg-kicker" style={{ color: 'var(--accent-300)' }}>{copy.path.kicker}</div>
          <h2 className="rg-h2" style={{ color: 'var(--khaki-100)', marginBottom: 16 }}>{copy.path.title}</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--khaki-200)', margin: 0 }}>{copy.path.desc}</p>
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <svg viewBox="0 0 1400 40" preserveAspectRatio="none" style={{ position: 'absolute', top: 14, left: 0, width: '100%', height: 6 }}>
            <line x1="20" y1="20" x2="1380" y2="20" stroke="var(--accent-500)" strokeWidth={4} strokeDasharray="2 16" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {levels.map((lvl) => {
              const isFinal = lvl === 'C1';
              return (
                <div key={lvl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: isFinal ? 28 : 20,
                      height: isFinal ? 28 : 20,
                      borderRadius: '50%',
                      background: 'var(--accent-500)',
                      border: isFinal ? '4px solid var(--khaki-100)' : '3px solid var(--khaki-100)',
                      boxShadow: isFinal ? '0 0 0 6px rgba(200,164,90,0.25)' : undefined,
                    }}
                  />
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: isFinal ? 22 : 19, color: isFinal ? 'var(--accent-300)' : 'var(--khaki-100)' }}>
                    {lvl}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" style={{ padding: '110px clamp(20px,5vw,64px)', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 640, margin: '0 0 60px' }}>
          <div className="rg-kicker">{copy.testimonials.kicker}</div>
          <h2 className="rg-h2" style={{ color: 'var(--pine-800)', marginBottom: 12 }}>{copy.testimonials.title}</h2>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--rust-600)' }}>{copy.testimonials.google}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 26 }}>
          {copy.testimonials.q.map((item, i) => (
            <div key={i} style={{ background: 'var(--khaki-100)', borderLeft: '6px solid var(--accent-500)', borderRadius: 2, padding: '30px 28px', boxShadow: '0 4px 14px -6px rgba(51,38,15,0.25)' }}>
              <div style={{ color: 'var(--accent-700)', fontSize: 15, letterSpacing: 2, marginBottom: 16 }}>★★★★★</div>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink)', margin: '0 0 20px', fontStyle: 'italic' }}>&ldquo;{item.text}&rdquo;</p>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--pine-800)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{item.name}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{item.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER */}
      <section style={{ padding: '0 clamp(20px,5vw,64px) 120px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 44,
            alignItems: 'center',
            background: 'var(--khaki-100)',
            border: '3px solid var(--pine-800)',
            borderRadius: 6,
            padding: 44,
          }}
        >
          {/* Replace with an actual photo of Cami/Cande when available */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              border: '5px solid var(--accent-500)',
              background: 'var(--khaki-300)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-soft)',
              fontSize: 13,
              textAlign: 'center',
              padding: 12,
            }}
          >
            Photo of Cande
          </div>
          <div>
            <div className="rg-kicker">{copy.founder.kicker}</div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 400, fontSize: 'clamp(24px,2.8vw,34px)', color: 'var(--pine-800)', margin: '0 0 16px' }}>
              {copy.founder.title}
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-soft)', margin: '0 0 24px', maxWidth: 500 }}>{copy.founder.body}</p>
            <a href="#contact" style={{ color: 'var(--pine-800)', textDecoration: 'none', fontWeight: 800, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '3px solid var(--accent-500)', paddingBottom: 3 }}>
              {copy.founder.cta} →
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ position: 'relative', padding: '110px clamp(20px,5vw,64px) 80px', background: 'var(--pine-900)', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, maxWidth: 1100, margin: '0 auto' }}>
          <div>
            <div className="rg-kicker" style={{ color: 'var(--accent-300)' }}>{copy.contact.kicker}</div>
            <h2 className="rg-h2" style={{ color: 'var(--khaki-100)', marginBottom: 20 }}>{copy.contact.title}</h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--khaki-200)', margin: '0 0 30px', maxWidth: 420 }}>{copy.contact.desc}</p>
            <a href="#" className="rg-cta-btn rg-cta-btn--lg" style={{ display: 'inline-block' }}>{copy.contact.cta}</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 15, color: 'var(--khaki-200)' }}>
            <div>
              <div className="rg-field-label">{copy.contact.addressLabel}</div>
              {copy.contact.address}
            </div>
            <div>
              <div className="rg-field-label">{copy.contact.phoneLabel}</div>
              {copy.contact.phone}
            </div>
            <div>
              <div className="rg-field-label">{copy.contact.emailLabel}</div>
              {copy.contact.email}
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, marginTop: 90, paddingTop: 26, borderTop: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', fontSize: 13, color: 'rgba(230,220,200,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          © 2026 Rangers Academy, Pontevedra
        </div>
      </section>
    </div>
  );
}
