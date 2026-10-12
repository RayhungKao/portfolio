import { LINKS } from './content';
import { Icon } from './icons/Icon';

/** GitHub, LinkedIn and email as icon buttons (icon sources and licenses: src/icons/README.md). */
export function SocialLinks({ className = '' }: { className?: string }) {
  const email = LINKS.email.replace('mailto:', '');
  return (
    <ul className={`social ${className}`.trim()}>
      <li>
        <a href={LINKS.github} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub">
          <Icon name="github" />
        </a>
      </li>
      <li>
        <a href={LINKS.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn">
          <Icon name="linkedin" />
        </a>
      </li>
      <li>
        <a href={LINKS.email} aria-label={`Email ${email}`} title={email}>
          <Icon name="mail" />
        </a>
      </li>
    </ul>
  );
}
