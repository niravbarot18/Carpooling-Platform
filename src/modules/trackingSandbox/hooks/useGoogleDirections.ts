import { useState, useEffect } from 'react';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export const useGoogleDirections = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).google && (window as any).google.maps) {
      setLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      console.warn('Google Maps API key is missing.');
      return;
    }

    let script = document.getElementById('google-maps-api-script') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-maps-api-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleLoad = () => {
      setLoaded(true);
    };

    script.addEventListener('load', handleLoad);

    return () => {
      script.removeEventListener('load', handleLoad);
    };
  }, []);

  const getRoute = (origin: LatLngLiteral, destination: LatLngLiteral): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!(window as any).google || !(window as any).google.maps) {
        reject(new Error('Google Maps script is not fully loaded.'));
        return;
      }

      const directionsService = new (window as any).google.maps.DirectionsService();
      directionsService.route(
        {
          origin: new (window as any).google.maps.LatLng(origin.lat, origin.lng),
          destination: new (window as any).google.maps.LatLng(destination.lat, destination.lng),
          travelMode: (window as any).google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === (window as any).google.maps.DirectionsStatus.OK) {
            resolve(result);
          } else {
            reject(new Error(`Google Directions request failed with status: ${status}`));
          }
        }
      );
    });
  };

  return { loaded, getRoute };
};
