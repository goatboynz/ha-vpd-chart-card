# VPD Chart Card - Setup Guide

## Quick Start

### 1. Install via HACS

1. Open HACS → Frontend
2. Click ⋮ → Custom repositories
3. Add: `https://github.com/YOUR-USERNAME/vpd-chart-card`
4. Category: Lovelace
5. Install and restart

### 2. Add to Dashboard

```yaml
type: custom:vpd-chart-card
title: VPD Monitor
temperature_sensor: sensor.grow_room_temperature
humidity_sensor: sensor.grow_room_humidity
leaf_temperature_offset: -2
growth_stage: vegetative
show_history: true
```

### 3. Configure Growth Stage

Change `growth_stage` as your plants grow:

- `seedling` - Young plants, clones, seedlings
- `vegetative` - Vegetative growth phase
- `flowering` - Early to mid flowering
- `late_flower` - Late flowering, harvest prep

## Sensor Setup

### Temperature Sensor

Any Home Assistant temperature sensor works:

**ESPHome Example:**
```yaml
sensor:
  - platform: dht
    pin: GPIO4
    temperature:
      name: "Grow Room Temperature"
    humidity:
      name: "Grow Room Humidity"
    update_interval: 30s
```

**Zigbee Example:**
- Aqara Temperature Sensor
- Sonoff SNZB-02
- Tuya Temperature/Humidity Sensor

### Leaf Temperature (Optional)

**Option 1: Use Offset (Recommended for beginners)**
```yaml
leaf_temperature_offset: -2  # Leaf is typically 2°C cooler
```

**Option 2: IR Thermometer Sensor**
```yaml
leaf_temperature_sensor: sensor.leaf_ir_temperature
```

**Option 3: Thermocouple**
```yaml
sensor:
  - platform: max6675
    name: "Leaf Temperature"
    cs_pin: GPIO15
    update_interval: 5s
```

## Understanding the Chart

### Color Zones

- **Dark Blue**: VPD too low - Risk of mold, poor transpiration
- **Light Green**: Acceptable but not optimal
- **Bright Green**: Optimal VPD - Maximum growth
- **Yellow**: Acceptable but getting high
- **Red**: VPD too high - Plant stress, excessive water loss

### Current Point

The **pink dot** shows your current conditions. Aim to keep it in the green zone!

### History Graph

Shows last 24 hours of:
- Temperature (red line)
- Humidity (teal line)
- VPD (yellow line)

## Optimization Tips

### VPD Too Low (Blue Zone)

**Solutions:**
1. Increase temperature
2. Decrease humidity (dehumidifier)
3. Improve air circulation

### VPD Too High (Red Zone)

**Solutions:**
1. Decrease temperature (AC, exhaust fans)
2. Increase humidity (humidifier, wet towels)
3. Reduce light intensity

### Maintaining Optimal VPD

**Seedling Stage (0.4-0.8 kPa):**
- Temperature: 20-25°C (68-77°F)
- Humidity: 65-75%

**Vegetative Stage (0.8-1.2 kPa):**
- Temperature: 22-28°C (72-82°F)
- Humidity: 55-70%

**Flowering Stage (1.0-1.5 kPa):**
- Temperature: 20-26°C (68-79°F)
- Humidity: 45-55%

**Late Flower (1.2-1.6 kPa):**
- Temperature: 18-24°C (64-75°F)
- Humidity: 40-50%

## Advanced Configuration

### Multiple Grow Rooms

```yaml
# Veg Room
type: custom:vpd-chart-card
title: Veg Room VPD
temperature_sensor: sensor.veg_room_temp
humidity_sensor: sensor.veg_room_humidity
growth_stage: vegetative

# Flower Room
type: custom:vpd-chart-card
title: Flower Room VPD
temperature_sensor: sensor.flower_room_temp
humidity_sensor: sensor.flower_room_humidity
growth_stage: flowering
```

### Hide History Graph

```yaml
type: custom:vpd-chart-card
temperature_sensor: sensor.temperature
humidity_sensor: sensor.humidity
show_history: false
```

### Custom Leaf Offset

Different plants have different leaf temperatures:

```yaml
# Tropical plants (smaller offset)
leaf_temperature_offset: -1.5

# Standard plants
leaf_temperature_offset: -2

# Desert plants (larger offset)
leaf_temperature_offset: -3
```

## Troubleshooting

### "Entity not found"

- Check sensor entity IDs in Developer Tools → States
- Ensure sensors are publishing data
- Verify spelling matches exactly

### VPD seems wrong

- Check temperature unit (°C vs °F) - card auto-converts
- Verify humidity sensor accuracy (calibrate if needed)
- Adjust leaf_temperature_offset if using estimate

### History not showing

- Wait 1-2 hours for data to accumulate
- Check that sensors update regularly
- Ensure `show_history: true` (default)

### Chart colors don't match my stage

- Verify `growth_stage` is set correctly
- Colors adjust automatically based on stage
- Green = optimal for YOUR stage

## FAQ

**Q: What's the best VPD?**
A: Depends on growth stage. Generally 0.8-1.2 kPa for vegetative, 1.0-1.5 kPa for flowering.

**Q: Do I need a leaf temperature sensor?**
A: No! Using an offset (-2°C) works great for most growers.

**Q: Can I use Fahrenheit?**
A: Yes! Card automatically detects and converts your Home Assistant unit system.

**Q: How often should I check VPD?**
A: Monitor daily, adjust as needed. VPD changes with temperature and humidity.

**Q: My VPD is always in the red, help!**
A: Lower temperature or increase humidity. Consider a humidifier or AC unit.

## Resources

- [VPD Chart Calculator](https://vpdchart.com/)
- [Pulse Grow VPD Guide](https://pulsegrow.com/blogs/learn/vpd)
- [Home Assistant Forum](https://community.home-assistant.io/)

---

**Need more help?** Open an issue on GitHub!
