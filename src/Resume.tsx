import type { ReactNode } from 'react';
import { SocialLinks } from './SocialLinks';
import { RESUME, type Role } from './resumeData';

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

const ExternalIcon = () => (
  <svg className="ext-icon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

/** An external link with a ↗ icon. The icon stays on the same line as the last word. */
function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  const text = typeof children === 'string' ? children : null;
  const cut = text ? text.lastIndexOf(' ') + 1 : 0;
  return (
    <a className="ext" href={href} target="_blank" rel="noreferrer">
      {text ? text.slice(0, cut) : children}
      <span className="ext-tail">
        {text ? text.slice(cut) : null}
        <ExternalIcon />
      </span>
    </a>
  );
}

/** Links the product name inside a role title, if the role names one. */
function Title({ role }: { role: Role }) {
  const p = role.product;
  if (!p || !role.title.includes(p.name)) return <>{role.title}</>;
  const [before, after] = role.title.split(p.name);
  return (
    <>
      {before}
      <ExtLink href={p.url}>{p.name}</ExtLink>
      {after}
    </>
  );
}

function RoleBlock({ role }: { role: Role }) {
  return (
    <article className="cv-role">
      <header className="cv-role-head">
        <h3>
          <span className="cv-role-title">
            <Title role={role} />
          </span>
          <span className="cv-role-org">{role.orgUrl ? <ExtLink href={role.orgUrl}>{role.org}</ExtLink> : role.org}</span>
        </h3>
        <span className="cv-dates">{role.dates}</span>
      </header>
      {role.place && <p className="cv-place">{role.place}</p>}
      <ul className="cv-bullets">
        {role.bullets.map((b) => (
          <li key={b.slice(0, 40)}>{b}</li>
        ))}
      </ul>
    </article>
  );
}

/** The résumé as a page: the same wording as the résumé document, without the phone number. */
export function Resume() {
  const r = RESUME;
  return (
    <main className="cv">
      <header className="cv-hero">
        <h1>{r.name}</h1>
        <p className="cv-title">{r.title}</p>
        <p className="cv-location">
          <PinIcon /> {r.location}
        </p>
        <p className="cv-summary">{r.summary}</p>
        <SocialLinks />
      </header>

      <section className="cv-section" aria-labelledby="cv-experience">
        <h2 id="cv-experience">Professional Experience</h2>
        {r.experience.map((role) => (
          <RoleBlock key={role.org} role={role} />
        ))}
      </section>

      <section className="cv-section" aria-labelledby="cv-startups">
        <h2 id="cv-startups">Startup Experience</h2>
        {r.startups.map((role) => (
          <RoleBlock key={role.org} role={role} />
        ))}
      </section>

      <section className="cv-section" aria-labelledby="cv-skills">
        <h2 id="cv-skills">Technical Skills</h2>
        <dl className="cv-skills">
          {r.skills.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cv-section" aria-labelledby="cv-academic">
        <h2 id="cv-academic">Academic Experience</h2>
        {r.academic.map((role) => (
          <RoleBlock key={role.org} role={role} />
        ))}
      </section>

      <section className="cv-section" aria-labelledby="cv-education">
        <h2 id="cv-education">Education</h2>
        {r.education.degrees.map((d) => (
          <article className="cv-role" key={d.degree}>
            <header className="cv-role-head">
              <h3>
                <span className="cv-role-title">{d.degree}</span>
                <span className="cv-role-org">{r.education.school}</span>
              </h3>
              <span className="cv-dates">{d.dates}</span>
            </header>
            <p className="cv-place">
              {r.education.place} · {d.grade}
            </p>
            <ul className="cv-bullets">
              {d.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
              {d.activities && <li>Activities and societies: {d.activities}</li>}
            </ul>
          </article>
        ))}
      </section>

      <section className="cv-section" aria-labelledby="cv-publications">
        <h2 id="cv-publications">Publications</h2>
        <ol className="cv-pubs">
          {r.publications.map((p) => (
            <li key={p.title}>
              <p className="cv-pub-title">{p.url ? <ExtLink href={p.url}>{p.title}</ExtLink> : p.title}</p>
              <p className="cv-pub-venue">{p.venue}</p>
              <p className="cv-pub-when">{p.when}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="home-footer cv-footer">© {new Date().getFullYear()} Jui-Hung (Ray) Kao</footer>
    </main>
  );
}
