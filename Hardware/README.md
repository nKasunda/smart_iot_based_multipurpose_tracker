# ==============================

# HARDWARE MODULE – IoT MULTIPURPOSE TRACKER

# ==============================

---

## [1] OVERVIEW

This section documents the hardware development of the IoT-based multipurpose tracking system. The system integrates an ESP32 microcontroller with an A9G GSM/GPS module to enable communication and location tracking.

---

## [2] COMPONENTS USED

* ESP32 (Main processing unit)
* A9G GSM/GPS Module
* Power Supply Unit (Battery + Charging Module – pending optimization)
* Connecting wires

---

## [3] COMMUNICATION SETUP

* Communication between ESP32 and A9G is achieved via **UART (Serial Communication)**.
* Successful transmission and reception of AT commands has been established.
* The ESP32 can send commands and receive responses from the A9G module.

---

## [4] GSM FUNCTIONALITY

* SMS communication has been successfully tested.
* The A9G module can:

  * Send SMS messages to a mobile device
  * Transmit data (including GPS-related output) via SMS

---

## [5] INTERNET CONNECTIVITY (GPRS/HTTP)

* Internet-based data transmission using the A9G module has **not yet been tested**.

### [5.1] Intended Functionality

* Send GPS coordinates directly to a remote server or web API
* Enable real-time tracking without relying on SMS

### [5.2] Planned Implementation

* Use A9G GPRS capabilities to establish an internet connection
* Send HTTP requests (POST/GET) to a backend API
* Integrate with a tracking dashboard or database

### [5.3] Considerations

* Requires a SIM card with an active data bundle
* Stable power supply is critical for GPRS communication
* GSM network registration must be confirmed before data transfer

### [5.4] Status

**Pending testing and implementation**

---

## [6] GPS FUNCTIONALITY

### [6.1] Progress

* GPS raw data (`GPSRD`) has been retrieved
* Data has been successfully transmitted via SMS

### [6.2] Current Limitations

* GPS coordinates are **static / not updating**
* No successful **satellite (GPS) fix achieved**

---

## [7] CURRENT CHALLENGES

### [7.1] GPS Fix Failure

Possible causes:

* Weak or unstable power supply
* Improper GPS antenna connection
* Indoor testing or poor satellite visibility

Observation:

* GPS module is active (not stuck at 0)
* However, it fails to acquire a valid satellite fix

---

### [7.2] Power Supply Constraints

* Lack of a stable, high-capacity battery
* This may be affecting:

  * GPS performance
  * Overall system stability

---

## [8] PROPOSED POWER SOLUTION

* Use a **torch battery + charging unit** (inspired by supervisor recommendation)
* Integrate with:

  * ESP32
  * A9G module

Goal:
Provide a stable and sufficient power supply for reliable operation

---

## [9] OBSERVATIONS & INSIGHTS

* GSM functionality is stable → communication pipeline is working
* GPS issues are likely **hardware-related rather than software**
* Power instability is a strong candidate affecting GPS performance

---

## [10] NEXT STEPS

[I] Integrate improved power supply (torch battery setup)
[II] Verify GPS antenna connection and positioning
[III] Test GPS in an open outdoor environment
[IV] Perform continuous GPS polling after stabilizing power
[V] Convert GPS data to decimal format
[VI] Create component connection diagram

---

## [11] NOTES

* GPS modules require:

  * Clear sky view
  * Stable voltage supply
  * Time to acquire satellite lock (cold start delay)

---

## [12] DIAGRAMS & REFERENCES

### [12.1] Circuit Diagram

The diagram below shows the hardware connections between the ESP32, A9G module, and the TP4056 battery/charging unit.

<img width="960" height="720" alt="TRACKER COMPONENT IMAGE CIRCUIT" src="https://github.com/user-attachments/assets/88cebcc8-085b-4c11-9709-e3d14735b5ab" />


**Notes on the wiring:**
* **UART Connections (Direct)**
  * ESP32 GPIO16 (RX) ← A9G TX
  * ESP32 GPIO17 (TX) → A9G RX
* **Power Supply**
  * TP4056 OUT+ → ESP32 VIN and A9G VCC (parallel connection)
  * TP4056 OUT- → ESP32 GND and A9G GND
  * A common GND for stable UART communication
* **Battery**
  * 3.7V Li-ion battery connected to TP4056 B+/B-
  * Charging module provides regulated power to devices

---

## [13] AUTHOR NOTES

This document will be continuously updated as hardware development progresses and issues are resolved.

