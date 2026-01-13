import { useState, useCallback, useEffect } from 'react';
import { ELEMENT_CONFIGS } from '../utils/cssVariables';

// Initialize default config for all elements across all devices and grids
const initializeConfig = () => {
  const config = {};
  const devices = ['mobile', 'tablet', 'desktop', 'tv'];
  const grids = [1, 2, 3, 4, 5, 6, 7, 8];

  devices.forEach(device => {
    config[device] = {};
    grids.forEach(grid => {
      config[device][grid] = {};
      Object.entries(ELEMENT_CONFIGS).forEach(([elementKey, elementConfig]) => {
        config[device][grid][elementKey] = {};
        elementConfig.properties.forEach(prop => {
          const defaults = elementConfig.defaults[prop];
          if (defaults) {
            config[device][grid][elementKey][prop] = { ...defaults };
          }
        });
      });
    });
  });

  return config;
};

export const useGridConfig = () => {
  const [config, setConfig] = useState(initializeConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load config from server
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/grid-config');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(prev => ({ ...prev, ...data.config }));
        }
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      // Use defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save config to server
  const saveConfig = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/grid-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const result = await response.json();
      setHasUnsavedChanges(false);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  // Update a specific element property
  const updateElementConfig = useCallback((device, grid, element, property, value) => {
    setConfig(prev => ({
      ...prev,
      [device]: {
        ...prev[device],
        [grid]: {
          ...prev[device][grid],
          [element]: {
            ...prev[device][grid][element],
            [property]: value
          }
        }
      }
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Get config for specific element
  const getElementConfig = useCallback((device, grid, element, property) => {
    return config[device]?.[grid]?.[element]?.[property] || null;
  }, [config]);

  // Reset element to defaults
  const resetElement = useCallback((device, grid, element) => {
    const elementConfig = ELEMENT_CONFIGS[element];
    if (!elementConfig) return;

    const defaults = {};
    elementConfig.properties.forEach(prop => {
      if (elementConfig.defaults[prop]) {
        defaults[prop] = { ...elementConfig.defaults[prop] };
      }
    });

    setConfig(prev => ({
      ...prev,
      [device]: {
        ...prev[device],
        [grid]: {
          ...prev[device][grid],
          [element]: defaults
        }
      }
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Reset all to defaults
  const resetAll = useCallback(() => {
    setConfig(initializeConfig());
    setHasUnsavedChanges(true);
  }, []);

  // Load on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    updateElementConfig,
    getElementConfig,
    resetElement,
    resetAll,
    saveConfig,
    loadConfig
  };
};

export default useGridConfig;
