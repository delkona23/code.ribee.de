// KNX2HA – Geräte-Datenbank (Jung, ABB, MDT, Hager)
// Kompakte Struktur: Hersteller → Gerätetyp → KOs pro Kanal mit HA-Mapping
// Stand: 2026-03-15
'use strict';

const DEVICE_DB = {

  // ================================================================
  // JUNG
  // ================================================================
  'Jung': {
    schaltaktor: {
      label: 'Schaltaktoren',
      products: [
        { art: '2302.16 REGHM', name: 'Schaltaktor 2-fach 16A', ch: 2 },
        { art: '2304.16 REGHM', name: 'Schaltaktor 4-fach 16A', ch: 4 },
        { art: '2308.16 REGHM', name: 'Schaltaktor 8-fach 16A', ch: 8 },
        { art: '2312.16 REGHM', name: 'Schaltaktor 12-fach 16A', ch: 12 },
        { art: '2316.16 REGHM', name: 'Schaltaktor 16-fach 16A', ch: 16 },
        { art: '2320.16 REGHM', name: 'Schaltaktor 20-fach 16A', ch: 20 },
        { art: '2324.16 REGHM', name: 'Schaltaktor 24-fach 16A', ch: 24 },
        { art: '230061SR', name: 'Schalt-/Jalousieaktor 6/3 Secure', ch: 6 },
        { art: '230161SR', name: 'Schalt-/Jalousieaktor 16/8 Secure', ch: 16 },
        { art: '230241SR', name: 'Schalt-/Jalousieaktor 24/12 Secure', ch: 24 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'rx', haField: 'address', haType: 'switch' },
        { name: 'Status Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'switch' },
        { name: 'Zwangsführung', dpt: '2.001', dir: 'rx', haField: null },
        { name: 'Szene', dpt: '18.001', dir: 'rx', haField: null },
      ],
    },
    jalousieaktor: {
      label: 'Jalousieaktoren',
      products: [
        { art: '2502 REGHE', name: 'Jalousieaktor 2-fach', ch: 2 },
        { art: '2504 REGHE', name: 'Jalousieaktor 4-fach', ch: 4 },
        { art: '2508 REGHE', name: 'Jalousieaktor 8-fach', ch: 8 },
        { art: '2514 REGHE', name: 'Jalousieaktor 4-fach', ch: 4 },
        { art: '2424 REGHE', name: 'Jalousieaktor 4-fach DC', ch: 4 },
        { art: '2501 UP', name: 'Jalousieaktor 1-fach UP', ch: 1 },
      ],
      kos: [
        { name: 'Langzeit fahren (Auf/Ab)', dpt: '1.008', dir: 'rx', haField: 'move_long_address', haType: 'cover' },
        { name: 'Kurzzeit / Stopp', dpt: '1.007', dir: 'rx', haField: 'stop_address', haType: 'cover' },
        { name: 'Absolute Position', dpt: '5.001', dir: 'rx', haField: 'position_address', haType: 'cover' },
        { name: 'Position Rückmeldung', dpt: '5.001', dir: 'tx', haField: 'position_state_address', haType: 'cover' },
        { name: 'Lamellenposition', dpt: '5.001', dir: 'rx', haField: 'angle_address', haType: 'cover' },
        { name: 'Lamellen Rückmeldung', dpt: '5.001', dir: 'tx', haField: 'angle_state_address', haType: 'cover' },
      ],
    },
    dimmaktor: {
      label: 'Dimmaktoren',
      products: [
        { art: '3901 REGHE', name: 'Dimmaktor 1-fach 500W', ch: 1 },
        { art: '3902 REGHE', name: 'Dimmaktor 2-fach 300W', ch: 2 },
        { art: '39004 1S R', name: 'Dimmaktor 4-fach LED Secure', ch: 4 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'rx', haField: 'address', haType: 'light' },
        { name: 'Status Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'light' },
        { name: 'Dimmen relativ', dpt: '3.007', dir: 'rx', haField: null },
        { name: 'Dimmwert absolut', dpt: '5.001', dir: 'rx', haField: 'brightness_address', haType: 'light' },
        { name: 'Status Dimmwert', dpt: '5.001', dir: 'tx', haField: 'brightness_state_address', haType: 'light' },
      ],
    },
    heizungsaktor: {
      label: 'Heizungsaktoren',
      products: [
        { art: '2336 REG HZ HE', name: 'Heizungsaktor 6-fach PWM', ch: 6 },
        { art: '2336 REG HZR HE', name: 'Heizungsaktor 6-fach mit RTR', ch: 6 },
        { art: '36006 1S R', name: 'Heizungsaktor 6-fach Triac Secure', ch: 6 },
      ],
      kos: [
        { name: 'Stellgröße (empfangen)', dpt: '5.001', dir: 'rx', haField: null, haType: 'climate' },
        { name: 'Stellgröße Status', dpt: '5.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Ist-Temperatur', dpt: '9.001', dir: 'rx', haField: 'temperature_address', haType: 'climate' },
        { name: 'Soll-Temperatur', dpt: '9.001', dir: 'both', haField: 'target_temperature_address', haType: 'climate' },
        { name: 'Betriebsmodus', dpt: '20.102', dir: 'both', haField: 'operation_mode_address', haType: 'climate' },
        { name: 'Heizmeldung', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
      ],
    },
    raumregler: {
      label: 'Raumregler / Raumthermostate',
      products: [
        { art: '4093 KRM TS D', name: 'Raumregler mit Display', ch: 1 },
        { art: '5192 KRM TS D', name: 'Raumregler Kompakt', ch: 1 },
      ],
      kos: [
        { name: 'Ist-Temperatur', dpt: '9.001', dir: 'tx', haField: 'temperature_address', haType: 'climate' },
        { name: 'Soll-Temperatur', dpt: '9.001', dir: 'both', haField: 'target_temperature_address', haType: 'climate' },
        { name: 'Betriebsmodus', dpt: '20.102', dir: 'both', haField: 'operation_mode_address', haType: 'climate' },
        { name: 'Präsenz', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
      ],
    },
    wetterstation: {
      label: 'Wetterstationen',
      products: [
        { art: '2225 WS U', name: 'Wetterstation Universal', ch: 1 },
        { art: '2224 WH', name: 'Wetterstation Home', ch: 1 },
      ],
      kos: [
        { name: 'Windgeschwindigkeit', dpt: '9.005', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Außentemperatur', dpt: '9.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Helligkeit', dpt: '9.004', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Regen', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
        { name: 'Dämmerung', dpt: '9.004', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
    binaereingang: {
      label: 'Binäreingänge',
      products: [
        { art: '40002 1S E', name: 'Binäreingang 2-fach Secure UP', ch: 2 },
        { art: '40004 1S E', name: 'Binäreingang 4-fach Secure UP', ch: 4 },
        { art: '40008 1S E', name: 'Binäreingang 8-fach Secure UP', ch: 8 },
        { art: '2128 REG', name: 'Binäreingang 8-fach REG', ch: 8 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
        { name: 'Dimmen', dpt: '3.007', dir: 'tx', haField: null },
        { name: 'Jalousie', dpt: '1.008', dir: 'tx', haField: null },
        { name: 'Szene', dpt: '18.001', dir: 'tx', haField: null },
      ],
    },
    energiesensor: {
      label: 'Energiesensoren',
      products: [
        { art: '2103 REG ES', name: 'Energiesensor 3-Phasen', ch: 3 },
      ],
      kos: [
        { name: 'Wirkleistung', dpt: '14.056', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Strom', dpt: '14.019', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Spannung', dpt: '14.076', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Energie', dpt: '13.010', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
  },

  // ================================================================
  // ABB / Busch-Jaeger
  // ================================================================
  'ABB': {
    schaltaktor: {
      label: 'Schaltaktoren (SA/S)',
      products: [
        { art: 'SA/S2.16.2.2', name: 'Schaltaktor 2-fach 16A', ch: 2 },
        { art: 'SA/S4.16.2.2', name: 'Schaltaktor 4-fach 16A', ch: 4 },
        { art: 'SA/S8.16.2.2', name: 'Schaltaktor 8-fach 16A', ch: 8 },
        { art: 'SA/S12.16.2.2', name: 'Schaltaktor 12-fach 16A', ch: 12 },
        { art: 'SA/S4.16.6.2', name: 'Schaltaktor 4-fach 16A Energie', ch: 4 },
        { art: 'SA/S8.16.6.2', name: 'Schaltaktor 8-fach 16A Energie', ch: 8 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'rx', haField: 'address', haType: 'switch' },
        { name: 'Status Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'switch' },
        { name: 'Zwangsführung', dpt: '2.001', dir: 'rx', haField: null },
        { name: 'Szene', dpt: '18.001', dir: 'rx', haField: null },
        { name: 'Schwellwert', dpt: '9.001', dir: 'rx', haField: null },
        { name: 'Betriebsstundenzähler', dpt: '13.002', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
    jalousieaktor: {
      label: 'Jalousieaktoren (JRA/S)',
      products: [
        { art: 'JRA/S2.230.2.1', name: 'Jalousieaktor 2-fach 230V', ch: 2 },
        { art: 'JRA/S4.230.2.1', name: 'Jalousieaktor 4-fach 230V', ch: 4 },
        { art: 'JRA/S8.230.2.1', name: 'Jalousieaktor 8-fach 230V', ch: 8 },
        { art: 'JRA/S2.230.2.2', name: 'Jalousieaktor 2-fach 230V (Gen2)', ch: 2 },
        { art: 'JRA/S4.230.2.2', name: 'Jalousieaktor 4-fach 230V (Gen2)', ch: 4 },
        { art: 'JRA/S4.24.2.1', name: 'Jalousieaktor 4-fach 24V DC', ch: 4 },
      ],
      kos: [
        { name: 'Fahren Auf/Ab', dpt: '1.008', dir: 'rx', haField: 'move_long_address', haType: 'cover' },
        { name: 'Stopp/Schritt', dpt: '1.007', dir: 'rx', haField: 'stop_address', haType: 'cover' },
        { name: 'Position Behang', dpt: '5.001', dir: 'rx', haField: 'position_address', haType: 'cover' },
        { name: 'Position Lamelle', dpt: '5.001', dir: 'rx', haField: 'angle_address', haType: 'cover' },
        { name: 'Status Position', dpt: '5.001', dir: 'tx', haField: 'position_state_address', haType: 'cover' },
        { name: 'Status Lamelle', dpt: '5.001', dir: 'tx', haField: 'angle_state_address', haType: 'cover' },
        { name: 'Windalarm', dpt: '1.005', dir: 'rx', haField: null },
        { name: 'Regenalarm', dpt: '1.005', dir: 'rx', haField: null },
        { name: 'Sonnenschutz', dpt: '1.001', dir: 'rx', haField: null },
      ],
    },
    dimmaktor: {
      label: 'Dimmaktoren (UD/S)',
      products: [
        { art: 'UD/S2.210.2.1', name: 'Universal-Dimmer 2-fach 210W', ch: 2 },
        { art: 'UD/S4.210.2.1', name: 'Universal-Dimmer 4-fach 210W', ch: 4 },
        { art: 'UD/S2.315.2.1', name: 'Universal-Dimmer 2-fach 315W', ch: 2 },
        { art: 'UD/S4.315.2.1', name: 'Universal-Dimmer 4-fach 315W', ch: 4 },
        { art: 'UD/S6.210.2.1', name: 'Universal-Dimmer 6-fach 210W', ch: 6 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'rx', haField: 'address', haType: 'light' },
        { name: 'Dimmen relativ', dpt: '3.007', dir: 'rx', haField: null },
        { name: 'Dimmwert absolut', dpt: '5.001', dir: 'rx', haField: 'brightness_address', haType: 'light' },
        { name: 'Status Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'light' },
        { name: 'Status Dimmwert', dpt: '5.001', dir: 'tx', haField: 'brightness_state_address', haType: 'light' },
      ],
    },
    heizungsaktor: {
      label: 'Heizungsaktoren (VAA/S, VC/S)',
      products: [
        { art: 'VAA/S6.230.2.1', name: 'Ventilantrieb 6-fach 230V', ch: 6 },
        { art: 'VAA/S12.230.2.1', name: 'Ventilantrieb 12-fach 230V', ch: 12 },
        { art: 'VC/S4.1.1', name: 'Ventilantrieb 4-fach mit PI-Regler', ch: 4 },
      ],
      kos: [
        { name: 'Stellgröße', dpt: '5.001', dir: 'rx', haField: null, haType: 'climate' },
        { name: 'Stellgröße Status', dpt: '5.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Ist-Temperatur', dpt: '9.001', dir: 'rx', haField: 'temperature_address', haType: 'climate' },
        { name: 'Soll-Temperatur', dpt: '9.001', dir: 'both', haField: 'target_temperature_address', haType: 'climate' },
        { name: 'Betriebsmodus', dpt: '20.102', dir: 'both', haField: 'operation_mode_address', haType: 'climate' },
        { name: 'Heizmeldung', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
      ],
    },
    binaereingang: {
      label: 'Binäreingänge (BE/S, US/U)',
      products: [
        { art: 'BE/S4.20.3.2', name: 'Binäreingang 4-fach Kontakt', ch: 4 },
        { art: 'BE/S8.20.3.2', name: 'Binäreingang 8-fach Kontakt', ch: 8 },
        { art: 'US/U2.2', name: 'Universalschnittstelle 2-fach UP', ch: 2 },
        { art: 'US/U4.2', name: 'Universalschnittstelle 4-fach UP', ch: 4 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
        { name: 'Dimmen', dpt: '3.007', dir: 'tx', haField: null },
        { name: 'Jalousie', dpt: '1.008', dir: 'tx', haField: null },
      ],
    },
    energiesensor: {
      label: 'Energiemessung (SE/S, EM/S)',
      products: [
        { art: 'SE/S3.16.1', name: 'Schaltaktor 3-fach mit Energie', ch: 3 },
        { art: 'EM/S3.16.1', name: 'Energiemodul 3-fach', ch: 3 },
      ],
      kos: [
        { name: 'Wirkleistung', dpt: '14.056', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Strom', dpt: '14.019', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Energie', dpt: '13.010', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
    raumregler: {
      label: 'Raumregler (6108, ClimaECO)',
      products: [
        { art: '6108/01', name: 'Raumtemperaturregler KNX', ch: 1 },
        { art: '6124/01', name: 'Raumtemperaturregler mit Display', ch: 1 },
      ],
      kos: [
        { name: 'Ist-Temperatur', dpt: '9.001', dir: 'tx', haField: 'temperature_address', haType: 'climate' },
        { name: 'Soll-Temperatur', dpt: '9.001', dir: 'both', haField: 'target_temperature_address', haType: 'climate' },
        { name: 'Betriebsmodus', dpt: '20.102', dir: 'both', haField: 'operation_mode_address', haType: 'climate' },
      ],
    },
    wetterstation: {
      label: 'Wetterstationen (WES/A)',
      products: [
        { art: 'WES/A4.1.1', name: 'Wetterstation 4-fach', ch: 1 },
      ],
      kos: [
        { name: 'Windgeschwindigkeit', dpt: '9.005', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Außentemperatur', dpt: '9.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Helligkeit', dpt: '9.004', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Regen', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
      ],
    },
  },

  // ================================================================
  // MDT Technologies
  // ================================================================
  'MDT': {
    schaltaktor: {
      label: 'Schaltaktoren (AKS/AKK/AKI)',
      products: [
        { art: 'AKS-0216.03', name: 'Schaltaktor 2-fach 16A', ch: 2 },
        { art: 'AKS-0416.03', name: 'Schaltaktor 4-fach 16A', ch: 4 },
        { art: 'AKS-0816.03', name: 'Schaltaktor 8-fach 16A', ch: 8 },
        { art: 'AKS-1216.03', name: 'Schaltaktor 12-fach 16A', ch: 12 },
        { art: 'AKS-1616.03', name: 'Schaltaktor 16-fach 16A', ch: 16 },
        { art: 'AKS-2016.03', name: 'Schaltaktor 20-fach 16A', ch: 20 },
        { art: 'AKS-2416.03', name: 'Schaltaktor 24-fach 16A', ch: 24 },
        { art: 'AKK-0416.03', name: 'Schaltaktor 4-fach Kompakt 16A', ch: 4 },
        { art: 'AKK-0816.03', name: 'Schaltaktor 8-fach Kompakt 16A', ch: 8 },
        { art: 'AKI-0216.03', name: 'Schaltaktor 2-fach Industrie 20A', ch: 2 },
        { art: 'AKI-0416.03', name: 'Schaltaktor 4-fach Industrie 20A', ch: 4 },
        { art: 'AMS-0416.03', name: 'Schaltaktor 4-fach Strommessung', ch: 4 },
        { art: 'AZI-0316.03', name: 'Schaltaktor 3-fach Wirkleistung', ch: 3 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'rx', haField: 'address', haType: 'switch' },
        { name: 'Status Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'switch' },
        { name: 'Sperren', dpt: '1.001', dir: 'rx', haField: null },
        { name: 'Zwangsführung', dpt: '2.001', dir: 'rx', haField: null },
        { name: 'Schwellwert', dpt: '9.001', dir: 'rx', haField: null },
        { name: 'Betriebsstundenzähler', dpt: '13.002', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
    jalousieaktor: {
      label: 'Jalousieaktoren (JAL)',
      products: [
        { art: 'JAL-0210.02', name: 'Jalousieaktor 2-fach 230V', ch: 2 },
        { art: 'JAL-0410.02', name: 'Jalousieaktor 4-fach 230V', ch: 4 },
        { art: 'JAL-0810.02', name: 'Jalousieaktor 8-fach 230V', ch: 8 },
        { art: 'JAL-0410D.02', name: 'Jalousieaktor 4-fach Fahrzeitmessung', ch: 4 },
        { art: 'JAL-0810D.02', name: 'Jalousieaktor 8-fach Fahrzeitmessung', ch: 8 },
        { art: 'JAL-01UP.02', name: 'Jalousieaktor 1-fach UP', ch: 1 },
      ],
      kos: [
        { name: 'Auf/Ab (Langzeitbetrieb)', dpt: '1.008', dir: 'rx', haField: 'move_long_address', haType: 'cover' },
        { name: 'Stopp / Lamellenverstellung', dpt: '1.007', dir: 'rx', haField: 'stop_address', haType: 'cover' },
        { name: 'Absolute Position', dpt: '5.001', dir: 'rx', haField: 'position_address', haType: 'cover' },
        { name: 'Absolute Lamellenposition', dpt: '5.001', dir: 'rx', haField: 'angle_address', haType: 'cover' },
        { name: 'Status Position', dpt: '5.001', dir: 'tx', haField: 'position_state_address', haType: 'cover' },
        { name: 'Status Lamellenposition', dpt: '5.001', dir: 'tx', haField: 'angle_state_address', haType: 'cover' },
        { name: 'Sperren', dpt: '1.001', dir: 'rx', haField: null },
        { name: 'Windalarm', dpt: '1.005', dir: 'rx', haField: null },
      ],
    },
    dimmaktor: {
      label: 'Dimmaktoren (AKD)',
      products: [
        { art: 'AKD-0101.02', name: 'Dimmaktor 1-fach 250W', ch: 1 },
        { art: 'AKD-0201.02', name: 'Dimmaktor 2-fach 250W', ch: 2 },
        { art: 'AKD-0401.02', name: 'Dimmaktor 4-fach 250W', ch: 4 },
        { art: 'AKD-0424V.02', name: 'LED Controller 4-Kanal RGBW', ch: 4 },
        { art: 'AKD-0224V.02', name: 'LED Controller 2-Kanal Tunable White', ch: 2 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'rx', haField: 'address', haType: 'light' },
        { name: 'Dimmen relativ', dpt: '3.007', dir: 'rx', haField: null },
        { name: 'Dimmwert absolut', dpt: '5.001', dir: 'rx', haField: 'brightness_address', haType: 'light' },
        { name: 'Status Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'light' },
        { name: 'Status Dimmwert', dpt: '5.001', dir: 'tx', haField: 'brightness_state_address', haType: 'light' },
        { name: 'HSV Farbwert', dpt: '232.600', dir: 'rx', haField: 'color_address', haType: 'light' },
        { name: 'Farbtemperatur', dpt: '7.600', dir: 'rx', haField: 'color_temperature_address', haType: 'light' },
      ],
    },
    heizungsaktor: {
      label: 'Heizungsaktoren (AKH)',
      products: [
        { art: 'AKH-0400.03', name: 'Heizungsaktor 4-fach', ch: 4 },
        { art: 'AKH-0600.03', name: 'Heizungsaktor 6-fach', ch: 6 },
        { art: 'AKH-0800.03', name: 'Heizungsaktor 8-fach', ch: 8 },
      ],
      kos: [
        { name: 'Stellgröße Heizen', dpt: '5.001', dir: 'rx', haField: null, haType: 'climate' },
        { name: 'Ist-Temperatur', dpt: '9.001', dir: 'rx', haField: 'temperature_address', haType: 'climate' },
        { name: 'Soll-Temperatur', dpt: '9.001', dir: 'both', haField: 'target_temperature_address', haType: 'climate' },
        { name: 'HVAC Modus', dpt: '20.102', dir: 'both', haField: 'operation_mode_address', haType: 'climate' },
        { name: 'Fensterkontakt', dpt: '1.001', dir: 'rx', haField: null },
        { name: 'Heizmeldung', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
        { name: 'Ventilstatus', dpt: '5.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
    binaereingang: {
      label: 'Binäreingänge (BE)',
      products: [
        { art: 'BE-0400.02', name: 'Binäreingang 4-fach potentialfrei', ch: 4 },
        { art: 'BE-0800.02', name: 'Binäreingang 8-fach potentialfrei', ch: 8 },
        { art: 'BE-1600.02', name: 'Binäreingang 16-fach potentialfrei', ch: 16 },
        { art: 'BE-3200.02', name: 'Binäreingang 32-fach potentialfrei', ch: 32 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
        { name: 'Dimmen', dpt: '3.007', dir: 'tx', haField: null },
        { name: 'Jalousie', dpt: '1.008', dir: 'tx', haField: null },
        { name: 'Zähler', dpt: '12.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
    energiesensor: {
      label: 'Energiezähler (EZ)',
      products: [
        { art: 'EZ-0320.01', name: 'Energiezähler 3-Phasen 20A', ch: 3 },
      ],
      kos: [
        { name: 'Wirkleistung', dpt: '14.056', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Strom', dpt: '14.019', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Spannung', dpt: '14.076', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Energie', dpt: '13.010', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Frequenz', dpt: '14.033', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
    glastaster: {
      label: 'Glastaster II Smart',
      products: [
        { art: 'BE-GT2TW.02', name: 'Glastaster II Smart weiß', ch: 1 },
        { art: 'BE-GT2TS.02', name: 'Glastaster II Smart schwarz', ch: 1 },
      ],
      kos: [
        { name: 'Ist-Temperatur', dpt: '9.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Sollwert-Verschiebung', dpt: '9.002', dir: 'tx', haField: null },
        { name: 'HVAC Modus', dpt: '20.102', dir: 'tx', haField: null },
      ],
    },
    wetterstation: {
      label: 'Wetterstation (SCN-WS)',
      products: [
        { art: 'SCN-WS3HW.01', name: 'Wetterstation Standard', ch: 1 },
      ],
      kos: [
        { name: 'Helligkeit Ost', dpt: '9.004', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Helligkeit Süd', dpt: '9.004', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Helligkeit West', dpt: '9.004', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Windgeschwindigkeit', dpt: '9.005', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Außentemperatur', dpt: '9.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Windalarm', dpt: '1.005', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
        { name: 'Dämmerung', dpt: '9.004', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
  },

  // ================================================================
  // Hager / Berker
  // ================================================================
  'Hager': {
    schaltaktor: {
      label: 'Schaltaktoren (TXA/TYA/TYM)',
      products: [
        { art: 'TXA604D', name: 'Schalt-/Jalousieaktor 4/2-fach easy 16A', ch: 4 },
        { art: 'TXA606D', name: 'Schalt-/Jalousieaktor 6/3-fach easy 16A', ch: 6 },
        { art: 'TYA604C', name: 'Schalt-/Jalousieaktor 4/2-fach 16A', ch: 4 },
        { art: 'TYA606C', name: 'Schalt-/Jalousieaktor 6/3-fach 16A', ch: 6 },
        { art: 'TYA608C', name: 'Schalt-/Jalousieaktor 8/4-fach 16A', ch: 8 },
        { art: 'TYA610C', name: 'Schalt-/Jalousieaktor 10/5-fach 16A', ch: 10 },
        { art: 'TYM616D', name: 'Schalt-/Jalousieaktor 16/8-fach 16A', ch: 16 },
        { art: 'TYM620D', name: 'Schalt-/Jalousieaktor 20/10-fach 16A', ch: 20 },
        { art: 'TYAS608D', name: 'Schalt-/Jalousieaktor 8/4-fach Secure 16A', ch: 8 },
        { art: 'TYB601B', name: 'Schaltaktor 1-fach UP 10A', ch: 1 },
        { art: 'TYB602F', name: 'Schalt-/Jalousieaktor 2/1-fach UP 6A', ch: 2 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'rx', haField: 'address', haType: 'switch' },
        { name: 'Status Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'switch' },
        { name: 'Zwangsführung', dpt: '2.001', dir: 'rx', haField: null },
        { name: 'Sperren', dpt: '1.003', dir: 'rx', haField: null },
        { name: 'Szene', dpt: '18.001', dir: 'rx', haField: null },
        { name: 'Betriebsstundenzähler', dpt: '13.002', dir: 'tx', haField: null },
      ],
    },
    jalousieaktor: {
      label: 'Jalousieaktoren (TXA/TYA)',
      products: [
        { art: 'TXA624C', name: 'Jalousieaktor 4-fach easy 230V', ch: 4 },
        { art: 'TYA624C', name: 'Jalousieaktor 4-fach 230V', ch: 4 },
        { art: 'TYA628C', name: 'Jalousieaktor 8-fach 230V', ch: 8 },
        { art: 'TYAS628C', name: 'Jalousieaktor 8-fach Secure 230V', ch: 8 },
        { art: 'TYM632C', name: 'Jalousieaktor 12-fach 230V', ch: 12 },
        { art: 'TYA624B', name: 'Rollladenaktor 4-fach 24V', ch: 4 },
      ],
      kos: [
        { name: 'Fahren Auf/Ab', dpt: '1.008', dir: 'rx', haField: 'move_long_address', haType: 'cover' },
        { name: 'Stopp/Schritt', dpt: '1.007', dir: 'rx', haField: 'stop_address', haType: 'cover' },
        { name: 'Position Behang', dpt: '5.001', dir: 'rx', haField: 'position_address', haType: 'cover' },
        { name: 'Position Lamelle', dpt: '5.001', dir: 'rx', haField: 'angle_address', haType: 'cover' },
        { name: 'Status Position', dpt: '5.001', dir: 'tx', haField: 'position_state_address', haType: 'cover' },
        { name: 'Status Lamelle', dpt: '5.001', dir: 'tx', haField: 'angle_state_address', haType: 'cover' },
        { name: 'Windalarm', dpt: '1.005', dir: 'rx', haField: null },
        { name: 'Regenalarm', dpt: '1.005', dir: 'rx', haField: null },
        { name: 'Sonnenschutz', dpt: '1.001', dir: 'rx', haField: null },
      ],
    },
    dimmaktor: {
      label: 'Dimmaktoren (TXA/TYA)',
      products: [
        { art: 'TXA661A', name: 'Universal-Dimmaktor 1-fach easy 300W', ch: 1 },
        { art: 'TXA662AN', name: 'Universal-Dimmaktor 2-fach easy 300W', ch: 2 },
        { art: 'TYA664A', name: 'Universal-Dimmaktor 4-fach 300W', ch: 4 },
        { art: 'TYA670W', name: 'DALI Gateway 1-Kanal', ch: 1 },
        { art: 'TYF684', name: 'LED Controller 4-Kanal RGBW', ch: 4 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'rx', haField: 'address', haType: 'light' },
        { name: 'Dimmen relativ', dpt: '3.007', dir: 'rx', haField: null },
        { name: 'Helligkeitswert', dpt: '5.001', dir: 'rx', haField: 'brightness_address', haType: 'light' },
        { name: 'Status Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'light' },
        { name: 'Status Helligkeitswert', dpt: '5.001', dir: 'tx', haField: 'brightness_state_address', haType: 'light' },
      ],
    },
    heizungsaktor: {
      label: 'Heizungsaktoren (TXM/TYM)',
      products: [
        { art: 'TXM646T', name: 'Heizungsaktor 6-fach easy (ohne Regler)', ch: 6 },
        { art: 'TXM646R', name: 'Heizungsaktor 6-fach easy (mit Regler)', ch: 6 },
        { art: 'TYM646R', name: 'Heizungsaktor 6-fach (mit Regler)', ch: 6 },
        { art: 'TYMS646R', name: 'Heizungsaktor 6-fach Secure (mit Regler)', ch: 6 },
      ],
      kos: [
        { name: 'Stellgröße', dpt: '5.001', dir: 'rx', haField: null, haType: 'climate' },
        { name: 'Stellgröße Status', dpt: '5.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Ist-Temperatur', dpt: '9.001', dir: 'rx', haField: 'temperature_address', haType: 'climate' },
        { name: 'Soll-Temperatur', dpt: '9.001', dir: 'both', haField: 'target_temperature_address', haType: 'climate' },
        { name: 'Betriebsmodus', dpt: '20.102', dir: 'both', haField: 'operation_mode_address', haType: 'climate' },
        { name: 'Heizmeldung', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
      ],
    },
    binaereingang: {
      label: 'Binäreingänge (TXB)',
      products: [
        { art: 'TXB302', name: 'Binäreingang 2-fach UP', ch: 2 },
        { art: 'TXB304', name: 'Binäreingang 4-fach UP', ch: 4 },
        { art: 'TXA306', name: 'Binäreingang 6-fach REG', ch: 6 },
        { art: 'TYBS702A', name: 'Binäreingang 2-fach Secure UP', ch: 2 },
      ],
      kos: [
        { name: 'Schalten', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
        { name: 'Dimmen', dpt: '3.007', dir: 'tx', haField: null },
        { name: 'Jalousie', dpt: '1.008', dir: 'tx', haField: null },
      ],
    },
    energiesensor: {
      label: 'Energiemessung (TXF/TE)',
      products: [
        { art: 'TXF121', name: 'KNX Interface für Energiezähler', ch: 1 },
        { art: 'TE332', name: 'Messwertgeber 3-Wandler', ch: 3 },
      ],
      kos: [
        { name: 'Wirkleistung', dpt: '14.056', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Strom', dpt: '14.019', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Spannung', dpt: '14.076', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Energie', dpt: '13.010', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
    raumregler: {
      label: 'Raumregler (Berker)',
      products: [
        { art: '80440100', name: 'Temperaturregler mit TFT', ch: 1 },
        { art: '80660100', name: 'Raumcontroller mit TFT', ch: 1 },
        { art: 'TX320', name: 'Aufputz-Raumthermostat', ch: 1 },
      ],
      kos: [
        { name: 'Ist-Temperatur', dpt: '9.001', dir: 'tx', haField: 'temperature_address', haType: 'climate' },
        { name: 'Soll-Temperatur', dpt: '9.001', dir: 'both', haField: 'target_temperature_address', haType: 'climate' },
        { name: 'Betriebsmodus', dpt: '20.102', dir: 'both', haField: 'operation_mode_address', haType: 'climate' },
      ],
    },
    wetterstation: {
      label: 'Wetterstationen (TG)',
      products: [
        { art: 'TG053A', name: 'Wetterstation KNX mit GPS', ch: 1 },
        { art: 'TXE531', name: 'Wetterstation KNX easy', ch: 1 },
      ],
      kos: [
        { name: 'Windgeschwindigkeit', dpt: '9.005', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Außentemperatur', dpt: '9.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Helligkeit', dpt: '9.004', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Regen', dpt: '1.001', dir: 'tx', haField: 'state_address', haType: 'binary_sensor' },
        { name: 'Sonnenposition Azimut', dpt: '9.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
        { name: 'Sonnenposition Elevation', dpt: '9.001', dir: 'tx', haField: 'state_address', haType: 'sensor' },
      ],
    },
  },
};

// ================================================================
// Helper: Gerätetyp-Label (deutsch)
// ================================================================
const DEVICE_TYPE_LABELS = {
  schaltaktor: 'Schalter/Licht',
  jalousieaktor: 'Rolladen/Jalousie',
  dimmaktor: 'Dimmer',
  heizungsaktor: 'Heizung',
  raumregler: 'Raumregler',
  wetterstation: 'Wetterstation',
  binaereingang: 'Binäreingang',
  energiesensor: 'Energiemessung',
  glastaster: 'Glastaster',
};

// ================================================================
// Helper: HA-Typ → Icon + Label
// ================================================================
const HA_TYPE_INFO = {
  light:         { icon: '💡', label: 'Lichter' },
  switch:        { icon: '🔌', label: 'Schalter' },
  cover:         { icon: '🪟', label: 'Rolläden' },
  climate:       { icon: '🌡️', label: 'Heizung' },
  sensor:        { icon: '📊', label: 'Sensoren' },
  binary_sensor: { icon: '🔔', label: 'Binärsensoren' },
};

// ================================================================
// Analyse: Was ist im Projekt definiert vs. was wäre möglich
// ================================================================
function analyzeDevicePotential(parsedGAs, deviceInstances) {
  const devices = deviceInstances || [];
  const result = {
    manufacturers: {},   // { 'Jung': { schaltaktor: 2, jalousieaktor: 1 } } – echte Geräte
    totalByType: {},     // { light: 10, switch: 5, ... } – GA-basiert
    potentials: [],      // [ { manufacturer, deviceType, label, deviceCount, defined, missing } ]
  };

  // 1. Hersteller-Übersicht aus echten Geräten (DeviceInstances)
  for (const dev of devices) {
    const mfr = dev.manufacturer || 'Unbekannt';
    if (!result.manufacturers[mfr]) result.manufacturers[mfr] = {};
    const dt = dev.deviceType || 'sonstiges';
    result.manufacturers[mfr][dt] = (result.manufacturers[mfr][dt] || 0) + 1;
  }

  // 2. HA-Entitäten-Typen aus GAs zählen
  for (const ga of parsedGAs) {
    if (!ga.selected) continue;
    const type = ga.haType || 'unknown';
    result.totalByType[type] = (result.totalByType[type] || 0) + 1;
  }

  // 3. Potentialanalyse: Für jeden erkannten Gerätetyp+Hersteller prüfen
  //    welche KOs im Projekt definiert sind vs. was die DB kennt
  const devicesByMfrType = new Map(); // "Jung|jalousieaktor" → count
  for (const dev of devices) {
    const key = `${dev.manufacturer}|${dev.deviceType}`;
    devicesByMfrType.set(key, (devicesByMfrType.get(key) || 0) + 1);
  }

  for (const [key, devCount] of devicesByMfrType) {
    const [mfr, devType] = key.split('|');
    if (!DEVICE_DB[mfr] || !DEVICE_DB[mfr][devType]) continue;

    const devInfo = DEVICE_DB[mfr][devType];
    const haKos = devInfo.kos.filter(ko => ko.haField);
    if (haKos.length === 0) continue;

    // Welche GA-DPTs sind für diesen Hersteller im Projekt vorhanden?
    const mfrGAs = parsedGAs.filter(g => g.manufacturer === mfr && g.selected);
    const definedDpts = new Set(mfrGAs.map(g => g.dpt).filter(d => d !== '—'));

    const definedKos = [];
    const missingKos = [];

    for (const ko of haKos) {
      if (definedDpts.has(ko.dpt)) {
        definedKos.push(ko);
      } else {
        missingKos.push(ko);
      }
    }

    // Nur anzeigen wenn mind. 1 KO definiert UND mind. 1 fehlt
    if (definedKos.length > 0 && missingKos.length > 0) {
      result.potentials.push({
        manufacturer: mfr,
        deviceType: devType,
        label: devInfo.label,
        deviceCount: devCount,
        products: devInfo.products,
        defined: definedKos,
        missing: missingKos,
      });
    }
  }

  return result;
}
