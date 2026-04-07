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

const CHECKS_KEY = "sport_v4_checks";
const WEIGHTS_KEY = "sport_v4_weights";
const START_KEY = "sport_v4_start";
const GOAL_KEY = "sport_v4_goal";
const NOTES_KEY = "sport_v4_notes";
const PIN_KEY = "sport_v4_pin";
const CAL_KEY = "sport_v4_calories";

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
  const [viewMode, setViewMode] = useState("today");
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    try {
      const savedChecks = JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}");
      const savedWeights = JSON.parse(localStorage.getItem(WEIGHTS_KEY) || "{}");
      const savedNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
      const savedCalories = JSON.parse(localStorage.getItem(CAL_KEY) || "{}");
      setChecks(savedChecks);
      setWeights(savedWeights);
      setNotes(savedNotes);
      setCaloriesMap(savedCalories);
    } catch {}

    const savedStart = localStorage.getItem(START_KEY);
    const savedGoal = localStorage.getItem(GOAL_KEY);
    if (savedStart) setStartWeight(savedStart);
    if (savedGoal) setGoalWeight(savedGoal);

    const savedPin = localStorage.getItem(PIN_KEY);
    setHasPin(!!savedPin);
    setIsUnlocked(!savedPin);
  }, []);

  useEffect(() => {
    localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
  }, [checks]);

  useEffect(() => {
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
  }, [weights]);

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(CAL_KEY, JSON.stringify(caloriesMap));
  }, [caloriesMap]);

  useEffect(() => {
    localStorage.setItem(START_KEY, startWeight);
  }, [startWeight]);

  useEffect(() => {
    localStorage.setItem(GOAL_KEY, goalWeight);
  }, [goalWeight]);

  const todayIso = isoDate(new Date());
  const todayData =
    days.find((d) => d.dateIso === todayIso) ||
    days.find((d) => !checks[d.dateIso]) ||
    days[0];

  const completed = Object.values(checks).filter(Boolean).length;
  const streak = getStreak(checks);
  const progress = Math.round((completed / days.length) * 100) || 0;

  const sortedWeightDates = Object.keys(weights).sort();
  const currentWeight = sortedWeightDates.length
    ? Number(weights[sortedWeightDates[sortedWeightDates.length - 1]])
    : null;

  const startWeightNum = Number(String(startWeight).replace(",", ".")) || 0;
  const goalWeightNum = Number(String(goalWeight).replace(",", ".")) || 0;
  const kilosLost = currentWeight && startWeightNum
    ? Math.max(0, Number((startWeightNum - currentWeight).toFixed(1)))
    : 0;
  const kilosRemaining = currentWeight && goalWeightNum
    ? Math.max(0, Number((currentWeight - goalWeightNum).toFixed(1)))
    : 0;

  const projectedDate = estimateGoalDate(currentWeight, goalWeightNum);

  const recentWeights = sortedWeightDates.slice(-8).map((date) => ({
    date,
    value: Number(weights[date]),
  }));
  const minWeight = recentWeights.length ? Math.min(...recentWeights.map((w) => w.value)) : 0;
  const maxWeight = recentWeights.length ? Math.max(...recentWeights.map((w) => w.value)) : 0;
  const weightRange = maxWeight - minWeight || 1;

  const toggleToday = () => {
    setChecks((prev) => ({ ...prev, [todayData.dateIso]: !prev[todayData.dateIso] }));
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

  if (!isUnlocked) {
    return (
      <div className="page-shell center-shell">
        <div className="lock-card">
          <div className="lock-badge">🔐 Privé</div>
          <h1>Sport Tracker V4</h1>
          <p>Entre ton code PIN pour accéder à ton suivi.</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Code PIN"
            className="input"
          />
          <button onClick={handleUnlock} className="primary-button full">Déverrouiller</button>

          {!hasPin && (
            <div className="pin-create">
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Créer un PIN"
                className="input"
              />
              <button onClick={handlePinCreate} className="secondary-button full">Créer mon PIN</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const deficitStatus = caloriesMap[todayIso]
    ? Number(caloriesMap[todayIso]) <= 2200
      ? "✅ Probablement en déficit"
      : "⚠️ Peut-être trop élevé"
    : "— Pas encore renseigné";

  return (
    <div className="page-shell">
      <div className="app-container">
        <section className="hero-card">
          <div>
            <div className="hero-kicker">Mission transformation</div>
            <h1 className="hero-title">Objectif 70 kg</h1>
            <p className="hero-text">Une seule mission par jour. Tu valides, tu avances.</p>
          </div>
          <div className="hero-side">
            <div className="hero-pill">Streak : {streak} jour{streak > 1 ? "s" : ""}</div>
            <div className="hero-pill soft">Progression : {progress}%</div>
          </div>
        </section>

        <section className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Poids de départ</span>
            <div className="metric-value">{startWeightNum || "--"} kg</div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Poids actuel</span>
            <div className="metric-value">{currentWeight ? `${currentWeight} kg` : "--"}</div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Kilos perdus</span>
            <div className="metric-value">-{kilosLost}</div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Reste à perdre</span>
            <div className="metric-value">{currentWeight ? `${kilosRemaining} kg` : "--"}</div>
          </div>
        </section>

        <section className="prediction-card">
          <div>
            <h3>Date estimée objectif</h3>
            <p className="muted">Sur une base d'environ 0,75 kg perdu par semaine.</p>
          </div>
          <div className="prediction-date">{projectedDate}</div>
        </section>

        <section className="today-card">
          <div className="today-head">
            <div>
              <div className="day-badge">Jour {todayData.id}</div>
              <h2 className="today-title">{todayData.label}</h2>
              <div className="focus-pill">{todayData.focus}</div>
              <p className="today-workout">{todayData.workout}</p>
            </div>
          </div>

          <button onClick={toggleToday} className={`validate-button ${checks[todayData.dateIso] ? "done" : ""}`}>
            {checks[todayData.dateIso] ? "✅ JOURNÉE VALIDÉE" : "🔥 VALIDER MA JOURNÉE"}
          </button>

          <textarea
            className="input note-area"
            value={notes[todayData.dateIso] || ""}
            onChange={(e) => setNotes((prev) => ({ ...prev, [todayData.dateIso]: e.target.value }))}
            placeholder="Note du jour : sensations, temps de course, nombre de tractions..."
          />
        </section>

        <section className="quick-grid">
          <div className="sub-card">
            <h3>Poids du jour</h3>
            <div className="inline">
              <input
                className="input"
                type="number"
                step="0.1"
                value={todayWeight}
                onChange={(e) => setTodayWeight(e.target.value)}
                placeholder="Ex. 79.4"
              />
              <button onClick={saveTodayWeight} className="primary-button">Enregistrer</button>
            </div>
          </div>

          <div className="sub-card">
            <h3>Calories du jour</h3>
            <div className="inline">
              <input
                className="input"
                type="number"
                value={todayCalories}
                onChange={(e) => setTodayCalories(e.target.value)}
                placeholder="Ex. 2100"
              />
              <button onClick={saveTodayCalories} className="primary-button">Sauver</button>
            </div>
            <p className="status-line">{deficitStatus}</p>
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-head">
            <h3>Courbe de poids</h3>
            <div className="toggle-group">
              <button className={viewMode === "today" ? "tab active" : "tab"} onClick={() => setViewMode("today")}>Jour</button>
              <button className={viewMode === "calendar" ? "tab active" : "tab"} onClick={() => setViewMode("calendar")}>Calendrier</button>
            </div>
          </div>

          {recentWeights.length > 1 ? (
            <>
              <svg viewBox="0 0 320 140" className="chart-svg" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  points={recentWeights.map((w, i) => {
                    const x = (i / Math.max(recentWeights.length - 1, 1)) * 300 + 10;
                    const y = 120 - (((w.value - minWeight) / weightRange) * 100);
                    return `${x},${y}`;
                  }).join(" ")}
                />
                {recentWeights.map((w, i) => {
                  const x = (i / Math.max(recentWeights.length - 1, 1)) * 300 + 10;
                  const y = 120 - (((w.value - minWeight) / weightRange) * 100);
                  return <circle key={w.date} cx={x} cy={y} r="4" fill="currentColor" />;
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
            <p className="muted">Ajoute au moins 2 poids pour afficher la courbe.</p>
          )}
        </section>

        {viewMode === "calendar" && (
          <section className="calendar-card">
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
                      <span className={isDone ? "pill success" : "pill muted-pill"}>
                        {isDone ? "Fait" : "À faire"}
                      </span>
                    </div>
                    <div className="calendar-date">{day.label}</div>
                    <div className="calendar-focus">{day.focus}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="settings-card">
          <div className="settings-grid">
            <div>
              <span className="metric-label">Poids de départ</span>
              <input className="input" type="number" step="0.1" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} />
            </div>
            <div>
              <span className="metric-label">Objectif</span>
              <input className="input" type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
