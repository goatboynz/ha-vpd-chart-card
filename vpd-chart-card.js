class VPDChartCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.zoomLevel = 1;
    this.minZoom = 1;
    this.maxZoom = 3;
    this.isPanning = false;
  }

  setConfig(config) {
    if (!config.temperature_sensor) {
      throw new Error('Please define temperature_sensor');
    }
    if (!config.humidity_sensor) {
      throw new Error('Please define humidity_sensor');
    }
    
    this.config = {
      ...config,
      min_temperature: config.min_temperature || 15,
      max_temperature: config.max_temperature || 35,
      min_humidity: config.min_humidity || 30,
      max_humidity: config.max_humidity || 90,
      leaf_temperature_offset: config.leaf_temperature_offset || 2,
      growth_stage: config.growth_stage || 'vegetative',
      enable_crosshair: config.enable_crosshair !== false,
      enable_zoom: config.enable_zoom !== false,
      title: config.title || 'VPD Chart'
    };
    
    this.vpd_phases = config.vpd_phases || [
      { upper: 0, className: 'gray-danger-zone', color: '#999999' },
      { lower: 0, upper: 0.4, className: 'under-transpiration', color: '#1a6c9c' },
      { lower: 0.4, upper: 0.8, className: 'early-veg', color: '#22ab9c' },
      { lower: 0.8, upper: 1.2, className: 'late-veg', color: '#9cc55b' },
      { lower: 1.2, upper: 1.6, className: 'mid-late-flower', color: '#e7c12b' },
      { lower: 1.6, className: 'danger-zone', color: '#ce4234' }
    ];
    
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.updateCard();
  }

  calculateVPD(Tleaf, Tair, RH, unit = '°C') {
    // Convert Fahrenheit to Celsius if needed
    if (unit === '°F' || unit === 'F') {
      Tleaf = (Tleaf - 32) * 5 / 9;
      Tair = (Tair - 32) * 5 / 9;
    }
    
    // Saturation vapor pressure at leaf temperature (kPa)
    const VPleaf = 610.7 * Math.exp(17.27 * Tleaf / (Tleaf + 237.3)) / 1000;
    
    // Actual vapor pressure at air temperature (kPa)
    const VPair = 610.7 * Math.exp(17.27 * Tair / (Tair + 237.3)) / 1000 * RH / 100;
    
    return Math.max(0, VPleaf - VPair);
  }

  getPhaseClass(vpd) {
    for (const phase of this.vpd_phases) {
      if (phase.upper === undefined) {
        if (vpd >= phase.lower) {
          return phase.className;
        }
      } else if (vpd <= phase.upper && (!phase.lower || vpd >= phase.lower)) {
        return phase.className;
      }
    }
    return '';
  }

  getColorForVpd(vpd) {
    const className = this.getPhaseClass(vpd);
    for (const phase of this.vpd_phases) {
      if (phase.className === className) {
        return phase.color;
      }
    }
    return '#999999';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 0;
          overflow: hidden;
          background: var(--card-background-color);
        }
        .card-header {
          font-size: 20px;
          font-weight: 500;
          padding: 16px;
          color: var(--primary-text-color);
        }
        .vpd-container {
          position: relative;
          width: 100%;
          padding: 16px;
          overflow: hidden;
          cursor: crosshair;
        }
        .vpd-container:active {
          cursor: grabbing !important;
        }
        canvas {
          width: 100%;
          height: 300px;
          display: block;
        }
        .crosshair {
          position: absolute;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.1s;
        }
        .crosshair.show {
          opacity: 1;
        }
        .horizontal-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.5);
        }
        .vertical-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(255, 255, 255, 0.5);
        }
        .tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 1000;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transform: translate(-50%, -100%);
          margin-top: -10px;
        }
        .tooltip.show {
          opacity: 1;
        }
        .tooltip-line {
          margin: 2px 0;
        }
        .vpd-values {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: 0 16px 16px 16px;
        }
        .vpd-box {
          padding: 16px 20px;
          border-radius: 12px;
          text-align: center;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .vpd-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          pointer-events: none;
        }
        .vpd-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        .vpd-label {
          font-size: 10px;
          opacity: 0.95;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
        }
        .vpd-number {
          font-size: 32px;
          font-weight: 800;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .vpd-unit {
          font-size: 16px;
          opacity: 0.9;
          margin-left: 3px;
          font-weight: 600;
        }
      </style>
      <ha-card>
        <div class="card-header">${this.config.title}</div>
        <div class="vpd-container" id="vpd-container">
          <canvas id="vpd-canvas"></canvas>
          <div class="crosshair horizontal-line" id="h-line"></div>
          <div class="crosshair vertical-line" id="v-line"></div>
          <div class="tooltip" id="tooltip"></div>
        </div>
        <div class="vpd-values">
          <div class="vpd-box" id="leaf-vpd-box">
            <div class="vpd-label">Leaf VPD</div>
            <div class="vpd-number" id="leaf-vpd-value">--</div>
          </div>
          <div class="vpd-box" id="room-vpd-box">
            <div class="vpd-label">Room VPD</div>
            <div class="vpd-number" id="room-vpd-value">--</div>
          </div>
        </div>
      </ha-card>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const container = this.shadowRoot.getElementById('vpd-container');
    const canvas = this.shadowRoot.getElementById('vpd-canvas');
    
    if (this.config.enable_crosshair) {
      container.addEventListener('mousemove', this.handleMouseMove.bind(this));
      container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    }
    
    if (this.config.enable_zoom) {
      container.addEventListener('wheel', this.handleZoom.bind(this), { passive: false });
      container.addEventListener('mousedown', this.handleMouseDown.bind(this));
      container.addEventListener('mouseup', this.handleMouseUp.bind(this));
      container.addEventListener('auxclick', (e) => {
        if (e.button === 1) { // Middle mouse button resets zoom
          this.zoomLevel = 1;
          canvas.style.transform = `scale(${this.zoomLevel})`;
        }
      });
    }
  }

  handleMouseMove(e) {
    const container = this.shadowRoot.getElementById('vpd-container');
    const canvas = this.shadowRoot.getElementById('vpd-canvas');
    const tooltip = this.shadowRoot.getElementById('tooltip');
    const hLine = this.shadowRoot.getElementById('h-line');
    const vLine = this.shadowRoot.getElementById('v-line');
    
    if (this.isPanning) {
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      canvas.style.transform = `scale(${this.zoomLevel}) translate(${(this.startLeft + dx) / this.zoomLevel}px, ${(this.startTop + dy) / this.zoomLevel}px)`;
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Show crosshair
    if (this.config.enable_crosshair) {
      hLine.style.top = `${e.clientY - container.getBoundingClientRect().top}px`;
      vLine.style.left = `${e.clientX - container.getBoundingClientRect().left}px`;
      hLine.classList.add('show');
      vLine.classList.add('show');
    }
    
    // Calculate temperature and humidity from mouse position
    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    if (x < padding || x > canvas.width - padding || y < padding || y > canvas.height - padding) {
      tooltip.classList.remove('show');
      return;
    }
    
    const tempRange = this.config.max_temperature - this.config.min_temperature;
    const humidityRange = this.config.max_humidity - this.config.min_humidity;
    
    const temperature = this.config.min_temperature + ((y - padding) / chartHeight) * tempRange;
    const humidity = this.config.max_humidity - ((x - padding) / chartWidth) * humidityRange;
    
    // Get actual air temperature from sensor
    if (!this._hass) return;
    const tempEntity = this._hass.states[this.config.temperature_sensor];
    if (!tempEntity) return;
    
    let airTemp = parseFloat(tempEntity.state);
    const unit = tempEntity.attributes.unit_of_measurement || '°C';
    
    // Calculate leaf temperature
    const leafTemp = temperature - this.config.leaf_temperature_offset;
    
    // Calculate VPD
    const vpd = this.calculateVPD(leafTemp, airTemp, humidity, unit);
    
    // Update tooltip
    tooltip.innerHTML = `
      <div class="tooltip-line"><strong>Air: ${temperature.toFixed(1)}°C</strong></div>
      <div class="tooltip-line">Leaf: ${leafTemp.toFixed(1)}°C</div>
      <div class="tooltip-line">RH: ${humidity.toFixed(0)}%</div>
      <div class="tooltip-line"><strong>VPD: ${vpd.toFixed(2)} kPa</strong></div>
    `;
    tooltip.style.left = `${e.clientX - container.getBoundingClientRect().left}px`;
    tooltip.style.top = `${e.clientY - container.getBoundingClientRect().top}px`;
    tooltip.classList.add('show');
  }

  handleMouseLeave() {
    const tooltip = this.shadowRoot.getElementById('tooltip');
    const hLine = this.shadowRoot.getElementById('h-line');
    const vLine = this.shadowRoot.getElementById('v-line');
    
    tooltip.classList.remove('show');
    hLine.classList.remove('show');
    vLine.classList.remove('show');
  }

  handleZoom(e) {
    e.preventDefault();
    const canvas = this.shadowRoot.getElementById('vpd-canvas');
    const zoomDirection = e.deltaY > 0 ? -0.1 : 0.1;
    
    let newZoomLevel = this.zoomLevel + zoomDirection;
    newZoomLevel = Math.min(Math.max(newZoomLevel, this.minZoom), this.maxZoom);
    newZoomLevel = Math.round(newZoomLevel * 100) / 100;
    
    if (newZoomLevel !== this.zoomLevel) {
      this.zoomLevel = newZoomLevel;
      canvas.style.transform = `scale(${this.zoomLevel})`;
    }
  }

  handleMouseDown(e) {
    this.isPanning = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    const canvas = this.shadowRoot.getElementById('vpd-canvas');
    const computedStyle = window.getComputedStyle(canvas);
    const matrix = new DOMMatrix(computedStyle.transform);
    
    this.startLeft = matrix.m41;
    this.startTop = matrix.m42;
    
    e.preventDefault();
  }

  handleMouseUp() {
    this.isPanning = false;
  }

  updateCard() {
    if (!this._hass) return;

    const tempEntity = this._hass.states[this.config.temperature_sensor];
    const humidityEntity = this._hass.states[this.config.humidity_sensor];

    if (!tempEntity || !humidityEntity) return;

    let airTemp = parseFloat(tempEntity.state);
    const humidity = parseFloat(humidityEntity.state);
    const unit = tempEntity.attributes.unit_of_measurement || '°C';

    // Get leaf temperature
    let leafTemp;
    if (this.config.leaf_temperature_sensor) {
      const leafTempEntity = this._hass.states[this.config.leaf_temperature_sensor];
      leafTemp = leafTempEntity ? parseFloat(leafTempEntity.state) : airTemp - this.config.leaf_temperature_offset;
    } else {
      leafTemp = airTemp - this.config.leaf_temperature_offset;
    }

    // Calculate VPDs
    const leafVPD = this.calculateVPD(leafTemp, airTemp, humidity, unit);
    const roomVPD = this.calculateVPD(airTemp, airTemp, humidity, unit);

    // Update display
    this.updateValues(leafVPD, roomVPD);
    this.drawVPDChart(airTemp, humidity, leafTemp);
  }

  updateValues(leafVPD, roomVPD) {
    const leafBox = this.shadowRoot.getElementById('leaf-vpd-box');
    const roomBox = this.shadowRoot.getElementById('room-vpd-box');
    
    // Set colors based on VPD value
    leafBox.style.background = this.getColorForVpd(leafVPD);
    roomBox.style.background = this.getColorForVpd(roomVPD);
    
    this.shadowRoot.getElementById('leaf-vpd-value').innerHTML = 
      `${leafVPD.toFixed(2)}<span class="vpd-unit">kPa</span>`;
    this.shadowRoot.getElementById('room-vpd-value').innerHTML = 
      `${roomVPD.toFixed(2)}<span class="vpd-unit">kPa</span>`;
  }

  drawVPDChart(currentTemp, currentHumidity, leafTemp) {
    const canvas = this.shadowRoot.getElementById('vpd-canvas');
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 600 * dpr;
    canvas.height = 300 * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    const width = 600;
    const height = 300;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // Draw VPD zones
    this.drawVPDZones(ctx, padding, chartWidth, chartHeight);
    
    // Draw grid
    this.drawGrid(ctx, padding, chartWidth, chartHeight);
    
    // Draw current point
    this.drawCurrentPoint(ctx, padding, chartWidth, chartHeight, currentTemp, currentHumidity);
    
    // Draw axes labels
    this.drawAxes(ctx, width, height, padding);
  }

  drawVPDZones(ctx, padding, chartWidth, chartHeight) {
    const resolution = 50;
    const tempRange = this.config.max_temperature - this.config.min_temperature;
    const humidityRange = this.config.max_humidity - this.config.min_humidity;

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const airTemp = this.config.min_temperature + (i / resolution) * tempRange;
        const humidity = this.config.max_humidity - (j / resolution) * humidityRange;
        const leafTemp = airTemp - this.config.leaf_temperature_offset;
        
        const vpd = this.calculateVPD(leafTemp, airTemp, humidity);
        const color = this.getColorForVpd(vpd);

        const x = padding + (i / resolution) * chartWidth;
        const y = padding + (j / resolution) * chartHeight;
        const cellWidth = chartWidth / resolution;
        const cellHeight = chartHeight / resolution;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellWidth, cellHeight);
      }
    }
  }

  drawGrid(ctx, padding, chartWidth, chartHeight) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#666';

    // Vertical lines (temperature)
    const tempStep = 5;
    for (let temp = this.config.min_temperature; temp <= this.config.max_temperature; temp += tempStep) {
      const x = padding + ((temp - this.config.min_temperature) / (this.config.max_temperature - this.config.min_temperature)) * chartWidth;
      
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(`${temp}°`, x, padding + chartHeight + 20);
    }

    // Horizontal lines (humidity)
    const humidityStep = 10;
    for (let humidity = this.config.min_humidity; humidity <= this.config.max_humidity; humidity += humidityStep) {
      const y = padding + chartHeight - ((humidity - this.config.min_humidity) / (this.config.max_humidity - this.config.min_humidity)) * chartHeight;
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillText(`${humidity}%`, padding - 10, y + 4);
    }
  }

  drawCurrentPoint(ctx, padding, chartWidth, chartHeight, temp, humidity) {
    const x = padding + ((temp - this.config.min_temperature) / (this.config.max_temperature - this.config.min_temperature)) * chartWidth;
    const y = padding + chartHeight - ((humidity - this.config.min_humidity) / (this.config.max_humidity - this.config.min_humidity)) * chartHeight;

    // Draw crosshair lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + chartWidth, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, padding + chartHeight);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw point
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#FF4081';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawAxes(ctx, width, height, padding) {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';

    // X-axis label
    ctx.fillText('Air Temperature (°C)', width / 2, height - 5);

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Relative Humidity (%)', 0, 0);
    ctx.restore();
  }

  getCardSize() {
    return 6;
  }

  static getStubConfig() {
    return {
      temperature_sensor: 'sensor.temperature',
      humidity_sensor: 'sensor.humidity',
      leaf_temperature_offset: 2,
      growth_stage: 'vegetative',
      title: 'VPD Chart'
    };
  }
}

customElements.define('vpd-chart-card', VPDChartCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'vpd-chart-card',
  name: 'VPD Chart Card',
  description: 'Vapor Pressure Deficit chart for optimal plant growth'
});
