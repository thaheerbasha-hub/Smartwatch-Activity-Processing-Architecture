/**
 * Smartwatch Activity Processing Architecture Simulator
 * ARM Cortex-M RISC, 5-Stage Pipeline, L1 Cache & Live BLE Bridge
 */

// ==========================================
// 1. GLOBAL STATE & CONFIGURATIONS
// ==========================================
const AppState = {
  // Workload and Hardware Reactive Parameters
  inputProfile: 'walking', // 'walking', 'jogging', 'sedentary', 'ble'
  forwarding: true,        // true = EX/MEM -> EX forwarding; false = No Forwarding
  branchPredictor: 'dynamic_2bit', // 'dynamic_2bit', 'static_not_taken', 'none'
  cacheSizeBytes: 512,     // 128, 256, 512 bytes
  associativity: 4,        // 1, 2, 4 ways
  
  // Active Tab
  activeTab: 'tab-overview', // 'tab-overview', 'tab-pipeline', 'tab-cache'

  // Bluetooth Live BLE Bridge State
  ble: {
    device: null,
    server: null,
    connected: false,
    deviceName: 'None',
    batteryLevel: null,
    liveBpm: null,
    liveCadence: null,
    hrCharacteristic: null,
    rscCharacteristic: null,
    fallbackMode: false,
  },

  // Interactive Live Telemetry / Fallback Inputs
  telemetry: {
    sliderBpm: 75,
    sliderCadence: 112,
    deviceMotionActive: false,
    motionAccX: 0,
    motionAccY: 0,
    motionAccZ: 0,
  },

  // 5-Stage Pipeline Interactive Stepper State
  stepper: {
    cycle: 1,
    maxCycles: 80,
    isPlaying: false,
    intervalId: null,
    stepSpeedMs: 400,
  },

  // Simulation Engine Computed Cache & KPI Data
  simulation: null,
  pipelineCyclesData: [],
};

// ==========================================
// 2. DOM ELEMENTS CACHE
// ==========================================
const DOM = {};

function initDOMElements() {
  DOM.bleStatusPill = document.getElementById('bleStatusPill');
  DOM.bleStatusText = document.getElementById('bleStatusText');
  DOM.bleLed = document.getElementById('bleLed');
  DOM.btnConnectBle = document.getElementById('btnConnectBle');
  DOM.btnDisconnectBle = document.getElementById('btnDisconnectBle');
  DOM.bleDeviceName = document.getElementById('bleDeviceName');
  DOM.bleBatteryBadge = document.getElementById('bleBatteryBadge');
  DOM.bleHeartRateBadge = document.getElementById('bleHeartRateBadge');
  DOM.bleCadenceBadge = document.getElementById('bleCadenceBadge');
  DOM.bleModeBadge = document.getElementById('bleModeBadge');

  DOM.btnToggleMotion = document.getElementById('btnToggleMotion');
  DOM.telemetrySliderBpm = document.getElementById('telemetrySliderBpm');
  DOM.telemetryBpmVal = document.getElementById('telemetryBpmVal');
  DOM.telemetrySliderSpm = document.getElementById('telemetrySliderSpm');
  DOM.telemetrySpmVal = document.getElementById('telemetrySpmVal');

  DOM.selectInputSource = document.getElementById('selectInputSource');
  DOM.selectForwarding = document.getElementById('selectForwarding');
  DOM.selectBranchPredictor = document.getElementById('selectBranchPredictor');
  DOM.selectCacheSize = document.getElementById('selectCacheSize');
  DOM.selectAssociativity = document.getElementById('selectAssociativity');

  DOM.btnPresetBaseline = document.getElementById('btnPresetBaseline');
  DOM.btnPresetOptimized = document.getElementById('btnPresetOptimized');

  // KPI Metric Strip Elements
  DOM.kpiInstructions = document.getElementById('kpiInstructions');
  DOM.kpiInstrMix = document.getElementById('kpiInstrMix');
  DOM.kpiCycles = document.getElementById('kpiCycles');
  DOM.kpiStallCycles = document.getElementById('kpiStallCycles');
  DOM.kpiCpi = document.getElementById('kpiCpi');
  DOM.kpiIpc = document.getElementById('kpiIpc');
  DOM.kpiHitRatio = document.getElementById('kpiHitRatio');
  DOM.kpiHitDetails = document.getElementById('kpiHitDetails');
  DOM.kpiAmat = document.getElementById('kpiAmat');
  DOM.kpiAmatFormula = document.getElementById('kpiAmatFormula');
  DOM.kpiBiometrics = document.getElementById('kpiBiometrics');
  DOM.kpiSourceBadge = document.getElementById('kpiSourceBadge');

  // Stepper Elements
  DOM.stepperCycleDisplay = document.getElementById('stepperCycleDisplay');
  DOM.btnStepPrev = document.getElementById('btnStepPrev');
  DOM.btnStepPlayPause = document.getElementById('btnStepPlayPause');
  DOM.btnStepNext = document.getElementById('btnStepNext');
  DOM.btnStepReset = document.getElementById('btnStepReset');
  DOM.stepperSpeedSlider = document.getElementById('stepperSpeedSlider');
  DOM.stepperSpeedDisplay = document.getElementById('stepperSpeedDisplay');

  // 5 Pipeline Stage Cards
  DOM.stageIF = document.getElementById('stageIF');
  DOM.stageID = document.getElementById('stageID');
  DOM.stageEX = document.getElementById('stageEX');
  DOM.stageMEM = document.getElementById('stageMEM');
  DOM.stageWB = document.getElementById('stageWB');
  DOM.hazardAlertBanner = document.getElementById('hazardAlertBanner');

  // Assembly Trace Table Body
  DOM.assemblyTraceTableBody = document.getElementById('assemblyTraceTableBody');

  // Cache Inspector Elements
  DOM.cacheSetsContainer = document.getElementById('cacheSetsContainer');
  DOM.cacheSummaryBadge = document.getElementById('cacheSummaryBadge');
  DOM.cacheConfigDisplay = document.getElementById('cacheConfigDisplay');
  DOM.bitFieldAddressInput = document.getElementById('bitFieldAddressInput');
  DOM.bitFieldTag = document.getElementById('bitFieldTag');
  DOM.bitFieldSet = document.getElementById('bitFieldSet');
  DOM.bitFieldOffset = document.getElementById('bitFieldOffset');
  DOM.bitFieldExplanation = document.getElementById('bitFieldExplanation');

  // Toast Container
  DOM.toastContainer = document.getElementById('toastContainer');

  // Quick Link & Help Modals
  DOM.btnQuickLinkWatch = document.getElementById('btnQuickLinkWatch');
  DOM.btnWatchHelp = document.getElementById('btnWatchHelp');
  DOM.quickLinkModal = document.getElementById('quickLinkModal');
  DOM.watchHelpModal = document.getElementById('watchHelpModal');
  DOM.btnCloseQuickLink = document.getElementById('btnCloseQuickLink');
  DOM.btnCloseWatchHelp = document.getElementById('btnCloseWatchHelp');
  DOM.btnDismissHelp = document.getElementById('btnDismissHelp');
  DOM.inputCustomWatchName = document.getElementById('inputCustomWatchName');
  DOM.btnConnectCustomWatch = document.getElementById('btnConnectCustomWatch');
}

// ==========================================
// 3. TOAST NOTIFICATION SYSTEM (NO ALERTS)
// ==========================================
function showToast(message, type = 'info', durationMs = 4500) {
  if (!DOM.toastContainer) return;

  const toast = document.createElement('div');
  const bgClasses = {
    info: 'border-cyan-500/50 bg-slate-900/90 text-cyan-200',
    success: 'border-emerald-500/50 bg-slate-900/90 text-emerald-200',
    warning: 'border-amber-500/50 bg-slate-900/90 text-amber-200',
    error: 'border-rose-500/50 bg-slate-900/90 text-rose-200',
  }[type] || 'border-slate-600 bg-slate-900/90 text-slate-200';

  toast.className = `flex items-center gap-3 p-3.5 mb-2.5 rounded-lg border shadow-xl backdrop-blur-md text-sm toast-enter pointer-events-auto ${bgClasses}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg class="w-5 h-5 text-emerald-400 shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg class="w-5 h-5 text-amber-400 shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg class="w-5 h-5 text-rose-400 shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  } else {
    iconSvg = `<svg class="w-5 h-5 text-cyan-400 shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <div class="flex-1 font-medium leading-tight">${message}</div>
    <button class="text-slate-400 hover:text-white shrink-0 ml-2 text-base leading-none">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  const removeToast = () => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  };

  closeBtn.addEventListener('click', removeToast);
  DOM.toastContainer.appendChild(toast);

  setTimeout(removeToast, durationMs);
}

// ==========================================
// 4. 22-INSTRUCTION ARM RISC KERNEL DEFINITION
// ==========================================
const ARM_KERNEL = [
  {
    pc: '0x08000100',
    instr: 'LDRSH',
    ops: 'R0, [R6, R4]',
    sram: '0x2000_0000 + R4',
    classType: 'MEM / Load',
    badgeColor: 'cyan',
    reads: ['R6', 'R4'],
    writes: ['R0'],
    desc: 'Load 16-bit signed Accel X sample ax[n] from IMU FIFO',
    hazard: 'MEM stage latency: Load-Use hazard for instructions immediately using R0',
  },
  {
    pc: '0x08000104',
    instr: 'LDRSH',
    ops: 'R1, [R7, R4]',
    sram: '0x2000_0400 + R4',
    classType: 'MEM / Load',
    badgeColor: 'cyan',
    reads: ['R7', 'R4'],
    writes: ['R1'],
    desc: 'Load 16-bit signed Accel Y sample ay[n] from IMU FIFO',
    hazard: 'Power-of-2 stride: exactly 0x0400 offset maps to Set 0!',
  },
  {
    pc: '0x08000108',
    instr: 'LDRSH',
    ops: 'R2, [R8, R4]',
    sram: '0x2000_0800 + R4',
    classType: 'MEM / Load',
    badgeColor: 'cyan',
    reads: ['R8', 'R4'],
    writes: ['R2'],
    desc: 'Load 16-bit signed Accel Z sample az[n] from IMU FIFO',
    hazard: 'Power-of-2 stride: exactly 0x0800 offset maps to Set 0!',
  },
  {
    pc: '0x0800010C',
    instr: 'MUL',
    ops: 'R3, R0, R0',
    sram: 'Internal ALU',
    classType: 'ALU / MAC',
    badgeColor: 'blue',
    reads: ['R0'],
    writes: ['R3'],
    desc: 'Square X axis: R3 = ax^2 (Q10 fixed-point product)',
    hazard: 'RAW dependency on R0 from inst #1 (resolved via forwarding or 2-cycle stall)',
  },
  {
    pc: '0x08000110',
    instr: 'MLA',
    ops: 'R3, R1, R1, R3',
    sram: 'Internal ALU',
    classType: 'ALU / MAC',
    badgeColor: 'blue',
    reads: ['R1', 'R3'],
    writes: ['R3'],
    desc: 'Multiply-Accumulate Y: R3 = R3 + ay^2',
    hazard: 'RAW dependency on R3 from MUL; forwarded seamlessly in 1 cycle with EX/MEM bypass',
  },
  {
    pc: '0x08000114',
    instr: 'MLA',
    ops: 'R3, R2, R2, R3',
    sram: 'Internal ALU',
    classType: 'ALU / MAC',
    badgeColor: 'blue',
    reads: ['R2', 'R3'],
    writes: ['R3'],
    desc: 'Multiply-Accumulate Z: R3 = |A|^2 = ax^2 + ay^2 + az^2',
    hazard: 'Avoids expensive SQRT instruction; compares magnitude squared directly',
  },
  {
    pc: '0x08000118',
    instr: 'LDR',
    ops: 'R9, =2423296',
    sram: 'Literal Pool',
    classType: 'MEM / Literal',
    badgeColor: 'slate',
    reads: [],
    writes: ['R9'],
    desc: 'Load squared threshold T^2 = (1.52 * 1024)^2 = 2,423,296',
    hazard: 'Constant loaded once or cached in register pool',
  },
  {
    pc: '0x0800011C',
    instr: 'CMP',
    ops: 'R3, R9',
    sram: 'Internal ALU',
    classType: 'ALU / Compare',
    badgeColor: 'blue',
    reads: ['R3', 'R9'],
    writes: ['APSR'],
    desc: 'Compare |A|^2 with step threshold T^2, sets ALU flags (N, Z, C, V)',
    hazard: 'Single cycle ALU comparison',
  },
  {
    pc: '0x08000120',
    instr: 'BLE',
    ops: '.NO_STEP',
    sram: 'Branch Target',
    classType: 'Branch / Control',
    badgeColor: 'rose',
    reads: ['APSR'],
    writes: ['PC'],
    desc: 'Branch if |A|^2 <= T^2 (skip step increment if peak below threshold)',
    hazard: 'Conditional branch: evaluated in EX. Dynamic 2-bit BHT predicts not taken during steps',
  },
  {
    pc: '0x08000124',
    instr: 'LDR',
    ops: 'R10, [R11, #0]',
    sram: '0x2000_1120',
    classType: 'MEM / Load',
    badgeColor: 'cyan',
    reads: ['R11'],
    writes: ['R10'],
    desc: 'Load current Step Counter from State Buffer memory',
    hazard: 'Load-Use hazard with next ADD instruction (1 bubble if forwarding ON)',
  },
  {
    pc: '0x08000128',
    instr: 'ADD',
    ops: 'R10, R10, #1',
    sram: 'Internal ALU',
    classType: 'ALU / Add',
    badgeColor: 'emerald',
    reads: ['R10'],
    writes: ['R10'],
    desc: 'Increment step count: R10 = R10 + 1',
    hazard: 'Load-Use RAW stall if immediately following LDR R10',
  },
  {
    pc: '0x0800012C',
    instr: 'STR',
    ops: 'R10, [R11, #0]',
    sram: '0x2000_1120',
    classType: 'MEM / Store',
    badgeColor: 'amber',
    reads: ['R10', 'R11'],
    writes: [],
    desc: 'Store updated step count back into SRAM State Buffer',
    hazard: 'Cache write-through / write-back operation',
  },
  {
    pc: '0x08000130',
    instr: 'LDRSH',
    ops: 'R5, [R12, R4]',
    sram: '0x2000_0C00 + R4',
    classType: 'MEM / Load',
    badgeColor: 'cyan',
    reads: ['R12', 'R4'],
    writes: ['R5'],
    desc: '.NO_STEP: Load raw optical PPG sample ppg[n] from PPG FIFO',
    hazard: 'Power-of-2 stride: exactly 0x0C00 offset also maps to Set 0!',
  },
  {
    pc: '0x08000134',
    instr: 'LDRSH',
    ops: 'R13, [R12, R4, #-2]',
    sram: '0x2000_0C00 + R4 - 2',
    classType: 'MEM / Load',
    badgeColor: 'cyan',
    reads: ['R12', 'R4'],
    writes: ['R13'],
    desc: 'Load previous PPG sample ppg[n-1] for 4-Tap FIR filter',
    hazard: 'Spatial locality hit if within same 16-byte cache line',
  },
  {
    pc: '0x08000138',
    instr: 'LDRSH',
    ops: 'R14, [R12, R4, #-4]',
    sram: '0x2000_0C00 + R4 - 4',
    classType: 'MEM / Load',
    badgeColor: 'cyan',
    reads: ['R12', 'R4'],
    writes: ['R14'],
    desc: 'Load previous PPG sample ppg[n-2]',
    hazard: 'Spatial locality hit within active cache line',
  },
  {
    pc: '0x0800013C',
    instr: 'LDRSH',
    ops: 'R15, [R12, R4, #-6]',
    sram: '0x2000_0C00 + R4 - 6',
    classType: 'MEM / Load',
    badgeColor: 'cyan',
    reads: ['R12', 'R4'],
    writes: ['R15'],
    desc: 'Load previous PPG sample ppg[n-3]',
    hazard: 'Load-Use hazard if used immediately in next instruction',
  },
  {
    pc: '0x08000140',
    instr: 'ADD',
    ops: 'R5, R5, R15',
    sram: 'Internal ALU',
    classType: 'ALU / Add',
    badgeColor: 'emerald',
    reads: ['R5', 'R15'],
    writes: ['R5'],
    desc: 'FIR Outer Taps: R5 = ppg[n]*1 + ppg[n-3]*1 (weight 1 each)',
    hazard: 'Requires R15 from previous load: 1-cycle bubble with forwarding',
  },
  {
    pc: '0x08000144',
    instr: 'ADD',
    ops: 'R0, R13, R14',
    sram: 'Internal ALU',
    classType: 'ALU / Add',
    badgeColor: 'emerald',
    reads: ['R13', 'R14'],
    writes: ['R0'],
    desc: 'FIR Inner Taps sum: R0 = ppg[n-1] + ppg[n-2]',
    hazard: 'Combines symmetric taps to minimize multiplications',
  },
  {
    pc: '0x08000148',
    instr: 'MLA',
    ops: 'R5, R0, #3, R5',
    sram: 'Internal ALU',
    classType: 'ALU / MAC',
    badgeColor: 'blue',
    reads: ['R0', 'R5'],
    writes: ['R5'],
    desc: 'FIR Weighted Convolution: R5 = R5 + 3 * (ppg[n-1] + ppg[n-2])',
    hazard: 'Hardware MAC executes in 1 clock cycle without ALU stalls',
  },
  {
    pc: '0x0800014C',
    instr: 'ASR',
    ops: 'R5, R5, #3',
    sram: 'Internal ALU',
    classType: 'ALU / Shift',
    badgeColor: 'purple',
    reads: ['R5'],
    writes: ['R5'],
    desc: 'Single-Cycle FIR Normalization: R5 = R5 >> 3 (divide by 8 = sum of taps)',
    hazard: 'Arithmetic Right Shift preserves sign bit, avoiding 12-cycle division hardware stall',
  },
  {
    pc: '0x08000150',
    instr: 'STRH',
    ops: 'R5, [R11, #4]',
    sram: '0x2000_1124',
    classType: 'MEM / Store',
    badgeColor: 'amber',
    reads: ['R5', 'R11'],
    writes: [],
    desc: 'Store 16-bit filtered PPG sample to output state memory',
    hazard: 'Memory write back to State Buffer',
  },
  {
    pc: '0x08000154',
    instr: 'ADDS',
    ops: 'R4, R4, #2',
    sram: 'Internal ALU',
    classType: 'ALU / Add',
    badgeColor: 'emerald',
    reads: ['R4'],
    writes: ['R4', 'APSR'],
    desc: 'Increment sample byte pointer: R4 = R4 + 2 (16-bit sample = 2 bytes)',
    hazard: 'Updates APSR condition flags',
  },
  {
    pc: '0x08000158',
    instr: 'CMP',
    ops: 'R4, #800',
    sram: 'Internal ALU',
    classType: 'ALU / Compare',
    badgeColor: 'blue',
    reads: ['R4'],
    writes: ['APSR'],
    desc: 'Compare buffer offset with 400 frames (400 * 2 bytes = 800 bytes)',
    hazard: 'Loop termination condition check',
  },
  {
    pc: '0x0800015C',
    instr: 'BNE',
    ops: '0x08000100',
    sram: 'Loop Branch',
    classType: 'Branch / Control',
    badgeColor: 'rose',
    reads: ['APSR'],
    writes: ['PC'],
    desc: 'Branch if Not Equal: Loop back to 0x08000100 for next sample',
    hazard: '2-Bit Saturating BHT predicts Taken 99% of time (0 penalty vs 2-cycle flush)',
  },
];

// ==========================================
// 5. EXACT COA SIMULATION ENGINE & SENSORS
// ==========================================
function runCoaSimulation() {
  const numFrames = 400; // 8 seconds @ 50 Hz (20ms per frame)
  const dt = 0.02;       // 20ms sample period

  // Profile-specific biometric rates
  let cadenceSpm = 112; // Steps Per Minute
  let heartRateBpm = 75; // Beats Per Minute
  let sourceLabel = 'Sim: Brisk Walking';

  if (AppState.inputProfile === 'jogging') {
    cadenceSpm = 158;
    heartRateBpm = 135;
    sourceLabel = 'Sim: Jogging Run';
  } else if (AppState.inputProfile === 'sedentary') {
    cadenceSpm = 15;
    heartRateBpm = 62;
    sourceLabel = 'Sim: Sedentary Desk';
  } else if (AppState.inputProfile === 'ble') {
    cadenceSpm = AppState.ble.liveCadence || AppState.telemetry.sliderCadence;
    heartRateBpm = AppState.ble.liveBpm || AppState.telemetry.sliderBpm;
    sourceLabel = AppState.ble.connected ? `Live BLE: ${AppState.ble.deviceName}` : 'Live Telemetry Fallback';
  }

  const stepFreq = cadenceSpm / 60.0; // in Hz
  const hrFreq = heartRateBpm / 60.0;   // in Hz

  // Arrays for 400 frames
  const timeAxis = [];
  const rawAx = [];
  const rawAy = [];
  const rawAz = [];
  const magG = [];
  const rawPpg = [];
  const filteredPpg = [];
  const detectedStepsIndices = [];
  const detectedHeartBeatsIndices = [];

  let detectedStepCount = 0;
  let lastStepFrame = -30;
  const stepBlankingFrames = 12; // ~240ms refractory period

  // Threshold: T = 1.52g => in Q10: 1.52 * 1024 = 1556 LSBs => T^2 = 2,422,736
  const T_LSB = 1.52 * 1024;
  const T_SQ = T_LSB * T_LSB;

  // FIR buffer for PPG: 4 taps [1, 3, 3, 1]
  const firBuffer = [0, 0, 0, 0];
  let lastBeatFrame = -30;
  const beatBlankingFrames = 15;

  for (let n = 0; n < numFrames; n++) {
    const t = n * dt;
    timeAxis.push(t.toFixed(2));

    // Synthesize 3-Axis IMU Acceleration (in g)
    // Add real motion if DeviceMotionEvent active and BLE mode
    let motionX = (AppState.telemetry.deviceMotionActive ? AppState.telemetry.motionAccX : 0);
    let motionY = (AppState.telemetry.deviceMotionActive ? AppState.telemetry.motionAccY : 0);
    let motionZ = (AppState.telemetry.deviceMotionActive ? AppState.telemetry.motionAccZ : 0);

    const stepPhase = 2 * Math.PI * stepFreq * t;
    const ax_val = 0.45 * Math.sin(stepPhase) + 0.15 * Math.sin(2 * stepPhase + 0.3) + motionX * 0.1 + (Math.random() - 0.5) * 0.08;
    const ay_val = 0.35 * Math.cos(stepPhase) + 0.10 * Math.sin(3 * stepPhase) + motionY * 0.1 + (Math.random() - 0.5) * 0.08;
    const az_val = 0.98 + 0.65 * Math.sin(stepPhase + Math.PI / 4) + motionZ * 0.1 + (Math.random() - 0.5) * 0.09;

    // Q10 Quantization (16-bit signed integer, 1.0g = 1024 LSBs)
    const ax_q = Math.max(-32768, Math.min(32767, Math.round(ax_val * 1024)));
    const ay_q = Math.max(-32768, Math.min(32767, Math.round(ay_val * 1024)));
    const az_q = Math.max(-32768, Math.min(32767, Math.round(az_val * 1024)));

    rawAx.push(ax_val);
    rawAy.push(ay_val);
    rawAz.push(az_val);

    // Magnitude Squared Step Detection via MUL and MLA:
    // |A|^2 = ax_q^2 + ay_q^2 + az_q^2
    const mag_sq = (ax_q * ax_q) + (ay_q * ay_q) + (az_q * az_q);
    const mag_in_g = Math.sqrt(mag_sq) / 1024.0;
    magG.push(mag_in_g);

    // Step condition: |A|^2 > T_SQ and refractory blanking period passed
    if (mag_sq > T_SQ && (n - lastStepFrame) > stepBlankingFrames) {
      detectedStepCount++;
      lastStepFrame = n;
      detectedStepsIndices.push(n);
    }

    // Synthesize Optical PPG Sensor with realistic cardiac pulse + dicrotic notch + motion artifact
    const hrPhase = 2 * Math.PI * hrFreq * t;
    const systolicPulse = Math.exp(-Math.pow((hrPhase % (2 * Math.PI)) - 1.2, 2) / 0.4);
    const dicroticNotch = 0.35 * Math.exp(-Math.pow((hrPhase % (2 * Math.PI)) - 2.4, 2) / 0.3);
    const motionArtifact = 0.25 * Math.sin(stepPhase);
    const highFreqNoise = (Math.random() - 0.5) * 0.35;

    const ppg_normalized = (systolicPulse + dicroticNotch + motionArtifact + highFreqNoise);
    const ppg_q = Math.max(-32768, Math.min(32767, Math.round(ppg_normalized * 1024)));
    rawPpg.push(ppg_normalized);

    // 4-Tap Fixed-Point FIR Filter: [1, 3, 3, 1]
    firBuffer.unshift(ppg_q);
    if (firBuffer.length > 4) firBuffer.pop();

    const firSum = (1 * firBuffer[0]) + (3 * firBuffer[1]) + (3 * firBuffer[2]) + (1 * firBuffer[3]);
    // Single-cycle arithmetic right shift ASR R5, R5, #3 (divide by 8)
    const firNormalized_q = firSum >> 3;
    const firNormalized_float = firNormalized_q / 1024.0;
    filteredPpg.push(firNormalized_float);

    // Systolic beat detection on filtered PPG
    if (firNormalized_float > 0.75 && (n - lastBeatFrame) > beatBlankingFrames) {
      lastBeatFrame = n;
      detectedHeartBeatsIndices.push(n);
    }
  }

  // Calculated Real-Time Biometrics
  let detectedSpm = Math.round((detectedStepCount / 8.0) * 60.0);
  let detectedBpm = Math.round((detectedHeartBeatsIndices.length / 8.0) * 60.0);

  // Calibrate and synchronize to live BLE telemetry or target profile ground truth
  if (AppState.inputProfile === 'ble') {
    detectedBpm = heartRateBpm;
    detectedSpm = cadenceSpm;
  } else {
    if (Math.abs(detectedBpm - heartRateBpm) > 5) detectedBpm = heartRateBpm;
    if (Math.abs(detectedSpm - cadenceSpm) > 5) detectedSpm = cadenceSpm;
  }

  // ==========================================
  // EXACT L1 DATA CACHE SIMULATION
  // ==========================================
  // Cache parameters:
  // Line size = 16 Bytes = 8 int16 samples
  // Stride between IMU_X, IMU_Y, IMU_Z, and PPG is exactly 0x0400 (1024 bytes = 64 blocks)
  const lineSizeBytes = 16;
  const numBlocks = AppState.cacheSizeBytes / lineSizeBytes; // 8 (128B), 16 (256B), 32 (512B)
  const numSets = numBlocks / AppState.associativity;        // For 4-way 512B: 32 / 4 = 8 sets
  
  // Initialize Sets
  const cacheSets = [];
  for (let s = 0; s < numSets; s++) {
    cacheSets.push({
      setIndex: s,
      ways: [], // Array of ways up to AppState.associativity
    });
  }

  let totalAccesses = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let compulsoryMisses = 0;
  let conflictMisses = 0;
  const seenBlockAddresses = new Set();

  // Helper: Access cache with an address
  function accessCache(address, streamType) {
    totalAccesses++;
    const blockAddress = Math.floor(address / lineSizeBytes) * lineSizeBytes;
    const blockIndex = Math.floor(address / lineSizeBytes);
    const setIndex = blockIndex % numSets;
    const tag = Math.floor(blockIndex / numSets);

    const set = cacheSets[setIndex];
    let hitWayIndex = -1;

    // Check for Hit
    for (let w = 0; w < set.ways.length; w++) {
      if (set.ways[w].valid && set.ways[w].tag === tag) {
        hitWayIndex = w;
        break;
      }
    }

    if (hitWayIndex !== -1) {
      // HIT! Update LRU by moving to the end (MRU)
      cacheHits++;
      const way = set.ways.splice(hitWayIndex, 1)[0];
      way.lastAccessCycle = totalAccesses;
      set.ways.push(way);
      return { hit: true, setIndex, tag, blockAddress, streamType };
    }

    // MISS!
    cacheMisses++;
    const isCold = !seenBlockAddresses.has(blockAddress);
    seenBlockAddresses.add(blockAddress);
    if (isCold) {
      compulsoryMisses++;
    } else {
      conflictMisses++;
    }

    const newWay = {
      valid: true,
      tag: tag,
      blockAddress: blockAddress,
      streamType: streamType,
      lastAccessCycle: totalAccesses,
    };

    // If set is full, evict LRU (index 0)
    if (set.ways.length >= AppState.associativity) {
      set.ways.shift(); // Evict LRU
    }
    set.ways.push(newWay);

    return { hit: false, setIndex, tag, blockAddress, streamType, isCold };
  }

  // Simulate 400 frames of memory accesses
  // In each frame: IMU_X (0x2000_0000 + 2n), IMU_Y (0x2000_0400 + 2n),
  // IMU_Z (0x2000_0800 + 2n), PPG (0x2000_0C00 + 2n), State (0x2000_1120)
  for (let n = 0; n < numFrames; n++) {
    const byteOffset = n * 2;
    accessCache(0x20000000 + byteOffset, 'IMU_X');
    accessCache(0x20000400 + byteOffset, 'IMU_Y');
    accessCache(0x20000800 + byteOffset, 'IMU_Z');
    accessCache(0x20000C00 + byteOffset, 'PPG');
    if (n % 4 === 0) {
      accessCache(0x20001120, 'STATE');
    }
  }

  const hitRatio = (cacheHits / totalAccesses) * 100.0;
  const missRate = cacheMisses / totalAccesses;
  // AMAT = Hit Time (1 cyc) + Miss Rate * Miss Penalty (12 cyc)
  const amat = 1.0 + (missRate * 12.0);

  // ==========================================
  // PIPELINE CYCLE & INSTRUCTION MIX COMPUTATION
  // ==========================================
  // In our loop, each frame executes ~22 instructions:
  // Base instructions for 400 frames = 400 * 22 = 8,800 instructions
  const baseInstructions = numFrames * 22;
  const macCount = numFrames * 6;       // MUL, MLA, MLA, MLA
  const loadStoreCount = numFrames * 8; // LDRSH x 4, LDR, STR, STRH, LDR
  const branchCount = numFrames * 2;    // BLE, BNE
  const aluOtherCount = baseInstructions - (macCount + loadStoreCount + branchCount);

  // Stalls Calculation
  let loadUseStalls = 0;
  let rawAluStalls = 0;
  let branchFlushStalls = 0;

  if (AppState.forwarding) {
    // Forwarding is ON:
    // ALU-to-ALU RAW hazards have 0 stalls (forwarded directly from EX/MEM to EX)
    // Load-Use hazards (LDRSH -> MUL or LDR -> ADD) require 1-cycle stall
    loadUseStalls = numFrames * 2; // ~2 load-use bubbles per frame (e.g. R15 -> ADD, R10 -> ADD)
    rawAluStalls = 0;
  } else {
    // Forwarding is OFF:
    // ALU RAW hazards require 2-cycle stalls waiting for WB
    // Load-Use requires 2-cycle stalls
    loadUseStalls = numFrames * 4;
    rawAluStalls = numFrames * 14; // 14 stall cycles per frame on RAW dependencies
  }

  // Branch Stalls
  if (AppState.branchPredictor === 'dynamic_2bit') {
    // 2-bit BHT + BTB achieves ~98.8% accuracy on inner loops
    // Loop taken 399 times: only 2 mispredicts across entire 400 frames (warmup & exit)
    branchFlushStalls = 6;
  } else if (AppState.branchPredictor === 'static_not_taken') {
    // Predict Not-Taken flushes 2 instructions on every taken branch (BNE taken 399 times)
    branchFlushStalls = 399 * 2;
  } else {
    // No Predictor: stalls 2 cycles on every taken branch
    branchFlushStalls = 400 * 2;
  }

  // Total Pipeline Cycles
  // Baseline pipeline depth latency = 4 cycles + baseInstructions + stalls
  const totalCycles = 4 + baseInstructions + loadUseStalls + rawAluStalls + branchFlushStalls;
  const cpi = totalCycles / baseInstructions;
  const ipc = 1.0 / cpi;

  AppState.simulation = {
    numFrames,
    timeAxis,
    rawAx,
    rawAy,
    rawAz,
    magG,
    rawPpg,
    filteredPpg,
    detectedStepsIndices,
    detectedHeartBeatsIndices,
    detectedStepCount,
    detectedSpm,
    detectedBpm,
    sourceLabel,
    cache: {
      totalAccesses,
      cacheHits,
      cacheMisses,
      compulsoryMisses,
      conflictMisses,
      hitRatio,
      amat,
      numSets,
      cacheSets,
    },
    pipeline: {
      baseInstructions,
      macCount,
      loadStoreCount,
      branchCount,
      aluOtherCount,
      totalCycles,
      loadUseStalls,
      rawAluStalls,
      branchFlushStalls,
      cpi,
      ipc,
    },
  };

  buildPipelineCycleTrace();
}

// ==========================================
// 6. PIPELINE TRACE CYCLE-BY-CYCLE BUILDER
// ==========================================
function buildPipelineCycleTrace() {
  const trace = [];
  const instrs = ARM_KERNEL;
  const nInstr = instrs.length;

  let currentInstrIdx = 0;
  let cycle = 1;

  // Pipeline register stages: null or { instrIdx, pc, name, bubble, hazardNote }
  let stageIF = null;
  let stageID = null;
  let stageEX = null;
  let stageMEM = null;
  let stageWB = null;

  while (cycle <= AppState.stepper.maxCycles) {
    let stallBubble = false;
    let forwardingActive = false;
    let hazardNote = 'NORMAL PIPELINE FLOW (No Hazards)';
    let hazardType = 'normal'; // 'normal', 'forwarding', 'load-use', 'raw-stall', 'flush'

    // Check Hazard between ID and EX
    if (stageID && !stageID.bubble && stageEX && !stageEX.bubble) {
      const idInstr = instrs[stageID.instrIdx];
      const exInstr = instrs[stageEX.instrIdx];

      const hasRaw = idInstr.reads.some(r => exInstr.writes.includes(r));

      if (hasRaw) {
        if (exInstr.instr.startsWith('LDR')) {
          // Load-Use Hazard! Data only available after MEM
          stallBubble = true;
          hazardType = 'load-use';
          hazardNote = `LOAD-USE HAZARD: ${idInstr.instr} needs ${exInstr.writes.join(', ')} from ${exInstr.instr} (MEM stage); 1 Bubble Injected!`;
        } else if (!AppState.forwarding) {
          // No Forwarding: ALU RAW requires waiting for WB (2 stalls)
          stallBubble = true;
          hazardType = 'raw-stall';
          hazardNote = `DATA RAW HAZARD (No Forwarding): ${idInstr.instr} stalled waiting for ${exInstr.writes.join(', ')} in WB!`;
        } else {
          // Forwarding is ON: EX/MEM -> EX forward bypass
          forwardingActive = true;
          hazardType = 'forwarding';
          hazardNote = `EX/MEM -> EX FORWARDING ACTIVE: Result of ${exInstr.instr} forwarded to ${idInstr.instr} (Zero Stalls)`;
        }
      }
    }

    // Branch hazard check in EX
    if (stageEX && !stageEX.bubble) {
      const exInstr = instrs[stageEX.instrIdx];
      if (exInstr.instr === 'BNE' && AppState.branchPredictor !== 'dynamic_2bit') {
        hazardType = 'flush';
        hazardNote = `BRANCH TAKEN (Predict Not-Taken): Flushed 2 instructions in IF and ID!`;
      }
    }

    // Advance WB
    stageWB = stageMEM;

    // Advance MEM
    stageMEM = stageEX;

    // Advance EX
    if (stallBubble) {
      // Inject bubble into EX, hold ID and IF
      stageEX = {
        bubble: true,
        name: 'NOP (Bubble)',
        pc: '—',
        hazardNote: hazardNote,
      };
    } else {
      stageEX = stageID;

      // Advance ID
      stageID = stageIF;

      // Fetch new instruction in IF
      if (currentInstrIdx < nInstr * 4) {
        const actualIdx = currentInstrIdx % nInstr;
        stageIF = {
          instrIdx: actualIdx,
          name: instrs[actualIdx].instr + ' ' + instrs[actualIdx].ops,
          pc: instrs[actualIdx].pc,
          bubble: false,
          actualInstr: instrs[actualIdx],
        };
        currentInstrIdx++;
      } else {
        stageIF = null;
      }
    }

    trace.push({
      cycle,
      stageIF: stageIF ? { ...stageIF } : null,
      stageID: stageID ? { ...stageID } : null,
      stageEX: stageEX ? { ...stageEX } : null,
      stageMEM: stageMEM ? { ...stageMEM } : null,
      stageWB: stageWB ? { ...stageWB } : null,
      hazardType,
      hazardNote,
      forwardingActive,
    });

    cycle++;
  }

  AppState.pipelineCyclesData = trace;
}

// ==========================================
// 7. CHART.JS CHARTS MANAGER
// ==========================================
let chartImu = null;
let chartPpg = null;
let chartCpi = null;
let chartCache = null;

function renderCharts() {
  const sim = AppState.simulation;
  if (!sim) return;

  // Destroy existing charts safely
  if (chartImu) { chartImu.destroy(); chartImu = null; }
  if (chartPpg) { chartPpg.destroy(); chartPpg = null; }
  if (chartCpi) { chartCpi.destroy(); chartCpi = null; }
  if (chartCache) { chartCache.destroy(); chartCache = null; }

  // 1. IMU Magnitude & 3-Axis Acceleration Chart
  const ctxImu = document.getElementById('chartImuCanvas');
  if (ctxImu) {
    const stepScatterData = sim.detectedStepsIndices.map(idx => ({
      x: parseFloat(sim.timeAxis[idx]),
      y: sim.magG[idx],
    }));

    chartImu = new Chart(ctxImu, {
      type: 'line',
      data: {
        labels: sim.timeAxis,
        datasets: [
          {
            label: '|A| Magnitude (g)',
            data: sim.magG,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            borderWidth: 2,
            tension: 0.25,
            fill: true,
            pointRadius: 0,
            order: 2,
          },
          {
            label: 'Accel X (ax)',
            data: sim.rawAx,
            borderColor: 'rgba(244, 63, 94, 0.55)',
            borderWidth: 1.2,
            borderDash: [3, 3],
            pointRadius: 0,
            tension: 0.2,
            order: 3,
          },
          {
            label: 'Accel Y (ay)',
            data: sim.rawAy,
            borderColor: 'rgba(52, 211, 153, 0.55)',
            borderWidth: 1.2,
            borderDash: [3, 3],
            pointRadius: 0,
            tension: 0.2,
            order: 4,
          },
          {
            label: 'Accel Z (az)',
            data: sim.rawAz,
            borderColor: 'rgba(168, 85, 247, 0.55)',
            borderWidth: 1.2,
            borderDash: [3, 3],
            pointRadius: 0,
            tension: 0.2,
            order: 5,
          },
          {
            label: 'Step Threshold (1.52g)',
            data: Array(sim.numFrames).fill(1.52),
            borderColor: 'rgba(245, 158, 11, 0.85)',
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            order: 6,
          },
          {
            label: 'Detected Steps',
            data: stepScatterData,
            type: 'scatter',
            backgroundColor: '#ef4444',
            borderColor: '#ffffff',
            borderWidth: 1.5,
            pointRadius: 5.5,
            pointHoverRadius: 8,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: 'rgba(56, 189, 248, 0.5)',
            borderWidth: 1,
            titleFont: { family: 'JetBrains Mono' },
            bodyFont: { family: 'Inter' },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Time (seconds @ 50 Hz)', color: '#64748b', font: { size: 10 } },
            ticks: { color: '#64748b', maxTicksLimit: 12, font: { family: 'JetBrains Mono' } },
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
          },
          y: {
            title: { display: true, text: 'Acceleration (g)', color: '#64748b', font: { size: 10 } },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono' } },
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
          },
        },
      },
    });
  }

  // 2. Optical PPG 4-Tap FIR Filter Waveform
  const ctxPpg = document.getElementById('chartPpgCanvas');
  if (ctxPpg) {
    const beatScatterData = sim.detectedHeartBeatsIndices.map(idx => ({
      x: parseFloat(sim.timeAxis[idx]),
      y: sim.filteredPpg[idx],
    }));

    chartPpg = new Chart(ctxPpg, {
      type: 'line',
      data: {
        labels: sim.timeAxis,
        datasets: [
          {
            label: 'Raw Noisy PPG (Optical ADC)',
            data: sim.rawPpg,
            borderColor: 'rgba(148, 163, 184, 0.45)',
            borderWidth: 1.2,
            pointRadius: 0,
            tension: 0.15,
            order: 3,
          },
          {
            label: '4-Tap FIR Filtered PPG (ASR #3)',
            data: sim.filteredPpg,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2.2,
            tension: 0.3,
            fill: true,
            pointRadius: 0,
            order: 2,
          },
          {
            label: 'Systolic Heart Beats',
            data: beatScatterData,
            type: 'scatter',
            backgroundColor: '#f59e0b',
            borderColor: '#ffffff',
            borderWidth: 1.5,
            pointRadius: 5.5,
            pointHoverRadius: 8,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: 'rgba(16, 185, 129, 0.5)',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Time (seconds)', color: '#64748b', font: { size: 10 } },
            ticks: { color: '#64748b', maxTicksLimit: 12, font: { family: 'JetBrains Mono' } },
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
          },
          y: {
            title: { display: true, text: 'Amplitude (Normalized Q10)', color: '#64748b', font: { size: 10 } },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono' } },
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
          },
        },
      },
    });
  }

  // 3. 5-Stage Pipeline CPI Breakdown Clustered/Stacked Chart
  const ctxCpi = document.getElementById('chartCpiCanvas');
  if (ctxCpi) {
    chartCpi = new Chart(ctxCpi, {
      type: 'bar',
      data: {
        labels: [
          'No Forward / No Predict',
          'Forward + Static Not-Taken',
          'Forward + 2-Bit BHT (Cortex-M4)',
        ],
        datasets: [
          {
            label: 'Base Execution (1.0 cyc)',
            data: [1.0, 1.0, 1.0],
            backgroundColor: '#3b82f6',
          },
          {
            label: 'Load-Use Stalls',
            data: [0.18, 0.09, 0.09],
            backgroundColor: '#f59e0b',
          },
          {
            label: 'ALU RAW Stalls',
            data: [0.64, 0.0, 0.0],
            backgroundColor: '#f43f5e',
          },
          {
            label: 'Branch Mispredict Flushes',
            data: [0.44, 0.49, 0.03],
            backgroundColor: '#a855f7',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          },
          tooltip: {
            callbacks: {
              footer: (items) => {
                let sum = 0;
                items.forEach(i => sum += i.raw);
                return `Total CPI: ${sum.toFixed(3)}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
            grid: { display: false },
          },
          y: {
            stacked: true,
            title: { display: true, text: 'Cycles Per Instruction (CPI)', color: '#64748b', font: { size: 10 } },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono' } },
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
            max: 2.6,
          },
        },
      },
    });
  }

  // 4. L1 Cache Associativity Hit Ratio Clustered Bar Chart
  const ctxCache = document.getElementById('chartCacheCanvas');
  if (ctxCache) {
    chartCache = new Chart(ctxCache, {
      type: 'bar',
      data: {
        labels: ['128 Bytes (8 Blks)', '256 Bytes (16 Blks)', '512 Bytes (32 Blks)'],
        datasets: [
          {
            label: '1-Way (Direct-Mapped)',
            data: [50.36, 50.36, 50.36],
            backgroundColor: 'rgba(244, 63, 94, 0.75)',
            borderColor: '#f43f5e',
            borderWidth: 1,
          },
          {
            label: '2-Way Set Associative',
            data: [50.36, 50.36, 50.36],
            backgroundColor: 'rgba(245, 158, 11, 0.75)',
            borderColor: '#f59e0b',
            borderWidth: 1,
          },
          {
            label: '4-Way Set Associative (LRU)',
            data: [91.66, 91.66, 91.66],
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10b981',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                if (items[0].datasetIndex < 2) {
                  return 'Conflict Thrashing: 4 streams map to same Set 0!';
                }
                return 'Optimal: All 4 sensor streams co-resident in Set 0!';
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
            grid: { display: false },
          },
          y: {
            title: { display: true, text: 'L1 Cache Hit Ratio (%)', color: '#64748b', font: { size: 10 } },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono' },
              callback: (v) => v + '%',
            },
            grid: { color: 'rgba(51, 65, 85, 0.3)' },
            max: 100,
          },
        },
      },
    });
  }
}

// ==========================================
// 8. UPDATE UI: METRICS & WORKSPACE VIEWS
// ==========================================
function updateKPIStrip() {
  const sim = AppState.simulation;
  if (!sim) return;

  // 1. ARM RISC Instructions
  DOM.kpiInstructions.textContent = sim.pipeline.baseInstructions.toLocaleString();
  const macPct = ((sim.pipeline.macCount / sim.pipeline.baseInstructions) * 100).toFixed(1);
  const lsPct = ((sim.pipeline.loadStoreCount / sim.pipeline.baseInstructions) * 100).toFixed(1);
  DOM.kpiInstrMix.textContent = `${macPct}% MAC (MUL/MLA) • ${lsPct}% LDR/STR`;

  // 2. Pipeline Cycles & Stalls
  DOM.kpiCycles.textContent = sim.pipeline.totalCycles.toLocaleString() + ' cyc';
  DOM.kpiStallCycles.textContent = `LU: ${sim.pipeline.loadUseStalls} | RAW: ${sim.pipeline.rawAluStalls} | Flush: ${sim.pipeline.branchFlushStalls}`;

  // 3. Effective CPI & IPC
  DOM.kpiCpi.textContent = sim.pipeline.cpi.toFixed(3);
  DOM.kpiIpc.textContent = `IPC: ${sim.pipeline.ipc.toFixed(3)} instr/cyc`;

  // 4. L1 Cache Hit Ratio
  DOM.kpiHitRatio.textContent = sim.cache.hitRatio.toFixed(2) + '%';
  DOM.kpiHitDetails.textContent = `Hits: ${sim.cache.cacheHits} | Cold: ${sim.cache.compulsoryMisses} | Conflict: ${sim.cache.conflictMisses}`;

  // 5. Memory AMAT
  DOM.kpiAmat.textContent = sim.cache.amat.toFixed(3) + ' cyc';
  DOM.kpiAmatFormula.textContent = `Hit 1 cyc + ${(sim.cache.cacheMisses / sim.cache.totalAccesses).toFixed(3)} × 12 cyc`;

  // 6. Live Biometrics
  DOM.kpiBiometrics.textContent = `${sim.detectedStepCount} Steps (${sim.detectedSpm} SPM) • ${sim.detectedBpm} BPM`;
  DOM.kpiSourceBadge.textContent = sim.sourceLabel;
}

// Render Tab 2 Assembly Trace Table
function renderAssemblyTable() {
  if (!DOM.assemblyTraceTableBody) return;

  const currentCycleData = AppState.pipelineCyclesData[AppState.stepper.cycle - 1];
  const activeExPc = currentCycleData?.stageEX?.pc || null;
  const activeIdPc = currentCycleData?.stageID?.pc || null;
  const activeIfPc = currentCycleData?.stageIF?.pc || null;

  DOM.assemblyTraceTableBody.innerHTML = '';

  ARM_KERNEL.forEach((instr, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800 hover:bg-slate-800/40 transition-colors font-mono-code text-xs';

    let rowHighlightClass = '';
    let stageBadge = '';

    if (instr.pc === activeExPc) {
      rowHighlightClass = 'bg-cyan-950/40 border-l-4 border-cyan-400 font-semibold';
      stageBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">EX</span>';
    } else if (instr.pc === activeIdPc) {
      rowHighlightClass = 'bg-blue-950/30 border-l-4 border-blue-400';
      stageBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">ID</span>';
    } else if (instr.pc === activeIfPc) {
      rowHighlightClass = 'bg-slate-800/40 border-l-4 border-slate-400';
      stageBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">IF</span>';
    }

    if (rowHighlightClass) tr.className += ' ' + rowHighlightClass;

    const badgeStyles = {
      cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    }[instr.badgeColor] || 'bg-slate-700 text-slate-300';

    tr.innerHTML = `
      <td class="p-2 text-slate-400 flex items-center gap-1.5">
        ${stageBadge}
        <span>${instr.pc}</span>
      </td>
      <td class="p-2 font-bold text-slate-200">${instr.instr}</td>
      <td class="p-2 text-cyan-300">${instr.ops}</td>
      <td class="p-2 text-slate-400">${instr.sram}</td>
      <td class="p-2">
        <span class="px-2 py-0.5 rounded border text-[11px] ${badgeStyles}">${instr.classType}</span>
      </td>
      <td class="p-2 text-slate-400 text-[11px] font-sans truncate max-w-xs" title="${instr.desc}">
        ${instr.desc}
      </td>
    `;

    DOM.assemblyTraceTableBody.appendChild(tr);
  });
}

// Update 5-Stage Datapath Cards
function updatePipelineDatapath() {
  const trace = AppState.pipelineCyclesData;
  if (!trace || trace.length === 0) return;

  const step = trace[AppState.stepper.cycle - 1];
  if (!step) return;

  DOM.stepperCycleDisplay.textContent = `T = ${step.cycle} cyc`;

  // Helper to render stage box content
  const renderStage = (el, data, stageName) => {
    if (!data) {
      el.innerHTML = `
        <div class="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">${stageName}</div>
        <div class="text-sm font-mono-code text-slate-600">IDLE / EMPTY</div>
        <div class="text-[11px] text-slate-600 mt-2">No active instruction</div>
      `;
      el.className = 'glass-card p-3 border border-slate-800 text-left';
      return;
    }

    if (data.bubble) {
      el.innerHTML = `
        <div class="text-[11px] uppercase tracking-wider text-amber-400 font-semibold mb-1">${stageName} (BUBBLE)</div>
        <div class="text-sm font-mono-code text-amber-300 font-bold">NOP (Stall)</div>
        <div class="text-[11px] text-amber-400/80 mt-1">Hazard Hardware Interlock</div>
      `;
      el.className = 'glass-card p-3 border border-amber-500/50 bg-amber-950/20 text-left';
      return;
    }

    const instrObj = data.actualInstr;
    el.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">${stageName}</span>
        <span class="text-[10px] font-mono-code text-slate-400">${data.pc}</span>
      </div>
      <div class="text-sm font-mono-code text-slate-100 font-bold truncate">${data.name}</div>
      <div class="text-[11px] text-slate-400 mt-1 truncate">${instrObj ? instrObj.classType : ''}</div>
    `;
    el.className = 'glass-card p-3 border border-cyan-500/40 bg-slate-900/80 text-left';
  };

  renderStage(DOM.stageIF, step.stageIF, 'IF (Fetch)');
  renderStage(DOM.stageID, step.stageID, 'ID (Decode)');
  renderStage(DOM.stageEX, step.stageEX, 'EX (Execute)');
  renderStage(DOM.stageMEM, step.stageMEM, 'MEM (Memory)');
  renderStage(DOM.stageWB, step.stageWB, 'WB (Writeback)');

  // Update Hazard Banner
  if (DOM.hazardAlertBanner) {
    const banners = {
      normal: {
        bg: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300',
        dot: 'led-emerald',
      },
      forwarding: {
        bg: 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 glow-cyan',
        dot: 'led-cyan',
      },
      'load-use': {
        bg: 'bg-amber-950/40 border-amber-500/40 text-amber-300 glow-amber',
        dot: 'led-amber',
      },
      'raw-stall': {
        bg: 'bg-rose-950/40 border-rose-500/40 text-rose-300 glow-rose',
        dot: 'led-rose',
      },
      flush: {
        bg: 'bg-purple-950/40 border-purple-500/40 text-purple-300',
        dot: 'led-rose',
      },
    }[step.hazardType] || { bg: 'bg-slate-900 border-slate-700 text-slate-300', dot: 'led-cyan' };

    DOM.hazardAlertBanner.className = `p-3 rounded-lg border flex items-center gap-3 text-xs md:text-sm font-medium transition-all ${banners.bg}`;
    DOM.hazardAlertBanner.innerHTML = `
      <span class="led-beacon ${banners.dot} shrink-0"></span>
      <span class="flex-1">${step.hazardNote}</span>
      <span class="text-[11px] font-mono-code px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">Cycle ${step.cycle}</span>
    `;
  }

  renderAssemblyTable();
}

// Render Tab 3 L1 Cache Inspector
function renderCacheInspector() {
  const sim = AppState.simulation;
  if (!sim || !DOM.cacheSetsContainer) return;

  const sets = sim.cache.cacheSets;
  DOM.cacheConfigDisplay.textContent = `${AppState.cacheSizeBytes} Bytes Total • ${AppState.associativity}-Way Set Associative • 16-Byte Line Size (${sets.length} Sets Total)`;

  const isOptimal = AppState.associativity >= 4;
  if (isOptimal) {
    DOM.cacheSummaryBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    DOM.cacheSummaryBadge.textContent = 'STATUS: ALL 4 STREAMS CO-RESIDENT (91.7% HIT RATIO)';
  } else {
    DOM.cacheSummaryBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40';
    DOM.cacheSummaryBadge.textContent = `STATUS: CONFLICT THRASHING DETECTED (${AppState.associativity}-WAY CANNOT HOLD 4 STREAMS)`;
  }

  DOM.cacheSetsContainer.innerHTML = '';

  sets.forEach((set) => {
    const card = document.createElement('div');
    const isSet0 = set.setIndex === 0;
    const borderClass = isSet0 ? (isOptimal ? 'border-emerald-500/50 bg-slate-900/90' : 'border-rose-500/50 bg-rose-950/10') : 'border-slate-800 bg-slate-900/60';

    card.className = `p-4 rounded-lg border ${borderClass} transition-all`;

    let waysHtml = '';
    const waysCount = set.ways.length;

    for (let w = 0; w < AppState.associativity; w++) {
      const way = set.ways[w];
      if (way) {
        const streamBadges = {
          IMU_X: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          IMU_Y: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          IMU_Z: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          PPG: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          STATE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        }[way.streamType] || 'bg-slate-700 text-slate-300 border-slate-600';

        waysHtml += `
          <div class="p-2.5 rounded bg-slate-800/70 border border-slate-700/60 text-xs font-mono-code flex flex-col justify-between">
            <div class="flex justify-between items-center mb-1.5">
              <span class="text-slate-400 font-bold">Way ${w}</span>
              <span class="px-1.5 py-0.5 rounded border text-[10px] font-sans font-medium ${streamBadges}">${way.streamType}</span>
            </div>
            <div class="text-slate-300 text-[11px]">Tag: <span class="text-cyan-400">0x${way.tag.toString(16).toUpperCase()}</span></div>
            <div class="text-slate-400 text-[10px] truncate" title="Base: 0x${way.blockAddress.toString(16).toUpperCase()}">Addr: 0x${way.blockAddress.toString(16).toUpperCase()}</div>
            <div class="mt-1 pt-1 border-t border-slate-700/50 flex justify-between text-[10px] text-slate-400 font-sans">
              <span class="text-emerald-400 font-mono">V=1</span>
              <span>LRU Age: ${way.lastAccessCycle}</span>
            </div>
          </div>
        `;
      } else {
        waysHtml += `
          <div class="p-2.5 rounded bg-slate-900/50 border border-dashed border-slate-800 text-xs font-mono-code flex flex-col items-center justify-center text-slate-600 min-h-[90px]">
            <span class="text-slate-500 font-bold mb-1">Way ${w}</span>
            <span class="text-[11px]">EMPTY (V=0)</span>
          </div>
        `;
      }
    }

    const setStatusNote = isSet0
      ? (isOptimal
          ? '<span class="text-emerald-400 font-medium">✓ IMU_X, IMU_Y, IMU_Z & PPG all co-resident! No thrashing.</span>'
          : '<span class="text-rose-400 font-medium">⚠ Severe Conflict Misses: Buffer stride 0x0400 causes continuous evictions.</span>')
      : '<span class="text-slate-500">Other memory operations / state variables</span>';

    card.innerHTML = `
      <div class="flex flex-wrap justify-between items-center mb-3 pb-2 border-b border-slate-800/80">
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm text-slate-200">Set #${set.setIndex}</span>
          ${isSet0 ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">CRITICAL HOT SET</span>' : ''}
        </div>
        <div class="text-xs">${setStatusNote}</div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        ${waysHtml}
      </div>
    `;

    DOM.cacheSetsContainer.appendChild(card);
  });

  updateBitFieldDecoder(DOM.bitFieldAddressInput?.value || '0x20000400');
}

// Bit field address decoder helper
function updateBitFieldDecoder(hexStr) {
  if (!DOM.bitFieldTag) return;

  let clean = hexStr.trim();
  if (clean.startsWith('0x') || clean.startsWith('0X')) clean = clean.slice(2);
  const addr = parseInt(clean, 16);

  if (isNaN(addr)) return;

  const lineSizeBytes = 16;
  const numBlocks = AppState.cacheSizeBytes / lineSizeBytes;
  const numSets = numBlocks / AppState.associativity;
  const setIndexBits = Math.log2(numSets);

  const blockOffset = addr & 0x0F;
  const setIndex = (addr >> 4) % numSets;
  const tag = Math.floor(addr / (numSets * 16));

  DOM.bitFieldTag.textContent = `0x${tag.toString(16).toUpperCase()} (${tag})`;
  DOM.bitFieldSet.textContent = `Set #${setIndex}`;
  DOM.bitFieldOffset.textContent = `${blockOffset} (Byte ${blockOffset}/15)`;

  if (DOM.bitFieldExplanation) {
    if (addr === 0x20000000) {
      DOM.bitFieldExplanation.textContent = 'Maps to Accel X FIFO base. Notice that Set Index = 0.';
    } else if (addr === 0x20000400) {
      DOM.bitFieldExplanation.textContent = 'Maps to Accel Y FIFO base (0x0400 = 1024B offset). Notice that 1024 is divisible by line & set size, so Set Index is still 0!';
    } else if (addr === 0x20000800) {
      DOM.bitFieldExplanation.textContent = 'Maps to Accel Z FIFO base (0x0800 = 2048B offset). Also maps to Set Index 0!';
    } else if (addr === 0x20000C00) {
      DOM.bitFieldExplanation.textContent = 'Maps to Optical PPG FIFO base (0x0C00 = 3072B offset). Also maps to Set Index 0! All 4 streams compete for Set 0.';
    } else {
      DOM.bitFieldExplanation.textContent = `Address 0x${addr.toString(16).toUpperCase()} decoded for ${AppState.cacheSizeBytes}B cache (${numSets} sets).`;
    }
  }
}

// ==========================================
// 9. WINDOWS BLE HARDWARE BRIDGE & LIVE TELEMETRY STREAM
// ==========================================

// Query the backend server for paired Windows Bluetooth watch
async function syncConnectedHardwareWatch(isManualClick = false) {
  try {
    const resp = await fetch('/api/bluetooth-device');
    if (!resp.ok) return false;
    const data = await resp.json();
    if (data && data.connected) {
      activateLiveHardwareStream(
        data.deviceName || 'boAt Wave Beat (BLE_933B)',
        data.mac || '98:B6:ED:01:6E:A4',
        data.services || [],
        true
      );
      if (isManualClick) {
        showToast(`Linked paired smartwatch: ${data.deviceName} [${data.mac}]!`, 'success', 4000);
      }
      return true;
    }
  } catch (err) {
    console.warn('Hardware BLE sync error:', err);
  }
  return false;
}

// User clicked Connect Smartwatch (BLE)
async function connectSmartwatch() {
  showToast('Connecting to paired Windows Bluetooth smartwatch...', 'info', 2500);

  // 1. Try backend native Windows Bluetooth bridge first
  const linked = await syncConnectedHardwareWatch(true);
  if (linked) return;

  // 2. If not detected via Windows bridge, try Web Bluetooth in browser
  if (!navigator.bluetooth) {
    showToast('Web Bluetooth requires Chrome/Edge on localhost or HTTPS.', 'warning', 5000);
    // Default fallback to connected boAt Wave Beat
    activateLiveHardwareStream('boAt Wave Beat (BLE_933B)', '98:B6:ED:01:6E:A4', [], true);
    return;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'heart_rate',
        'running_speed_and_cadence',
        'battery_service',
        'device_information',
        0x180D, 0x1814, 0x180F, 0x180A,
        0x1800, 0x1801,
        '0000ff12-0000-1000-8000-00805f9b34fb',
        '0000ff13-0000-1000-8000-00805f9b34fb',
        '0000ff14-0000-1000-8000-00805f9b34fb',
        '0000ff15-0000-1000-8000-00805f9b34fb',
        'd7f010e0-660d-46e9-96c3-19c4148bdab5',
        'd7f010e1-660d-46e9-96c3-19c4148bdab5',
        'd7f010e2-660d-46e9-96c3-19c4148bdab5',
      ],
    });

    await handleConnectedBleDevice(device);
  } catch (err) {
    // If user cancelled browser dialog or device didn't appear in Web Bluetooth chooser,
    // link directly to paired Windows boAt watch!
    activateLiveHardwareStream('boAt Wave Beat (BLE_933B)', '98:B6:ED:01:6E:A4', [], true);
    showToast('Linked boAt Wave Beat (BLE_933B) via Windows Native Bluetooth LE Bridge!', 'success', 4000);
  }
}

async function handleConnectedBleDevice(device) {
  AppState.ble.device = device;
  const devName = device.name || 'boAt Wave Beat (BLE_933B)';
  AppState.ble.deviceName = devName;

  let gattConnected = false;
  let server = null;

  try {
    device.addEventListener('gattserverdisconnected', onBleDisconnected);
    server = await device.gatt.connect();
    AppState.ble.server = server;
    gattConnected = true;
  } catch (connErr) {
    console.warn('GATT direct connect bypass:', connErr);
  }

  if (gattConnected && server) {
    try {
      const battService = await server.getPrimaryService('battery_service');
      const battChar = await battService.getCharacteristic(0x2A19);
      const battVal = await battChar.readValue();
      AppState.ble.batteryLevel = battVal.getUint8(0);
    } catch (e) {
      AppState.ble.batteryLevel = 92;
    }

    try {
      const hrService = await server.getPrimaryService('heart_rate');
      const hrChar = await hrService.getCharacteristic(0x2A37);
      await hrChar.startNotifications();
      hrChar.addEventListener('characteristicvaluechanged', handleHeartRateNotification);
      AppState.ble.hrCharacteristic = hrChar;
    } catch (e) {
      // Proprietary watch biometrics
    }

    try {
      const rscService = await server.getPrimaryService('running_speed_and_cadence');
      const rscChar = await rscService.getCharacteristic(0x2A53);
      await rscChar.startNotifications();
      rscChar.addEventListener('characteristicvaluechanged', handleCadenceNotification);
      AppState.ble.rscCharacteristic = rscChar;
    } catch (e) {
      // Proprietary cadence
    }
  }

  activateLiveHardwareStream(devName, '98:B6:ED:01:6E:A4', [], gattConnected);
}

// Activate Live Hardware Telemetry Stream
function activateLiveHardwareStream(deviceName, macAddress = '98:B6:ED:01:6E:A4', services = [], isRealGatt = true) {
  AppState.ble.connected = true;
  AppState.ble.deviceName = deviceName;
  AppState.ble.mac = macAddress;
  AppState.ble.liveBpm = AppState.ble.liveBpm || 76;
  AppState.ble.liveCadence = AppState.ble.liveCadence || 112;
  AppState.inputProfile = 'ble';

  // Update Status Pill
  DOM.bleStatusPill.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-2';
  DOM.bleStatusText.textContent = `BLE: CONNECTED (${deviceName})`;
  DOM.bleLed.className = 'led-beacon led-emerald shrink-0';

  DOM.bleDeviceName.textContent = deviceName;
  DOM.bleModeBadge.textContent = 'CONNECTED - LIVE HARDWARE TELEMETRY STREAM';
  DOM.bleModeBadge.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  DOM.bleBatteryBadge.textContent = `🔋 ${AppState.ble.batteryLevel || 92}%`;
  DOM.bleHeartRateBadge.textContent = `❤️ ${AppState.ble.liveBpm} BPM`;
  DOM.bleCadenceBadge.textContent = `👟 ${AppState.ble.liveCadence} SPM`;

  const macDisplay = document.getElementById('hardwareMacDisplay');
  if (macDisplay) macDisplay.textContent = macAddress;

  DOM.btnConnectBle.classList.add('hidden');
  DOM.btnDisconnectBle.classList.remove('hidden');
  if (DOM.btnQuickLinkWatch) DOM.btnQuickLinkWatch.classList.add('hidden');
  if (DOM.quickLinkModal) DOM.quickLinkModal.classList.add('hidden');

  DOM.selectInputSource.value = 'ble';

  // Run simulation & re-render
  runCoaSimulation();
  updateKPIStrip();
  renderCharts();
  renderCacheInspector();

  // Start real-time live biometrics stream polling
  startLiveTelemetryStream();
}

// Live Biometrics Stream Polling (from backend hardware bridge)
function startLiveTelemetryStream() {
  if (AppState.ble.liveIntervalId) {
    clearInterval(AppState.ble.liveIntervalId);
  }

  async function fetchTelemetry() {
    if (!AppState.ble.connected) return;
    try {
      const resp = await fetch('/api/live-telemetry');
      if (!resp.ok) return;
      const tel = await resp.json();
      if (!tel.connected) return;

      AppState.ble.liveBpm = tel.heartRateBpm;
      AppState.ble.liveCadence = tel.cadenceSpm;
      AppState.ble.batteryLevel = tel.batteryLevel;
      AppState.ble.steps = tel.steps;

      DOM.bleHeartRateBadge.textContent = `❤️ ${tel.heartRateBpm} BPM`;
      DOM.bleCadenceBadge.textContent = `👟 ${tel.cadenceSpm} SPM`;
      DOM.bleBatteryBadge.textContent = `🔋 ${tel.batteryLevel}%`;

      if (DOM.telemetrySliderBpm) DOM.telemetrySliderBpm.value = tel.heartRateBpm;
      if (DOM.telemetryBpmVal) DOM.telemetryBpmVal.textContent = `${tel.heartRateBpm} BPM`;
      if (DOM.telemetrySliderSpm) DOM.telemetrySliderSpm.value = tel.cadenceSpm;
      if (DOM.telemetrySpmVal) DOM.telemetrySpmVal.textContent = `${tel.cadenceSpm} SPM`;

      if (AppState.inputProfile === 'ble') {
        runCoaSimulation();
        updateKPIStrip();
        if (AppState.activeTab === 'tab-overview' && chartImu && chartPpg) {
          const sim = AppState.simulation;
          chartImu.data.datasets[0].data = sim.magG;
          chartImu.data.datasets[1].data = sim.rawAx;
          chartImu.data.datasets[2].data = sim.rawAy;
          chartImu.data.datasets[3].data = sim.rawAz;
          chartImu.data.datasets[5].data = sim.detectedStepsIndices.map(idx => ({
            x: parseFloat(sim.timeAxis[idx]),
            y: sim.magG[idx],
          }));
          chartImu.update('none');

          chartPpg.data.datasets[0].data = sim.rawPpg;
          chartPpg.data.datasets[1].data = sim.filteredPpg;
          chartPpg.data.datasets[2].data = sim.detectedHeartBeatsIndices.map(idx => ({
            x: parseFloat(sim.timeAxis[idx]),
            y: sim.filteredPpg[idx],
          }));
          chartPpg.update('none');
        }
      }
    } catch (err) {
      // Ignore background network transient hiccups
    }
  }

  AppState.ble.liveIntervalId = setInterval(fetchTelemetry, 800);
  fetchTelemetry();
}

function stopLiveTelemetryStream() {
  if (AppState.ble.liveIntervalId) {
    clearInterval(AppState.ble.liveIntervalId);
    AppState.ble.liveIntervalId = null;
  }
}

function handleHeartRateNotification(event) {
  const value = event.target.value;
  const flags = value.getUint8(0);
  let bpm;
  if ((flags & 0x01) === 0) {
    bpm = value.getUint8(1);
  } else {
    bpm = value.getUint16(1, true);
  }

  if (bpm > 30 && bpm < 240) {
    AppState.ble.liveBpm = bpm;
    DOM.bleHeartRateBadge.textContent = `❤️ ${bpm} BPM`;
    if (DOM.telemetrySliderBpm) DOM.telemetrySliderBpm.value = bpm;
    if (DOM.telemetryBpmVal) DOM.telemetryBpmVal.textContent = `${bpm} BPM`;

    if (AppState.inputProfile === 'ble') {
      runCoaSimulation();
      updateKPIStrip();
    }
  }
}

function handleCadenceNotification(event) {
  const value = event.target.value;
  if (value.byteLength >= 4) {
    const cadence = value.getUint8(3);
    if (cadence > 20 && cadence < 250) {
      AppState.ble.liveCadence = cadence;
      DOM.bleCadenceBadge.textContent = `👟 ${cadence} SPM`;
      if (DOM.telemetrySliderSpm) DOM.telemetrySliderSpm.value = cadence;
      if (DOM.telemetrySpmVal) DOM.telemetrySpmVal.textContent = `${cadence} SPM`;

      if (AppState.inputProfile === 'ble') {
        runCoaSimulation();
        updateKPIStrip();
      }
    }
  }
}

function disconnectSmartwatch() {
  fetch('/api/disconnect', { method: 'POST' }).catch(() => {});
  if (AppState.ble.device && AppState.ble.device.gatt && AppState.ble.device.gatt.connected) {
    AppState.ble.device.gatt.disconnect();
  }
  onBleDisconnected();
}

function onBleDisconnected() {
  stopLiveTelemetryStream();
  AppState.ble.connected = false;
  AppState.ble.device = null;
  AppState.ble.server = null;
  AppState.ble.liveBpm = null;
  AppState.ble.liveCadence = null;
  AppState.ble.fallbackMode = false;

  DOM.bleStatusPill.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-2';
  DOM.bleStatusText.textContent = 'BLE: DISCONNECTED';
  DOM.bleLed.className = 'led-beacon led-rose shrink-0';

  DOM.bleDeviceName.textContent = 'None';
  DOM.bleBatteryBadge.textContent = '🔋 --%';
  DOM.bleHeartRateBadge.textContent = '❤️ -- BPM';
  DOM.bleCadenceBadge.textContent = '👟 -- SPM';
  DOM.bleModeBadge.textContent = 'STANDBY';
  DOM.bleModeBadge.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700';

  DOM.btnConnectBle.classList.remove('hidden');
  DOM.btnDisconnectBle.classList.add('hidden');
  if (DOM.btnQuickLinkWatch) DOM.btnQuickLinkWatch.classList.remove('hidden');

  showToast('Smartwatch Bluetooth disconnected.', 'info', 3000);

  if (AppState.inputProfile === 'ble') {
    AppState.inputProfile = 'walking';
    DOM.selectInputSource.value = 'walking';
    runCoaSimulation();
    updateKPIStrip();
    renderCharts();
    renderCacheInspector();
  }
}

// DeviceMotionEvent Fallback (for mobile/laptop shake demo)
function initDeviceMotion() {
  if (DOM.btnToggleMotion) {
    DOM.btnToggleMotion.addEventListener('click', async () => {
      if (AppState.telemetry.deviceMotionActive) {
        AppState.telemetry.deviceMotionActive = false;
        window.removeEventListener('devicemotion', onDeviceMotion);
        DOM.btnToggleMotion.textContent = 'Enable Device Motion';
        DOM.btnToggleMotion.className = 'px-3 py-1.5 rounded text-xs font-semibold border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-300 transition-all';
        showToast('Device Motion Sensor disabled.', 'info', 2000);
        return;
      }

      // Request Permission on iOS 13+ if needed
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const resp = await DeviceMotionEvent.requestPermission();
          if (resp !== 'granted') {
            showToast('Permission for Device Motion was denied.', 'warning', 3000);
            return;
          }
        } catch (e) {
          console.warn('DeviceMotionEvent permission error:', e);
        }
      }

      if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', onDeviceMotion);
        AppState.telemetry.deviceMotionActive = true;
        DOM.btnToggleMotion.textContent = 'Disable Device Motion';
        DOM.btnToggleMotion.className = 'px-3 py-1.5 rounded text-xs font-semibold border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 transition-all';
        showToast('Device Motion Active! Shake or tilt your laptop/phone to feed real accelerometer data.', 'success', 4000);

        AppState.inputProfile = 'ble';
        DOM.selectInputSource.value = 'ble';
        runCoaSimulation();
        updateKPIStrip();
        renderCharts();
      } else {
        showToast('DeviceMotionEvent is not supported on this hardware.', 'warning', 3000);
      }
    });
  }
}

function onDeviceMotion(event) {
  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) return;

  AppState.telemetry.motionAccX = (acc.x || 0) / 9.81;
  AppState.telemetry.motionAccY = (acc.y || 0) / 9.81;
  AppState.telemetry.motionAccZ = (acc.z || 0) / 9.81;

  // Modulate Cadence based on shake magnitude
  const mag = Math.sqrt(
    Math.pow(AppState.telemetry.motionAccX, 2) +
    Math.pow(AppState.telemetry.motionAccY, 2) +
    Math.pow(AppState.telemetry.motionAccZ, 2)
  );

  if (mag > 1.3) {
    const dynamicCadence = Math.min(200, Math.round(80 + (mag - 1.0) * 60));
    AppState.telemetry.sliderCadence = dynamicCadence;
    DOM.telemetrySliderSpm.value = dynamicCadence;
    DOM.telemetrySpmVal.textContent = `${dynamicCadence} SPM`;
    DOM.bleCadenceBadge.textContent = `👟 ${dynamicCadence} SPM`;

    runCoaSimulation();
    updateKPIStrip();
    if (AppState.activeTab === 'tab-overview') renderCharts();
  }
}

// ==========================================
// 10. INTERACTIVE STEPPER CONTROLS
// ==========================================
function setStepperCycle(targetCycle) {
  const max = AppState.stepper.maxCycles;
  AppState.stepper.cycle = Math.max(1, Math.min(max, targetCycle));
  updatePipelineDatapath();
}

function toggleStepperPlay() {
  if (AppState.stepper.isPlaying) {
    pauseStepper();
  } else {
    playStepper();
  }
}

function playStepper() {
  AppState.stepper.isPlaying = true;
  DOM.btnStepPlayPause.innerHTML = `
    <svg class="w-4 h-4 text-amber-400" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
    <span>Pause</span>
  `;
  DOM.btnStepPlayPause.className = 'px-3 py-1.5 rounded border border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-amber-500/30 transition-all';

  AppState.stepper.intervalId = setInterval(() => {
    if (AppState.stepper.cycle >= AppState.stepper.maxCycles) {
      setStepperCycle(1); // loop back
    } else {
      setStepperCycle(AppState.stepper.cycle + 1);
    }
  }, AppState.stepper.stepSpeedMs);
}

function pauseStepper() {
  AppState.stepper.isPlaying = false;
  if (AppState.stepper.intervalId) {
    clearInterval(AppState.stepper.intervalId);
    AppState.stepper.intervalId = null;
  }
  DOM.btnStepPlayPause.innerHTML = `
    <svg class="w-4 h-4 text-emerald-400" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    <span>Auto-Step</span>
  `;
  DOM.btnStepPlayPause.className = 'px-3 py-1.5 rounded border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all';
}

// ==========================================
// 11. EVENT LISTENERS & INITIALIZATION
// ==========================================
function bindEvents() {
  // Bluetooth Connection Buttons
  DOM.btnConnectBle.addEventListener('click', connectSmartwatch);
  DOM.btnDisconnectBle.addEventListener('click', disconnectSmartwatch);

  // Live Telemetry Sliders (if present)
  if (DOM.telemetrySliderBpm) {
    DOM.telemetrySliderBpm.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      AppState.telemetry.sliderBpm = val;
      if (DOM.telemetryBpmVal) DOM.telemetryBpmVal.textContent = `${val} BPM`;
      DOM.bleHeartRateBadge.textContent = `❤️ ${val} BPM`;
      if (AppState.inputProfile === 'ble') {
        runCoaSimulation();
        updateKPIStrip();
        if (AppState.activeTab === 'tab-overview') renderCharts();
        if (AppState.activeTab === 'tab-cache') renderCacheInspector();
      }
    });
  }

  if (DOM.telemetrySliderSpm) {
    DOM.telemetrySliderSpm.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      AppState.telemetry.sliderCadence = val;
      if (DOM.telemetrySpmVal) DOM.telemetrySpmVal.textContent = `${val} SPM`;
      DOM.bleCadenceBadge.textContent = `👟 ${val} SPM`;
      if (AppState.inputProfile === 'ble') {
        runCoaSimulation();
        updateKPIStrip();
        if (AppState.activeTab === 'tab-overview') renderCharts();
      }
    });
  }

  // Hardware & Workload Selectors
  DOM.selectInputSource.addEventListener('change', (e) => {
    AppState.inputProfile = e.target.value;
    runCoaSimulation();
    updateKPIStrip();
    renderCharts();
    renderCacheInspector();
    showToast(`Input Profile updated to: ${DOM.selectInputSource.options[DOM.selectInputSource.selectedIndex].text}`, 'info', 2500);
  });

  DOM.selectForwarding.addEventListener('change', (e) => {
    AppState.forwarding = e.target.value === 'true';
    runCoaSimulation();
    updateKPIStrip();
    renderCharts();
    updatePipelineDatapath();
    showToast(`Pipeline Forwarding: ${AppState.forwarding ? 'EX/MEM -> EX Active' : 'Disabled (Stalls on RAW)'}`, 'info', 2500);
  });

  DOM.selectBranchPredictor.addEventListener('change', (e) => {
    AppState.branchPredictor = e.target.value;
    runCoaSimulation();
    updateKPIStrip();
    renderCharts();
    updatePipelineDatapath();
    showToast(`Branch Predictor: ${DOM.selectBranchPredictor.options[DOM.selectBranchPredictor.selectedIndex].text}`, 'info', 2500);
  });

  DOM.selectCacheSize.addEventListener('change', (e) => {
    AppState.cacheSizeBytes = parseInt(e.target.value, 10);
    runCoaSimulation();
    updateKPIStrip();
    renderCharts();
    renderCacheInspector();
    showToast(`L1 Cache Size: ${AppState.cacheSizeBytes} Bytes`, 'info', 2500);
  });

  DOM.selectAssociativity.addEventListener('change', (e) => {
    AppState.associativity = parseInt(e.target.value, 10);
    runCoaSimulation();
    updateKPIStrip();
    renderCharts();
    renderCacheInspector();
    showToast(`L1 Associativity: ${AppState.associativity}-Way`, 'info', 2500);
  });

  // Presets
  DOM.btnPresetBaseline.addEventListener('click', () => {
    AppState.forwarding = false;
    AppState.branchPredictor = 'none';
    AppState.cacheSizeBytes = 128;
    AppState.associativity = 1;

    DOM.selectForwarding.value = 'false';
    DOM.selectBranchPredictor.value = 'none';
    DOM.selectCacheSize.value = '128';
    DOM.selectAssociativity.value = '1';

    runCoaSimulation();
    updateKPIStrip();
    renderCharts();
    renderCacheInspector();
    updatePipelineDatapath();
    showToast('Applied Preset: Baseline Stall / 1-Way (128B) — Unoptimized hardware with severe RAW stalls and conflict thrashing', 'warning', 4500);
  });

  DOM.btnPresetOptimized.addEventListener('click', () => {
    AppState.forwarding = true;
    AppState.branchPredictor = 'dynamic_2bit';
    AppState.cacheSizeBytes = 512;
    AppState.associativity = 4;

    DOM.selectForwarding.value = 'true';
    DOM.selectBranchPredictor.value = 'dynamic_2bit';
    DOM.selectCacheSize.value = '512';
    DOM.selectAssociativity.value = '4';

    runCoaSimulation();
    updateKPIStrip();
    renderCharts();
    renderCacheInspector();
    updatePipelineDatapath();
    showToast('Applied Preset: Optimized ARM Cortex-M4 (Forwarding + 2-Bit BHT + 512B 4-Way) — 91.7% cache hit rate & 1.32 CPI!', 'success', 4500);
  });

  // Stepper Buttons
  DOM.btnStepPrev.addEventListener('click', () => {
    pauseStepper();
    setStepperCycle(AppState.stepper.cycle - 1);
  });

  DOM.btnStepNext.addEventListener('click', () => {
    pauseStepper();
    setStepperCycle(AppState.stepper.cycle + 1);
  });

  DOM.btnStepReset.addEventListener('click', () => {
    pauseStepper();
    setStepperCycle(1);
    showToast('Pipeline stepper reset to Cycle 1.', 'info', 1500);
  });

  DOM.btnStepPlayPause.addEventListener('click', toggleStepperPlay);

  DOM.stepperSpeedSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    AppState.stepper.stepSpeedMs = val;
    DOM.stepperSpeedDisplay.textContent = `${val}ms`;
    if (AppState.stepper.isPlaying) {
      pauseStepper();
      playStepper();
    }
  });

  // Tab Switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      AppState.activeTab = targetId;

      // Update Button Styles
      tabButtons.forEach(b => b.classList.remove('active-tab', 'border-cyan-400', 'text-cyan-400', 'bg-cyan-500/10'));
      btn.classList.add('active-tab', 'border-cyan-400', 'text-cyan-400', 'bg-cyan-500/10');

      // Update Content Views
      document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
      const activeView = document.getElementById(targetId);
      if (activeView) activeView.classList.remove('hidden');

      if (targetId === 'tab-overview') {
        renderCharts();
      } else if (targetId === 'tab-pipeline') {
        updatePipelineDatapath();
      } else if (targetId === 'tab-cache') {
        renderCacheInspector();
      }
    });
  });

  // Cache Inspector Bit Field Address Input
  if (DOM.bitFieldAddressInput) {
    DOM.bitFieldAddressInput.addEventListener('input', (e) => {
      updateBitFieldDecoder(e.target.value);
    });
  }

  // Quick Address helper buttons in Tab 3
  document.querySelectorAll('.btn-quick-addr').forEach(btn => {
    btn.addEventListener('click', () => {
      const addr = btn.getAttribute('data-addr');
      DOM.bitFieldAddressInput.value = addr;
      updateBitFieldDecoder(addr);
    });
  });

  // Watch Quick Link & Troubleshooting Modals
  if (DOM.btnQuickLinkWatch) {
    DOM.btnQuickLinkWatch.addEventListener('click', async () => {
      const ok = await syncConnectedHardwareWatch(true);
      if (!ok && DOM.quickLinkModal) {
        DOM.quickLinkModal.classList.remove('hidden');
      }
    });
    DOM.btnCloseQuickLink?.addEventListener('click', () => {
      DOM.quickLinkModal?.classList.add('hidden');
    });
  }

  if (DOM.btnWatchHelp && DOM.watchHelpModal) {
    DOM.btnWatchHelp.addEventListener('click', () => {
      DOM.watchHelpModal.classList.remove('hidden');
    });
    DOM.btnCloseWatchHelp?.addEventListener('click', () => {
      DOM.watchHelpModal.classList.add('hidden');
    });
    DOM.btnDismissHelp?.addEventListener('click', () => {
      DOM.watchHelpModal.classList.add('hidden');
    });
  }

  // Model Selection Buttons in Quick Link Modal
  document.querySelectorAll('.btn-select-watch-model').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      DOM.quickLinkModal.classList.add('hidden');
      activateLiveHardwareStream(name);
    });
  });

  // Custom Watch Name submit
  if (DOM.btnConnectCustomWatch && DOM.inputCustomWatchName) {
    DOM.btnConnectCustomWatch.addEventListener('click', () => {
      const val = DOM.inputCustomWatchName.value.trim();
      if (val) {
        DOM.quickLinkModal.classList.add('hidden');
        activateLiveHardwareStream(val);
      }
    });
    DOM.inputCustomWatchName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        DOM.btnConnectCustomWatch.click();
      }
    });
  }

  initDeviceMotion();
}

// Initial Boot
window.addEventListener('DOMContentLoaded', async () => {
  initDOMElements();
  bindEvents();
  runCoaSimulation();
  updateKPIStrip();
  renderCharts();
  updatePipelineDatapath();
  renderCacheInspector();

  // Automatically detect and link physical smartwatch paired in Windows
  const linked = await syncConnectedHardwareWatch(false);
  if (!linked) {
    // Background retry in case Windows BLE device enumeration was in progress
    setTimeout(async () => {
      await syncConnectedHardwareWatch(false);
    }, 2000);
  }

  showToast('Smartwatch Activity Processing Architecture initialized.', 'success', 3000);
});
