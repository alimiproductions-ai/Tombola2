
import React, { useEffect } from 'react';

const ConfettiEffect: React.FC = () => {
  useEffect(() => {
    // Load script dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    script.onload = () => {
      // @ts-ignore
      const end = Date.now() + (3 * 1000);
      const colors = ['#bb0000', '#ffffff', '#ffd700'];

      (function frame() {
        // @ts-ignore
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        // @ts-ignore
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
};

export default ConfettiEffect;
