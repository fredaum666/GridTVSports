import { useMemo } from 'react';
import { getDeviceDimensions } from '../utils/devicePresets';
import { MOCK_GAMES } from '../utils/cssVariables';
import ScoreboardCard from './ScoreboardCard';

const Canvas = ({
  device,
  gridCount,
  orientation,
  config,
  selectedElement,
  selectedCardIndex,
  onSelectElement,
  onClearSelection,
  isSelected
}) => {
  // Calculate viewport dimensions
  const dimensions = useMemo(() => {
    return getDeviceDimensions(device, orientation);
  }, [device, orientation]);

  // Calculate scale to fit in canvas area
  const scale = useMemo(() => {
    const maxWidth = window.innerWidth - 400; // Sidebar width + padding
    const maxHeight = window.innerHeight - 120;
    const scaleX = maxWidth / dimensions.width;
    const scaleY = maxHeight / dimensions.height;
    return Math.min(scaleX, scaleY, 1);
  }, [dimensions]);

  // Get games to display based on grid count
  const games = useMemo(() => {
    return MOCK_GAMES.slice(0, gridCount);
  }, [gridCount]);

  // Get config for current device/grid
  const currentConfig = useMemo(() => {
    return config?.[device]?.[gridCount] || {};
  }, [config, device, gridCount]);

  // Handle canvas click to clear selection
  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget) {
      onClearSelection();
    }
  };

  // Get grid class based on grid count
  const getGridClass = () => {
    return `fullscreen-grid grid-${gridCount}`;
  };

  return (
    <div className="config-canvas" onClick={handleCanvasClick}>
      {/* Canvas Header */}
      <div className="canvas-header">
        <div className="canvas-info">
          <span className="canvas-badge">{device.charAt(0).toUpperCase() + device.slice(1)}</span>
          <span className="canvas-badge">{dimensions.width} x {dimensions.height}</span>
          <span className="canvas-badge">Grid: {gridCount}</span>
          <span className="canvas-badge">Scale: {Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* Viewport Container */}
      <div
        className="canvas-viewport"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${scale})`
        }}
      >
        {/* Grid Container - uses actual fullscreen-grid classes */}
        <div className={getGridClass()}>
          {games.map((game, index) => (
            <ScoreboardCard
              key={game.id}
              game={game}
              index={index}
              gridCount={gridCount}
              device={device}
              config={currentConfig}
              selectedElement={selectedElement}
              isCardSelected={selectedCardIndex === index}
              onSelectElement={(element) => onSelectElement(element, index)}
              isSelected={isSelected}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Canvas;
