import { DEVICE_PRESETS } from '../utils/devicePresets';
import { ELEMENT_CONFIGS } from '../utils/cssVariables';
import ElementInspector from './ElementInspector';

const Sidebar = ({
  selectedDevice,
  setSelectedDevice,
  selectedGrid,
  setSelectedGrid,
  orientation,
  setOrientation,
  selectedElement,
  onUpdateConfig,
  getCurrentConfig,
  onResetElement,
  onResetAll,
  onSave,
  isSaving,
  hasUnsavedChanges
}) => {
  return (
    <div className="config-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h1>Grid Config Tool</h1>
        <p>Visual layout editor</p>
      </div>

      {/* Device Selector */}
      <div className="sidebar-section">
        <h3>Device</h3>
        <div className="device-selector">
          {Object.entries(DEVICE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`device-btn ${selectedDevice === key ? 'active' : ''}`}
              onClick={() => setSelectedDevice(key)}
            >
              <span className="icon">{preset.icon}</span>
              <span className="label">{preset.name}</span>
              <span className="dimensions">{preset.width}x{preset.height}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orientation Toggle */}
      {(selectedDevice === 'mobile' || selectedDevice === 'tablet') && (
        <div className="sidebar-section">
          <h3>Orientation</h3>
          <div className="orientation-toggle">
            <button
              className={`orientation-btn ${orientation === 'portrait' ? 'active' : ''}`}
              onClick={() => setOrientation('portrait')}
            >
              Portrait
            </button>
            <button
              className={`orientation-btn ${orientation === 'landscape' ? 'active' : ''}`}
              onClick={() => setOrientation('landscape')}
            >
              Landscape
            </button>
          </div>
        </div>
      )}

      {/* Grid Count Selector */}
      <div className="sidebar-section">
        <h3>Grid Count</h3>
        <div className="grid-selector">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
            <button
              key={num}
              className={`grid-btn ${selectedGrid === num ? 'active' : ''}`}
              onClick={() => setSelectedGrid(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Element Inspector */}
      <div className="sidebar-section" style={{ flex: 1, borderBottom: 'none' }}>
        <h3>Element Inspector</h3>
        <ElementInspector
          selectedElement={selectedElement}
          elementConfig={selectedElement ? ELEMENT_CONFIGS[selectedElement] : null}
          onUpdateConfig={onUpdateConfig}
          getCurrentConfig={getCurrentConfig}
          onResetElement={onResetElement}
        />
      </div>

      {/* Save Section */}
      <div className="save-section">
        <button
          className={`save-btn ${isSaving ? 'saving' : ''} ${hasUnsavedChanges ? 'has-changes' : ''}`}
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
        >
          {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
        </button>
        {hasUnsavedChanges && (
          <div className="unsaved-indicator">
            <span>*</span> Unsaved changes
          </div>
        )}
        <button
          className="reset-btn"
          style={{ width: '100%', marginTop: '8px', padding: '8px' }}
          onClick={onResetAll}
        >
          Reset All to Defaults
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
