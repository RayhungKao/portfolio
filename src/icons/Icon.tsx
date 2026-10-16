import { SVGS } from './svgs';

const ICONS = SVGS as Record<IconName, string>;

export type IconName = 'book' | 'github' | 'linkedin' | 'mail' | 'mortar-board' | 'organization';

/** One of the SVG files in this folder, inlined so it takes the text color (fill="currentColor"). */
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <span className="icon" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}
