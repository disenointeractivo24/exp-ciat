import { useEffect, useState } from 'react';
import { JOURNEY, LINKS, NODES, NIGHT_TEXT, PATTERN_TEXT, TIME_BANDS, bandOf, useStore, type NightPattern } from '../store';
import { sound } from '../lib/audio';
import { PLATES } from '../lib/layout';
import { TOUR } from '../scene/Controls';

const fmt = (t: number) => {
  const h = Math.floor(t), m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`;
};

function Leaf() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16Z" fill="#D6E65A" />
      <path d="M5 19 15 9" stroke="#103C2F" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Intro() {
  const setMode = useStore((s) => s.setMode);
  const setTourStep = useStore((s) => s.setTourStep);
  const soundOn = useStore((s) => s.sound);
  const begin = (tour: boolean) => {
    if (soundOn) sound.start();
    if (tour) { setTourStep(0); setMode('tour'); } else setMode('walk');
  };
  return (
    <div className="intro">
      <div className="intro-card">
        <div className="eyebrow"><Leaf /> CIAT · Palmira, Colombia</div>
        <h1>Deck de descanso</h1>
        <p className="lema">«Elevar la mirada, conectar la vida.»</p>
        <p className="lead">
          La visita empieza en el túnel de la guadua y termina en el deck de descanso, junto a la laguna: un mirador
          a nivel del suelo para quien prefiere observar sin subir. Toma un pasaporte y calca las seis placas del deck.
        </p>
        <ol className="miradas">
          <li><b>El túnel</b> de guadua: prismas, ventanas a tres alturas y el corral.</li>
          <li><b>Mirar abajo</b> las sombras del techo y el reloj de luz.</li>
          <li><b>Mirar a través</b> de las capas, a la altura de quien está sentado.</li>
          <li><b>Conectar</b> fauna, vegetación y agua en la rueda.</li>
          <li><b>Contemplar</b> desde una banca con espaldar, frente al agua.</li>
          <li><b>Elevar la mirada</b> en el espejo del dosel, sin levantar la cabeza.</li>
        </ol>
        <div className="keys">
          <span><kbd>W A S D</kbd> caminar</span>
          <span><kbd>Ratón</kbd> mirar (clic para fijar)</span>
          <span><kbd>E</kbd> / clic interactuar</span>
          <span><kbd>ESC</kbd> salir</span>
          <span><kbd>N</kbd> día / noche</span>
          <span><kbd>V</kbd> vista órbita</span>
        </div>
        <div className="intro-actions">
          <button className="btn primary" onClick={() => begin(false)}>Comenzar recorrido</button>
          <button className="btn ghost" onClick={() => begin(true)}>Tour guiado</button>
        </div>
      </div>
    </div>
  );
}

function DayNight() {
  const night = useStore((s) => s.night);
  const setNight = useStore((s) => s.setNight);
  const time = useStore((s) => s.time);
  const setTime = useStore((s) => s.setTime);
  const pattern = useStore((s) => s.pattern);
  const setPattern = useStore((s) => s.setPattern);
  const pats: { id: NightPattern; l: string }[] = [{ id: 'hojas', l: 'Hojas' }, { id: 'aves', l: 'Aves' }, { id: 'agua', l: 'Agua' }];
  return (
    <div className="panel daynight">
      <div className="seg" role="group" aria-label="Día o noche">
        <button className={!night ? 'on' : ''} onClick={() => setNight(false)}>DÍA</button>
        <button className={night ? 'on' : ''} onClick={() => setNight(true)}>NOCHE</button>
      </div>
      <p className="caption">
        <b>{night ? 'Noche' : TIME_BANDS[Math.max(0, bandOf(time))].title}</b>
        {night ? `${NIGHT_TEXT} ${PATTERN_TEXT[pattern]}` : TIME_BANDS[Math.max(0, bandOf(time))].text}
      </p>
      {!night ? (
        <label className="slider">
          <span className="lbl">Simular hora <b>{fmt(time)}</b></span>
          <input type="range" min={6.25} max={17.75} step={0.05} value={time} onChange={(e) => setTime(parseFloat(e.target.value))} />
          <span className="ticks"><i>06</i><i>12</i><i>18</i></span>
        </label>
      ) : (
        <div className="patterns">
          <span className="lbl">Luz artificial · proyección</span>
          <div className="seg small">
            {pats.map((p) => <button key={p.id} className={pattern === p.id ? 'on' : ''} onClick={() => setPattern(p.id)}>{p.l}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Journey() {
  const j = useStore((s) => s.journey);
  return (
    <ol className="journey" aria-label="Recorrido sugerido">
      {JOURNEY.map((n, i) => (
        <li key={n} className={j[i] ? 'done' : ''}><span>{i + 1}</span>{n}</li>
      ))}
    </ol>
  );
}

function ModeBar() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const setTourStep = useStore((s) => s.setTourStep);
  const soundOn = useStore((s) => s.sound);
  const setSound = useStore((s) => s.setSound);
  const [help, setHelp] = useState(false);
  return (
    <div className="modebar">
      <div className="seg">
        <button className={mode === 'walk' ? 'on' : ''} onClick={() => setMode('walk')}>Recorrido</button>
        <button className={mode === 'orbit' ? 'on' : ''} onClick={() => setMode('orbit')}>Órbita</button>
        <button className={mode === 'tour' ? 'on' : ''} onClick={() => { setTourStep(0); setMode('tour'); }}>Tour guiado</button>
      </div>
      <button
        className="icon"
        aria-label={soundOn ? 'Silenciar sonido ambiente' : 'Activar sonido ambiente'}
        title="Sonido ambiente"
        onClick={() => { const v = !soundOn; setSound(v); if (v) sound.start(); sound.setEnabled(v); }}
      >
        {soundOn ? '♪' : '–'}
      </button>
      <button className="icon" aria-label="Controles" title="Controles" onClick={() => setHelp(!help)}>?</button>
      {help && (
        <div className="help">
          <b>Controles</b>
          <span><kbd>W A S D</kbd> / flechas · caminar (<kbd>Shift</kbd> más rápido)</span>
          <span><kbd>Clic</kbd> fija el ratón · arrastrar también gira la vista</span>
          <span><kbd>E</kbd> o clic · interactuar con el elemento señalado</span>
          <span><kbd>ESC</kbd> · salir de la interacción / levantarse</span>
          <span><kbd>N</kbd> día / noche · <kbd>V</kbd> órbita · <kbd>B</kbd> pasaporte</span>
          <span>Rueda: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> giran cada disco · Capas: <kbd>←</kbd> <kbd>→</kbd></span>
        </div>
      )}
    </div>
  );
}

function Prompt() {
  const mode = useStore((s) => s.mode);
  const label = useStore((s) => s.hoverLabel);
  const info = useStore((s) => s.info);
  const locked = useStore((s) => s.locked);
  const exitFocus = useStore((s) => s.exitFocus);
  if (mode === 'walk') {
    return (
      <>
        {locked && <div className={`crosshair ${label ? 'hot' : ''}`} />}
        {label ? (
          <div className="prompt"><kbd>E</kbd>{label}</div>
        ) : !locked ? (
          <div className="prompt subtle">Clic para mirar con el ratón · arrastra para girar</div>
        ) : null}
      </>
    );
  }
  if (mode === 'focus') {
    return (
      <div className="prompt focus">
        <span className="info">{info}</span>
        <button className="btn small" onClick={exitFocus}><kbd>ESC</kbd> Volver</button>
      </div>
    );
  }
  return null;
}

const PROMPTS_DAY = [
  'Respira. Deja que el paisaje llegue a ti.',
  'Escucha: ¿cuántos cantos distintos reconoces?',
  'Busca una garza en la orilla. Quieta, espera a su presa.',
  'Mira el agua: refleja el cielo, los árboles y las nubes.',
  'Sigue el vuelo de un ave hasta perderla de vista.',
  'Cuando quieras, asómate al espejo del centro: el techo también es un bosque.',
];
const PROMPTS_NIGHT = [
  'Respira. Deja que los ojos se acostumbren a la oscuridad.',
  'Escucha: ranas y grillos marcan el ritmo de la noche.',
  'Busca las luciérnagas entre la vegetación de la orilla.',
  'La laguna queda a oscuras para que las aves descansen.',
  'Ahora eleva la mirada: el techo brilla como un dosel encendido.',
];

function Seated() {
  const stand = useStore((s) => s.stand);
  const night = useStore((s) => s.night);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((v) => v + 1), 9000);
    return () => window.clearInterval(t);
  }, []);
  const list = night ? PROMPTS_NIGHT : PROMPTS_DAY;
  const text = list[Math.min(i, list.length - 1)];
  return (
    <div className="seated">
      <span key={text} className="breath">{text}</span>
      <button className="btn small" onClick={stand}><kbd>ESC</kbd> Levantarse</button>
    </div>
  );
}

function Tour() {
  const step = useStore((s) => s.tourStep);
  const setTourStep = useStore((s) => s.setTourStep);
  const setMode = useStore((s) => s.setMode);
  const t = TOUR[step];
  return (
    <div className="tour">
      <div className="tour-head"><span>Paso {step + 1} de {TOUR.length}</span><b>{t.title}</b></div>
      <p>{t.text}</p>
      <div className="tour-actions">
        <button className="btn small ghost" disabled={step === 0} onClick={() => setTourStep(step - 1)}>Anterior</button>
        {step < TOUR.length - 1 ? (
          <button className="btn small primary" onClick={() => setTourStep(step + 1)}>Siguiente</button>
        ) : (
          <button className="btn small primary" onClick={() => setMode('walk')}>Explorar libremente</button>
        )}
        <button className="btn small ghost" onClick={() => setMode('walk')}>Salir del tour</button>
      </div>
    </div>
  );
}

function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div key={toast.id} className={`toast ${toast.tone}`} role="status">
      {toast.title && <b>{toast.title}</b>}
      <span>{toast.text}</span>
    </div>
  );
}

function NetSvg({ size, links }: { size: number; links: Record<string, boolean> }) {
  const stamps = useStore((s) => s.stamps);
  const lit = new Set<string>(Object.keys(stamps));
  const last = useStore((s) => s.lastLink);
  return (
    <svg viewBox="-8 -4 116 108" width={size} height={size * 0.93} className="net" aria-hidden>
      {LINKS.map((l) => {
        const a = NODES.find((n) => n.id === l.a)!, b = NODES.find((n) => n.id === l.b)!;
        return <line key={l.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`${links[l.id] ? 'on' : ''} ${last === l.id ? 'new' : ''}`} />;
      })}
      {NODES.map((n) => (
        <g key={n.id} className={lit.has(n.id) ? 'on' : ''} transform={`translate(${n.x} ${n.y})`}>
          <circle r={n.id === 'tu' ? 6 : 5} />
          {size > 120 && <text y={n.y > 60 ? 14 : -9} textAnchor="middle">{n.label}</text>}
        </g>
      ))}
    </svg>
  );
}

/** The visitor's paper passport: the net is pre-printed; each rubbing fills a node, and a link appears when both ends are filled. */
function Network() {
  const links = useStore((s) => s.links);
  const stamps = useStore((s) => s.stamps);
  const last = useStore((s) => s.lastLink);
  const open = useStore((s) => s.showNet);
  const setOpen = useStore((s) => s.setShowNet);
  const n = Object.keys(stamps).length;
  const lastDef = LINKS.find((l) => l.id === last);
  return (
    <div className="network">
      {lastDef && !open && (
        <div className="newlink" key={lastDef.id}>
          <small>Nueva conexión en tu pasaporte</small>
          <b>{NODES.find((x) => x.id === lastDef.a)!.label} ↔ {NODES.find((x) => x.id === lastDef.b)!.label}</b>
          <span>{lastDef.text}</span>
        </div>
      )}
      {open && (
        <div className="netpanel">
          <div className="nethead"><b>Pasaporte de la laguna</b><span>{n} de 6 calcos</span></div>
          <NetSvg size={220} links={links} />
          <ul>
            {PLATES.map((p) => (
              <li key={p.node} className={stamps[p.node] ? 'on' : ''}>
                <b>{stamps[p.node] ? '✓' : '○'} {NODES.find((x) => x.id === p.node)!.label}</b>
                <span>{stamps[p.node] ? 'Calcado.' : `Placa ${p.where}.`}</span>
              </li>
            ))}
            {LINKS.filter((l) => links[l.id]).map((l) => (
              <li key={l.id} className="on">
                <b>{NODES.find((x) => x.id === l.a)!.label} ↔ {NODES.find((x) => x.id === l.b)!.label}</b>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button className={`netbtn ${last ? 'pulse' : ''}`} onClick={() => setOpen(!open)} aria-label="Pasaporte de la laguna">
        <NetSvg size={46} links={links} />
        <span><b>Pasaporte</b><small>{n} / 6 calcos</small></span>
      </button>
    </div>
  );
}

function Summary() {
  const links = useStore((s) => s.links);
  const stamps = useStore((s) => s.stamps);
  const wheel = useStore((s) => s.wheelFound);
  const bands = useStore((s) => s.bands);
  const pats = useStore((s) => s.patternsSeen);
  const journey = useStore((s) => s.journey);
  const close = useStore((s) => s.setSummary);
  const n = LINKS.filter((l) => links[l.id]).length;
  const s = Object.keys(stamps).length;
  const closing =
    s === 6 ? 'Tu pasaporte teje la red completa. Nada en la laguna vive aislado, tampoco nosotros. Llévalo a la torre.'
      : s >= 3 ? 'Tu pasaporte ya muestra buena parte de la red. Las placas que faltan siguen en el deck, esperando otra mirada.'
        : 'Apenas empieza tu red. Vuelve cuando quieras: cada hora y cada mirada revelan algo distinto.';
  return (
    <div className="summary" role="dialog" aria-label="Pasaporte de la laguna">
      <div className="summary-card">
        <small className="eyebrow">Pasaporte de la laguna</small>
        <h2>Elevar la mirada, conectar la vida.</h2>
        <div className="summary-body">
          <NetSvg size={200} links={links} />
          <div>
            <p>{closing}</p>
            <ul className="stats">
              <li><b>{s}/6</b> calcos en el pasaporte</li>
              <li><b>{n}/{LINKS.length}</b> conexiones de la red</li>
              <li><b>{wheel.filter(Boolean).length}/4</b> relaciones en la rueda</li>
              <li><b>{bands.filter(Boolean).length}/5</b> momentos del día observados</li>
              <li><b>{Object.keys(pats).length}/3</b> proyecciones nocturnas</li>
              <li><b>{journey.filter(Boolean).length}/6</b> miradas del recorrido</li>
            </ul>
          </div>
        </div>
        <div className="intro-actions">
          <button className="btn primary" onClick={() => close(false)}>Continuar el sendero</button>
          <button className="btn ghost" onClick={() => { close(false); useStore.getState().setShowNet(true); }}>Ver las conexiones</button>
        </div>
      </div>
    </div>
  );
}

export function HUD() {
  const mode = useStore((s) => s.mode);
  const focus = useStore((s) => s.focus);
  const summary = useStore((s) => s.summary);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b') { const st = useStore.getState(); st.setShowNet(!st.showNet); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  if (mode === 'intro') return <Intro />;
  const minimal = mode === 'seated';
  return (
    <div className={`hud ${minimal ? 'minimal' : ''}`}>
      <header className="brand">
        <Leaf />
        <div>
          <b>Deck de descanso</b>
          <small>Laguna · CIAT Palmira</small>
        </div>
      </header>
      {!minimal && <Journey />}
      <DayNight />
      {!minimal && mode !== 'tour' && <ModeBar />}
      {mode === 'tour' && <Tour />}
      {mode === 'seated' && <Seated />}
      {mode === 'orbit' && <div className="prompt subtle">Arrastra para orbitar · rueda para acercar · <kbd>V</kbd> volver al recorrido</div>}
      {mode === 'focus' && focus === 'binoc' && <div className="binoc-mask" aria-hidden />}
      {mode === 'focus' && focus === 'visor' && <div className="visor-mask" aria-hidden />}
      <Prompt />
      <Toast />
      {!minimal && mode !== 'tour' && <Network />}
      {summary && <Summary />}
    </div>
  );
}
