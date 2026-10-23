const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WEIGHTS,
  DEFAULT_PREFERENCES,
  urgencyFor,
  calculateRedistributionPriority,
  isValidCoordinate,
  haversineKm
} = require('../utils/redistributionPriority');

test('Global Priority - Baseline weights are fixed and sum to 1.0', () => {
  assert.equal(WEIGHTS.waitingTime, 0.35);
  assert.equal(WEIGHTS.demandMatch, 0.30);
  assert.equal(WEIGHTS.distance, 0.20);
  assert.equal(WEIGHTS.quantity, 0.10);
  assert.equal(WEIGHTS.pickupAvailability, 0.05);

  const sum =
    WEIGHTS.waitingTime +
    WEIGHTS.demandMatch +
    WEIGHTS.distance +
    WEIGHTS.quantity +
    WEIGHTS.pickupAvailability;
  assert.equal(Number(sum.toFixed(2)), 1.0);
});

test('Urgency thresholds correspond to platform standards', () => {
  assert.equal(urgencyFor(100), 'URGENT');
  assert.equal(urgencyFor(80), 'URGENT');
  assert.equal(urgencyFor(79.99), 'HIGH');
  assert.equal(urgencyFor(60), 'HIGH');
  assert.equal(urgencyFor(59.99), 'MEDIUM');
  assert.equal(urgencyFor(40), 'MEDIUM');
  assert.equal(urgencyFor(39.99), 'NORMAL');
  assert.equal(urgencyFor(0), 'NORMAL');
});

test('Coordinates validation handles missing, [0,0], and out-of-bounds coordinates', () => {
  assert.equal(isValidCoordinate(null), false);
  assert.equal(isValidCoordinate({}), false);
  assert.equal(isValidCoordinate({ type: 'Point', coordinates: [0, 0] }), false);
  assert.equal(isValidCoordinate({ type: 'Point', coordinates: ['invalid', 12] }), false);
  assert.equal(isValidCoordinate({ type: 'Point', coordinates: [77.59, 12.97] }), true);

  // Haversine returns null when either coordinate is invalid
  assert.equal(haversineKm({ coordinates: [0, 0] }, { coordinates: [77.59, 12.97] }), null);
  assert.equal(haversineKm(null, { coordinates: [77.59, 12.97] }), null);

  // Real distance between two valid points in Bangalore
  const dist = haversineKm(
    { coordinates: [77.5946, 12.9716] },
    { coordinates: [77.599, 12.968] }
  );
  assert.ok(dist > 0 && dist < 2, `Expected distance ~0.6km, got ${dist}`);
});

test('calculateRedistributionPriority handles missing coordinates without throwing', () => {
  const listing = {
    foodName: 'Rice Meal',
    foodType: 'cooked',
    quantity: 50,
    quantityUnit: 'portions',
    restaurantLocation: { type: 'Point', coordinates: [0, 0] },
    createdAt: new Date()
  };

  const result = calculateRedistributionPriority({
    listing,
    recipients: [{ location: { coordinates: [77.59, 12.97] } }],
    requirements: []
  });

  assert.equal(result.priorityFactors.nearestDistanceKm, null);
  assert.equal(result.priorityFactors.distanceScore, 0);
  assert.ok(result.priorityScore >= 0 && result.priorityScore <= 100);
});

test('Expired pickup window results in pickupAvailabilityScore of 0', () => {
  const past = new Date(Date.now() - 3600000); // 1 hour ago
  const listing = {
    foodName: 'Bread Loaves',
    foodType: 'bakery',
    quantity: 10,
    quantityUnit: 'boxes',
    pickupAvailableFrom: new Date(Date.now() - 7200000),
    pickupAvailableUntil: past,
    createdAt: new Date()
  };

  const result = calculateRedistributionPriority({
    listing,
    recipients: [],
    requirements: []
  });

  assert.equal(result.priorityFactors.pickupAvailabilityScore, 0);
});

test('Zero, negative, or invalid quantities do not produce NaN', () => {
  const listing = {
    foodName: 'Leftover soup',
    foodType: 'cooked',
    quantity: -5,
    quantityUnit: 'litres',
    createdAt: new Date()
  };

  const result = calculateRedistributionPriority({
    listing,
    recipients: [],
    requirements: []
  });

  assert.equal(result.priorityFactors.quantityScore, 0);
  assert.ok(!Number.isNaN(result.priorityScore));
});

test('Demand match scores 0 when no matching requirements exist', () => {
  const listing = {
    foodName: 'Cooked Curry',
    foodType: 'cooked',
    quantity: 30,
    quantityUnit: 'portions',
    createdAt: new Date()
  };

  const requirements = [
    {
      status: 'active',
      foodType: 'bakery',
      quantityRequired: 50,
      quantityFulfilled: 0,
      quantityUnit: 'boxes'
    }
  ];

  const result = calculateRedistributionPriority({
    listing,
    recipients: [],
    requirements
  });

  assert.equal(result.priorityFactors.demandMatchScore, 0);
  assert.equal(result.priorityFactors.matchingRequirementCount, 0);
});
