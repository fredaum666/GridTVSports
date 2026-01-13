import { useCallback, useRef, useState } from 'react';

const ResizableElement = ({
  children,
  elementType,
  isSelected,
  onSelect,
  onResize
}) => {
  const elementRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });

  // Handle click to select
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onSelect(elementType);
  }, [elementType, onSelect]);

  // Handle mouse enter/leave for hover effect
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!isResizing) {
      setIsHovered(false);
    }
  }, [isResizing]);

  // Handle resize start (for future drag-to-resize functionality)
  const handleResizeStart = useCallback((e, corner) => {
    e.stopPropagation();
    e.preventDefault();

    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ width: rect.width, height: rect.height });

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const deltaY = moveEvent.clientY - e.clientY;

      // Calculate new size based on corner being dragged
      let newWidth = startSize.width;
      let newHeight = startSize.height;

      if (corner.includes('e')) newWidth = rect.width + deltaX;
      if (corner.includes('w')) newWidth = rect.width - deltaX;
      if (corner.includes('s')) newHeight = rect.height + deltaY;
      if (corner.includes('n')) newHeight = rect.height - deltaY;

      // Call onResize if provided
      if (onResize) {
        onResize({
          width: Math.max(10, newWidth),
          height: Math.max(10, newHeight)
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize, startSize]);

  const showHandles = isSelected || isHovered;

  return (
    <div
      ref={elementRef}
      className={`resizable-element ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        display: 'inline-flex',
        cursor: 'pointer'
      }}
    >
      {children}

      {/* Selection Indicator */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            border: '2px solid #3b82f6',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}

      {/* Hover Indicator */}
      {isHovered && !isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            border: '2px dashed rgba(59, 130, 246, 0.5)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      )}

      {/* Resize Handles */}
      {showHandles && (
        <>
          {/* Corner handles */}
          {['nw', 'ne', 'sw', 'se'].map((corner) => (
            <div
              key={corner}
              onMouseDown={(e) => handleResizeStart(e, corner)}
              style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                background: '#3b82f6',
                borderRadius: '50%',
                cursor: `${corner}-resize`,
                zIndex: 20,
                ...(corner.includes('n') ? { top: -4 } : { bottom: -4 }),
                ...(corner.includes('w') ? { left: -4 } : { right: -4 })
              }}
            />
          ))}
        </>
      )}

      {/* Element Type Label */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#3b82f6',
            color: 'white',
            fontSize: '0.625rem',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            zIndex: 30
          }}
        >
          {elementType}
        </div>
      )}
    </div>
  );
};

export default ResizableElement;
