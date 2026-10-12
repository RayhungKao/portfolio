import book from './book.svg?raw';
import github from './github.svg?raw';
import linkedin from './linkedin.svg?raw';
import mail from './mail.svg?raw';
import mortarBoard from './mortar-board.svg?raw';
import organization from './organization.svg?raw';

const ICONS = { book, github, linkedin, mail, 'mortar-board': mortarBoard, organization };

export type IconName = keyof typeof ICONS;

/** One of the SVG files in this folder, inlined so it takes the text color (fill="currentColor"). */
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <span className="icon" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}
