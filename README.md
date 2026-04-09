# Indoor BLE Tracker & Asset Management System

A comprehensive indoor positioning solution utilizing ESP32-C3 trackers, nRF52840 beacons, and a centralized Node.js web application for real-time monitoring and asset management.

## System Architecture

The system consists of three main components:

1.  **Beacons (nRF52840 Base):** [Stationary BLE radio units that continuously broadcast their identity and transmit power to enable distance estimation by the tracker]
2.  **Tracker (ESP32-C3):** [Mobile device that listens for beacon signals, applies signal processing to estimate distances, and computes absolute position using geometry]
3.  **Web App (Node.js/Express):** [Central server that receives position data from trackers, authenticates users, and provides a browser-based interface for monitoring and asset management]

### Data Flow

1. **Beacons** [Transmit advertisement packets every 100ms containing a compact payload: Company Identifier (0x0059 for Nordic) + Base Station ID + Calibrated TX Power at 1m]
2. **Tracker** [Operates a continuous BLE scanner that captures all beacon advertisements, extracts RSSI values, applies Kalman filtering for smoothing, and runs trilateration algorithms to produce X/Y/Z coordinates]
3. **Local Dashboard (Port 80):** [Embedded web server running on the ESP32-C3 that serves a single-page HTML/JS dashboard for on-site debugging, configuration, and live visualization of position data]
4. **Central Web App (Port 3000):** [Node.js backend that aggregates data from multiple trackers, stores historical position records in a database, and serves the multi-user authentication system]

---

## Hardware Requirements

- **Tracker:** [Seeed Studio XIAO ESP32-C3 — a compact ESP32-C3 based development board with built-in WiFi and BLE, acting as the primary processing unit for the mobile tracker] + [Adafruit BMP390 Barometer — I2C pressure sensor used to measure ambient atmospheric pressure for calculating relative altitude changes between floors]
- **Beacons:** [3× Seeed Studio XIAO nRF52840 — identical BLE radio modules programmed as stationary reference points, each broadcasting a unique identifier at 100ms intervals]
- **Standard Wiring (I2C):** [SDA=6, SCL=7 — predefined GPIO pins on the ESP32-C3 for I2C communication with the BMP390 barometer] | [BMP390 address is typically 0x77 — I2C slave address when the SDO pin is pulled high, determined by hardware configuration]

---

## Developer Commands (Arduino CLI)

**Arduino CLI Path:** [Command-line interface for compiling and uploading Arduino sketches without the Arduino IDE — must be installed and configured with the appropriate board URLs]

### ESP32-C3 Tracker

- **Compile:** [Compiles the ESP32-C3 tracker sketch using the espressif:esp32 board package with the XIAO_ESP32C3 board definition]
  `arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C3 ./esp32c3_tracker`
- **Upload:** [Flashes the compiled binary to the ESP32-C3 device connected to the specified serial port — <PORT> is typically COMx on Windows or /dev/ttyUSBx on Linux]
  `arduino-cli upload -p <PORT> --fqbn esp32:esp32:XIAO_ESP32C3 ./esp32c3_tracker`

### nRF52840 Base (Beacon)

- **Compile:** [Compiles the nRF52840 beacon firmware using the Seeed nRF52 board package targeting the XIAO nRF52840 board definition]
  `arduino-cli compile --fqbn Seeeduino:nrf52:xiaonRF52840 ./nrf52840_base`
- **Upload:** [Flashes the compiled binary to the nRF52840 device connected to the specified serial port]
  `arduino-cli upload -p <PORT> --fqbn Seeeduino:nrf52:xiaonRF52840 ./nrf52840_base`

---

## Critical Serial Commands (115200 baud)

### Tracker (XIAO C3)

- `WIFI <ssid> <pass>`: [Establishes WiFi connection using the provided credentials — credentials are stored in non-volatile storage and automatically reconnect on reboot; supports SSIDs containing spaces when properly quoted]
- `KNOWNDIST <id> <m>`: [Allows manual calibration of a specific base station's distance offset — useful when the actual distance is known precisely (e.g., measured with a tape measure) to improve overall positioning accuracy]
- `REGFLOOR <n>`: [Captures the current barometric pressure reading as the reference altitude for floor number n — this creates a baseline for detecting floor changes based on pressure differences]
- `STATUS`: [Outputs a comprehensive diagnostic report to the serial console including current X/Y coordinates, Z (floor) estimation, RSSI values from all detected bases, WiFi connection status, and system uptime]
- `BASE <id> <x> <y>`: [Stores the physical (x, y) coordinates in meters for base station id — these coordinates define the reference points used in the trilateration algorithm]
- `PATHLOSS <n>`: [Adjusts the path-loss exponent n in the RSSI-to-distance model (d = 10^((TxPower - RSSI) / (10*n))) — higher values account for more signal attenuation in cluttered environments]

### Base (XIAO nRF52)

- `SETID <0|1|2>`: [Permanently stores the base station ID (0, 1, or 2) in flash memory — this ID is broadcast in every advertisement and is critical for the tracker to distinguish between multiple bases]
- `RESET`: [Erases the stored base ID from flash and reboots — the device enters a "provisioning mode" indicated by a slow breathing LED pattern, awaiting a new SETID command]

---

## Web Application

The central web app provides user authentication and asset management.

The web app cosists of 5 html pages:

1. **Register Screen:** Allows user to create new usernames and passwords as well as assigning IT staff designation.
2. **Menu Screen:** Login Screen that recives pre-existing usernames and passwords.
3. **Staff Main:** After successful login users without IT designation are redirected to this page. It displays the asset location map, asset filter system, and user information page.
4. **IT Main:** After successful login users with IT designation are redirected to this page. It displays the asset location map, asset filter system, and user information page, as well as a button to redirect to the Asset page.
5. **Assets:** Only IT staff can access this page, it acts as a hub to add and remove assets as well as view all existing assets and their history.

### Installation

1. Navigate to `package.json`
2. Start the server: Run script "start"

### Key Dependencies

- `express` [Fast, minimalist web framework for Node.js that handles HTTP routing, middleware, and template rendering]
- `bcryptjs` [Library for hashing passwords using the bcrypt algorithm to securely store user credentials]
- `jsonwebtoken` [Implementation of JSON Web Tokens (JWT) for stateless authentication and session management]
- `pug` [Template engine (formerly Jade) used to render server-side HTML views with dynamic data]

---

## Firmware Dependencies

### ESP32-C3 Tracker

- **ESP32 Arduino BSP** [Espressif board support package for ESP32 — required version ≥ 2.0.14 for XIAO_ESP32C3 board support]
- **NimBLE-Arduino** [Lightweight BLE stack for ESP32 that provides low-level BLE advertising and scanning functionality without the overhead of Bluedroid]
- **ESPAsyncWebServer** [Asynchronous HTTP server and WebSocket handler that runs on the ESP32, enabling the embedded dashboard without blocking the main loop]
- **Adafruit BMP3XX** [Driver library for the BMP390 barometric pressure sensor that provides I2C communication and pressure-to-altitude conversion]
- **ArduinoJson** [JSON serialization and deserialization library for encoding/decoding position data and configuration payloads]
- **AsyncTCP** [Asynchronous TCP stack required by ESPAsyncWebServer for handling concurrent network connections on the ESP32]

### nRF52840 Base (Beacon)

- **Adafruit nRF52 BSP** [Board support package for nRF52840-based boards including Seeed XIAO nRF52840]
- **ArduinoBLE** [Official Arduino library for BLE operations on nRF52840, providing peripheral role advertising and GATT server functionality]
- **LittleFS** [Flash file system (exposed via InternalFileSystem) that persists base station configuration across power cycles]
- **ArduinoJson** [JSON library used for parsing and serializing the base configuration file stored on flash]

---

## Positioning Logic

- **XY Positioning:** [Uses Weighted Least Squares (WLS) — a statistical optimization method that solves the non-linear trilateration problem by minimizing the weighted sum of squared errors between estimated and measured distances; weights are derived from RSSI signal quality]
- **Z-Axis:** [Uses relative barometer delta — the BMP390 measures ambient pressure which decreases with altitude; by comparing current pressure to registered floor reference points, the system determines which floor the tracker is on based on pressure thresholds]
- **Local Tuning:** [The ESP32-C3 hosts a web server on Port 80 — the dashboard.cpp module serves a self-contained HTML/JavaScript interface that plots the position in real-time, displays RSSI metrics, and provides form controls for adjusting calibration parameters without recompiling]

---

## Accuracy Expectations

- **Open Space:** [0.5m – 1.5m — achievable when beacons are placed in a wide triangle with clear line-of-sight, minimal multipath interference, and properly calibrated TX power values]
- **Obstructed:** [1.5m – 3.0m — typical performance when walls, furniture, or human bodies block direct signal paths, causing additional signal attenuation and reflection-based errors]
- **Floor Detection:** [Reliable within building environments (±0.25m typical precision) — the barometer can reliably distinguish floor transitions of 2.5m or greater; smaller floor heights may cause misclassification due to natural pressure fluctuations]
