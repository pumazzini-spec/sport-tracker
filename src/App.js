
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

    if (weekday === 1 || weekday === 4) {
      focus = "Haut du corps";
      workout = "Tractions 4x max • Pompes 4x max • Dips 3x10 • Gainage 3x45 sec";
    } else if (weekday === 2 || weekday === 5) {
      focus = "Cardio";
      workout = "Course 30 à 40 min + 10 min d'abdos";
    } else if (weekday === 3) {
      focus = "Activité légère";
      workout = "10 000 pas + gainage 3x1 min";
    } else if (weekday === 6) {
      focus = "Full body";
      workout = "Circuit x4 : tractions • pompes • squats • gainage";
    } else {
      focus = "Repos actif";
      workout = "Marche légère + mobilité";
    }

    arr.push({
      id: i,
      dateIso: isoDate(cur),
      label: formatDateFr(isoDate(cur)),
      focus,
      workout,
    });

    cur.setDate(cur.getDate() + 1);
    i += 1;
  }

  return arr;
}

const CHECKS_KEY = "sport_v6_checks";
const WEIGHTS_KEY = "sport_v6_weights";
const START_KEY = "sport_v6_start";
const GOAL_KEY = "sport_v6_goal";
const NOTES_KEY = "sport_v6_notes";
const PIN_KEY = "sport_v6_pin";
const CAL_KEY = "sport_v6_calories";

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

function ProgressRing({ progress }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(progress, 0), 100) / 100) * circumference;

  return (
    <div className="ring-wrap">
      <svg width="110" height="110" viewBox="0 0 110 110" className="ring-svg" aria-hidden="true">
        <circle cx="55" cy="55" r={radius} className="ring-track" />
        <circle
          cx="55" cy="55" r={radius}
          className="ring-progress"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-center">
        <strong>{progress}%</strong>
        <span>fait</span>
      </div>
    </div>
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
  const [tab, setTab] = useState("today");
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showValidatedFlash, setShowValidatedFlash] = useState(false);

  useEffect(() => {
    try {
      setChecks(JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}"));
      setWeights(JSON.parse(localStorage.getItem(WEIGHTS_KEY) || "{}"));
      setNotes(JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"));
      setCaloriesMap(JSON.parse(localStorage.getItem(CAL_KEY) || "{}"));
    } catch {}

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
  useEffect(() => { localStorage.setItem(START_KEY, startWeight); }, [startWeight]);
  useEffect(() => { localStorage.setItem(GOAL_KEY, goalWeight); }, [goalWeight]);

  const todayIso = isoDate(new Date());
  const todayData = days.find((d) => d.dateIso === todayIso) || days.find((d) => !checks[d.dateIso]) || days[0];

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

  const toggleToday = () => {
    const nextValue = !checks[todayData.dateIso];
    setChecks((prev) => ({ ...prev, [todayData.dateIso]: nextValue }));
    if (nextValue) {
      setShowValidatedFlash(true);
      setTimeout(() => setShowValidatedFlash(false), 1600);
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

  const deficitStatus = caloriesMap[todayIso]
    ? Number(caloriesMap[todayIso]) <= 2200
      ? "✅ Probablement en déficit"
      : "⚠️ Peut-être trop élevé"
    : "— Pas encore renseigné";

  const motivationalMessage = (() => {
    if (currentWeight && currentWeight <= goalWeightNum) return "Objectif atteint. Continue à tenir.";
    if (streak >= 7) return "Tu es lancé. Ne casse pas la chaîne.";
    if (streak >= 3) return "Très bon rythme. Continue comme ça.";
    if (completed === 0) return "Première mission : lancer la machine.";
    return `Encore ${kilosRemaining || "--"} kg. Continue.`;
  })();

  if (!isUnlocked) {
    return (
      <div className="page-shell center-shell">
        <div className="lock-card">
          <div className="lock-topline">MODE PRIVÉ</div>
          <h1>Discipline Tracker</h1>
          <p>Entre ton code PIN pour continuer.</p>
          <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Code PIN" className="input" />
          <button onClick={handleUnlock} className="primary-button full">Déverrouiller</button>
          {!hasPin && (
            <div className="pin-create">
              <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Créer un PIN" className="input" />
              <button onClick={handlePinCreate} className="secondary-button full">Créer mon PIN</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell app-dark">
      <div className="phone-shell">
        <header className="top-header">
          <div>
            <div className="eyebrow">NO EXCUSES</div>
            <h1>Discipline Tracker</h1>
            <p className="header-subtext">{motivationalMessage}</p>
          </div>
          <ProgressRing progress={progress} />
        </header>

        {showValidatedFlash && <div className="validated-flash">✔️ JOUR VALIDÉ</div>}

        {tab === "today" && (
          <main className="content">
            <section className="hero-danger fade-up">
              <div className="danger-line">MISSION DU JOUR</div>
              <h2>{todayData.label}</h2>
              <div className="focus-tag">{todayData.focus}</div>
              <p>{todayData.workout}</p>
            </section>

            <section className="stats-strip fade-up delay-1">
              <div className="mini-card red streak-card">
                <span>Streak</span>
                <strong>{streak}</strong>
                <div className="streak-bar"><div className="streak-fill" style={{ width: `${Math.min((streak / 7) * 100, 100)}%` }} /></div>
              </div>
              <div className="mini-card"><span>Perdus</span><strong>-{kilosLost} kg</strong></div>
              <div className="mini-card"><span>Reste</span><strong>{currentWeight ? `${kilosRemaining} kg` : "--"}</strong></div>
            </section>

            <button onClick={toggleToday} className={`validate-btn pulse-on-hover ${checks[todayData.dateIso] ? "done" : ""}`}>
              {checks[todayData.dateIso] ? "✅ JOUR VALIDÉ" : "🔥 VALIDER MA JOURNÉE"}
            </button>

            <section className="card-dark fade-up delay-2">
              <h3>Note du jour</h3>
              <textarea className="input note-area dark-input" value={notes[todayData.dateIso] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [todayData.dateIso]: e.target.value }))} placeholder="Tractions, sensations, course, moral..." />
            </section>

            <section className="double-grid fade-up delay-3">
              <div className="card-dark">
                <h3>Poids du jour</h3>
                <div className="stack">
                  <input className="input dark-input" type="number" step="0.1" value={todayWeight} onChange={(e) => setTodayWeight(e.target.value)} placeholder="Ex. 79.4" />
                  <button onClick={saveTodayWeight} className="secondary-button soft-press">Enregistrer</button>
                </div>
              </div>
              <div className="card-dark">
                <h3>Calories</h3>
                <div className="stack">
                  <input className="input dark-input" type="number" value={todayCalories} onChange={(e) => setTodayCalories(e.target.value)} placeholder="Ex. 2100" />
                  <button onClick={saveTodayCalories} className="secondary-button soft-press">Sauver</button>
                </div>
                <div className="status-red">{deficitStatus}</div>
              </div>
            </section>

            <section className="card-dark fade-up delay-4">
              <h3>Projection</h3>
              <p className="muted-light">Objectif visé : {goalWeightNum || 70} kg</p>
              <div className="projection-date">{projectedDate}</div>
            </section>
          </main>
        )}

        {tab === "calendar" && (
          <main className="content">
            <section className="card-dark fade-up">
              <h3>Calendrier global</h3>
              <div className="calendar-grid">
                {days.map((day) => {
                  const isDone = !!checks[day.dateIso];
                  const isToday = day.dateIso === todayIso;
                  return (
                    <button key={day.dateIso} onClick={() => setChecks((prev) => ({ ...prev, [day.dateIso]: !prev[day.dateIso] }))} className={`calendar-item ${isDone ? "done" : ""} ${isToday ? "today" : ""}`}>
                      <div className="calendar-top">
                        <span className="mini-badge">J{day.id}</span>
                        <span className={isDone ? "pill success" : "pill muted-pill"}>{isDone ? "Fait" : "À faire"}</span>
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

        {tab === "progress" && (
          <main className="content">
            <section className="stats-strip big fade-up">
              <div className="mini-card red"><span>Départ</span><strong>{startWeightNum || "--"} kg</strong></div>
              <div className="mini-card"><span>Actuel</span><strong>{currentWeight ? `${currentWeight} kg` : "--"}</strong></div>
              <div className="mini-card"><span>Objectif</span><strong>{goalWeightNum || 70} kg</strong></div>
            </section>

            <section className="card-dark fade-up delay-1">
              <h3>Courbe de poids</h3>
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
            </section>

            <section className="card-dark fade-up delay-2">
              <h3>Réglages</h3>
              <div className="stack">
                <label className="label-light">Poids de départ</label>
                <input className="input dark-input" type="number" step="0.1" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} />
                <label className="label-light">Objectif</label>
                <input className="input dark-input" type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
              </div>
            </section>
          </main>
        )}

        <nav className="bottom-nav">
          <button className={tab === "today" ? "nav-item active" : "nav-item"} onClick={() => setTab("today")}><span>🔥</span><small>Jour</small></button>
          <button className={tab === "calendar" ? "nav-item active" : "nav-item"} onClick={() => setTab("calendar")}><span>📅</span><small>Calendrier</small></button>
          <button className={tab === "progress" ? "nav-item active" : "nav-item"} onClick={() => setTab("progress")}><span>📈</span><small>Progrès</small></button>
        </nav>
      </div>
    </div>
  );
}
