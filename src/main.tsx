import { createRoot } from 'react-dom/client';
import App from './App';
import { upgradeHashUrl } from './router';
import './styles.css';

upgradeHashUrl();

createRoot(document.getElementById('root')!).render(<App />);
