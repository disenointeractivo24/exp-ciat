import { createRoot } from 'react-dom/client';
import { Scene } from './scene/Scene';
import { HUD } from './ui/HUD';
import './index.css';

function App() {
  return (
    <>
      <Scene />
      <HUD />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
