from flask import Flask, jsonify
from flask_pymongo import PyMongo
from datetime import datetime
import paho.mqtt.client as mqtt
import json
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.emqx.io")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "fadhil123/gps/koordinat")

# Initialize MongoDB
mongo = PyMongo(app)

class MQTTClient:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
    
    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        print(f"[MQTT] Connected with result code {rc}")
        client.subscribe(MQTT_TOPIC)
    
    def on_message(self, client, userdata, msg):
        """Callback when message is received"""
        try:
            payload = msg.payload.decode()
            data = json.loads(payload)
            self.process_gps_data(data)
        except json.JSONDecodeError:
            print("[ERROR] Invalid JSON payload")
        except Exception as e:
            print(f"[ERROR] Processing message: {str(e)}")
    
    def process_gps_data(self, data):
        """Process and store GPS data"""
        try:
            # Add timestamp
            data["timestamp"] = datetime.utcnow()
            
            # Get last record
            last_data = mongo.db.drone.find_one(
                sort=[("timestamp", -1)],
                projection={"_id": 0, "jumlah_orang": 1, "latitude": 1, "longitude": 1}
            )
            
            # Check if data is different
            if not self.is_data_duplicate(last_data, data):
                mongo.db.drone.insert_one(data)
                print(f"[DB] Inserted new record: {data}")
        except Exception as e:
            print(f"[ERROR] Database operation: {str(e)}")
    
    @staticmethod
    def is_data_duplicate(last_data, new_data):
        """Check if new data is same as last record"""
        if not last_data:
            return False
        
        return all(
            last_data.get(field) == new_data.get(field)
            for field in ["jumlah_orang", "latitude", "longitude"]
        )
    
    def start(self):
        """Start MQTT client"""
        self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
        self.client.loop_start()

# Routes
@app.route("/drone/data")
def get_drone_data():
    """Endpoint to retrieve all drone data"""
    try:
        data = list(mongo.db.drone.find({}, {"_id": 0}))
        return jsonify({
            "status": "success",
            "data": data,
            "count": len(data)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/")
def index():
    """Health check endpoint"""
    return jsonify({
        "status": "running",
        "service": "Drone Detection Backend",
        "timestamp": datetime.utcnow().isoformat()
    })

if __name__ == "__main__":
    # Initialize and start MQTT client
    mqtt_client = MQTTClient()
    mqtt_client.start()
    
    print("[SYSTEM] Service started successfully")
    app.run(host="0.0.0.0", port=5000, debug=os.getenv("FLASK_DEBUG", "False") == "True")