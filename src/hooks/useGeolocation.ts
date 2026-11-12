import { useCallback, useEffect, useRef, useState } from 'react';

export type GeolocationPermissionStatus =
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'unsupported'
  | 'unknown';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  heading: number | null;
  speed: number | null;
  loading: boolean;
  permissionStatus: GeolocationPermissionStatus;
  error: string | null;
  isWatching: boolean;
}

const initialState: GeolocationState = {
  latitude: null,
  longitude: null,
  accuracy: null,
  timestamp: null,
  heading: null,
  speed: null,
  loading: false,
  permissionStatus: 'unknown',
  error: null,
  isWatching: false,
};

export function useGeolocation() {
  const [state, setState] = useState(initialState);
  const watchIdRef = useRef<number | null>(null);
  const shouldWatchRef = useRef(false);
  const permissionStatusRef = useRef<GeolocationPermissionStatus>('unknown');

  const setPermissionStatus = useCallback((permissionStatus: GeolocationPermissionStatus) => {
    permissionStatusRef.current = permissionStatus;
    setState((current) => ({ ...current, permissionStatus }));
  }, []);

  const stopNativeWatch = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const stopWatching = useCallback(() => {
    shouldWatchRef.current = false;
    stopNativeWatch();
    setState((current) => ({ ...current, isWatching: false, loading: false }));
  }, [stopNativeWatch]);

  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null || shouldWatchRef.current) return;

    if (!window.isSecureContext) {
      setState((current) => ({
        ...current,
        error: 'Lokasi hanya tersedia melalui HTTPS atau localhost.',
        loading: false,
      }));
      return;
    }

    if (!navigator.geolocation) {
      setPermissionStatus('unsupported');
      setState((current) => ({
        ...current,
        error: 'Browser ini tidak mendukung layanan lokasi.',
        loading: false,
      }));
      return;
    }

    if (permissionStatusRef.current === 'denied') {
      setState((current) => ({
        ...current,
        error: 'Izin lokasi ditolak. Aktifkan izin lokasi melalui pengaturan situs di browser, lalu coba lagi.',
        loading: false,
      }));
      return;
    }

    shouldWatchRef.current = true;
    setState((current) => ({
      ...current,
      latitude: null,
      longitude: null,
      accuracy: null,
      timestamp: null,
      heading: null,
      speed: null,
      loading: true,
      error: null,
      isWatching: true,
    }));

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, heading, speed } = position.coords;
          const validCoordinates =
            Number.isFinite(latitude) &&
            latitude >= -90 &&
            latitude <= 90 &&
            Number.isFinite(longitude) &&
            longitude >= -180 &&
            longitude <= 180 &&
            Number.isFinite(accuracy) &&
            accuracy >= 0 &&
            Number.isFinite(position.timestamp);

          if (!validCoordinates) {
            setState((current) => ({
              ...current,
              latitude: null,
              longitude: null,
              accuracy: null,
              timestamp: null,
              heading: null,
              speed: null,
              loading: false,
              error: 'Browser mengirim koordinat lokasi yang tidak valid.',
            }));
            return;
          }

          setPermissionStatus('granted');
          setState((current) => ({
            ...current,
            latitude,
            longitude,
            accuracy,
            timestamp: position.timestamp,
            heading: heading !== null && Number.isFinite(heading) ? heading : null,
            speed: speed !== null && Number.isFinite(speed) ? speed : null,
            loading: false,
            error: null,
            isWatching: true,
          }));
        },
        (positionError) => {
          const errorMessage =
            positionError.code === positionError.PERMISSION_DENIED
              ? 'Izin lokasi ditolak. Aktifkan izin lokasi melalui pengaturan situs di browser, lalu coba lagi.'
              : positionError.code === positionError.POSITION_UNAVAILABLE
              ? 'Lokasi belum dapat ditentukan. Pastikan layanan lokasi perangkat aktif.'
              : positionError.code === positionError.TIMEOUT
              ? 'Waktu tunggu GPS habis. Pindah ke area dengan sinyal lebih baik lalu coba lagi.'
              : 'Terjadi kesalahan saat membaca lokasi perangkat.';

          if (positionError.code === positionError.PERMISSION_DENIED) {
            setPermissionStatus('denied');
            shouldWatchRef.current = false;
            stopNativeWatch();
          }

          setState((current) => ({
            ...current,
            latitude: null,
            longitude: null,
            accuracy: null,
            timestamp: null,
            heading: null,
            speed: null,
            loading: false,
            isWatching: shouldWatchRef.current,
            error: errorMessage,
          }));
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } catch {
      shouldWatchRef.current = false;
      setState((current) => ({
        ...current,
        loading: false,
        isWatching: false,
        error: 'Browser tidak dapat memulai layanan lokasi.',
      }));
    }
  }, [setPermissionStatus, stopNativeWatch]);

  const refreshLocation = useCallback(async () => {
    stopNativeWatch();
    shouldWatchRef.current = false;

    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(permission.state);
      } catch {
        setPermissionStatus('unknown');
      }
    } else {
      setPermissionStatus('unknown');
    }

    startWatching();
  }, [setPermissionStatus, startWatching, stopNativeWatch]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported');
      return;
    }

    if (!navigator.permissions?.query) {
      setPermissionStatus('unknown');
      return;
    }

    let permission: PermissionStatus | null = null;
    let mounted = true;

    void navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!mounted) return;
        permission = result;
        setPermissionStatus(result.state);
        result.onchange = () => {
          setPermissionStatus(result.state);
          if (result.state === 'denied') stopWatching();
        };
      })
      .catch(() => setPermissionStatus('unknown'));

    return () => {
      mounted = false;
      if (permission) permission.onchange = null;
      shouldWatchRef.current = false;
      stopNativeWatch();
    };
  }, [setPermissionStatus, stopNativeWatch, stopWatching]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (shouldWatchRef.current) {
          stopNativeWatch();
          setState((current) => ({ ...current, isWatching: false, loading: false }));
        }
        return;
      }

      if (shouldWatchRef.current) {
        shouldWatchRef.current = false;
        startWatching();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startWatching, stopNativeWatch]);

  return {
    ...state,
    startWatching,
    stopWatching,
    refreshLocation,
  };
}