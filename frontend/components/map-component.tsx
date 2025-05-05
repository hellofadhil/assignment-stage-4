"use client"

import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Compass, Navigation, AlertCircle, Car, Bike, FootprintsIcon as Walking } from "lucide-react"

// Tipe data untuk korban
interface VictimData {
  jumlah_orang: number
  latitude: number
  longitude: number
  timestamp: {
    $date: string
  }
}

// Tipe untuk mode transportasi
type TransportMode = "driving" | "walking" | "cycling"

interface MapComponentProps {
  victims: VictimData[]
  selectedVictimIndex: number
  onSelectVictim: (index: number) => void
  baseLocation: {
    latitude: number
    longitude: number
  }
  isMobile: boolean
}

// Komponen untuk memperbarui tampilan peta saat selectedVictim berubah
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [center, map, zoom])

  return null
}

// Tambahkan kode untuk memuat script dan CSS Leaflet Routing Machine secara dinamis
const loadRoutingMachine = async () => {
  // Cek apakah Leaflet Routing Machine sudah dimuat
  if (typeof L.Routing === "undefined") {
    // Muat CSS
    const linkElement = document.createElement("link")
    linkElement.rel = "stylesheet"
    linkElement.href = "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css"
    document.head.appendChild(linkElement)

    // Muat script
    return new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => reject(new Error("Failed to load Leaflet Routing Machine"))
      document.body.appendChild(script)
    })
  }
  return Promise.resolve(true)
}

// Komponen untuk menangani routing dengan penanganan error yang lebih baik
function RoutingControl({
  userLocation,
  destination,
  showRoute,
  transportMode,
}: {
  userLocation: [number, number] | null
  destination: [number, number]
  showRoute: boolean
  transportMode: TransportMode
}) {
  const map = useMap()
  const routingControlRef = useRef<any>(null)
  const [routingLoaded, setRoutingLoaded] = useState(false)
  const [routingError, setRoutingError] = useState<string | null>(null)

  // Muat Leaflet Routing Machine
  useEffect(() => {
    loadRoutingMachine()
      .then(() => {
        setRoutingLoaded(true)
      })
      .catch((error) => {
        console.error("Error loading Leaflet Routing Machine:", error)
        setRoutingError("Gagal memuat modul rute. Silakan muat ulang halaman.")
      })
  }, [])

  // Buat atau perbarui kontrol routing
  useEffect(() => {
    if (!routingLoaded || !userLocation || !showRoute) {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current)
        routingControlRef.current = null
      }
      return
    }

    try {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current)
      }

      // Buat kontrol routing baru dengan mode transportasi yang dipilih
      const routingControl = L.Routing.control({
        waypoints: [L.latLng(userLocation[0], userLocation[1]), L.latLng(destination[0], destination[1])],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: false,
        lineOptions: {
          styles: [
            { color: "#6366F1", opacity: 0.8, weight: 6 },
            { color: "#4F46E5", opacity: 0.9, weight: 4 },
          ],
        },
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
          profile: transportMode, // Gunakan mode transportasi yang dipilih
        }),
        collapsible: true,
        createMarker: () => null, // Tidak membuat marker baru
        addWaypoints: false,
        draggableWaypoints: false,
      }).addTo(map)

      routingControlRef.current = routingControl
    } catch (error) {
      console.error("Error creating routing control:", error)
      setRoutingError("Gagal membuat rute. Silakan coba lagi.")
    }

    return () => {
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current)
        } catch (error) {
          console.error("Error removing routing control:", error)
        }
      }
    }
  }, [map, userLocation, destination, showRoute, routingLoaded, transportMode])

  // Tampilkan pesan error jika ada
  if (routingError) {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md shadow-md z-50">
        <p>{routingError}</p>
      </div>
    )
  }

  return null
}

// Fungsi untuk memformat timestamp
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  return format(date, "dd MMMM yyyy, HH:mm:ss", { locale: id })
}

export default function MapComponent({
  victims,
  selectedVictimIndex,
  onSelectVictim,
  baseLocation,
  isMobile,
}: MapComponentProps) {
  const [mapReady, setMapReady] = useState(false)
  const selectedVictim = victims[selectedVictimIndex]
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [transportMode, setTransportMode] = useState<TransportMode>("driving")

  // Ikon untuk marker korban
  const victimIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  // Ikon untuk marker korban yang dipilih
  const selectedVictimIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [30, 45], // Sedikit lebih besar untuk yang terpilih
    iconAnchor: [15, 45],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  // Ikon untuk marker base
  const baseIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  // Ikon untuk marker lokasi pengguna
  const userIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  // Fungsi untuk mendapatkan lokasi pengguna
  const getUserLocation = () => {
    setIsLocating(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError("Geolocation tidak didukung oleh browser Anda")
      setIsLocating(false)
      return
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          try {
            const { latitude, longitude } = position.coords
            setUserLocation([latitude, longitude])
            setIsLocating(false)
            setShowRoute(true)
          } catch (error) {
            console.error("Error processing geolocation:", error)
            setLocationError("Terjadi kesalahan saat memproses lokasi")
            setIsLocating(false)
          }
        },
        (error) => {
          let errorMessage = "Gagal mendapatkan lokasi"
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Izin lokasi ditolak. Silakan aktifkan izin lokasi di browser Anda."
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Informasi lokasi tidak tersedia. Silakan coba lagi."
              break
            case error.TIMEOUT:
              errorMessage = "Waktu permintaan lokasi habis. Silakan coba lagi."
              break
          }
          console.error("Geolocation error:", error)
          setLocationError(errorMessage)
          setIsLocating(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    } catch (error) {
      console.error("Unexpected error with geolocation:", error)
      setLocationError("Terjadi kesalahan saat mengakses lokasi.")
      setIsLocating(false)
    }
  }

  // Toggle tampilan rute
  const toggleRoute = () => {
    if (!userLocation) {
      getUserLocation()
    } else {
      setShowRoute(!showRoute)
    }
  }

  // Memastikan komponen map hanya dirender di client-side
  useEffect(() => {
    setMapReady(true)
  }, [])

  if (!mapReady) return <div className="h-full w-full bg-slate-100 animate-pulse" />

  // Menentukan zoom level berdasarkan perangkat
  const zoomLevel = isMobile ? 9 : 10

  // Menentukan center peta untuk memastikan semua marker terlihat
  const center: [number, number] = [selectedVictim.latitude, selectedVictim.longitude]

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={center}
        zoom={zoomLevel}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false} // Menonaktifkan kontrol zoom default
        attributionControl={false} // Menyembunyikan atribusi untuk tampilan lebih bersih
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Menambahkan kontrol zoom di kanan bawah */}
        <ZoomControl position="bottomright" />

        {/* Marker untuk base location */}
        <Marker position={[baseLocation.latitude, baseLocation.longitude]} icon={baseIcon}>
          <Popup>
            <div className="text-center">
              <h3 className="font-bold">Base Station</h3>
              <p className="text-xs">Lokasi Awal Drone</p>
            </div>
          </Popup>
        </Marker>

        {/* Marker untuk setiap korban */}
        {victims.map((victim, index) => (
          <Marker
            key={index}
            position={[victim.latitude, victim.longitude]}
            icon={index === selectedVictimIndex ? selectedVictimIcon : victimIcon}
            eventHandlers={{
              click: () => {
                onSelectVictim(index)
              },
            }}
            zIndexOffset={index === selectedVictimIndex ? 1000 : 0} // Marker yang dipilih selalu di atas
          >
            <Popup>
              <div className="text-center">
                <h3 className="font-bold">Korban Terdeteksi</h3>
                <p>Lokasi #{index + 1}</p>
                <p>Jumlah: {victim.jumlah_orang} orang</p>
                <p className="text-xs">Waktu: {formatTimestamp(victim.timestamp.$date)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Marker untuk lokasi pengguna */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <h3 className="font-bold">Lokasi Anda</h3>
                <p className="text-xs">
                  {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Komponen untuk routing dengan transportMode */}
        {userLocation && (
          <RoutingControl
            userLocation={userLocation}
            destination={[selectedVictim.latitude, selectedVictim.longitude]}
            showRoute={showRoute}
            transportMode={transportMode}
          />
        )}

        {/* Komponen untuk memperbarui tampilan peta */}
        <MapUpdater center={center} zoom={zoomLevel} />
      </MapContainer>

      {/* Tombol untuk mendapatkan lokasi pengguna */}
      <div className="absolute left-4 bottom-4 z-10 flex flex-col gap-2">
        <button
          onClick={getUserLocation}
          disabled={isLocating}
          className={`p-3 rounded-full shadow-lg ${isLocating ? "bg-gray-400" : "bg-white hover:bg-gray-100"}`}
          title="Dapatkan lokasi saya"
        >
          <Compass className={`h-5 w-5 ${isLocating ? "animate-spin text-gray-600" : "text-blue-600"}`} />
        </button>

        <button
          onClick={toggleRoute}
          disabled={isLocating || !userLocation}
          className={`p-3 rounded-full shadow-lg ${
            !userLocation
              ? "bg-gray-200 text-gray-500"
              : showRoute
                ? "bg-blue-600 text-white"
                : "bg-white text-blue-600 hover:bg-gray-100"
          }`}
          title={showRoute ? "Sembunyikan rute" : "Tampilkan rute"}
        >
          <Navigation className="h-5 w-5" />
        </button>
      </div>

      {/* Panel mode transportasi */}
      {showRoute && userLocation && (
        <div className="absolute right-4 bottom-4 z-10">
          <div className="bg-white rounded-lg shadow-lg p-2 flex items-center gap-1">
            <button
              onClick={() => setTransportMode("driving")}
              className={`p-2 rounded-md ${
                transportMode === "driving" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
              title="Mode Mobil"
            >
              <Car className="h-5 w-5" />
            </button>
            <button
              onClick={() => setTransportMode("cycling")}
              className={`p-2 rounded-md ${
                transportMode === "cycling" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
              title="Mode Sepeda"
            >
              <Bike className="h-5 w-5" />
            </button>
            <button
              onClick={() => setTransportMode("walking")}
              className={`p-2 rounded-md ${
                transportMode === "walking" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
              title="Mode Jalan Kaki"
            >
              <Walking className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Pesan error */}
      {locationError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md shadow-md z-50 max-w-xs text-center">
          <div className="flex items-center gap-2 justify-center mb-1">
            <AlertCircle className="h-4 w-4" />
            <p className="font-semibold">Error Lokasi</p>
          </div>
          <p className="text-sm">{locationError}</p>
        </div>
      )}
    </div>
  )
}
