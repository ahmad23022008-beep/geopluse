export function calculateDistanceMeters(
  latitude: number,
  longitude: number,
  officeLatitude: number,
  officeLongitude: number
): number {
  const coordinates = [latitude, longitude, officeLatitude, officeLongitude];
  if (
    !coordinates.every(Number.isFinite) ||
    latitude < -90 ||
    latitude > 90 ||
    officeLatitude < -90 ||
    officeLatitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    officeLongitude < -180 ||
    officeLongitude > 180
  ) {
    throw new RangeError('Koordinat untuk menghitung jarak tidak valid.');
  }

  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(officeLatitude - latitude);
  const longitudeDelta = toRadians(officeLongitude - longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude)) *
      Math.cos(toRadians(officeLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine))
  );
}