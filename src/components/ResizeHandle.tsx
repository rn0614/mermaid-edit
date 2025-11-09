import { useRef, useEffect } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction: 'horizontal' | 'vertical';
}

export default function ResizeHandle({ onResize, direction }: ResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const delta = direction === 'horizontal' ? e.movementX : e.movementY;
      onResize(delta);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    handle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      handle.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize, direction]);

  return (
    <div
      ref={handleRef}
      style={{
        position: 'relative',
        backgroundColor: direction === 'horizontal' ? '#dee2e6' : '#dee2e6',
        cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
        zIndex: 10,
        ...(direction === 'horizontal' 
          ? { width: '4px', minWidth: '4px', height: '100%' }
          : { height: '4px', minHeight: '4px', width: '100%' }
        ),
      }}
      onMouseEnter={() => {
        if (handleRef.current) {
          handleRef.current.style.backgroundColor = '#007bff';
        }
      }}
      onMouseLeave={() => {
        if (!isDraggingRef.current && handleRef.current) {
          handleRef.current.style.backgroundColor = '#dee2e6';
        }
      }}
    />
  );
}

