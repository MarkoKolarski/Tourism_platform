import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Location {
  latitude: number;
  longitude: number;
}

export function useUserLocation() {
  const { user, isLoading } = useAuth();
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    const fetchCurrentLocation = async () => {
      try {
        const response = await fetch(`/api/stakeholders-service/locations/current/${user.id}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.has_location && data.current_location) {
            setUserLocation({
              latitude: data.current_location.latitude,
              longitude: data.current_location.longitude,
            });
          } else {
            setUserLocation(null);
          }
        }
      } catch (error) {
        console.error("Greška pri učitavanju lokacije korisnika:", error);
        setUserLocation(null);
      }
    };

    fetchCurrentLocation();
    // Poll for location updates every 30 seconds
    const intervalId = setInterval(fetchCurrentLocation, 30000);

    return () => clearInterval(intervalId);
  }, [user, isLoading]);

  return userLocation;
}
