import { useCallback } from 'react';

const PropertySlider = ({ label, config, onChange }) => {
  if (!config) return null;

  const handleMinChange = useCallback((e) => {
    onChange({ ...config, min: parseFloat(e.target.value) || 0 });
  }, [config, onChange]);

  const handlePreferredChange = useCallback((e) => {
    onChange({ ...config, preferred: parseFloat(e.target.value) || 0 });
  }, [config, onChange]);

  const handleMaxChange = useCallback((e) => {
    onChange({ ...config, max: parseFloat(e.target.value) || 0 });
  }, [config, onChange]);

  const handleSliderChange = useCallback((e) => {
    // Slider controls the "preferred" value
    const value = parseFloat(e.target.value);
    onChange({ ...config, preferred: value });
  }, [config, onChange]);

  const displayValue = `clamp(${config.min}${config.unit}, ${config.preferred}vmin, ${config.max}${config.unit})`;

  return (
    <div className="property-control">
      <div className="property-label">
        <span>{label}</span>
        <span className="value">{config.preferred}{config.unit === 'px' ? 'vmin' : config.unit}</span>
      </div>
      <input
        type="range"
        className="property-slider"
        min="0"
        max="20"
        step="0.5"
        value={config.preferred}
        onChange={handleSliderChange}
      />
      <div className="property-inputs">
        <div className="property-input">
          <label>Min</label>
          <input
            type="number"
            value={config.min}
            onChange={handleMinChange}
            step="1"
          />
        </div>
        <div className="property-input">
          <label>Pref</label>
          <input
            type="number"
            value={config.preferred}
            onChange={handlePreferredChange}
            step="0.5"
          />
        </div>
        <div className="property-input">
          <label>Max</label>
          <input
            type="number"
            value={config.max}
            onChange={handleMaxChange}
            step="1"
          />
        </div>
      </div>
      <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>
        {displayValue}
      </div>
    </div>
  );
};

const ElementInspector = ({
  selectedElement,
  elementConfig,
  onUpdateConfig,
  getCurrentConfig,
  onResetElement
}) => {
  if (!selectedElement || !elementConfig) {
    return (
      <div className="inspector-empty">
        <div className="icon">🎯</div>
        <p>Click an element on the canvas to inspect and edit its properties</p>
      </div>
    );
  }

  return (
    <div className="element-inspector">
      <div className="inspector-header">
        <h4>{elementConfig.label}</h4>
        <button className="reset-btn" onClick={onResetElement}>
          Reset
        </button>
      </div>

      {elementConfig.properties.map((prop) => {
        const currentConfig = getCurrentConfig(prop);
        return (
          <PropertySlider
            key={prop}
            label={prop}
            config={currentConfig}
            onChange={(newValue) => onUpdateConfig(prop, newValue)}
          />
        );
      })}
    </div>
  );
};

export default ElementInspector;
