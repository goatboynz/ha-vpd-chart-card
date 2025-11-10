class VPDChartCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config.temperature_sensor) {
      throw new Error('Please define temperature_sensor');
    }
    if (!config.humidity_sensor) {
      throw new Error('Please define humidity_sensor');
    }
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.updateCard();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: 0;
          overflow: hidden;
          background: var(--card-background-color);
          border-radius: 12px;
        }
        .card-header {
          font-size: 22px;
          font-weight: 600;
          padding: 20px 20px 0 20px;
          color: var(--primary-text-color);
          letter-spacing: 0.3px;
        }
        .vpd-container {
          position: relative;
          width: 100%;
          padding: 20px;
          background: linear-gradient(180deg, 
            rgba(var(--rgb-primary-color, 33, 150, 243), 0.02) 0%, 
            transparent 100%);
        }
        canvas {
          width: 100%;
          height: 100%;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          background: var(--card-background-color);
        }

        .vpd-values {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 0 20px 20px 20px;
        }
        .vpd-box {
          padding: 14px;
          border-radius: 10px;
          text-align: center;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
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
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          pointer-events: none;
        }
        .vpd-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .vpd-label {
          font-size: 11px;
          opacity: 0.95;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-weight: 600;
        }
        .vpd-number {
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .value-box {
          background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
          padding: 12px;
          border-radius: 10px;
          text-align: center;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }
        .value-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          pointer-events: none;
        }
        .value-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .value-label {
          font-size: 10px;
          opacity: 0.95;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-weight: 600;
        }
        .value-number {
          font-size: 24px;
          font-weight: 700;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .value-unit {
          font-size: 14px;
          opacity: 0.85;
          margin-left: 2px;
          font-weight: 500;
        }

        .tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 1000;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .tooltip.show {
          opacity: 1;
        }

      </style>
      <ha-card>
        <div class="card-header">${this.config.title || 'VPD Chart'}</div>
        <div class="vpd-container" id="vpd-container">
          <canvas id="vpd-canvas" width="600" height="400"></canvas>
          <div class="tooltip" id="tooltip"></div>
        </div>
        <div class="vpd-values">
          <div class="vpd-box" style="background: linear-gradient(135deg, #FFD93D, #F6C90E);">
            <div class="vpd-label">Leaf VPD</div>
            <div class="vpd-number" id="leaf-vpd-value">--</div>
          </div>
          <div class="vpd-box" style="background: linear-gradient(135deg, #FF9F43, #EE5A24);">
            <div class="vpd-label">Room VPD</div>
            <div class="vpd-number" id="room-vpd-value">--</div>
          </div>
        </div>
      </ha-card>
    `;
    
    setTimeout(() => this.setupInteraction(), 0);
  }

  drawHistoryGraph() {
    const canvas = this.shadowRoot.getElementById('history-canvas');
    if (!canvas || !this._history || this._history.length < 2) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // Get data ranges
    const temps = this._history.map(h => h.airTemp);
    const humidities = this._history.map(h => h.humidity);
    const vpds = this._history.map(h => h.vpd);
    
    const tempMin = Math.min(...temps) - 2;
    const tempMax = Math.max(...temps) + 2;
    const humidityMin = Math.min(...humidities) - 5;
    const humidityMax = Math.max(...humidities) + 5;
    const vpdMin = 0;
    const vpdMax = Math.max(...vpds) + 0.5;

    const now = Date.now();
    const timeRange = 24 * 60 * 60 * 1000; // 24 hours

    // Draw grid
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw VPD line
    ctx.beginPath();
    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 2;
    this._history.forEach((point, i) => {
      const x = padding + ((point.timestamp - (now - timeRange)) / timeRange) * chartWidth;
      const y = padding + chartHeight - ((point.vpd - vpdMin) / (vpdMax - vpdMin)) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw temperature line
    ctx.beginPath();
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    this._history.forEach((point, i) => {
      const x = padding + ((point.timestamp - (now - timeRange)) / timeRange) * chartWidth;
      const y = padding + chartHeight - ((point.airTemp - tempMin) / (tempMax - tempMin)) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw humidity line
    ctx.beginPath();
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 2;
    this._history.forEach((point, i) => {
      const x = padding + ((point.timestamp - (now - timeRange)) / timeRange) * chartWidth;
      const y = padding + chartHeight - ((point.humidity - humidityMin) / (humidityMax - humidityMin)) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw time labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i / 4) * chartWidth;
      const hoursAgo = 24 - (i * 6);
      ctx.fillText(`${hoursAgo}h`, x, height - 5);
    }
  }

  updateCard() {
    if (!this._hass) return;

    const tempEntity = this._hass.states[this.config.temperature_sensor];
    const humidityEntity = this._hass.states[this.config.humidity_sensor];
    
    if (!tempEntity || !humidityEntity) return;

    let airTemp = parseFloat(tempEntity.state);
    const humidity = parseFloat(humidityEntity.state);
    
    // Convert Fahrenheit to Celsius if needed
    const isFahrenheit = this._hass.config.unit_system.temperature === '°F';
    if (isFahrenheit) {
      airTemp = (airTemp - 32) * 5/9;
    }
    
    // Get leaf temperature
    let leafTemp;
    if (this.config.leaf_temperature_sensor) {
      const leafTempEntity = this._hass.states[this.config.leaf_temperature_sensor];
      let leafTempRaw = leafTempEntity ? parseFloat(leafTempEntity.state) : airTemp - 2;
      leafTemp = isFahrenheit ? (leafTempRaw - 32) * 5/9 : leafTempRaw;
    } else {
      const offset = this.config.leaf_temperature_offset || -2;
      leafTemp = airTemp + offset;
    }

    // Calculate VPD
    const vpd = this.calculateVPD(airTemp, humidity, leafTemp);

    // Update display
    this.updateValues(airTemp, humidity, leafTemp, vpd, isFahrenheit);
    this.drawVPDChart(airTemp, humidity, leafTemp, vpd);
  }



  calculateVPD(airTemp, humidity, leafTemp) {
    // This is the correct VPD calculation
    // VPD = SVP(leaf) - AVP(air)
    
    // Saturation vapor pressure at air temperature (kPa)
    const svpAir = 0.61078 * Math.exp((17.27 * airTemp) / (airTemp + 237.3));
    
    // Saturation vapor pressure at leaf temperature (kPa)
    const svpLeaf = 0.61078 * Math.exp((17.27 * leafTemp) / (leafTemp + 237.3));
    
    // Actual vapor pressure based on air temp and humidity (kPa)
    const avp = svpAir * (humidity / 100);
    
    // VPD is the difference between leaf SVP and actual air VP
    const vpd = svpLeaf - avp;
    
    return Math.max(0, vpd);
  }

  calculateVPDFromLeaf(leafTemp, humidity) {
    // Simplified VPD calculation when we only have leaf temp
    // Assumes air temp is slightly higher than leaf temp
    const estimatedAirTemp = leafTemp + 2;
    return this.calculateVPD(estimatedAirTemp, humidity, leafTemp);
  }

  updateValues(airTemp, humidity, leafTemp, leafVPD, isFahrenheit) {
    // Calculate Room VPD (air temp to air temp)
    const roomVPD = this.calculateVPD(airTemp, humidity, airTemp);
    
    // Leaf VPD (the correct one for plants!)
    this.shadowRoot.getElementById('leaf-vpd-value').innerHTML = 
      `${leafVPD.toFixed(2)}<span class="value-unit">kPa</span>`;
    
    // Room VPD (for reference)
    this.shadowRoot.getElementById('room-vpd-value').innerHTML = 
      `${roomVPD.toFixed(2)}<span class="value-unit">kPa</span>`;
  }

  updateStatus(vpd, stage) {
    const statusEl = this.shadowRoot.getElementById('vpd-status');
    
    // VPD ranges based on growth stage
    const ranges = {
      seedling: { optimal: [0.4, 0.8], acceptable: [0.2, 1.0] },
      vegetative: { optimal: [0.8, 1.2], acceptable: [0.6, 1.4] },
      flowering: { optimal: [1.0, 1.5], acceptable: [0.8, 1.6] },
      late_flower: { optimal: [1.2, 1.6], acceptable: [1.0, 1.8] }
    };
    
    const range = ranges[stage] || ranges.vegetative;
    
    let status, message;
    if (vpd >= range.optimal[0] && vpd <= range.optimal[1]) {
      status = 'optimal';
      message = `✓ Optimal VPD for ${stage.replace('_', ' ')}`;
    } else if (vpd >= range.acceptable[0] && vpd <= range.acceptable[1]) {
      status = 'acceptable';
      message = `~ Acceptable VPD for ${stage.replace('_', ' ')}`;
    } else if (vpd < range.acceptable[0]) {
      status = 'warning';
      message = `⚠ VPD too low - Increase temperature or decrease humidity`;
    } else {
      status = 'danger';
      message = `⚠ VPD too high - Decrease temperature or increase humidity`;
    }
    
    statusEl.className = `vpd-status ${status}`;
    statusEl.textContent = message;
  }

  drawVPDChart(currentTemp, currentHumidity, leafTemp, currentVPD) {
    const canvas = this.shadowRoot.getElementById('vpd-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // LEAF Temperature range (not air temp!) - this is what matters for VPD
    const leafTempMin = 13; // Leaf temp is typically 2-4°C cooler
    const leafTempMax = 33;
    const humidityMin = 30;
    const humidityMax = 90;

    // Draw VPD zones based on LEAF temperature
    this.drawVPDZones(ctx, padding, chartWidth, chartHeight, leafTempMin, leafTempMax, humidityMin, humidityMax);

    // Draw grid lines
    this.drawGrid(ctx, padding, chartWidth, chartHeight, leafTempMin, leafTempMax, humidityMin, humidityMax, true);

    // Draw current point using LEAF temperature
    this.drawCurrentPoint(ctx, padding, chartWidth, chartHeight, leafTemp, currentHumidity, leafTempMin, leafTempMax, humidityMin, humidityMax);

    // Draw axes labels
    this.drawAxes(ctx, width, height, padding, true);
  }

  drawVPDZones(ctx, padding, chartWidth, chartHeight, leafTempMin, leafTempMax, humidityMin, humidityMax) {
    // Calculate VPD for each point and color accordingly
    const resolution = 30; // Higher resolution for smoother gradients
    
    const stage = this.config.growth_stage || 'vegetative';
    const ranges = {
      seedling: { optimal: [0.4, 0.8], acceptable: [0.2, 1.0] },
      vegetative: { optimal: [0.8, 1.2], acceptable: [0.6, 1.4] },
      flowering: { optimal: [1.0, 1.5], acceptable: [0.8, 1.6] },
      late_flower: { optimal: [1.2, 1.6], acceptable: [1.0, 1.8] }
    };
    const range = ranges[stage] || ranges.vegetative;
    
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const leafTemp = leafTempMin + (i / resolution) * (leafTempMax - leafTempMin);
        const humidity = humidityMin + (j / resolution) * (humidityMax - humidityMin);
        
        // Calculate VPD correctly: need air temp estimate
        const airTemp = leafTemp + 2; // Estimate air temp from leaf temp
        const vpd = this.calculateVPD(airTemp, humidity, leafTemp);
        
        const x = padding + (leafTemp - leafTempMin) / (leafTempMax - leafTempMin) * chartWidth;
        const y = padding + chartHeight - (humidity - humidityMin) / (humidityMax - humidityMin) * chartHeight;
        const cellWidth = chartWidth / resolution;
        const cellHeight = chartHeight / resolution;
        
        // Color based on VPD value and growth stage
        let color;
        if (vpd < range.acceptable[0]) {
          // Too low - Blue
          const intensity = Math.max(0.2, 1 - (range.acceptable[0] - vpd) / range.acceptable[0]);
          color = `rgba(33, 150, 243, ${intensity * 0.4})`;
        } else if (vpd < range.optimal[0]) {
          // Low acceptable - Light green
          color = 'rgba(139, 195, 74, 0.35)';
        } else if (vpd >= range.optimal[0] && vpd <= range.optimal[1]) {
          // Optimal - Bright green
          color = 'rgba(76, 175, 80, 0.5)';
        } else if (vpd <= range.acceptable[1]) {
          // High acceptable - Yellow
          color = 'rgba(255, 235, 59, 0.35)';
        } else {
          // Too high - Red
          const intensity = Math.min(1, (vpd - range.acceptable[1]) / 0.5);
          color = `rgba(244, 67, 54, ${0.25 + intensity * 0.25})`;
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y - cellHeight, cellWidth, cellHeight);
      }
    }
  }

  drawGrid(ctx, padding, chartWidth, chartHeight, tempMin, tempMax, humidityMin, humidityMax, isLeafTemp = false) {
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
    ctx.lineWidth = 1;

    // Vertical lines (temperature)
    for (let temp = tempMin; temp <= tempMax; temp += 5) {
      const x = padding + (temp - tempMin) / (tempMax - tempMin) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${temp}°`, x, padding + chartHeight + 20);
    }

    // Horizontal lines (humidity)
    for (let humidity = humidityMin; humidity <= humidityMax; humidity += 10) {
      const y = padding + chartHeight - (humidity - humidityMin) / (humidityMax - humidityMin) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${humidity}%`, padding - 10, y + 4);
    }
  }

  drawCurrentPoint(ctx, padding, chartWidth, chartHeight, temp, humidity, tempMin, tempMax, humidityMin, humidityMax) {
    const x = padding + (temp - tempMin) / (tempMax - tempMin) * chartWidth;
    const y = padding + chartHeight - (humidity - humidityMin) / (humidityMax - humidityMin) * chartHeight;

    // Draw crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
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
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#FF4081';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  drawAxes(ctx, width, height, padding, isLeafTemp = false) {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    
    // X-axis label - now shows LEAF temperature
    ctx.fillText('Leaf Temperature (°C)', width / 2, height - 10);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Relative Humidity (%)', 0, 0);
    ctx.restore();
  }

  setupInteraction() {
    const canvas = this.shadowRoot.getElementById('vpd-canvas');
    const tooltip = this.shadowRoot.getElementById('tooltip');
    
    if (!canvas || !tooltip) return;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate temp and humidity from position
      const padding = 60;
      const chartWidth = canvas.width - padding * 2;
      const chartHeight = canvas.height - padding * 2;
      
      if (x < padding || x > canvas.width - padding || y < padding || y > canvas.height - padding) {
        tooltip.classList.remove('show');
        return;
      }
      
      // Use LEAF temperature range (same as chart)
      const leafTempMin = 13;
      const leafTempMax = 33;
      const humidityMin = 30;
      const humidityMax = 90;
      
      const leafTemp = leafTempMin + (x - padding) / chartWidth * (leafTempMax - leafTempMin);
      const humidity = humidityMax - (y - padding) / chartHeight * (humidityMax - humidityMin);
      
      // Get actual current air temperature from sensor
      if (!this._hass) return;
      const tempEntity = this._hass.states[this.config.temperature_sensor];
      if (!tempEntity) return;
      
      let airTemp = parseFloat(tempEntity.state);
      const isFahrenheit = this._hass.config.unit_system.temperature === '°F';
      if (isFahrenheit) {
        airTemp = (airTemp - 32) * 5/9;
      }
      
      // Calculate VPD using actual air temp and the hovered leaf temp
      const vpd = this.calculateVPD(airTemp, humidity, leafTemp);
      
      tooltip.innerHTML = `
        <strong>Leaf: ${leafTemp.toFixed(1)}°C, RH: ${humidity.toFixed(0)}%</strong><br>
        Leaf VPD: ${vpd.toFixed(2)} kPa
      `;
      tooltip.style.left = `${e.clientX - rect.left + 15}px`;
      tooltip.style.top = `${e.clientY - rect.top - 40}px`;
      tooltip.classList.add('show');
    });

    canvas.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });
  }

  getCardSize() {
    return 6;
  }

  static getStubConfig() {
    return {
      temperature_sensor: 'sensor.temperature',
      humidity_sensor: 'sensor.humidity',
      leaf_temperature_offset: -2,
      growth_stage: 'vegetative',
      show_history: true,
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
