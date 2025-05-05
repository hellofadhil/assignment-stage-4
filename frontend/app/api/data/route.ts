const data = {
    "status": "success",
    "data": [
        {
            "jumlah_orang": 4,
            "latitude": -6.317862,
            "longitude": 106.918167,
            "timestamp": {
                "$date": "2025-04-08T08:54:38.190Z"
            }
        },
        {
            "jumlah_orang": 3,
            "latitude": -6.574369,
            "longitude": 106.688881,
            "timestamp": {
                "$date": "2025-05-01T06:46:08.277Z"
            }
        },
        {
            "jumlah_orang": 3,
            "latitude": -6.574385,
            "longitude": 106.758805,
            "timestamp": {
                "$date": "2025-05-01T06:47:58.347Z"
            }
        },
        {
            "jumlah_orang": 3,
            "latitude": -6.574389,
            "longitude": 106.698805,
            "timestamp": {
                "$date": "2025-05-05T08:45:00Z"
            }
        },
        {
            "jumlah_orang": 5,
            "latitude": -6.574391,
            "longitude": 106.708807,
            "timestamp": {
                "$date": "2025-05-05T08:45:35Z"
            }
        }
    ],
    "count": 5
}


export async function GET() {
    return Response.json(data);
}