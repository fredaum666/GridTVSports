import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import { useGridConfig } from './hooks/useGridConfig';
import { useElementSelection } from './hooks/useElementSelection';

const App = () => {
  // Device and grid state
  const [selectedDevice, setSelectedDevice] = useState('desktop');
  const [selectedGrid, setSelectedGrid] = useState(4);
  const [orientation, setOrientation] = useState('landscape');

  // Config management
  const {
    config,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    updateElementConfig,
    getElementConfig,
    resetElement,
    resetAll,
    saveConfig
  } = useGridConfig();

  // Element selection
  const {
    selectedElement,
    selectedCardIndex,
    selectElement,
    clearSelection,
    isSelected
  } = useElementSelection();

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await saveConfig();
      showToast('Configuration saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save configuration', 'error');
    }
  }, [saveConfig, showToast]);

  // Handle element config update
  const handleUpdateConfig = useCallback((property, value) => {
    if (!selectedElement) return;
    updateElementConfig(selectedDevice, selectedGrid, selectedElement, property, value);
  }, [selectedDevice, selectedGrid, selectedElement, updateElementConfig]);

  // Get current element config
  const getCurrentElementConfig = useCallback((property) => {
    if (!selectedElement) return null;
    return getElementConfig(selectedDevice, selectedGrid, selectedElement, property);
  }, [selectedDevice, selectedGrid, selectedElement, getElementConfig]);

  // Handle element reset
  const handleResetElement = useCallback(() => {
    if (!selectedElement) return;
    resetElement(selectedDevice, selectedGrid, selectedElement);
  }, [selectedDevice, selectedGrid, selectedElement, resetElement]);

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="config-tool">
      <Sidebar
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
        selectedGrid={selectedGrid}
        setSelectedGrid={setSelectedGrid}
        orientation={orientation}
        setOrientation={setOrientation}
        selectedElement={selectedElement}
        onUpdateConfig={handleUpdateConfig}
        getCurrentConfig={getCurrentElementConfig}
        onResetElement={handleResetElement}
        onResetAll={resetAll}
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      <Canvas
        device={selectedDevice}
        gridCount={selectedGrid}
        orientation={orientation}
        config={config}
        selectedElement={selectedElement}
        selectedCardIndex={selectedCardIndex}
        onSelectElement={selectElement}
        onClearSelection={clearSelection}
        isSelected={isSelected}
      />
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default App;
