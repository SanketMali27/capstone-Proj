/**
 * ============================================================================
 * REDISTRIBUTION PRIORITY ENGINE
 * ============================================================================
 *
 * Provides:
 * 1. Global Priority Score:
 *    Platform-wide ranking of surplus food listings based on:
 *    - Waiting time (35%)
 *    - Demand match (30%)
 *    - Nearest recipient distance (20%)
 *    - Quantity (10%)
 *    - Pickup availability (5%)
 *
 * 2. Personalized Priority Score:
 *    Recipient-customized ranking based on recipient's operational preferences.
 *    - Calculates distance relative to the logged-in recipient.
 *    - Reuses validated factor scores.
 *    - Does NOT alter global priority scores or other recipients' rankings.
 * ============================================================================
 */

// Baseline global priority weights (configurable for future tuning)
const WEIGHTS = Object.freeze({
  waitingTime: 0.35,
  demandMatch: 0.30,
  distance: 0.20,
  quantity: 0.10,
  pickupAvailability: 0.05
});

// Default recipient preference weights (percentages summing to 100)
const DEFAULT_PREFERENCES = Object.freeze({
  waitingTime: 35,
  demandMatch: 30,
  distance: 20,
  quantity: 10,
  pickupAvailability: 5
});

const LIMITS = Object.freeze({
  waitingHoursToMax: 24,
  distanceKmToMax: 50,
  quantityToMax: 100
});

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

/**
 * Validate that a GeoJSON Point has real, non-zero, finite coordinates.
 * [0, 0] represents unconfigured/missing coordinates in this system.
 */
const isValidCoordinate = (point) => {
  if (!point || !Array.isArray(point.coordinates) || point.coordinates.length < 2) {
    return false;
  }
  const [lon, lat] = point.coordinates;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return false;
  }
  // [0, 0] is treated as missing location, not zero distance
  if (lon === 0 && lat === 0) {
    return false;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return false;
  }
  return true;
};

/**
 * Haversine formula to compute great-circle distance in kilometers.
 * Returns null if either location is missing, invalid, or [0, 0].
 */
const haversineKm = (a, b) => {
  if (!isValidCoordinate(a) || !isValidCoordinate(b)) {
    return null;
  }

  const [lon1, lat1] = a.coordinates;
  const [lon2, lat2] = b.coordinates;

  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/**
 * Platform-wide urgency label based on score:
 * URGENT: 80+
 * HIGH: 60 - 79.99
 * MEDIUM: 40 - 59.99
 * NORMAL: below 40
 */
const urgencyFor = (score) => {
  const numericScore = Number(score) || 0;
  if (numericScore >= 80) return 'URGENT';
  if (numericScore >= 60) return 'HIGH';
  if (numericScore >= 40) return 'MEDIUM';
  return 'NORMAL';
};

/**
 * Calculate the global redistribution priority score.
 */
const calculateRedistributionPriority = ({
  listing,
  requirements = [],
  recipients = [],
  now = new Date(),
  customWeights = WEIGHTS
}) => {
  const weights = customWeights || WEIGHTS;

  // 1. Waiting Time Score
  const rawCreatedAt = listing?.createdAt ? new Date(listing.createdAt) : now;
  const createdAt = isNaN(rawCreatedAt.getTime()) ? now : rawCreatedAt;
  const waitingMinutes = Math.max(0, (now - createdAt) / 60000);
  const waitingTimeScore = clamp(
    (waitingMinutes / (LIMITS.waitingHoursToMax * 60)) * 100
  );

  // 2. Quantity Score
  const rawQuantity = Number(listing?.quantity);
  const quantity = Number.isFinite(rawQuantity) ? Math.max(0, rawQuantity) : 0;
  const quantityScore = clamp((quantity / LIMITS.quantityToMax) * 100);

  // 3. Demand Match Score
  const listingFoodType = String(listing?.foodType || '').toLowerCase();
  const listingUnit = listing?.quantityUnit;

  const matchingRequirements = (requirements || []).filter((item) => {
    if (item.status !== 'active') return false;
    if (String(item.foodType || '').toLowerCase() !== listingFoodType) return false;
    if (item.quantityUnit && listingUnit && item.quantityUnit !== listingUnit) return false;
    const reqQty = Number(item.quantityRequired) || 0;
    const fulQty = Number(item.quantityFulfilled) || 0;
    return Math.max(0, reqQty - fulQty) > 0;
  });

  const outstandingDemand = matchingRequirements.reduce((sum, item) => {
    const reqQty = Number(item.quantityRequired) || 0;
    const fulQty = Number(item.quantityFulfilled) || 0;
    return sum + Math.max(0, reqQty - fulQty);
  }, 0);

  const quantityCompatibility =
    outstandingDemand > 0 && quantity > 0
      ? Math.min(1, quantity / outstandingDemand)
      : 0;

  const demandMatchScore =
    matchingRequirements.length > 0 && quantity > 0
      ? clamp(55 + quantityCompatibility * 45)
      : 0;

  // 4. Distance Score (relative to nearest recipient among provided recipients)
  const distances = (recipients || [])
    .map((recipient) => haversineKm(listing?.restaurantLocation, recipient?.location))
    .filter((value) => value !== null);

  const nearestDistanceKm = distances.length ? Math.min(...distances) : null;
  const distanceScore =
    nearestDistanceKm === null
      ? 0
      : clamp(100 * (1 - nearestDistanceKm / LIMITS.distanceKmToMax));

  // 5. Pickup Availability Score
  const rawFrom = listing?.pickupAvailableFrom ? new Date(listing.pickupAvailableFrom) : now;
  const from = isNaN(rawFrom.getTime()) ? now : rawFrom;
  const rawUntil = listing?.pickupAvailableUntil ? new Date(listing.pickupAvailableUntil) : null;
  const until = rawUntil && !isNaN(rawUntil.getTime()) ? rawUntil : null;

  let pickupAvailabilityScore =
    from <= now
      ? 100
      : clamp(100 - ((from - now) / (24 * 60 * 60 * 1000)) * 100);

  // Expired pickup window scores 0
  if (until && until < now) {
    pickupAvailabilityScore = 0;
  }

  // Calculate weighted global priority score (0-100)
  const priorityScore = Number(
    (
      waitingTimeScore * (weights.waitingTime ?? WEIGHTS.waitingTime) +
      demandMatchScore * (weights.demandMatch ?? WEIGHTS.demandMatch) +
      distanceScore * (weights.distance ?? WEIGHTS.distance) +
      quantityScore * (weights.quantity ?? WEIGHTS.quantity) +
      pickupAvailabilityScore * (weights.pickupAvailability ?? WEIGHTS.pickupAvailability)
    ).toFixed(2)
  );

  return {
    priorityScore,
    urgencyLevel: urgencyFor(priorityScore),
    priorityFactors: {
      waitingTimeScore: Number(waitingTimeScore.toFixed(2)),
      demandMatchScore: Number(demandMatchScore.toFixed(2)),
      distanceScore: Number(distanceScore.toFixed(2)),
      quantityScore: Number(quantityScore.toFixed(2)),
      pickupAvailabilityScore: Number(pickupAvailabilityScore.toFixed(2)),
      waitingMinutes: Math.round(waitingMinutes),
      nearestDistanceKm: nearestDistanceKm === null ? null : Number(nearestDistanceKm.toFixed(2)),
      matchingRequirementCount: matchingRequirements.length
    }
  };
};

/**
 * Validate and normalize recipient priority preferences so that they sum to exactly 100%.
 */
const normalizePreferences = (prefs = {}) => {
  const waitingTime = Math.max(0, Number(prefs?.waitingTime ?? DEFAULT_PREFERENCES.waitingTime) || 0);
  const demandMatch = Math.max(0, Number(prefs?.demandMatch ?? DEFAULT_PREFERENCES.demandMatch) || 0);
  const distance = Math.max(0, Number(prefs?.distance ?? DEFAULT_PREFERENCES.distance) || 0);
  const quantity = Math.max(0, Number(prefs?.quantity ?? DEFAULT_PREFERENCES.quantity) || 0);
  const pickupAvailability = Math.max(0, Number(prefs?.pickupAvailability ?? DEFAULT_PREFERENCES.pickupAvailability) || 0);

  const sum = waitingTime + demandMatch + distance + quantity + pickupAvailability;
  if (sum <= 0) {
    return { ...DEFAULT_PREFERENCES };
  }

  const normalized = {
    waitingTime: Number(((waitingTime / sum) * 100).toFixed(2)),
    demandMatch: Number(((demandMatch / sum) * 100).toFixed(2)),
    distance: Number(((distance / sum) * 100).toFixed(2)),
    quantity: Number(((quantity / sum) * 100).toFixed(2)),
    pickupAvailability: Number(((pickupAvailability / sum) * 100).toFixed(2))
  };

  // Adjust rounding drift so sum is exactly 100.00
  const currentTotal =
    normalized.waitingTime +
    normalized.demandMatch +
    normalized.distance +
    normalized.quantity +
    normalized.pickupAvailability;
  const drift = Number((100 - currentTotal).toFixed(2));
  normalized.waitingTime = Number((normalized.waitingTime + drift).toFixed(2));

  return normalized;
};

/**
 * Calculate personalized priority score for a specific logged-in recipient.
 *
 * Formula:
 * Personal Score = Sum( (Normalized Weight / 100) * Factor Score )
 *
 * Calculates distance relative to THIS recipient, rather than nearest recipient.
 * Does NOT alter the listing's global priority score or other recipients' rankings.
 */
const calculatePersonalizedScore = ({
  listing,
  recipient,
  requirements = [],
  preferences = DEFAULT_PREFERENCES,
  now = new Date()
}) => {
  const norm = normalizePreferences(preferences);

  // 1. Waiting Time Score (reuse listing factor if available, else calculate)
  let waitingTimeScore = listing?.priorityFactors?.waitingTimeScore;
  if (waitingTimeScore === undefined || waitingTimeScore === null) {
    const rawCreatedAt = listing?.createdAt ? new Date(listing.createdAt) : now;
    const createdAt = isNaN(rawCreatedAt.getTime()) ? now : rawCreatedAt;
    const waitingMinutes = Math.max(0, (now - createdAt) / 60000);
    waitingTimeScore = clamp((waitingMinutes / (LIMITS.waitingHoursToMax * 60)) * 100);
  }

  // 2. Demand Match Score
  // For NGO recipients: check if THIS specific NGO has active matching requirement
  let demandMatchScore = 0;
  let matchingRequirementCount = 0;
  const listingFoodType = String(listing?.foodType || '').toLowerCase();
  const rawQuantity = Number(listing?.quantity);
  const quantity = Number.isFinite(rawQuantity) ? Math.max(0, rawQuantity) : 0;

  if (recipient?.role === 'ngo' && Array.isArray(requirements) && requirements.length > 0) {
    const matchingReqs = requirements.filter((item) => {
      const ngoId = String(item.ngo?._id || item.ngo || '');
      const recipientId = String(recipient?._id || '');
      if (ngoId !== recipientId) return false;
      if (item.status !== 'active') return false;
      if (String(item.foodType || '').toLowerCase() !== listingFoodType) return false;
      if (item.quantityUnit && listing?.quantityUnit && item.quantityUnit !== listing.quantityUnit) return false;
      const reqQty = Number(item.quantityRequired) || 0;
      const fulQty = Number(item.quantityFulfilled) || 0;
      return Math.max(0, reqQty - fulQty) > 0;
    });

    matchingRequirementCount = matchingReqs.length;
    const outstandingDemand = matchingReqs.reduce((sum, item) => {
      const reqQty = Number(item.quantityRequired) || 0;
      const fulQty = Number(item.quantityFulfilled) || 0;
      return sum + Math.max(0, reqQty - fulQty);
    }, 0);

    const quantityCompatibility =
      outstandingDemand > 0 && quantity > 0
        ? Math.min(1, quantity / outstandingDemand)
        : 0;

    demandMatchScore =
      matchingReqs.length > 0 && quantity > 0
        ? clamp(55 + quantityCompatibility * 45)
        : 0;
  } else {
    // For animal / industry recipients or when specific requirements are not tracked,
    // fallback to listing's global demand match score
    demandMatchScore = listing?.priorityFactors?.demandMatchScore ?? 0;
    matchingRequirementCount = listing?.priorityFactors?.matchingRequirementCount ?? 0;
  }

  // 3. Distance Score (relative to THIS logged-in recipient)
  const distKm = haversineKm(listing?.restaurantLocation, recipient?.location);
  const distanceScore =
    distKm === null ? 0 : clamp(100 * (1 - distKm / LIMITS.distanceKmToMax));

  // 4. Quantity Score
  let quantityScore = listing?.priorityFactors?.quantityScore;
  if (quantityScore === undefined || quantityScore === null) {
    quantityScore = clamp((quantity / LIMITS.quantityToMax) * 100);
  }

  // 5. Pickup Availability Score
  let pickupAvailabilityScore = listing?.priorityFactors?.pickupAvailabilityScore;
  if (pickupAvailabilityScore === undefined || pickupAvailabilityScore === null) {
    const rawFrom = listing?.pickupAvailableFrom ? new Date(listing.pickupAvailableFrom) : now;
    const from = isNaN(rawFrom.getTime()) ? now : rawFrom;
    const rawUntil = listing?.pickupAvailableUntil ? new Date(listing.pickupAvailableUntil) : null;
    const until = rawUntil && !isNaN(rawUntil.getTime()) ? rawUntil : null;

    pickupAvailabilityScore =
      from <= now ? 100 : clamp(100 - ((from - now) / (24 * 60 * 60 * 1000)) * 100);
    if (until && until < now) {
      pickupAvailabilityScore = 0;
    }
  }

  // Personal score = sum ( (normWeight / 100) * factorScore )
  const personalScore = Number(
    (
      (norm.waitingTime / 100) * waitingTimeScore +
      (norm.demandMatch / 100) * demandMatchScore +
      (norm.distance / 100) * distanceScore +
      (norm.quantity / 100) * quantityScore +
      (norm.pickupAvailability / 100) * pickupAvailabilityScore
    ).toFixed(2)
  );

  return {
    personalScore,
    personalFactors: {
      waitingTimeScore: Number(Number(waitingTimeScore).toFixed(2)),
      demandMatchScore: Number(Number(demandMatchScore).toFixed(2)),
      distanceScore: Number(Number(distanceScore).toFixed(2)),
      quantityScore: Number(Number(quantityScore).toFixed(2)),
      pickupAvailabilityScore: Number(Number(pickupAvailabilityScore).toFixed(2)),
      distanceKm: distKm === null ? null : Number(distKm.toFixed(2)),
      matchingRequirementCount
    },
    appliedWeights: norm
  };
};

module.exports = {
  WEIGHTS,
  DEFAULT_PREFERENCES,
  LIMITS,
  isValidCoordinate,
  haversineKm,
  urgencyFor,
  calculateRedistributionPriority,
  normalizePreferences,
  calculatePersonalizedScore
};
