import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useSocket } from '../../../contexts/SocketContext';
import { fetchSandboxTrip } from '../services/sandboxApi';
import { useGoogleDirections } from '../hooks/useGoogleDirections';
import { decodePolyline } from '../simulator/simulationEngine';
import { SandboxMap } from '../components/SandboxMap';

export const TrackingSandbox: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const { getTripSocket, closeSocket } = useSocket();

  const [trip, setTrip] = useState<any>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [fetchingRoute, setFetchingRoute] = useState(false);

  // Route path coordinates and metrics
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [totalDistance, setTotalDistance] = useState(0); // in km
  const [totalDuration, setTotalDuration] = useState(0); // in seconds

  // Location Coordinate states
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);

  // Local simulation states
  const [simulationActive, setSimulationActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [distanceCovered, setDistanceCovered] = useState(0);
  const [etaMinutes, setEtaMinutes] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'in_progress' | 'arrived'>('idle');

  // WebSocket reference
  const tripSocketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<any>(null);

  const { loaded: googleScriptLoaded, getRoute } = useGoogleDirections();

  // Role detection
  const isDriver = user && trip && user.id === trip.ride_details.driver.id;

  // Load trip details on mount
  useEffect(() => {
    if (tripId) {
      setLoadingTrip(true);
      fetchSandboxTrip(tripId)
        .then((data) => {
          setTrip(data);
          setLoadingTrip(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingTrip(false);
        });
    }
  }, [tripId]);

  // Request Google directions route when trip details and Google script are ready
  useEffect(() => {
    if (trip && googleScriptLoaded) {
      const pickupLat = parseFloat(trip.ride_details.pickup_latitude);
      const pickupLng = parseFloat(trip.ride_details.pickup_longitude);
      const destLat = parseFloat(trip.ride_details.destination_latitude);
      const destLng = parseFloat(trip.ride_details.destination_longitude);

      if (isNaN(pickupLat) || isNaN(pickupLng) || isNaN(destLat) || isNaN(destLng)) {
        setRouteError('Invalid coordinate values on trip object.');
        return;
      }

      setPickupCoords([pickupLat, pickupLng]);
      setDestCoords([destLat, destLng]);
      setCurrentPosition([pickupLat, pickupLng]);

      setFetchingRoute(true);
      setRouteError(null);
      setRoutePath([]);

      getRoute(
        { lat: pickupLat, lng: pickupLng },
        { lat: destLat, lng: destLng }
      )
        .then((result) => {
          setRouteResult(result);
          setFetchingRoute(false);

          if (result.routes[0]?.overview_polyline) {
            const decoded = decodePolyline(result.routes[0].overview_polyline);
            setRoutePath(decoded);
          }

          if (result.routes[0]?.legs[0]) {
            setTotalDistance(result.routes[0].legs[0].distance.value / 1000);
            setTotalDuration(result.routes[0].legs[0].duration.value);
            setEtaMinutes(Math.round(result.routes[0].legs[0].duration.value / 60));
          }
        })
        .catch((err: any) => {
          console.error(err);
          setRouteError(err.message || 'Failed to query directions.');
          setFetchingRoute(false);
        });
    }
  }, [trip, googleScriptLoaded]);

  // WebSocket connection sync
  useEffect(() => {
    if (!tripId || !trip) return;

    const wsUrl = `/ws/trips/${tripId}/`;
    const socket = getTripSocket(tripId);
    tripSocketRef.current = socket;

    // Listen for coordinate updates (useful for passengers)
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'location_update') {
        // If passenger, receive and render simulated coordinates
        if (!isDriver) {
          if (data.latitude && data.longitude) {
            setCurrentPosition([parseFloat(data.latitude), parseFloat(data.longitude)]);
          }
          if (data.eta_minutes !== undefined) setEtaMinutes(data.eta_minutes);
          if (data.distance_covered !== undefined) setDistanceCovered(parseFloat(data.distance_covered));
          if (data.status) {
            if (data.status === 'arrived') {
              setStatus('arrived');
              setProgress(100);
            } else if (data.status === 'in_progress') {
              setStatus('in_progress');
              if (routePath.length > 0) {
                // Approximate passenger progress dynamically based on remaining minutes
                const progressRatio = 1 - (data.eta_minutes / ((totalDuration / 60) || 1));
                setProgress(Math.min(100, Math.max(0, Math.round(progressRatio * 100))));
              }
            }
          }
        }
      }
    };

    return () => {
      closeSocket(wsUrl);
    };
  }, [tripId, trip, isDriver, routePath, totalDuration]);

  // Handle Simulation loop
  const startLocalSimulation = () => {
    if (routePath.length === 0) return;

    setSimulationActive(true);
    setStatus('in_progress');
    
    // Clear any active timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    let stepIndex = currentIndex;
    if (stepIndex >= routePath.length || status === 'arrived') {
      stepIndex = 0;
      setCurrentIndex(0);
      setProgress(0);
      setDistanceCovered(0);
    }

    intervalRef.current = setInterval(() => {
      if (stepIndex >= routePath.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setSimulationActive(false);
        setStatus('arrived');

        // Broadcast final arrived state
        if (tripSocketRef.current && tripSocketRef.current.readyState === WebSocket.OPEN) {
          tripSocketRef.current.send(JSON.stringify({
            latitude: routePath[routePath.length - 1][0],
            longitude: routePath[routePath.length - 1][1],
            eta_minutes: 0,
            distance_covered: Number(totalDistance.toFixed(2)),
            status: 'arrived'
          }));
        }
        return;
      }

      const pos = routePath[stepIndex];
      setCurrentPosition(pos);
      setCurrentIndex(stepIndex);

      const frac = stepIndex / (routePath.length - 1 || 1);
      const currentProg = Math.round(frac * 100);
      const currentDist = Number((frac * totalDistance).toFixed(2));
      const currentEta = Math.max(0, Math.round(((1 - frac) * totalDuration) / 60));

      setProgress(currentProg);
      setDistanceCovered(currentDist);
      setEtaMinutes(currentEta);

      // Broadcast simulated step coordinates to WebSocket group channels
      if (tripSocketRef.current && tripSocketRef.current.readyState === WebSocket.OPEN) {
        tripSocketRef.current.send(JSON.stringify({
          latitude: pos[0],
          longitude: pos[1],
          eta_minutes: currentEta,
          distance_covered: currentDist,
          status: 'in_progress'
        }));
      }

      stepIndex++;
    }, 1000); // 1-second ticks as requested
  };

  const stopLocalSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setSimulationActive(false);
  };

  const resetLocalSimulation = () => {
    stopLocalSimulation();
    setCurrentIndex(0);
    setCurrentPosition(pickupCoords);
    setProgress(0);
    setDistanceCovered(0);
    setEtaMinutes(Math.round(totalDuration / 60));
    setStatus('idle');

    // Broadcast reset coordinates to WebSocket
    if (pickupCoords && tripSocketRef.current && tripSocketRef.current.readyState === WebSocket.OPEN) {
      tripSocketRef.current.send(JSON.stringify({
        latitude: pickupCoords[0],
        longitude: pickupCoords[1],
        eta_minutes: Math.round(totalDuration / 60),
        distance_covered: 0,
        status: 'idle'
      }));
    }
  };

  // Clean up interval timer on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">Tracking Sandbox</h2>
            <p className="text-muted-foreground text-xs">
              This is an isolated sandbox workspace for testing live journey simulation on real-road coordinates.
            </p>
          </div>
          
          {trip && (
            <span className={`px-3.5 py-1 rounded-full text-xs font-bold ${
              isDriver 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
            }`}>
              Viewing as: {isDriver ? 'Driver (Publisher)' : 'Passenger (Subscriber)'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Trip Loading Status */}
          <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trip Details Status</h3>
            {loadingTrip ? (
              <p className="text-xs text-muted-foreground animate-pulse">Loading trip details from API...</p>
            ) : trip ? (
              <div className="space-y-2 text-sm">
                <div>Trip ID: <span className="font-mono text-primary font-semibold">{trip.id}</span></div>
                <div>Pickup: <span className="font-semibold">{trip.ride_details.pickup_location}</span></div>
                <div>Destination: <span className="font-semibold">{trip.ride_details.destination_location}</span></div>
              </div>
            ) : (
              <p className="text-xs text-destructive">Failed to fetch trip details.</p>
            )}
          </div>

          {/* Right Column: Google Maps Directions Status */}
          <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Google Maps Directions Status</h3>
            <div className="space-y-2 text-sm">
              <div>Google Script: <span className={googleScriptLoaded ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>{googleScriptLoaded ? 'Loaded' : 'Loading...'}</span></div>
              {fetchingRoute && (
                <p className="text-xs text-muted-foreground animate-pulse">Querying directions from Google Maps API...</p>
              )}
              {routeError && (
                <p className="text-xs text-destructive font-semibold">Error: {routeError}</p>
              )}
              {routeResult && (
                <div className="space-y-1 text-xs">
                  <p className="text-emerald-500 font-bold">✓ Directions Route Retrieved Successfully!</p>
                  <p>Encoded Polyline Length: <span className="font-mono font-bold">{routeResult.routes[0]?.overview_polyline?.length || 0} chars</span></p>
                  {routeResult.routes[0]?.legs[0] && (
                    <>
                      <p>Distance: <span className="font-bold">{routeResult.routes[0].legs[0].distance?.text}</span></p>
                      <p>Duration: <span className="font-bold">{routeResult.routes[0].legs[0].duration?.text}</span></p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Sandbox Map rendering */}
        {trip && (
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Journey Map Viewer</h3>
            <SandboxMap
              pickup={pickupCoords}
              destination={destCoords}
              routePath={routePath}
              currentPosition={currentPosition}
            />
          </div>
        )}

        {/* Simulation Controls & Dashboard Segment */}
        {routePath.length > 0 && (
          <div className="mt-6 border-t border-border pt-6 space-y-6">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <h3 className="text-sm font-bold">Simulation Panel</h3>
              
              {isDriver && (
                <div className="flex space-x-2">
                  {!simulationActive ? (
                    <button
                      onClick={startLocalSimulation}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-md shadow-primary/10 hover:bg-primary/90 transition-all"
                    >
                      {status === 'arrived' ? 'Restart Simulation' : 'Start Simulation'}
                    </button>
                  ) : (
                    <button
                      onClick={stopLocalSimulation}
                      className="px-4 py-2 bg-amber-500 text-white font-semibold rounded-xl text-xs hover:bg-amber-600 transition-colors"
                    >
                      Pause Simulation
                    </button>
                  )}
                  
                  <button
                    onClick={resetLocalSimulation}
                    className="px-4 py-2 bg-muted hover:bg-muted-foreground/10 border border-border text-xs font-semibold rounded-xl transition-all"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Simulation Status Card */}
            <div className="bg-muted/20 border border-border rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Engine State</span>
                <p className={`text-sm font-bold mt-1 capitalize ${
                  status === 'in_progress' ? 'text-primary animate-pulse' :
                  status === 'arrived' ? 'text-emerald-500' : 'text-muted-foreground'
                }`}>{status.replace('_', ' ')}</p>
              </div>
              
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Distance Covered</span>
                <p className="text-sm font-bold mt-1">{distanceCovered} km / {totalDistance.toFixed(1)} km</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ETA (Duration)</span>
                <p className="text-sm font-bold mt-1">{etaMinutes} mins</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Index Step</span>
                <p className="text-sm font-bold mt-1">{currentIndex + 1} / {routePath.length}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Journey Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Simulated Coordinate Marker coordinates */}
            {currentPosition && (
              <div className="bg-card border border-border/80 rounded-xl p-3.5 flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground">Live Simulated Coordinates:</span>
                <span className="font-mono text-primary font-semibold">[{currentPosition[0].toFixed(6)}, {currentPosition[1].toFixed(6)}]</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingSandbox;
