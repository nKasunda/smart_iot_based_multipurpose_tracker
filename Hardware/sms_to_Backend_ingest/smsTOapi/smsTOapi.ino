#include <HardwareSerial.h>

HardwareSerial A9G(2);


// DEVICE CONFIG
String imei = "123456789012345";
String phoneNumber = "+265994656375";

// GPS SIMULATION
float lat = -15.3876;
float lon = 35.3367;

// SYSTEM STATE
int batteryLevel = -1;   // default = not available
int signalLevel = 0;


// ROBUST AT READER
String sendATRead(String cmd, int timeout = 3000) {
  String response = "";

  while (A9G.available()) A9G.read();

  A9G.println(cmd);

  unsigned long start = millis();

  while (millis() - start < timeout) {
    while (A9G.available()) {
      response += (char)A9G.read();
    }
  }

  Serial.println("CMD: " + cmd);
  Serial.println("RES: " + response);

  return response;
}


// GET BATTERY
void getBattery() {
  String res = sendATRead("AT+CBC");

  int idx = res.indexOf("+CBC:");
  if (idx != -1) {
    int comma1 = res.indexOf(",", idx);
    int comma2 = res.indexOf(",", comma1 + 1);

    if (comma1 != -1 && comma2 != -1) {
      batteryLevel = res.substring(comma1 + 1, comma2).toInt();
      return;
    }
  }

  batteryLevel = -1; // mark as invalid
}


// GET SIGNAL
void getSignal() {
  String res = sendATRead("AT+CSQ");

  int idx = res.indexOf("+CSQ:");
  if (idx != -1) {
    int comma = res.indexOf(",", idx);

    if (comma != -1) {
      String val = res.substring(idx + 6, comma);
      signalLevel = val.toInt();
      return;
    }
  }

  signalLevel = -1;
}


// BUILD JSON MESSAGE
String buildMessage() {
  String msg = "{";
  msg += "\"imei\":\"" + imei + "\",";
  msg += "\"lat\":" + String(lat, 6) + ",";
  msg += "\"lng\":" + String(lon, 6) + ",";

  // battery handling (null if invalid)
  if (batteryLevel == -1) {
    msg += "\"battery\":null,";
  } else {
    msg += "\"battery\":" + String(batteryLevel) + ",";
  }

  msg += "\"signal\":" + String(signalLevel);
  msg += "}";

  return msg;
}


// SEND SMS
void sendSMS(String message) {
  A9G.print("AT+CMGS=\"");
  A9G.print(phoneNumber);
  A9G.println("\"");

  delay(10000);

  A9G.print(message);
  delay(5000);

  A9G.write(26);
  delay(50000);

  Serial.println("===== SMS SENT =====");
  Serial.println(message);
  Serial.println("====================");
}


// SETUP
void setup() {
  Serial.begin(115200);
  A9G.begin(115200, SERIAL_8N1, 16, 17);

  delay(30000);

  Serial.println("Initializing A9G...");

  sendATRead("AT");
  sendATRead("AT+CMGF=1");

  randomSeed(analogRead(0));

  Serial.println("Tracker Ready...");
}



void loop() {

  float stepSize = 0.0002;

  lat += ((float)random(-10, 10) / 10.0) * stepSize;
  lon += ((float)random(-10, 10) / 10.0) * stepSize;

  if (lat < -16 || lat > -14) lat = -15.3876;
  if (lon < 34 || lon > 36) lon = 35.3367;

  getBattery();
  getSignal();

  String message = buildMessage();

  Serial.println("==== TRACKER DATA ====");
  Serial.println(message);
  Serial.println("======================");

  sendSMS(message);

  delay(20000);
}