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

const STORAGE_KEY = "sport_tracker_fin_juillet_v1";
const PIN_KEY = "sport_tracker_pin_v1";
const WEIGHT_KEY = "sport_tracker_weight_v1";

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
      <div className="page center">
        <div className="card auth-card">
          <h1>Programme sport</h1>
          <p>Entre ton code PIN pour accéder à ton suivi.</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Code PIN"
          />
          <button onClick={handleUnlock} className="primary">Déverrouiller</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="card top-card">
          <div className="top-row">
            <div>
              <h1>Suivi sport jusqu'à fin juillet</h1>
              <p className="muted">
                Coche tes journées faites et garde une trace de ta progression.
              </p>
            </div>
            <div className="stats">
              <div>Jours validés : <strong>{completed}</strong> / {days.length}</div>
              <div>Progression : <strong>{progress}%</strong></div>
            </div>
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="controls">
            <div className="button-group">
              <button onClick={() => setFilter("all")} className={filter === "all" ? "active" : ""}>Tous</button>
              <button onClick={() => setFilter("todo")} className={filter === "todo" ? "active" : ""}>À faire</button>
              <button onClick={() => setFilter("done")} className={filter === "done" ? "active" : ""}>Faits</button>
            </div>

            <div className="button-group">
              <button onClick={() => setViewMode("list")} className={viewMode === "list" ? "active" : ""}>Liste</button>
              <button onClick={() => setViewMode("calendar")} className={viewMode === "calendar" ? "active" : ""}>Calendrier</button>
              {!hasPin ? (
                <>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Créer un PIN"
                  />
                  <button onClick={handlePinCreate} className="primary">Protéger</button>
                </>
              ) : (
                <button onClick={removePin}>Retirer le PIN</button>
              )}
            </div>
          </div>

          <div className="grid-two">
            <div className="subcard">
              <h3>Poids de la semaine</h3>
              <p className="muted">Entre ton poids du jour pour suivre ton évolution semaine par semaine.</p>
              <div className="inline-row">
                <input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="Ex. 79.4"
                />
                <button onClick={saveWeight} className="primary">Ajouter</button>
              </div>
              <div className="small-top">
                <span>Dernier poids cette semaine :</span>{" "}
                <strong>{latestWeekWeight ? `${latestWeekWeight} kg` : "aucune entrée"}</strong>
              </div>
            </div>

            <div className="subcard">
              <h3>Légende</h3>
              <div className="legend">
                <span className="pill green">Jour validé</span>
                <span className="pill gray">Jour non validé</span>
                <span className="pill blue">Aujourd'hui</span>
              </div>
            </div>
          </div>

          <p className="tiny muted">
            Accès privé basique : les données restent dans ce navigateur via le stockage local.
          </p>
        </div>

        {viewMode === "calendar" ? (
          <div className="card">
            <div className="calendar-grid">
              {days.map((day) => {
                const isDone = !!checks[day.dateIso];
                const isToday = day.dateIso === isoDate(today);
                return (
                  <button
                    key={day.dateIso}
                    onClick={() => setChecks((prev) => ({ ...prev, [day.dateIso]: !prev[day.dateIso] }))}
                    className={`calendar-day ${isDone ? "done" : ""} ${isToday ? "today" : ""}`}
                  >
                    <div className="calendar-top">
                      <span className="badge-dark">J{day.id}</span>
                      <span className={`pill ${isDone ? "green" : "gray"}`}>
                        {isDone ? "Fait" : "À faire"}
                      </span>
                    </div>
                    <div className="calendar-label">{day.label}</div>
                    <div className="calendar-focus">{day.focus}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="list">
            {filteredDays.map((day) => (
              <div key={day.dateIso} className={`card day-card ${checks[day.dateIso] ? "day-done" : ""}`}>
                <div className="day-head">
                  <div className="day-content">
                    <div className="day-badges">
                      <span className="badge-dark">Jour {day.id}</span>
                      <span className="pill gray">{day.focus}</span>
                      {checks[day.dateIso] && <span className="pill green">Validé</span>}
                    </div>
                    <h2>{day.label}</h2>
                    <p>{day.workout}</p>
                  </div>

                  <div className="check-box-wrap">
                    <label className={`check-box ${checks[day.dateIso] ? "checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!checks[day.dateIso]}
                        onChange={() =>
                          setChecks((prev) => ({ ...prev, [day.dateIso]: !prev[day.dateIso] }))
                        }
                      />
                      <span>Jour fait</span>
                    </label>
                  </div>
                </div>

                <textarea
                  value={notes[day.dateIso] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [day.dateIso]: e.target.value }))}
                  placeholder="Note du jour : sensations, temps de course, nombre de tractions..."
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
