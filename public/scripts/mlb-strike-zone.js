/**
 * MLB Strike Zone Visualizer
 * ESPN-style pitch tracking with SVG animations
 */

class MLBStrikeZone {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      width: options.width || 400,
      height: options.height || 500,
      teamColors: options.teamColors || { home: '#FF6B00', away: '#00A8E8' },
      ...options
    };

    this.pitches = [];
    this.currentPitchIndex = 0;
    this.svg = null;
    this.strikeZoneGroup = null;

    // MLB strike zone dimensions (in inches, converted to pixels)
    this.PLATE_WIDTH = 17; // inches
    this.STRIKE_ZONE_TOP = 3.5; // feet from ground
    this.STRIKE_ZONE_BOTTOM = 1.6; // feet from ground

    this.init();
  }

  init() {
    this.createSVG();
    this.drawStrikeZone();
    this.drawHomePlate();
  }

  createSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${this.options.width} ${this.options.height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.overflow = 'visible';

    // Create defs for gradients and filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Glow filter for pitches
    const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    glowFilter.setAttribute('id', 'pitch-glow');
    glowFilter.innerHTML = `
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    `;
    defs.appendChild(glowFilter);

    // Radial gradient for strike zone
    const zoneGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    zoneGradient.setAttribute('id', 'zone-gradient');
    zoneGradient.innerHTML = `
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.05);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0);stop-opacity:1" />
    `;
    defs.appendChild(zoneGradient);

    svg.appendChild(defs);

    // Main group for strike zone
    this.strikeZoneGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.strikeZoneGroup.setAttribute('transform', `translate(${this.options.width / 2}, ${this.options.height / 2})`);
    svg.appendChild(this.strikeZoneGroup);

    this.container.innerHTML = '';
    this.container.appendChild(svg);
    this.svg = svg;
  }

  drawStrikeZone() {
    const zoneWidth = 140;
    const zoneHeight = 190;
    const x = -zoneWidth / 2;
    const y = -zoneHeight / 2;

    // Main strike zone box
    const zone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    zone.setAttribute('x', x);
    zone.setAttribute('y', y);
    zone.setAttribute('width', zoneWidth);
    zone.setAttribute('height', zoneHeight);
    zone.setAttribute('fill', 'rgba(255, 255, 255, 0.03)');
    zone.setAttribute('stroke', 'rgba(255, 255, 255, 0.22)');
    zone.setAttribute('stroke-width', 1.5);
    zone.setAttribute('rx', 2);
    zone.classList.add('strike-zone-box');
    this.strikeZoneGroup.appendChild(zone);

    // Grid lines (3x3) - ESPN style: light gray dashed
    for (let i = 1; i < 3; i++) {
      // Vertical lines
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', x + (zoneWidth / 3) * i);
      vLine.setAttribute('y1', y);
      vLine.setAttribute('x2', x + (zoneWidth / 3) * i);
      vLine.setAttribute('y2', y + zoneHeight);
      vLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
      vLine.setAttribute('stroke-width', 1);
      vLine.setAttribute('stroke-dasharray', '3 4');
      vLine.classList.add('zone-line');
      this.strikeZoneGroup.appendChild(vLine);

      // Horizontal lines
      const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hLine.setAttribute('x1', x);
      hLine.setAttribute('y1', y + (zoneHeight / 3) * i);
      hLine.setAttribute('x2', x + zoneWidth);
      hLine.setAttribute('y2', y + (zoneHeight / 3) * i);
      hLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
      hLine.setAttribute('stroke-width', 1);
      hLine.setAttribute('stroke-dasharray', '3 4');
      hLine.classList.add('zone-line');
      this.strikeZoneGroup.appendChild(hLine);
    }

    // Zone labels
    const zones = [
      { num: 1, x: x + zoneWidth / 6, y: y + zoneHeight / 6 },
      { num: 2, x: x + zoneWidth / 2, y: y + zoneHeight / 6 },
      { num: 3, x: x + zoneWidth * 5/6, y: y + zoneHeight / 6 },
      { num: 4, x: x + zoneWidth / 6, y: y + zoneHeight / 2 },
      { num: 5, x: x + zoneWidth / 2, y: y + zoneHeight / 2 },
      { num: 6, x: x + zoneWidth * 5/6, y: y + zoneHeight / 2 },
      { num: 7, x: x + zoneWidth / 6, y: y + zoneHeight * 5/6 },
      { num: 8, x: x + zoneWidth / 2, y: y + zoneHeight * 5/6 },
      { num: 9, x: x + zoneWidth * 5/6, y: y + zoneHeight * 5/6 }
    ];

    zones.forEach(zone => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', zone.x);
      text.setAttribute('y', zone.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', 'rgba(255, 255, 255, 0.13)');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '700');
      text.setAttribute('font-family', 'Roboto, sans-serif');
      text.classList.add('zone-number');
      text.textContent = zone.num;
      this.strikeZoneGroup.appendChild(text);
    });

    this.zoneBox = { x, y, width: zoneWidth, height: zoneHeight };
  }

  drawHomePlate() {
    const plateY = this.zoneBox.y + this.zoneBox.height + 16;

    // Home plate (pentagon) - ESPN style: orange outline
    const plate = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const plateWidth = 28;
    const plateHeight = 20;
    const d = `
      M ${-plateWidth/2} ${plateY}
      L ${plateWidth/2} ${plateY}
      L ${plateWidth/2} ${plateY + plateHeight - 10}
      L 0 ${plateY + plateHeight}
      L ${-plateWidth/2} ${plateY + plateHeight - 10}
      Z
    `;
    plate.setAttribute('d', d);
    plate.setAttribute('fill', 'none');
    plate.setAttribute('stroke', '#ff6b00');
    plate.setAttribute('stroke-width', 2.5);
    this.strikeZoneGroup.appendChild(plate);
  }

  getPitchColor(pitchType, callCode) {
    // Color by RESULT (call code), not pitch type — matches ESPN HitMap
    // B=Ball, C=Called Strike, S=Swinging Strike, F=Foul, T=Foul Tip,
    // X/D/E=In play, H=Hit by pitch
    if (callCode) {
      const resultColors = {
        'B': '#22c55e', // Ball — green
        'H': '#22c55e', // Hit by pitch — green
        'C': '#dd0000', // Called strike — red
        'S': '#dd0000', // Swinging strike — red
        'W': '#dd0000', // Swinging strikeout — red
        'O': '#dd0000', // Swinging bunt strikeout — red
        'Q': '#dd0000', // Swinging pitchout strikeout — red
        'F': '#f59e0b', // Foul — amber
        'T': '#f59e0b', // Foul tip — amber
        'L': '#f59e0b', // Foul bunt — amber
        'R': '#f59e0b', // Foul bunt out — amber
        'M': '#f59e0b', // Missed bunt — amber
        'X': '#3b82f6', // In play, out — blue
        'D': '#3b82f6', // In play, no out — blue
        'E': '#3b82f6', // In play, error — blue
      };
      if (resultColors[callCode]) return resultColors[callCode];
    }
    return '#6b7280'; // Unknown — gray
  }

  mapMLBCoordinatesToSVG(mlbX, mlbZ) {
    // MLB StatCast coordinates (from catcher's perspective):
    // pX: horizontal feet from plate center — negative = inside to RHB, positive = outside to RHB
    //     Half-plate = 0.708 ft (17"/2), display range ±1.5 ft to include balls off plate
    // pZ: height above ground in feet
    //     Strike zone top ~3.5 ft, bottom ~1.6 ft (varies by batter)
    //     Display range covers 0.5 ft below zone to 0.5 ft above for context

    // Horizontal mapping: plate center = SVG center
    // Display range: -1.5 (catcher's left = hitter's right/outside for LHB) to +1.5
    // ESPN catcher-view: pX negative = right side of display (inside to RHB)
    const pxMin = -1.5;
    const pxMax = 1.5;

    // Vertical mapping: bottom of display to top
    // Strike zone is roughly 1.6-3.5 ft, add 0.5 ft padding each side
    const pzMin = 1.1;   // bottom of display (slightly below zone bottom)
    const pzMax = 4.0;   // top of display (slightly above zone top)

    const pxRange = pxMax - pxMin;  // 3.0 ft
    const pzRange = pzMax - pzMin;  // 2.9 ft

    // Clamp to display range
    const clampedX = Math.max(pxMin - 0.3, Math.min(pxMax + 0.3, mlbX));
    const clampedZ = Math.max(pzMin - 0.3, Math.min(pzMax + 0.3, mlbZ));

    // pX: flip horizontally — ESPN shows catcher's perspective
    // negative pX (inside to RHB) = right side of display
    // positive pX (outside to RHB) = left side of display
    const svgX = this.zoneBox.x + ((pxMax - clampedX) / pxRange) * this.zoneBox.width;

    // pZ: flip vertically — higher pZ = higher on display = lower SVG Y
    const svgY = this.zoneBox.y + this.zoneBox.height - ((clampedZ - pzMin) / pzRange) * this.zoneBox.height;

    return { x: svgX, y: svgY };
  }

  addPitch(pitchData) {
    const { type, speed, result, coordinates, count, callCode } = pitchData;
    const { pX, pZ } = coordinates;

    const svgCoords = this.mapMLBCoordinatesToSVG(pX, pZ);
    const color = this.getPitchColor(type, callCode);
    const pitchNumber = this.pitches.length + 1;

    // Create pitch marker with animation
    const pitchGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    pitchGroup.setAttribute('class', 'pitch-marker');
    pitchGroup.setAttribute('opacity', '0');
    pitchGroup.style.transformBox = 'fill-box';
    pitchGroup.style.transformOrigin = 'center';

    // Outer ring (subtle border for ESPN style)
    const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerRing.setAttribute('cx', svgCoords.x);
    outerRing.setAttribute('cy', svgCoords.y);
    outerRing.setAttribute('r', 12);
    outerRing.setAttribute('fill', 'none');
    outerRing.setAttribute('stroke', color);
    outerRing.setAttribute('stroke-width', 1.5);
    outerRing.setAttribute('opacity', '0.4');
    pitchGroup.appendChild(outerRing);

    // Main pitch circle (ESPN style: solid fill with white border)
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', svgCoords.x);
    circle.setAttribute('cy', svgCoords.y);
    circle.setAttribute('r', 9);
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', 2);
    pitchGroup.appendChild(circle);

    // Pitch number (ESPN style: white bold number)
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', svgCoords.x);
    text.setAttribute('y', svgCoords.y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', 'Roboto, sans-serif');
    text.setAttribute('pointer-events', 'none');
    text.textContent = pitchNumber;
    pitchGroup.appendChild(text);

    this.strikeZoneGroup.appendChild(pitchGroup);

    // Animate in
    setTimeout(() => {
      pitchGroup.setAttribute('opacity', '1');
      pitchGroup.style.transition = 'opacity 0.4s ease-out';
    }, 50);

    this.pitches.push({ element: pitchGroup, data: pitchData });
  }

  clearPitches() {
    this.pitches.forEach(pitch => {
      pitch.element.remove();
    });
    this.pitches = [];
    this.currentPitchIndex = 0;
  }

  highlightPitch(index) {
    this.pitches.forEach((pitch, i) => {
      if (i === index) {
        pitch.element.style.opacity = '1';
        pitch.element.style.transform = 'scale(1.2)';
      } else {
        pitch.element.style.opacity = '0.4';
        pitch.element.style.transform = 'scale(1)';
      }
    });
  }

  resetHighlight() {
    this.pitches.forEach(pitch => {
      pitch.element.style.opacity = '1';
      pitch.element.style.transform = 'scale(1)';
    });
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLBStrikeZone;
}
