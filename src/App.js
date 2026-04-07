import React, { useEffect, useMemo, useState } from "react";

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
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
      workout = "Course 30 à 40 min à rythme modéré + 10 min d'abdos";
    } else if (weekday === 3) {
      focus = "Activité légère";
      workout = "10 000 pas + gainage 3x1 min";
    } else if (weekday === 6) {
      focus = "Full body";
      workout = "Circuit x4 : tractions • pompes • squats poids du corps • gainage";
    } else {
      focus = "Repos actif";
      workout = "Marche légère, mobilité, récupération";
    }

    arr.push({
      id: i,
      dateIso: isoDate(cur),
      label: formatDate(cur),
      focus,
      workout,
    });

    cur.setDate(cur.getDate() + 1);
    i += 1;
  }

  return arr;
}

const STORAGE_KEY = "sport_tracker_fin_juillet_v2";
const PIN_KEY = "sport_tracker_pin_v2";
const WEIGHT_KEY = "sport_tracker_weight_v2";
const START_WEIGHT_KEY = "sport_tracker_start_weight_v2";
const GOAL_WEIGHT_KEY = "sport_tracker_goal_weight_v2";

export default function ProgrammeSportTracker() {
  const days = useMemo(() => generateDays(), []);
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState("all");
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [weightEntries, setWeightEntries] = useState({});
  const [weightInput, setWeightInput] = useState("");
  const [startWeight, setStartWeight] = useState("80");
  const [goalWeight, setGoalWeight] = useState("70");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChecks(parsed.checks || {});
        setNotes(parsed.notes || {});
      } catch {}
    }

    const savedWeight = localStorage.getItem(WEIGHT_KEY);
    if (savedWeight) {
      try {
        setWeightEntries(JSON.parse(savedWeight) || {});
      } catch {}
    }

    const savedStartWeight = localStorage.getItem(START_WEIGHT_KEY);
    const savedGoalWeight = localStorage.getItem(GOAL_WEIGHT_KEY);
    if (savedStartWeight) setStartWeight(savedStartWeight);
    if (savedGoalWeight) setGoalWeight(savedGoalWeight);

    const savedPin = localStorage.getItem(PIN_KEY);
    setHasPin(!!savedPin);
    setIsUnlocked(!savedPin);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ checks, notes }));
  }, [checks, notes]);

  useEffect(() => {
    localStorage.setItem(WEIGHT_KEY, JSON.stringify(weightEntries));
  }, [weightEntries]);

  useEffect(() => {
    localStorage.setItem(START_WEIGHT_KEY, String(startWeight));
  }, [startWeight]);

  useEffect(() => {
    localStorage.setItem(GOAL_WEIGHT_KEY, String(goalWeight));
  }, [goalWeight]);

  const completed = Object.values(checks).filter(Boolean).length;
  const progress = Math.round((completed / days.length) * 100) || 0;

  const filteredDays = days.filter((day) => {
    if (filter === "done") return !!checks[day.dateIso];
    if (filter === "todo") return !checks[day.dateIso];
    return true;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  const weeklyWeightKeys = Object.keys(weightEntries)
    .sort()
    .filter((k) => {
      const d = new Date(`${k}T00:00:00`);
      return d >= weekStart && d <= weekEnd;
    });

  const latestWeekWeight = weeklyWeightKeys.length
    ? weightEntries[weeklyWeightKeys[weeklyWeightKeys.length - 1]]
    : "";

  const sortedWeightDates = Object.keys(weightEntries).sort();
  const currentWeight = sortedWeightDates.length
    ? Number(weightEntries[sortedWeightDates[sortedWeightDates.length - 1]])
    : null;
  const startWeightNum = Number(String(startWeight).replace(",", ".")) || 0;
  const goalWeightNum = Number(String(goalWeight).replace(",", ".")) || 0;
  const kilosLost = currentWeight && startWeightNum ? Math.max(0, Number((startWeightNum - currentWeight).toFixed(1))) : 0;
  const kilosRemaining = currentWeight && goalWeightNum ? Math.max(0, Number((currentWeight - goalWeightNum).toFixed(1))) : 0;

  const streak = (() => {
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
  })();

  const recentWeights = sortedWeightDates.slice(-8).map((date) => ({
    date,
    value: Number(weightEntries[date]),
  }));
  const minWeight = recentWeights.length ? Math.min(...recentWeights.map((w) => w.value)) : 0;
  const maxWeight = recentWeights.length ? Math.max(...recentWeights.map((w) => w.value)) : 0;
  const weightRange = maxWeight - minWeight || 1;

  const saveWeight = () => {
    const value = Number(String(weightInput).replace(",", "."));
    if (!value || value <= 0) return;
    const todayIso = isoDate(today);
    setWeightEntries((prev) => ({ ...prev, [todayIso]: value }));
    setWeightInput("");
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

  const removePin = () => {
    localStorage.removeItem(PIN_KEY);
    setHasPin(false);
    setIsUnlocked(true);
  };

  if (!isUnlocked) {
    return (
      <div className="page-shell lock-bg">
        <div className="lock-card">
          <div className="lock-badge">🔐 Privé</div>
          <h1 className="lock-title">Sport Tracker</h1>
          <p className="lock-text">Entre ton code PIN pour accéder à ton suivi.</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Code PIN"
            className="lock-input"
          />
          <button onClick={handleUnlock} className="primary-button full">Déverrouiller</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="app-container">
        <section className="hero-card">
          <div>
            <div className="hero-kicker">Objectif transformation</div>
            <h1 className="hero-title">Sport Tracker</h1>
            <p className="hero-text">Ton suivi quotidien pour rester discipliné jusqu'à fin juillet.</p>
          </div>
          <div className="hero-side">
            <div className="hero-pill">Objectif : {goalWeight} kg</div>
            <div className="hero-pill hero-pill-soft">Streak : {streak} jour{streak > 1 ? "s" : ""}</div>
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
            <span className="metric-label">Perte totale</span>
            <div className="metric-value">-{kilosLost} kg</div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Reste à perdre</span>
            <div className="metric-value">{currentWeight ? `${kilosRemaining} kg` : "--"}</div>
          </div>
        </section>

        <section className="chart-card">
          <div className="section-head">
            <div>
              <h3>Évolution du poids</h3>
              <p className="muted">Tes dernières entrées de poids.</p>
            </div>
          </div>
          {recentWeights.length > 1 ? (
            <div>
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
            </div>
          ) : (
            <p className="muted">Ajoute au moins 2 poids pour afficher la courbe.</p>
          )}
        </section>

        <section className="panel-card">
          <div className="panel-top">
            <div>
              <h2 className="panel-title">Suivi sport jusqu'à fin juillet</h2>
              <p className="muted">Coche tes journées faites et garde une trace de ta progression.</p>
            </div>
            <div className="panel-stats">
              <div>Jours validés : <strong>{completed}</strong> / {days.length}</div>
              <div>Progression : <strong>{progress}%</strong></div>
            </div>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="controls-row">
            <div className="button-group">
              <button onClick={() => setFilter("all")} className={filter === "all" ? "tab-button active" : "tab-button"}>Tous</button>
              <button onClick={() => setFilter("todo")} className={filter === "todo" ? "tab-button active" : "tab-button"}>À faire</button>
              <button onClick={() => setFilter("done")} className={filter === "done" ? "tab-button active" : "tab-button"}>Faits</button>
            </div>

            <div className="button-group">
              <button onClick={() => setViewMode("list")} className={viewMode === "list" ? "tab-button active" : "tab-button"}>Liste</button>
              <button onClick={() => setViewMode("calendar")} className={viewMode === "calendar" ? "tab-button active" : "tab-button"}>Calendrier</button>
              {!hasPin ? (
                <div className="pin-group">
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Créer un PIN"
                    className="soft-input pin-input"
                  />
                  <button onClick={handlePinCreate} className="primary-button">Protéger</button>
                </div>
              ) : (
                <button onClick={removePin} className="tab-button">Retirer le PIN</button>
              )}
            </div>
          </div>

          <div className="info-grid">
            <div className="sub-card">
              <h3>Objectifs</h3>
              <p className="muted">Ajuste ton poids de départ et ton objectif.</p>
              <div className="dual-inputs">
                <input
                  type="number"
                  step="0.1"
                  value={startWeight}
                  onChange={(e) => setStartWeight(e.target.value)}
                  placeholder="Poids de départ"
                  className="soft-input"
                />
                <input
                  type="number"
                  step="0.1"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  placeholder="Objectif"
                  className="soft-input"
                />
              </div>
            </div>

            <div className="sub-card">
              <h3>Poids de la semaine</h3>
              <p className="muted">Entre ton poids du jour pour suivre ton évolution.</p>
              <div className="dual-inputs">
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="Ex. 79.4"
                  className="soft-input"
                />
                <button onClick={saveWeight} className="primary-button">Ajouter</button>
              </div>
              <div className="info-line">
                <span>Dernier poids cette semaine :</span>{" "}
                <strong>{latestWeekWeight ? `${latestWeekWeight} kg` : "aucune entrée"}</strong>
              </div>
            </div>

            <div className="sub-card">
              <h3>Discipline</h3>
              <div className="discipline-grid">
                <div>
                  <span className="metric-label">Streak</span>
                  <div className="mini-metric">{streak} jour{streak > 1 ? "s" : ""}</div>
                </div>
                <div>
                  <span className="metric-label">Validés</span>
                  <div className="mini-metric">{completed}</div>
                </div>
                <div>
                  <span className="metric-label">Objectif</span>
                  <div className="mini-metric">{goalWeightNum || 70} kg</div>
                </div>
              </div>
            </div>

            <div className="sub-card">
              <h3>Légende</h3>
              <div className="legend-row">
                <span className="pill success">Jour validé</span>
                <span className="pill muted-pill">Jour non validé</span>
                <span className="pill info">Aujourd'hui</span>
              </div>
            </div>
          </div>

          <p className="tiny muted">Accès privé basique : les données restent dans ce navigateur via le stockage local.</p>
        </section>

        {viewMode === "calendar" ? (
          <section className="calendar-card">
            <div className="calendar-grid">
              {days.map((day) => {
                const isDone = !!checks[day.dateIso];
                const isToday = day.dateIso === isoDate(today);
                return (
                  <button
                    key={day.dateIso}
                    onClick={() => setChecks((prev) => ({ ...prev, [day.dateIso]: !prev[day.dateIso] }))}
                    className={`calendar-item ${isDone ? "done" : ""} ${isToday ? "today" : ""}`}
                  >
                    <div className="calendar-item-top">
                      <span className="dark-badge">J{day.id}</span>
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
        ) : (
          <section className="days-list">
            {filteredDays.map((day) => (
              <div key={day.dateIso} className={`day-card ${checks[day.dateIso] ? "done" : ""}`}>
                <div className="day-card-top">
                  <div className="day-main">
                    <div className="badges-row">
                      <span className="dark-badge">Jour {day.id}</span>
                      <span className="pill muted-pill">{day.focus}</span>
                      {checks[day.dateIso] && <span className="pill success">Validé</span>}
                    </div>
                    <h3 className="day-title">{day.label}</h3>
                    <p className="day-text">{day.workout}</p>
                  </div>

                  <div className="check-wrap">
                    <label className={`check-box ${checks[day.dateIso] ? "checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!checks[day.dateIso]}
                        onChange={() => setChecks((prev) => ({ ...prev, [day.dateIso]: !prev[day.dateIso] }))}
                      />
                      <span>Jour fait</span>
                    </label>
                  </div>
                </div>

                <textarea
                  value={notes[day.dateIso] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [day.dateIso]: e.target.value }))}
                  placeholder="Note du jour : sensations, temps de course, nombre de tractions..."
                  className="note-area"
                />
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
