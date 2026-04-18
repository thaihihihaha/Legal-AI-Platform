import React from 'react';

export default function PageHero({ icon, title, subtitle, kicker = '', pills = [] }) {
  return (
    <div className="hero-header">
      {kicker ? <div className="hero-kicker">{kicker}</div> : null}
      <h1>{icon} {title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {Array.isArray(pills) && pills.length > 0 ? (
        <div className="hero-pills">
          {pills.map((pill) => <span key={pill}>{pill}</span>)}
        </div>
      ) : null}
    </div>
  );
}
