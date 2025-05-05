import cv2
from ultralytics import YOLO
import paho.mqtt.client as mqtt
import time

# Load YOLO model
model = YOLO("./ai/best.pt")

# url = "http://192.168.240.254/stream"

# Buka stream video
# cap = cv2.VideoCapture(0)
cap = cv2.VideoCapture("http://192.168.240.254/stream")



# MQTT setup
broker = "broker.emqx.io"
topic_perintah = "fadhil123/perintah/gps"
client = mqtt.Client()

# client = mqtt.Client(protocol=mqtt.MQTTv311)

client.connect(broker, 1883, 60)

# State untuk deteksi
last_person_count = 0
cooldown_timer = 0
cooldown_duration = 5  # detik

def draw_box(frame, box):
    x1, y1, x2, y2 = map(int, box.xyxy[0])
    confidence = float(box.conf[0])
    label = f"Person ({confidence * 100:.1f}%)"
    
    # Gambar kotak biru
    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
    # Label di atas kotak
    cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX,
                0.5, (255, 0, 0), 2)

def detect_and_draw(frame):
    global last_person_count, cooldown_timer

    results = model.predict(frame, stream=True)
    person_count = 0

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            if class_id == 0 and confidence > 0.5:  # class 0 = person
                person_count += 1
                draw_box(frame, box)

    current_time = time.time()

    # Kirim hanya jika jumlah orang berubah, cooldown selesai, dan orang > 0
    if person_count != last_person_count and person_count > 0 and (current_time - cooldown_timer) > cooldown_duration:
        print(f"[AI] Orang terdeteksi: {person_count}")
        client.publish(topic_perintah, f"deteksi:{person_count}")
        last_person_count = person_count
        cooldown_timer = current_time

    # Reset state jika tidak ada orang
    elif person_count == 0:
        last_person_count = 0

    return frame

# Loop utama
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    processed_frame = detect_and_draw(frame)
    cv2.imshow("Deteksi Orang", processed_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
