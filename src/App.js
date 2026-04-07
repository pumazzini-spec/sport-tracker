
import React, { useEffect, useMemo, useState } from "react";

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatDateFr(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function generateDays() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date("2026-07-31T00:00:00");
  const arr = [];
  let i = 1;
  const cur = new Date(start);

  while (cur <= end) {
    const weekday = cur.getDay();
    let workout = "";
    let focus = "";
    let goals = [];

    if (weekday === 1 || weekday === 4) {
      focus = "Haut du corps";
      workout = "Tractions 4x max • Pompes 4x max • Dips 3x10 • Gainage 3x45 sec";
      goals = ["Tractions 4 séries", "Pompes 4 séries", "Dips 3 x 10", "Gainage 3 x 45 sec"];
    } else if (weekday === 2 || weekday === 5) {
      focus = "Cardio";
      workout = "Course 30 à 40 min + 10 min d'abdos";
      goals = ["Course 30 à 40 min", "Abdos 10 min", "Hydratation correcte"];
    } else if (weekday === 3) {
      focus = "Activité légère";
      workout = "10 000 pas + gainage 3x1 min";
      goals = ["10 000 pas", "Gainage 3 x 1 min"];
    } else if (weekday === 6) {
      focus = "Full body";
      workout = "Circuit x4 : tractions • pompes • squats • gainage";
      goals = ["Circuit x4", "Squats", "Tractions", "Gainage"];
    } else {
      focus = "Repos actif";
      workout = "Marche légère + mobilité";
      goals = ["Marche légère", "Mobilité", "Récupération"];
    }

    arr.push({
      id: i,
      dateIso: isoDate(cur),
      label: formatDateFr(isoDate(cur)),
      focus,
      workout,
      goals,
    });

    cur.setDate(cur.getDate() + 1);
    i += 1;
  }

  return arr;
}

const CHECKS_KEY = "system_v8_checks";
const WEIGHTS_KEY = "system_v8_weights";
const START_KEY = "system_v8_start";
const GOAL_KEY = "system_v8_goal";
const NOTES_KEY = "system_v8_notes";
const PIN_KEY = "system_v8_pin";
const CAL_KEY = "system_v8_calories";
const XP_KEY = "system_v8_xp";

function getStreak(checks) {
  let count = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (true) {
    const key = isoDate(d);
    if (checks[key]) {
      count += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
}

function estimateGoalDate(currentWeight, goalWeight) {
  if (!currentWeight || !goalWeight || currentWeight <= goalWeight) return "Objectif atteint";
  const diff = currentWeight - goalWeight;
  const weeksNeeded = diff / 0.75;
  const daysNeeded = Math.ceil(weeksNeeded * 7);
  const target = new Date();
  target.setDate(target.getDate() + daysNeeded);
  return target.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getLevelData(xp) {
  const levels = [
    { level: 1, title: "Éveillé", need: 0 },
    { level: 2, title: "Combattant", need: 80 },
    { level: 3, title: "Chasseur", need: 180 },
    { level: 4, title: "Chasseur Élite", need: 320 },
    { level: 5, title: "Commandant", need: 500 },
    { level: 6, title: "Monarque", need: 740 },
  ];

  let current = levels[0];
  let next = null;

  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].need) current = levels[i];
    if (xp < levels[i].need) {
      next = levels[i];
      break;
    }
  }

  if (!next) {
    return { level: current.level, title: current.title, progress: 100, currentXp: xp, nextNeed: xp };
  }

  const previousNeed = current.need;
  const range = next.need - previousNeed;
  const earned = xp - previousNeed;
  const progress = Math.max(0, Math.min(100, Math.round((earned / range) * 100)));

  return { level: current.level, title: current.title, progress, currentXp: xp, nextNeed: next.need };
}

function XpBar({ progress }) {
  return (
    <div className="xp-bar">
      <div className="xp-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}

function ProgressRing({ progress }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(progress, 0), 100) / 100) * circumference;

  return (
    <div className="ring-wrap">
      <svg width="110" height="110" viewBox="0 0 110 110" className="ring-svg" aria-hidden="true">
        <circle cx="55" cy="55" r={radius} className="ring-track" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          className="ring-progress"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-center">
        <strong>{progress}%</strong>
        <span>SYNC</span>
      </div>
    </div>
  );
}

function FrameCard({ title, children, className = "" }) {
  return (
    <section className={`frame-card ${className}`}>
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      <div className="frame-title">{title}</div>
      {children}
    </section>
  );
}

export default function App() {
  const days = useMemo(() => generateDays(), []);
  const [checks, setChecks] = useState({});
  const [weights, setWeights] = useState({});
  const [notes, setNotes] = useState({});
  const [startWeight, setStartWeight] = useState("80");
  const [goalWeight, setGoalWeight] = useState("70");
  const [todayWeight, setTodayWeight] = useState("");
  const [todayCalories, setTodayCalories] = useState("");
  const [caloriesMap, setCaloriesMap] = useState({});
  const [tab, setTab] = useState("quest");
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    try {
      setChecks(JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}"));
      setWeights(JSON.parse(localStorage.getItem(WEIGHTS_KEY) || "{}"));
      setNotes(JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"));
      setCaloriesMap(JSON.parse(localStorage.getItem(CAL_KEY) || "{}"));
    } catch {}
    const savedStart = localStorage.getItem(START_KEY);
    const savedGoal = localStorage.getItem(GOAL_KEY);
    const savedPin = localStorage.getItem(PIN_KEY);
    const savedXp = Number(localStorage.getItem(XP_KEY) || "0");
    if (savedStart) setStartWeight(savedStart);
    if (savedGoal) setGoalWeight(savedGoal);
    setXp(savedXp);
    setHasPin(!!savedPin);
    setIsUnlocked(!savedPin);
  }, []);

  useEffect(() => { localStorage.setItem(CHECKS_KEY, JSON.stringify(checks)); }, [checks]);
  useEffect(() => { localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights)); }, [weights]);
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(CAL_KEY, JSON.stringify(caloriesMap)); }, [caloriesMap]);
  useEffect(() => { localStorage.setItem(START_KEY, startWeight); }, [startWeight]);
  useEffect(() => { localStorage.setItem(GOAL_KEY, goalWeight); }, [goalWeight]);
  useEffect(() => { localStorage.setItem(XP_KEY, String(xp)); }, [xp]);

  const todayIso = isoDate(new Date());
  const todayData = days.find((d) => d.dateIso === todayIso) || days.find((d) => !checks[d.dateIso]) || days[0];
  const alreadyDone = !!checks[todayData.dateIso];

  const completed = Object.values(checks).filter(Boolean).length;
  const streak = getStreak(checks);
  const progress = Math.round((completed / days.length) * 100) || 0;

  const sortedWeightDates = Object.keys(weights).sort();
  const currentWeight = sortedWeightDates.length ? Number(weights[sortedWeightDates[sortedWeightDates.length - 1]]) : null;
  const startWeightNum = Number(String(startWeight).replace(",", ".")) || 0;
  const goalWeightNum = Number(String(goalWeight).replace(",", ".")) || 0;
  const kilosLost = currentWeight && startWeightNum ? Math.max(0, Number((startWeightNum - currentWeight).toFixed(1))) : 0;
  const kilosRemaining = currentWeight && goalWeightNum ? Math.max(0, Number((currentWeight - goalWeightNum).toFixed(1))) : 0;
  const projectedDate = estimateGoalDate(currentWeight, goalWeightNum);

  const recentWeights = sortedWeightDates.slice(-8).map((date) => ({ date, value: Number(weights[date]) }));
  const minWeight = recentWeights.length ? Math.min(...recentWeights.map((w) => w.value)) : 0;
  const maxWeight = recentWeights.length ? Math.max(...recentWeights.map((w) => w.value)) : 0;
  const weightRange = maxWeight - minWeight || 1;

  const levelData = getLevelData(xp);

  const toggleToday = () => {
    const nextValue = !checks[todayData.dateIso];
    setChecks((prev) => ({ ...prev, [todayData.dateIso]: nextValue }));

    if (nextValue) {
      const gain = streak >= 3 ? 15 : 10;
      setXp((prev) => prev + gain);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 1800);
    } else {
      const loss = streak >= 3 ? 15 : 10;
      setXp((prev) => Math.max(0, prev - loss));
    }
  };

  const saveTodayWeight = () => {
    const value = Number(String(todayWeight).replace(",", "."));
    if (!value || value <= 0) return;
    setWeights((prev) => ({ ...prev, [todayIso]: value }));
    setTodayWeight("");
  };

  const saveTodayCalories = () => {
    const value = Number(String(todayCalories).replace(",", "."));
    if (!value || value <= 0) return;
    setCaloriesMap((prev) => ({ ...prev, [todayIso]: value }));
    setTodayCalories("");
  };

  const handlePinCreate = () => {
    if (newPin.trim().length < 4) return;
    localStorage.setItem(PIN_KEY, newPin.trim());
    setHasPin(true);
    setIsUnlocked(true);
    setNewPin("");
  };

  const handleUnlock = () => {
    const savedPin = localStorage.getItem(PIN_KEY);
    if (pinInput.trim() === savedPin) {
      setIsUnlocked(true);
      setPinInput("");
    }
  };

  const statusCalories = caloriesMap[todayIso]
    ? Number(caloriesMap[todayIso]) <= 2200
      ? "STATUT : DÉFICIT CALORIQUE"
      : "STATUT : APPORT ÉLEVÉ"
    : "STATUT : AUCUNE DONNÉE";

  const systemMessage = (() => {
    if (alreadyDone) return "Quête terminée. Récompense sécurisée.";
    if (streak >= 7) return "Stabilité élevée. Montée de rang probable.";
    if (completed === 0) return "Système initialisé. Première quête requise.";
    return `Cible restante : ${kilosRemaining || "--"} kg`;
  })();

  if (!isUnlocked) {
    return (
      <div className="page-shell center-shell">
        <FrameCard title="ACCÈS SYSTÈME" className="lock-card">
          <h1 className="screen-title">Système Discipline</h1>
          <p className="muted-light">Entre ton code PIN pour déverrouiller l'interface.</p>
          <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="CODE PIN" className="input system-input" />
          <button onClick={handleUnlock} className="system-button full">DÉVERROUILLER</button>
          {!hasPin && (
            <div className="pin-create">
              <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="CRÉER UN PIN" className="input system-input" />
              <button onClick={handlePinCreate} className="ghost-button full">CRÉER L'ACCÈS</button>
            </div>
          )}
        </FrameCard>
      </div>
    );
  }

  return (
    <div className="page-shell app-system">
      <div className="phone-shell">
        <header className="top-header">
          <div className="header-main">
            <div className="system-line">SYSTÈME ACTIF</div>
            <h1 className="screen-title">Système Discipline</h1>
            <p className="header-subtext">{systemMessage}</p>
            <div className="level-box">
              <span>LV.{levelData.level}</span>
              <strong>{levelData.title}</strong>
            </div>
            <XpBar progress={levelData.progress} />
            <div className="xp-text">{levelData.currentXp} XP / {levelData.nextNeed} XP</div>
          </div>
          <ProgressRing progress={progress} />
        </header>

        {showReward && <div className="reward-flash">+ XP OBTENU</div>}

        {tab === "quest" && (
          <main className="content">
            <FrameCard title="QUÊTE DU JOUR" className="fade-up">
              <h2 className="quest-title">{todayData.label}</h2>
              <div className="focus-tag">{todayData.focus}</div>
              <p className="quest-desc">{todayData.workout}</p>

              <div className="goals-block">
                <div className="mini-title">OBJECTIFS</div>
                <div className="goal-list">
                  {todayData.goals.map((goal, index) => (
                    <div key={index} className="goal-row">
                      <span>- {goal}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="warning-box">
                <strong>ATTENTION</strong>
                <span>Si la quête n'est pas terminée, aucun gain durable ne sera accordé.</span>
              </div>
            </FrameCard>

            <section className="stats-strip fade-up delay-1">
              <div className="mini-card accent"><span>SÉRIE</span><strong>{streak}</strong></div>
              <div className="mini-card"><span>PERDUS</span><strong>-{kilosLost} kg</strong></div>
              <div className="mini-card"><span>RESTANT</span><strong>{currentWeight ? `${kilosRemaining} kg` : "--"}</strong></div>
            </section>

            <button onClick={toggleToday} className={`quest-button ${alreadyDone ? "done" : ""}`}>
              {alreadyDone ? "QUÊTE VALIDÉE" : "TERMINER LA QUÊTE"}
            </button>

            <FrameCard title="JOURNAL DE QUÊTE" className="fade-up delay-2">
              <textarea
                className="input system-input note-area"
                value={notes[todayData.dateIso] || ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [todayData.dateIso]: e.target.value }))}
                placeholder="Tractions, sensations, course, moral..."
              />
            </FrameCard>

            <section className="double-grid fade-up delay-3">
              <FrameCard title="MASSE CORPORELLE" className="small-card">
                <div className="stack">
                  <input className="input system-input" type="number" step="0.1" value={todayWeight} onChange={(e) => setTodayWeight(e.target.value)} placeholder="79.4" />
                  <button onClick={saveTodayWeight} className="ghost-button">ENREGISTRER</button>
                </div>
              </FrameCard>

              <FrameCard title="JOURNAL CALORIQUE" className="small-card">
                <div className="stack">
                  <input className="input system-input" type="number" value={todayCalories} onChange={(e) => setTodayCalories(e.target.value)} placeholder="2100" />
                  <button onClick={saveTodayCalories} className="ghost-button">SAUVER</button>
                </div>
                <div className="status-blue">{statusCalories}</div>
              </FrameCard>
            </section>

            <FrameCard title="PROJECTION FUTURE" className="fade-up delay-4">
              <p className="muted-light">OBJECTIF : {goalWeightNum || 70} KG</p>
              <div className="projection-date">{projectedDate}</div>
            </FrameCard>
          </main>
        )}

        {tab === "calendar" && (
          <main className="content">
            <FrameCard title="TABLEAU DES QUÊTES" className="fade-up">
              <div className="calendar-grid">
                {days.map((day) => {
                  const isDone = !!checks[day.dateIso];
                  const isToday = day.dateIso === todayIso;
                  return (
                    <button key={day.dateIso} onClick={() => {
                      const wasDone = !!checks[day.dateIso];
                      setChecks((prev) => ({ ...prev, [day.dateIso]: !prev[day.dateIso] }));
                      setXp((prev) => Math.max(0, prev + (wasDone ? -10 : 10)));
                    }} className={`calendar-item ${isDone ? "done" : ""} ${isToday ? "today" : ""}`}>
                      <div className="calendar-top">
                        <span className="mini-badge">J{day.id}</span>
                        <span className={isDone ? "pill success" : "pill muted-pill"}>{isDone ? "FAIT" : "EN ATTENTE"}</span>
                      </div>
                      <div className="calendar-date">{day.label}</div>
                      <div className="calendar-focus">{day.focus}</div>
                    </button>
                  );
                })}
              </div>
            </FrameCard>
          </main>
        )}

        {tab === "stats" && (
          <main className="content">
            <section className="stats-strip big fade-up">
              <div className="mini-card accent"><span>DÉPART</span><strong>{startWeightNum || "--"} kg</strong></div>
              <div className="mini-card"><span>ACTUEL</span><strong>{currentWeight ? `${currentWeight} kg` : "--"}</strong></div>
              <div className="mini-card"><span>CIBLE</span><strong>{goalWeightNum || 70} kg</strong></div>
            </section>

            <FrameCard title="GRAPHIQUE DE POIDS" className="fade-up delay-1">
              {recentWeights.length > 1 ? (
                <>
                  <svg viewBox="0 0 320 160" className="chart-svg" preserveAspectRatio="none">
                    <polyline fill="none" stroke="currentColor" strokeWidth="4" points={recentWeights.map((w, i) => {
                      const x = (i / Math.max(recentWeights.length - 1, 1)) * 300 + 10;
                      const y = 130 - (((w.value - minWeight) / weightRange) * 110);
                      return `${x},${y}`;
                    }).join(" ")} />
                    {recentWeights.map((w, i) => {
                      const x = (i / Math.max(recentWeights.length - 1, 1)) * 300 + 10;
                      const y = 130 - (((w.value - minWeight) / weightRange) * 110);
                      return <circle key={w.date} cx={x} cy={y} r="5" fill="currentColor" />;
                    })}
                  </svg>
                  <div className="chart-labels">
                    {recentWeights.map((w) => (
                      <div key={w.date} className="chart-label-item"><span>{w.value} kg</span><small>{w.date.slice(5)}</small></div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted-light">Ajoute au moins 2 poids pour afficher la courbe.</p>
              )}
            </FrameCard>

            <FrameCard title="RÉGLAGES SYSTÈME" className="fade-up delay-2">
              <div className="stack">
                <label className="label-light">POIDS DE DÉPART</label>
                <input className="input system-input" type="number" step="0.1" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} />
                <label className="label-light">POIDS CIBLE</label>
                <input className="input system-input" type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
              </div>
            </FrameCard>
          </main>
        )}

        <nav className="bottom-nav">
          <button className={tab === "quest" ? "nav-item active" : "nav-item"} onClick={() => setTab("quest")}><span>◈</span><small>Quête</small></button>
          <button className={tab === "calendar" ? "nav-item active" : "nav-item"} onClick={() => setTab("calendar")}><span>▦</span><small>Tableau</small></button>
          <button className={tab === "stats" ? "nav-item active" : "nav-item"} onClick={() => setTab("stats")}><span>△</span><small>Stats</small></button>
        </nav>
      </div>
    </div>
  );
}
