# Smartwatch Activity Processing Architecture Simulator
### ARM Cortex-M RISC • 5-Stage Pipeline • L1 Cache • Live Bluetooth Low Energy (BLE) Smartwatch Engine

An interactive Computer Organization and Architecture (COA) simulation web application and hardware workbench demonstrating how an ultra-low-power **ARM Cortex-M RISC processor** inside a smartwatch processes real-time activity streams (**3-Axis IMU Accelerometer @ 50 Hz** for step detection + **Optical PPG Sensor @ 50 Hz** for heart-rate estimation).

---

## 🚀 Key Hardware Architecture Features

1. **Native Windows Bluetooth LE & Web Bluetooth Bridge**:
   - Automatically detects and interfaces with physical consumer smartwatches (**boAt Wave Beat / `BLE_933B`**, MAC: `98:B6:ED:01:6E:A4`, Actions ATS3085 chipset) via Python WinRT (`Windows.Devices.Bluetooth.BluetoothLEDevice`) and the Web Bluetooth API (`navigator.bluetooth`).
   - Discovered and streams from proprietary vendor GATT services: `0xFF12` (Actions biometrics: `0xFF13` write, `0xFF14` notify, `0xFF15` config) and `D7F010E0` (high-throughput raw sensor notify `0xD7F010E2`).
   - Streams live 50 Hz optical PPG and 3-axis accelerometer packets directly into ARM system SRAM circular ring buffers (`0x2000_0000` to `0x2000_1120`).

2. **16-Bit Q10 Fixed-Point ALU (`1.0g = 1024 LSBs`)**:
   - Eliminates expensive floating-point hardware units in microwatt-constrained wearables.
   - **Magnitude-Squared Step Detection**: Computes $|A|^2 = a_x^2 + a_y^2 + a_z^2$ via single-cycle `MUL` and `MLA` instructions and compares directly against $T^2 = (1.52 \times 1024)^2 = 2,421,136$, completely bypassing hardware square-root stalls (which take 14–34 cycles).
   - **4-Tap Fixed-Point FIR Filter**: Convolves noisy PPG with symmetric taps `[1, 3, 3, 1]` and normalizes via single-cycle arithmetic right shift (`ASR R5, R5, #3` = divide by 8 without divider stalls).

3. **Power-of-2 Stride Cache Conflict & 4-Way LRU Set Associativity**:
   - The 4 circular FIFO ring buffers are aligned on $1,024$-byte (`0x0400`) boundaries in SRAM:
     - `0x2000_0000`: IMU Accel X FIFO (400 frames, 800 bytes)
     - `0x2000_0400`: IMU Accel Y FIFO (400 frames, 800 bytes)
     - `0x2000_0800`: IMU Accel Z FIFO (400 frames, 800 bytes)
     - `0x2000_0C00`: Optical PPG FIFO (400 frames, 800 bytes)
     - `0x2000_1120`: Output Activity State Buffer
   - Because $1,024$ bytes is a multiple of 128B, 256B, and 512B line strides (stride / line size = 64 blocks, $64 \equiv 0 \pmod S$), simultaneous reads across all 4 streams map to the **exact same cache set**.
   - Direct-mapped (1-way) and 2-way caches suffer catastrophic conflict miss thrashing (~48–50% hit rate, AMAT = 6.96–7.22 cycles).
   - A **4-Way Set Associative (LRU)** cache keeps all 4 streaming lines concurrently resident in the set, achieving an optimal **91.66% hit rate** and lowering Memory AMAT from 6.957 down to **2.001 cycles** ($3.48\times$ memory speedup)!

4. **5-Stage Pipeline Hazards, Data Forwarding & Branch Prediction**:
   - Interactive clock-cycle stepper through the 22-instruction ARM processing kernel loop (`0x08000100` – `0x08000164`).
   - Explores `EX/MEM -> EX Data Forwarding` (0 stalls on ALU RAW hazards; 1-cycle bubble on Load-Use).
   - Demonstrates `Dynamic 2-Bit Saturating Counter BHT + BTB` achieving ~98.7% loop branch accuracy, dropping effective CPI from 2.260 down to **1.092 CPI** (**0.916 IPC**).

5. **Formal Academic Technical Report**:
   - Includes full 6-page publication-quality IEEE/ACM formatted Technical Report PDF: `Smartwatch_COA_Architecture_Report.pdf`.
   - Generatable via Playwright Chromium (`python generate_report_pdf.py`).

---

## 🛠️ Repository Structure

```
├── index.html                             # Dark Silicon Workbench UI & 3 Interactive Views
├── app.js                                 # 16-Bit Q10 ALU, 5-Stage Pipeline, Cache & BLE Logic
├── style.css                              # Modern Dark Silicon Glassmorphic Styling
├── server.py                              # Local HTTP Server, WinRT BLE Bridge & Cloudflare Tunnel
├── run.bat                                # Windows Quick-Start Launcher
├── Smartwatch_COA_Architecture_Report.pdf # Full 6-Page Technical Project Report
├── generate_report_pdf.py                 # Playwright Headless Chromium PDF Generator
├── report_template.html                   # Academic Report HTML/CSS Print Template
├── verified_screenshot.png                # Live Workbench Verification Screenshot
└── .gitignore                             # Ignored cache and temporary artifacts
```

---

## 💻 How to Run Locally

Because the Web Bluetooth API and Native WinRT Bluetooth bridge require a secure origin (`http://localhost` or `https://`), launch via the Python server:

```bash
# 1. Install optional requirements (if generating PDF or using Bleak):
pip install playwright bleak

# 2. Run the application server:
python server.py
# Or on Windows, double-click:
run.bat
```

Open your browser at:
`http://localhost:8080/`

---

## 📜 License & Academic Attribution
Developed as an interactive Computer Organization and Architecture (COA) / Embedded Systems Mini Project.
