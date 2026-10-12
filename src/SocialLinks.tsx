import { MailIcon, MarkGithubIcon } from '@primer/octicons-react';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { LINKS } from './content';

/** Renders a Font Awesome icon definition as a plain SVG, without the Font Awesome runtime. */
function FaIcon({ icon, size }: { icon: typeof faLinkedin; size: number }) {
  const [width, height, , , path] = icon.icon;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={Array.isArray(path) ? path.join(' ') : path} />
    </svg>
  );
}

/**
 * GitHub, LinkedIn and email as icon buttons. GitHub and mail icons come from GitHub's Octicons (MIT);
 * the LinkedIn icon from Font Awesome Free (CC BY 4.0).
 */
export function SocialLinks({ className = '' }: { className?: string }) {
  const email = LINKS.email.replace('mailto:', '');
  return (
    <ul className={`social ${className}`.trim()}>
      <li>
        <a href={LINKS.github} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
          <MarkGithubIcon size={18} />
        </a>
      </li>
      <li>
        <a href={LINKS.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn">
          <FaIcon icon={faLinkedin} size={18} />
        </a>
      </li>
      <li>
        <a href={LINKS.email} aria-label={`Email ${email}`} title={email}>
          <MailIcon size={18} />
        </a>
      </li>
    </ul>
  );
}
