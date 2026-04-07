
import React, { useEffect, useState } from "react";

const XP_KEY = "xp";
const CHECKS_KEY = "checks";

export default function App() {
  const [checks, setChecks] = useState({});
  const [xp, setXp] = useState(0);

  useEffect(() => {
    setChecks(JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}"));
    setXp(Number(localStorage.getItem(XP_KEY) || 0));
  }, []);

  useEffect(() => {
    localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
  }, [checks]);

  useEffect(() => {
    localStorage.setItem(XP_KEY, xp);
  }, [xp]);

  const today = new Date().toISOString().slice(0,10);
  const done = checks[today];

  const toggle = () => {
    const newValue = !done;

    setChecks(prev => ({...prev, [today]: newValue}));

    if(newValue){
      setXp(prev => prev + 10);
    } else {
      setXp(prev => Math.max(0, prev - 10));
    }
  };

  return (
    <div className="app">
      <h1>SYSTÈME ACTIF</h1>

      <div className="card">
        <h2>QUÊTE DU JOUR</h2>
        <p>10 000 pas + gainage</p>
      </div>

      <div className="xp">XP : {xp}</div>

      <button onClick={toggle} className="btn">
        {done ? "QUÊTE VALIDÉE" : "VALIDER LA QUÊTE"}
      </button>
    </div>
  );
}
