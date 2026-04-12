import { useEffect, useRef, useState } from 'react';
import '../styles/OverflowTitle.css';

const MARQUEE_GAP_PX = 56;
const MARQUEE_PIXELS_PER_SECOND = 34;

function OverflowTitle({ text, className }) {
  const containerRef = useRef(null);
  const firstCopyRef = useRef(null);
  const [metrics, setMetrics] = useState({
    overflowing: false,
    distance: 0,
    duration: 0,
  });

  useEffect(() => {
    const measure = () => {
      const containerNode = containerRef.current;
      const firstCopyNode = firstCopyRef.current;

      if (!containerNode || !firstCopyNode) {
        return;
      }

      const availableWidth = containerNode.clientWidth;
      const textWidth = firstCopyNode.scrollWidth;
      const overflowing = textWidth - availableWidth > 1;

      if (!overflowing) {
        setMetrics({
          overflowing: false,
          distance: 0,
          duration: 0,
        });
        return;
      }

      const distance = textWidth + MARQUEE_GAP_PX;
      const duration = Math.max(8, distance / MARQUEE_PIXELS_PER_SECOND);

      setMetrics({
        overflowing: true,
        distance,
        duration,
      });
    };

    const frameId = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure);
      if (containerRef.current) resizeObserver.observe(containerRef.current);
      if (firstCopyRef.current) resizeObserver.observe(firstCopyRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measure);
      resizeObserver?.disconnect();
    };
  }, [text]);

  return (
    <h3
      ref={containerRef}
      className={`${className} overflow-title ${metrics.overflowing ? 'overflow-title--scrolling' : ''}`}
      title={text}
      style={{
        '--overflow-title-distance': `${metrics.distance}px`,
        '--overflow-title-duration': `${metrics.duration}s`,
        '--overflow-title-gap': `${MARQUEE_GAP_PX}px`,
      }}
    >
      {metrics.overflowing ? (
        <span className="overflow-title__track">
          <span ref={firstCopyRef} className="overflow-title__copy">{text}</span>
          <span className="overflow-title__copy" aria-hidden="true">{text}</span>
        </span>
      ) : (
        <span ref={firstCopyRef} className="overflow-title__copy">{text}</span>
      )}
    </h3>
  );
}

export default OverflowTitle;
