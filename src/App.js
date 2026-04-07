
import React, { useEffect, useMemo, useState } from "react";

const CHECKS_KEY = "system_v8_checks";
const WEIGHTS_KEY = "system_v8_weights";
const NOTES_KEY = "system_v8_notes";
const XP_KEY = "system_v8_xp";
const START_KEY = "system_v8_start";
const GOAL_KEY = "system_v8_goal";
const PIN_KEY = "system_v8_pin";
const CAL_KEY = "system_v8_cal";

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
    let reward = 10;

    if (weekday === 1 || weekday === 4) {
      focus = "Haut du corps";
      workout = "Tractions 4x max • Pompes 4x max • Dips 3x10 • Gainage 3x45 sec";
      reward = 12;
    } else if (weekday === 2 || weekday === 5) {
      focus = "Cardio";
      workout = "Course 30 à 40 min + 10 min d'abdos";
      reward = 12;
    } else if (weekday === 3) {
      focus = "Activité légère";
      workout = "10 000 pas + gainage 3x1 min";
      reward = 8;
    } else if (weekday === 6) {
      focus = "Full body";
      workout = "Circuit x4 : tractions • pompes • squats • gainage";
      reward = 15;
    } else {
      focus = "Repos actif";
      workout = "Marche légère + mobilité";
      reward = 5;
    }

    arr.push({
      id: i,
      dateIso: isoDate(cur),
      label: formatDateFr(isoDate(cur)),
      focus,
      workout,
      reward,
    });

    cur.setDate(cur.getDate() + 1);
    i += 1;
  }
  return arr;
}

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
    { level: 2, title: "Combattant", need: 70 },
    { level: 3, title: "Chasseur", need: 160 },
    { level: 4, title: "Élite", need: 300 },
    { level: 5, title: "Commandant", need: 500 },
    { level: 6, title: "Monarque", need: 760 },
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

function XpBar({ progress }) {
  return (
    <div className="xp-bar">
      <div className="xp-fill" style={{ width: `${progress}%` }} />
    </div>
  );
}

export default function App() {
  const days = useMemo(() => generateDays(), []);
  const [checks, setChecks] = useState({});
  const [weights, setWeights] = useState({});
  const [notes, setNotes] = useState({});
  const [caloriesMap, setCaloriesMap] = useState({});
  const [xp, setXp] = useState(0);
  const [startWeight, setStartWeight] = useState("80");
  const [goalWeight, setGoalWeight] = useState("70");
  const [todayWeight, setTodayWeight] = useState("");
  const [todayCalories, setTodayCalories] = useState("");
  const [tab, setTab] = useState("quete");
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [rewardFlash, setRewardFlash] = useState("");

  useEffect(() => {
    try {
      setChecks(JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}"));
      setWeights(JSON.parse(localStorage.getItem(WEIGHTS_KEY) || "{}"));
      setNotes(JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"));
      setCaloriesMap(JSON.parse(localStorage.getItem(CAL_KEY) || "{}"));
    } catch {}
    setXp(Number(localStorage.getItem(XP_KEY) || "0"));
    const savedStart = localStorage.getItem(START_KEY);
    const savedGoal = localStorage.getItem(GOAL_KEY);
    if (savedStart) setStartWeight(savedStart);
    if (savedGoal) setGoalWeight(savedGoal);
    const savedPin = localStorage.getItem(PIN_KEY);
    setHasPin(!!savedPin);
    setIsUnlocked(!savedPin);
  }, []);

  useEffect(() => { localStorage.setItem(CHECKS_KEY, JSON.stringify(checks)); }, [checks]);
  useEffect(() => { localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights)); }, [weights]);
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(CAL_KEY, JSON.stringify(caloriesMap)); }, [caloriesMap]);
  useEffect(() => { localStorage.setItem(XP_KEY, String(xp)); }, [xp]);
  useEffect(() => { localStorage.setItem(START_KEY, startWeight); }, [startWeight]);
  useEffect(() => { localStorage.setItem(GOAL_KEY, goalWeight); }, [goalWeight]);

  const todayIso = isoDate(new Date());
  const todayData = days.find((d) => d.dateIso === todayIso) || days.find((d) => !checks[d.dateIso]) || days[0];
  const todayDone = !!checks[todayData.dateIso];

  const completed = Object.values(checks).filter(Boolean).length;
  const progress = Math.round((completed / days.length) * 100) || 0;
  const streak = getStreak(checks);
  const levelData = getLevelData(xp);

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

  const handleQuestToggle = () => {
    const wasDone = !!checks[todayData.dateIso];
    const nextDone = !wasDone;
    const reward = todayData.reward + (streak >= 3 ? 5 : 0);

    setChecks((prev) => ({ ...prev, [todayData.dateIso]: nextDone }));

    if (nextDone) {
      setXp((prev) => prev + reward);
      setRewardFlash(`+${reward} XP ACQUIS`);
      setTimeout(() => setRewardFlash(""), 1800);
    } else {
      setXp((prev) => Math.max(0, prev - reward));
      setRewardFlash(`-${reward} XP RETIRÉ`);
      setTimeout(() => setRewardFlash(""), 1800);
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
    if (todayDone) return "Quête terminée. Récompense sécurisée.";
    if (streak >= 7) return "Rythme exceptionnel détecté.";
    if (completed === 0) return "Initialisation du système. Première quête requise.";
    return `Cible restante : ${kilosRemaining || "--"} kg`;
  })();

  if (!isUnlocked) {
    return (
      <div className="page-shell center-shell">
        <div className="lock-card system-frame">
          <div className="system-corner tl" />
          <div className="system-corner tr" />
          <div className="system-corner bl" />
          <div className="system-corner br" />
          <div className="system-line">ACCÈS SYSTÈME</div>
          <h1>Système Discipline</h1>
          <p>Entre ton code PIN pour déverrouiller l’interface.</p>
          <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="CODE PIN" className="input system-input" />
          <button onClick={handleUnlock} className="system-button full">DÉVERROUILLER</button>
          {!hasPin && (
            <div className="pin-create">
              <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="CRÉER UN PIN" className="input system-input" />
              <button onClick={handlePinCreate} className="ghost-button full">CRÉER L’ACCÈS</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell app-system">
      <div className="phone-shell">
        <header className="top-header">
          <div>
            <div className="system-line">SYSTÈME ACTIF</div>
            <h1>Système Discipline</h1>
            <p className="header-subtext">{systemMessage}</p>

            <div className="level-box system-frame thin">
              <div className="system-corner tl" />
              <div className="system-corner tr" />
              <div className="system-corner bl" />
              <div className="system-corner br" />
              <span>NIVEAU {levelData.level}</span>
              <strong>{levelData.title}</strong>
            </div>

            <XpBar progress={levelData.progress} />
            <div className="xp-text">{levelData.currentXp} XP / {levelData.nextNeed} XP</div>
          </div>

          <ProgressRing progress={progress} />
        </header>

        {rewardFlash && <div className="reward-flash">{rewardFlash}</div>}

        {tab === "quete" && (
          <main className="content">
            <section className="system-card system-frame glow fade-up">
              <div className="system-corner tl" />
              <div className="system-corner tr" />
              <div className="system-corner bl" />
              <div className="system-corner br" />
              <div className="card-line">QUÊTE DU JOUR</div>
              <h2>{todayData.label}</h2>
              <div className="focus-tag">{todayData.focus}</div>
              <p>{todayData.workout}</p>
              <div className="reward-line">Récompense : {todayData.reward + (streak >= 3 ? 5 : 0)} XP</div>
            </section>

            <section className="stats-strip fade-up delay-1">
              <div className="mini-card accent system-frame thin">
                <div className="system-corner tl" />
                <div className="system-corner tr" />
                <div className="system-corner bl" />
                <div className="system-corner br" />
                <span>STREAK</span>
                <strong>{streak}</strong>
              </div>
              <div className="mini-card system-frame thin">
                <div className="system-corner tl" />
                <div className="system-corner tr" />
                <div className="system-corner bl" />
                <div className="system-corner br" />
                <span>PERDUS</span>
                <strong>-{kilosLost} kg</strong>
              </div>
              <div className="mini-card system-frame thin">
                <div className="system-corner tl" />
                <div className="system-corner tr" />
                <div className="system-corner bl" />
                <div className="system-corner br" />
                <span>RESTE</span>
                <strong>{currentWeight ? `${kilosRemaining} kg` : "--"}</strong>
              </div>
            </section>

            <button onClick={handleQuestToggle} className={`quest-button ${todayDone ? "done" : ""}`}>
              {todayDone ? "QUÊTE TERMINÉE" : "TERMINER LA QUÊTE"}
            </button>

            <section className="system-card system-frame fade-up delay-2">
              <div className="system-corner tl" />
              <div className="system-corner tr" />
              <div className="system-corner bl" />
              <div className="system-corner br" />
              <h3>JOURNAL</h3>
              <textarea
                className="input system-input note-area"
                value={notes[todayData.dateIso] || ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [todayData.dateIso]: e.target.value }))}
                placeholder="Tractions, sensations, course, moral..."
              />
            </section>

            <section className="double-grid fade-up delay-3">
              <div className="system-card small system-frame">
                <div className="system-corner tl" />
                <div className="system-corner tr" />
                <div className="system-corner bl" />
                <div className="system-corner br" />
                <h3>MASSE CORPORELLE</h3>
                <div className="stack">
                  <input className="input system-input" type="number" step="0.1" value={todayWeight} onChange={(e) => setTodayWeight(e.target.value)} placeholder="79.4" />
                  <button onClick={saveTodayWeight} className="ghost-button">SAUVEGARDER</button>
                </div>
              </div>
              <div className="system-card small system-frame">
                <div className="system-corner tl" />
                <div className="system-corner tr" />
                <div className="system-corner bl" />
                <div className="system-corner br" />
                <h3>JOURNAL CALORIES</h3>
                <div className="stack">
                  <input className="input system-input" type="number" value={todayCalories} onChange={(e) => setTodayCalories(e.target.value)} placeholder="2100" />
                  <button onClick={saveTodayCalories} className="ghost-button">SAUVEGARDER</button>
                </div>
                <div className="status-blue">{statusCalories}</div>
              </div>
            </section>

            <section className="system-card system-frame fade-up delay-4">
              <div className="system-corner tl" />
              <div className="system-corner tr" />
              <div className="system-corner bl" />
              <div className="system-corner br" />
              <h3>PROJECTION FUTURE</h3>
              <p className="muted-light">CIBLE : {goalWeightNum || 70} KG</p>
              <div className="projection-date">{projectedDate}</div>
            </section>
          </main>
        )}

        {tab === "calendrier" && (
          <main className="content">
            <section className="system-card system-frame fade-up">
              <div className="system-corner tl" />
              <div className="system-corner tr" />
              <div className="system-corner bl" />
              <div className="system-corner br" />
              <h3>TABLEAU DES QUÊTES</h3>
              <div className="calendar-grid">
                {days.map((day) => {
                  const isDone = !!checks[day.dateIso];
                  const isToday = day.dateIso === todayIso;
                  return (
                    <button
                      key={day.dateIso}
                      onClick={() => setChecks((prev) => ({ ...prev, [day.dateIso]: !prev[day.dateIso] }))}
                      className={`calendar-item ${isDone ? "done" : ""} ${isToday ? "today" : ""}`}
                    >
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
            </section>
          </main>
        )}

        {tab === "stats" && (
          <main className="content">
            <section className="stats-strip big fade-up">
              <div className="mini-card accent system-frame thin">
                <div className="system-corner tl" />
                <div className="system-corner tr" />
                <div className="system-corner bl" />
                <div className="system-corner br" />
                <span>DÉPART</span>
                <strong>{startWeightNum || "--"} kg</strong>
              </div>
              <div className="mini-card system-frame thin">
                <div className="system-corner tl" />
                <div className="system-corner tr" />
                <div className="system-corner bl" />
                <div className="system-corner br" />
                <span>ACTUEL</span>
                <strong>{currentWeight ? `${currentWeight} kg` : "--"}</strong>
              </div>
              <div className="mini-card system-frame thin">
                <div className="system-corner tl" />
                <div className="system-corner tr" />
                <div className="system-corner bl" />
                <div className="system-corner br" />
                <span>CIBLE</span>
                <strong>{goalWeightNum || 70} kg</strong>
              </div>
            </section>

            <section className="system-card system-frame fade-up delay-1">
              <div className="system-corner tl" />
              <div className="system-corner tr" />
              <div className="system-corner bl" />
              <div className="system-corner br" />
              <h3>GRAPHIQUE DE POIDS</h3>
              {recentWeights.length > 1 ? (
                <>
                  <svg viewBox="0 0 320 160" className="chart-svg" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      points={recentWeights.map((w, i) => {
                        const x = (i / Math.max(recentWeights.length - 1, 1)) * 300 + 10;
                        const y = 130 - (((w.value - minWeight) / weightRange) * 110);
                        return `${x},${y}`;
                      }).join(" ")}
                    />
                    {recentWeights.map((w, i) => {
                      const x = (i / Math.max(recentWeights.length - 1, 1)) * 300 + 10;
                      const y = 130 - (((w.value - minWeight) / weightRange) * 110);
                      return <circle key={w.date} cx={x} cy={y} r="5" fill="currentColor" />;
                    })}
                  </svg>
                  <div className="chart-labels">
                    {recentWeights.map((w) => (
                      <div key={w.date} className="chart-label-item">
                        <span>{w.value} kg</span>
                        <small>{w.date.slice(5)}</small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted-light">Ajoute au moins 2 poids pour afficher la courbe.</p>
              )}
            </section>

            <section className="system-card system-frame fade-up delay-2">
              <div className="system-corner tl" />
              <div className="system-corner tr" />
              <div className="system-corner bl" />
              <div className="system-corner br" />
              <h3>PARAMÈTRES SYSTÈME</h3>
              <div className="stack">
                <label className="label-light">POIDS DE DÉPART</label>
                <input className="input system-input" type="number" step="0.1" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} />
                <label className="label-light">POIDS CIBLE</label>
                <input className="input system-input" type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
              </div>
            </section>
          </main>
        )}

        <nav className="bottom-nav">
          <button className={tab === "quete" ? "nav-item active" : "nav-item"} onClick={() => setTab("quete")}><span>◈</span><small>Quête</small></button>
          <button className={tab === "calendrier" ? "nav-item active" : "nav-item"} onClick={() => setTab("calendrier")}><span>▦</span><small>Tableau</small></button>
          <button className={tab === "stats" ? "nav-item active" : "nav-item"} onClick={() => setTab("stats")}><span>△</span><small>Stats</small></button>
        </nav>
      </div>
    </div>
  );
}
