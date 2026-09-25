const WEIGHTS = Object.freeze({
  waitingTime: 0.35,
  demandMatch: 0.30,
  distance: 0.20,
  quantity: 0.10,
  pickupAvailability: 0.05
});

const LIMITS = Object.freeze({ waitingHoursToMax: 24, distanceKmToMax: 50, quantityToMax: 100 });

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const haversineKm = (a, b) => {
  if (!a?.coordinates || !b?.coordinates || a.coordinates.length < 2 || b.coordinates.length < 2) return null;


  const [lon1, lat1] = a.coordinates;
  const [lon2, lat2] = b.coordinates;

  if (![lon1, lat1, lon2, lat2].every(Number.isFinite)) return null;

  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const urgencyFor = (score) => score >= 80 ? 'URGENT' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'NORMAL';

const calculateRedistributionPriority = ({ listing, requirements = [], recipients = [], now = new Date() }) => {
  const waitingMinutes = Math.max(0, (now - new Date(listing.createdAt || now)) / 60000);
  const waitingTimeScore = clamp((waitingMinutes / (LIMITS.waitingHoursToMax * 60)) * 100);
  const matchingRequirements = requirements.filter((item) =>
    item.status === 'active' && item.foodType?.toLowerCase() === listing.foodType?.toLowerCase() && item.quantityUnit === listing.quantityUnit &&
    Math.max(0, Number(item.quantityRequired || 0) - Number(item.quantityFulfilled || 0)) > 0
  );
  const outstandingDemand = matchingRequirements.reduce((sum, item) => sum + Math.max(0, item.quantityRequired - item.quantityFulfilled), 0);
  const quantityCompatibility = outstandingDemand > 0 ? Math.min(1, listing.quantity / outstandingDemand) : 0;
  const demandMatchScore = matchingRequirements.length ? clamp(55 + quantityCompatibility * 45) : 0;

  const distances = recipients.map((recipient) => haversineKm(listing.restaurantLocation, recipient.location)).filter((value) => value !== null);
  const nearestDistanceKm = distances.length ? Math.min(...distances) : null;
  const distanceScore = nearestDistanceKm === null ? 0 : clamp(100 * (1 - nearestDistanceKm / LIMITS.distanceKmToMax));
  const quantityScore = clamp((Math.max(0, Number(listing.quantity || 0)) / LIMITS.quantityToMax) * 100);
  const from = listing.pickupAvailableFrom ? new Date(listing.pickupAvailableFrom) : now;
  const until = listing.pickupAvailableUntil ? new Date(listing.pickupAvailableUntil) : null;
  let pickupAvailabilityScore = from <= now ? 100 : clamp(100 - ((from - now) / (24 * 60 * 60 * 1000)) * 100);
  if (until && until < now) pickupAvailabilityScore = 0;

  const priorityScore = Number((waitingTimeScore * WEIGHTS.waitingTime + demandMatchScore * WEIGHTS.demandMatch + distanceScore * WEIGHTS.distance + quantityScore * WEIGHTS.quantity + pickupAvailabilityScore * WEIGHTS.pickupAvailability).toFixed(2));
  return {
    priorityScore,
    urgencyLevel: urgencyFor(priorityScore),
    priorityFactors: {
      waitingTimeScore: Number(waitingTimeScore.toFixed(2)), demandMatchScore: Number(demandMatchScore.toFixed(2)),
      distanceScore: Number(distanceScore.toFixed(2)), quantityScore: Number(quantityScore.toFixed(2)),
      pickupAvailabilityScore: Number(pickupAvailabilityScore.toFixed(2)), waitingMinutes: Math.round(waitingMinutes),
      nearestDistanceKm: nearestDistanceKm === null ? null : Number(nearestDistanceKm.toFixed(2)),
      matchingRequirementCount: matchingRequirements.length
    }
  };
};

module.exports = { WEIGHTS, LIMITS, haversineKm, urgencyFor, calculateRedistributionPriority };
