export const DEVICE_PRESETS = {
  mobile: {
    name: 'Mobile',
    width: 375,
    height: 667,
    icon: '📱'
  },
  tablet: {
    name: 'Tablet',
    width: 768,
    height: 1024,
    icon: '📱'
  },
  desktop: {
    name: 'Desktop',
    width: 1440,
    height: 900,
    icon: '🖥️'
  },
  tv: {
    name: 'TV',
    width: 1920,
    height: 1080,
    icon: '📺'
  }
};

export const ORIENTATIONS = {
  portrait: 'portrait',
  landscape: 'landscape'
};

export const getDeviceDimensions = (device, orientation) => {
  const preset = DEVICE_PRESETS[device];
  if (!preset) return { width: 1440, height: 900 };

  if (orientation === ORIENTATIONS.landscape && device !== 'desktop' && device !== 'tv') {
    return { width: preset.height, height: preset.width };
  }
  return { width: preset.width, height: preset.height };
};
