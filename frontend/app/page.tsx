"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Clock,
  MapPinned,
  Users,
  DrillIcon as Drone,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Navigation,
  Car,
  Bike,
  FootprintsIcon as Walking,
} from "lucide-react";

import { formatTimestamp } from "@/lib/utils";

// Types
interface VictimData {
  jumlah_orang: number;
  latitude: number;
  longitude: number;
  timestamp: {
    $date: string;
  };
}

// Constants
const BASE_LOCATION = {
  latitude: -6.57,
  longitude: 106.69100,
};

const API_ENDPOINT = "/api/data";

// Dynamic Imports
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p>Memuat peta...</p>
      </div>
    </div>
  ),
});

export default function DroneMonitoringPage() {
  const [selectedVictimIndex, setSelectedVictimIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [victimsData, setVictimsData] = useState<VictimData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) throw new Error("Gagal mengambil data");
        const result = await response.json();
        setVictimsData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Responsive check
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);


  const goToPrevVictim = () => {
    setSelectedVictimIndex((prev) =>
      prev > 0 ? prev - 1 : victimsData.length - 1
    );
  };

  const goToNextVictim = () => {
    setSelectedVictimIndex((prev) =>
      prev < victimsData.length - 1 ? prev + 1 : 0
    );
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Loading state
  if (loading) {
    return <LoadingScreen />;
  }

  // Error state
  if (error) {
    return <ErrorScreen error={error} />;
  }

  // Empty state
  if (victimsData.length === 0 && !loading) {
    return <EmptyStateScreen />;
  }

  const selectedVictim = victimsData[selectedVictimIndex];

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden">
      <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isOpen={sidebarOpen}
          isMobile={isMobile}
          victimsData={victimsData}
          selectedVictimIndex={selectedVictimIndex}
          selectedVictim={selectedVictim}
          onSelectVictim={(index) => {
            setSelectedVictimIndex(index);
            if (isMobile) setSidebarOpen(false);
          }}
        />

        <MapView
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          victimsData={victimsData}
          selectedVictimIndex={selectedVictimIndex}
          onSelectVictim={(index) => {
            setSelectedVictimIndex(index);
            if (isMobile) setSidebarOpen(false);
          }}
          onCloseSidebar={() => setSidebarOpen(false)}
          goToPrevVictim={goToPrevVictim}
          goToNextVictim={goToNextVictim}
        />
      </div>
    </main>
  );
}

// Component Sub-sections
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p>Memuat data korban...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center p-4 bg-red-50 rounded-lg max-w-md">
        <h2 className="text-lg font-semibold text-red-600">Error</h2>
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

function EmptyStateScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center p-4 bg-yellow-50 rounded-lg max-w-md">
        <h2 className="text-lg font-semibold text-yellow-600">Data Kosong</h2>
        <p className="text-yellow-500">Tidak ada data korban yang ditemukan</p>
      </div>
    </div>
  );
}

function Header({
  toggleSidebar,
  sidebarOpen,
}: {
  toggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  return (
    <header className="bg-blue-600 text-white p-3 flex items-center justify-between shadow-md z-30 relative">
      <div className="flex items-center gap-2">
        <Drone className="h-5 w-5" />
        <h1 className="text-lg font-bold">Pemantauan Drone</h1>
      </div>
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md hover:bg-blue-700 transition-colors"
        aria-label={sidebarOpen ? "Tutup panel" : "Buka panel"}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </header>
  );
}

function Sidebar({
  isOpen,
  isMobile,
  victimsData,
  selectedVictimIndex,
  selectedVictim,
  onSelectVictim,
}: {
  isOpen: boolean;
  isMobile: boolean;
  victimsData: VictimData[];
  selectedVictimIndex: number;
  selectedVictim: VictimData;
  onSelectVictim: (index: number) => void;
}) {
  return (
    <div
      className={`
        absolute top-0 left-0 h-full z-20 bg-white border-r border-gray-200
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:w-80 lg:w-96
      `}
    >
      <div className="h-full overflow-y-auto">
        <VictimListSection
          victimsData={victimsData}
          selectedVictimIndex={selectedVictimIndex}
          onSelectVictim={onSelectVictim}
          isMobile={isMobile}
        />

        <VictimDetailSection selectedVictim={selectedVictim} />

        <AdditionalInfoSection selectedVictim={selectedVictim} />
      </div>
    </div>
  );
}

function VictimListSection({
  victimsData,
  selectedVictimIndex,
  onSelectVictim,
  isMobile,
}: {
  victimsData: VictimData[];
  selectedVictimIndex: number;
  onSelectVictim: (index: number) => void;
  isMobile: boolean;
}) {
  return (
    <div className="p-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
        <Users className="h-5 w-5 mr-2 text-blue-600" />
        Daftar Korban
      </h2>

      <div className="space-y-2">
        {victimsData.map((victim, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border cursor-pointer ${
              selectedVictimIndex === index
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => onSelectVictim(index)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 text-red-600 p-2 rounded-full">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium">Lokasi #{index + 1}</h3>
                  <p className="text-xs text-gray-500">
                    {victim.jumlah_orang} orang terdeteksi
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VictimDetailSection({
  selectedVictim,
}: {
  selectedVictim: VictimData;
}) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
        <Info className="h-5 w-5 mr-2 text-blue-600" />
        Detail Korban
      </h2>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Jumlah Korban:</span>
            <span className="font-medium">
              {selectedVictim.jumlah_orang} orang
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Waktu Deteksi:</span>
            <span className="font-medium">
              {formatTimestamp(selectedVictim.timestamp.$date)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Koordinat:</span>
            <span className="font-medium">
              {selectedVictim.latitude.toFixed(6)},{" "}
              {selectedVictim.longitude.toFixed(6)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdditionalInfoSection({
  selectedVictim,
}: {
  selectedVictim: VictimData;
}) {
  return (
    <div className="p-4 mt-2">
      <div className="space-y-2">
        <InfoItem
          icon={<Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />}
          text={`Terdeteksi pada: ${formatTimestamp(
            selectedVictim.timestamp.$date
          )}`}
        />
        <InfoItem
          icon={<MapPinned className="h-4 w-4 text-blue-500 flex-shrink-0" />}
          text={`Koordinat: ${selectedVictim.latitude.toFixed(
            6
          )}, ${selectedVictim.longitude.toFixed(6)}`}
        />
        <InfoItem
          icon={<Users className="h-4 w-4 text-blue-500 flex-shrink-0" />}
          text={`Jumlah orang terdeteksi: ${selectedVictim.jumlah_orang}`}
        />
        <InfoItem
          icon={<Navigation className="h-4 w-4 text-blue-500 flex-shrink-0" />}
          text="Petunjuk: Klik tombol kompas di peta untuk mendapatkan lokasi dan rute ke korban"
          highlight
        />
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Car className="h-4 w-4 text-blue-500" />
            <Bike className="h-4 w-4 text-blue-500" />
            <Walking className="h-4 w-4 text-blue-500" />
          </div>
          <span className="text-blue-600">
            Pilih mode transportasi (mobil, sepeda, jalan kaki) saat menampilkan
            rute
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  text,
  highlight = false,
}: {
  icon: React.ReactNode;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span
        className={`break-words ${
          highlight ? "text-blue-600 font-medium" : ""
        }`}
      >
        {text}
      </span>
    </div>
  );
}

function MapView({
  isMobile,
  sidebarOpen,
  victimsData,
  selectedVictimIndex,
  onSelectVictim,
  onCloseSidebar,
  goToPrevVictim,
  goToNextVictim,
}: {
  isMobile: boolean;
  sidebarOpen: boolean;
  victimsData: VictimData[];
  selectedVictimIndex: number;
  onSelectVictim: (index: number) => void;
  onCloseSidebar: () => void;
  goToPrevVictim: () => void;
  goToNextVictim: () => void;
}) {
  return (
    <div className="flex-1 relative">
      <MapComponent
        victims={victimsData}
        selectedVictimIndex={selectedVictimIndex}
        onSelectVictim={onSelectVictim}
        baseLocation={BASE_LOCATION}
        isMobile={isMobile}
      />

      {isMobile && sidebarOpen && (
        <div
          className="absolute inset-0 bg-black bg-opacity-50 z-10"
          onClick={onCloseSidebar}
          aria-hidden="true"
        />
      )}

      {isMobile && !sidebarOpen && (
        <NavigationControls
          selectedVictimIndex={selectedVictimIndex}
          totalVictims={victimsData.length}
          goToPrevVictim={goToPrevVictim}
          goToNextVictim={goToNextVictim}
        />
      )}
    </div>
  );
}

function NavigationControls({
  selectedVictimIndex,
  totalVictims,
  goToPrevVictim,
  goToNextVictim,
}: {
  selectedVictimIndex: number;
  totalVictims: number;
  goToPrevVictim: () => void;
  goToNextVictim: () => void;
}) {
  return (
    <div className="absolute bottom-4 right-4 flex justify-center z-10">
      <div className="bg-white rounded-full shadow-lg p-1 flex items-center">
        <button
          onClick={goToPrevVictim}
          className="p-2 bg-gray-100 rounded-full mx-1"
          aria-label="Korban sebelumnya"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="px-3 font-medium">
          {selectedVictimIndex + 1}/{totalVictims}
        </div>
        <button
          onClick={goToNextVictim}
          className="p-2 bg-gray-100 rounded-full mx-1"
          aria-label="Korban berikutnya"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
