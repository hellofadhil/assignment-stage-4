from machine import UART, Pin, I2C	
import time
import network
from umqtt.simple import MQTTClient

# WiFi Configuration
ssid = "Redmi 13C"
password = "haloteman"

# MQTT Broker EMQX
emqx_broker = "broker.emqx.io"
topic_perintah = b"fadhil123/perintah/gps"
topic_kordinat = b"fadhil123/gps/koordinat"

# MQTT Ubidots Setup
UBIDOTS_BROKER = "industrial.api.ubidots.com"
UBIDOTS_PORT = 1883
UBIDOTS_TOKEN = "BBUS-fwSEmIs8jwdNBL5Pj9pREmLiUGLhsU"
DEVICE_LABEL = "dile-comunity"

# Connect to WiFi
wifi = network.WLAN(network.STA_IF)
wifi.active(True)
wifi.connect(ssid, password)
while not wifi.isconnected():
    time.sleep(1)

# UART GPS
uart2 = UART(2, baudrate=9600, tx=17, rx=16)
   

# History data
last_lat = None
last_lon = None
last_jumlah = None

# Convert GPS to Decimal Degrees
def convert_to_degrees(raw):
    if raw:
        raw = float(raw)
        deg = int(raw / 100)
        min = raw - (deg * 100)
        return deg + (min / 60)
    return None

# Parse GPS GPGGA Sentence
def parse_gpgga(data):
    try:
        parts = data.split(",")
        if parts[0] == "$GPGGA" and len(parts) > 6:
            lat = convert_to_degrees(parts[2])
            lon = convert_to_degrees(parts[4])
            if parts[3] == "S":
                lat = -lat
            if parts[5] == "W":
                lon = -lon
            return lat, lon
    except:
        pass
    return None, None


# MQTT Callback for EMQX
def sub_cb(topic, msg):
    print("[ESP32] Pesan diterima:", msg)
    if msg.startswith(b"deteksi:"):
        jumlah = int(msg.decode().split(":")[1])
        for _ in range(10):
            if uart2.any():
                data = uart2.readline()
                if data:
                    try:
                        data = data.decode().strip()
                        if "$GPGGA" in data:
                            lat, lon = parse_gpgga(data)
                            if lat and lon:
                                # Payload ke EMQX
                                payload = '{{"jumlah_orang": {}, "latitude": {:.6f}, "longitude": {:.6f}}}'.format(jumlah, lat, lon)
                                emqx_client.publish(topic_kordinat, payload)
                                print("[ESP32] EMQX ->", payload)

                                # Payload ke Ubidots
                                ubidots_payload = '{{"jumlah_orang": {}, "latitude": {:.6f}, "longitude": {:.6f}}}'.format(jumlah, lat, lon)
                                ubidots_client.publish(b"/v1.6/devices/" + DEVICE_LABEL.encode(), ubidots_payload)
                                print("[ESP32] Ubidots ->", ubidots_payload)

                                # Update OLED display
                                time.sleep(4)
                                return
                    except Exception as e:
                        print("[ESP32] Parsing error:", e)
            time.sleep(1)

# MQTT Client for EMQX
emqx_client = MQTTClient("esp32_gps", emqx_broker)
emqx_client.set_callback(sub_cb)
emqx_client.connect()
emqx_client.subscribe(topic_perintah)

# MQTT Client for Ubidots
ubidots_client = MQTTClient("esp32_ubidots", UBIDOTS_BROKER, UBIDOTS_PORT, UBIDOTS_TOKEN, UBIDOTS_TOKEN)
ubidots_client.connect()

print("[ESP32] MQTT terhubung ke EMQX & Ubidots. Menunggu perintah...")

# Main Loop
while True:
    emqx_client.check_msg()
    time.sleep(0.1)
