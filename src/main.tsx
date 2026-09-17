import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/shell.css';
import './styles/spotlight.css';
import { installSpotlight } from './ui/effects/spotlight.ts';
import { App } from './app/App.tsx';

render(<App />, document.getElementById('app')!);
installSpotlight();
