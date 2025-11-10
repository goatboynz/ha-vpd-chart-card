# VPD Chart Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)

A beautiful custom Lovelace card for visualizing Vapor Pressure Deficit (VPD) in Home Assistant. Perfect for indoor gardening, grow rooms, and optimizing plant growth conditions.

## ✨ Features

- 📊 **Interactive VPD chart** - Color-coded zones showing optimal growing conditions
- 🎯 **Real-time monitoring** - Live temperature, humidity, and VPD calculations
- 🌱 **Growth stage support** - Optimized ranges for seedling, vegetative, flowering, and late flower
- 🍃 **Leaf temperature** - Use sensor or offset for accurate VPD calculation
- ⚠️ **Smart alerts** - Automatic warnings when VPD is out of range
- 🎨 **Modern design** - Beautiful gradient UI with color-coded status
- 📱 **Fully responsive** - Works on all devices

## 📦 Installation

### Via HACS (Recommended)

1. Open **HACS** → **Frontend**
2. Click **⋮** menu → **Custom repositories**
3. Add repository URL
4. Category: **Lovelace**
5. Install and restart Home Assistant

### Manual Installation

1. Download `vpd-chart-card.js`
2. Copy to `config/www/`
3. Add as Lovelace resource
4. Restart Home Assistant

## 🎨 Configuration

### Basic Setup

```yaml
type: custom:vpd-chart-card
title: VPD Chart
temperature_sensor: sensor.grow_room_temperature
humidity_sensor: sensor.grow_room_humidity
leaf_temperature_offset: -2
growth_stage: vegetative
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `temperature_sensor` | string | **Yes** | - | Air temperature sensor entity |
| `humidity_sensor` | string | **Yes** | - | Relative humidity sensor entity |
| `leaf_temperature_sensor` | string | No | - | Leaf temperature sensor (optional) |
| `leaf_temperature_offset` | number | No | `-2` | Offset from air temp if no leaf sensor |
| `growth_stage` | string | No | `vegetative` | Plant growth stage |
| `title` | string | No | `VPD Chart` | Card title |

### Growth Stages

| Stage | Optimal VPD | Acceptable VPD |
|-------|-------------|----------------|
| `seedling` | 0.4 - 0.8 kPa | 0.2 - 1.0 kPa |
| `vegetative` | 0.8 - 1.2 kPa | 0.6 - 1.4 kPa |
| `flowering` | 1.0 - 1.5 kPa | 0.8 - 1.6 kPa |
| `late_flower` | 1.2 - 1.6 kPa | 1.0 - 1.8 kPa |

## 💡 Understanding VPD

**Vapor Pressure Deficit (VPD)** is the difference between the amount of moisture in the air and how much moisture the air can hold when saturated. It's a critical factor for plant growth.

### Why VPD Matters

- **Too Low (<0.4 kPa)**: Reduced transpiration, mold risk, nutrient uptake issues
- **Optimal (0.8-1.2 kPa)**: Maximum growth, healthy transpiration, efficient nutrient uptake
- **Too High (>1.6 kPa)**: Plant stress, excessive water loss, stunted growth

### Leaf Temperature

Leaf temperature is typically 2-4°C cooler than air temperature due to transpiration. You can:
- Use a **leaf temperature sensor** (most accurate)
- Set an **offset** from air temperature (typical: -2°C)

## 🎯 How to Use

### Reading the Chart

- **Blue zones**: VPD too low (increase temp or decrease humidity)
- **Green zones**: Optimal VPD range
- **Yellow zones**: Acceptable but not optimal
- **Red zones**: VPD too high (decrease temp or increase humidity)

### Current Point

The **pink dot** with crosshairs shows your current conditions. Hover over the chart to see VPD at any temperature/humidity combination.

### Status Indicator

- ✓ **Green**: Optimal VPD for your growth stage
- ~ **Yellow**: Acceptable but could be better
- ⚠ **Orange/Red**: Out of range - adjust conditions

## 🔧 Example Configurations

### With Leaf Temperature Sensor

```yaml
type: custom:vpd-chart-card
title: Grow Room VPD
temperature_sensor: sensor.grow_room_temperature
humidity_sensor: sensor.grow_room_humidity
leaf_temperature_sensor: sensor.leaf_temperature
growth_stage: flowering
```

### Seedling Stage

```yaml
type: custom:vpd-chart-card
title: Seedling VPD
temperature_sensor: sensor.propagation_temp
humidity_sensor: sensor.propagation_humidity
leaf_temperature_offset: -1.5
growth_stage: seedling
```

### Late Flowering

```yaml
type: custom:vpd-chart-card
title: Flowering VPD
temperature_sensor: sensor.flower_room_temp
humidity_sensor: sensor.flower_room_humidity
leaf_temperature_offset: -2.5
growth_stage: late_flower
```

## 📊 VPD Calculation

VPD is calculated using the formula:

```
VPD = SVP(leaf) - AVP
```

Where:
- **SVP(leaf)** = Saturation Vapor Pressure at leaf temperature
- **AVP** = Actual Vapor Pressure (based on air temp and RH)

The card uses the Magnus-Tetens formula for accurate calculations.

## 🌡️ Sensor Recommendations

### Temperature Sensors

- **DHT22** - Good accuracy (±0.5°C)
- **BME280** - Excellent accuracy (±1°C)
- **SHT31** - High precision (±0.3°C)
- **Inkbird IBS-TH1** - Bluetooth option

### Humidity Sensors

- **BME280** - Good (±3% RH)
- **SHT31** - Excellent (±2% RH)
- **DHT22** - Acceptable (±2-5% RH)

### Leaf Temperature

- **IR thermometer** - Non-contact measurement
- **Thermocouple** - Direct contact (most accurate)

## 🔧 Troubleshooting

### Chart not showing

- Verify sensors are publishing data
- Check entity IDs match exactly
- Clear browser cache (Ctrl+F5)

### Incorrect VPD values

- Verify temperature unit (°C vs °F)
- Check sensor calibration
- Ensure humidity sensor is accurate

### Status always shows warning

- Adjust `growth_stage` to match your plants
- Verify `leaf_temperature_offset` is appropriate
- Check if sensors need calibration

## 🤝 Contributing

Contributions welcome! Please submit Pull Requests.

## 📄 License

MIT License

## 🙏 Credits

- VPD calculations based on research from [Pulse Grow](https://pulsegrow.com/)
- Inspired by [VPDChart.com](https://vpdchart.com/)
- Built for the Home Assistant community

---

**Made with 🌱 for optimal plant growth**
