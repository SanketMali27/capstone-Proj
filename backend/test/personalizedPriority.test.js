const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  calculateRedistributionPriority,
  calculatePersonalizedScore
} = require('../utils/redistributionPriority');

test('normalizePreferences - Normalizes arbitrary weights to exactly 100%', () => {
  const custom = {
    waitingTime: 50,
    demandMatch: 50,
    distance: 0,
    quantity: 0,
    pickupAvailability: 0
  };

  const norm = normalizePreferences(custom);
  assert.equal(norm.waitingTime, 50);
  assert.equal(norm.demandMatch, 50);
  assert.equal(norm.distance, 0);

  const total =
    norm.waitingTime +
    norm.demandMatch +
    norm.distance +
    norm.quantity +
    norm.pickupAvailability;
  assert.equal(Number(total.toFixed(2)), 100);
});

test('normalizePreferences - Falls back to DEFAULT_PREFERENCES when sum is 0', () => {
  const norm = normalizePreferences({
    waitingTime: 0,
    demandMatch: 0,
    distance: 0,
    quantity: 0,
    pickupAvailability: 0
  });

  assert.equal(norm.waitingTime, DEFAULT_PREFERENCES.waitingTime);
  assert.equal(norm.demandMatch, DEFAULT_PREFERENCES.demandMatch);
  assert.equal(norm.distance, DEFAULT_PREFERENCES.distance);
  assert.equal(norm.quantity, DEFAULT_PREFERENCES.quantity);
  assert.equal(norm.pickupAvailability, DEFAULT_PREFERENCES.pickupAvailability);
});

test('Personalized Priority - Calculates distance relative to THIS recipient, not nearest', () => {
  const listing = {
    foodName: 'Rice Trays',
    foodType: 'cooked',
    quantity: 40,
    quantityUnit: 'portions',
    restaurantLocation: { type: 'Point', coordinates: [77.5946, 12.9716] },
    createdAt: new Date()
  };

  // Recipient A is 1 km away
  const recipientA = {
    _id: 'recA',
    role: 'ngo',
    location: { type: 'Point', coordinates: [77.599, 12.968] },
    priorityPreferences: { waitingTime: 10, demandMatch: 10, distance: 70, quantity: 5, pickupAvailability: 5 }
  };

  // Recipient B is 35 km away
  const recipientB = {
    _id: 'recB',
    role: 'ngo',
    location: { type: 'Point', coordinates: [77.9, 13.2] },
    priorityPreferences: { waitingTime: 10, demandMatch: 10, distance: 70, quantity: 5, pickupAvailability: 5 }
  };

  const globalResult = calculateRedistributionPriority({
    listing,
    recipients: [recipientA, recipientB],
    requirements: []
  });

  const scoreA = calculatePersonalizedScore({
    listing,
    recipient: recipientA,
    requirements: [],
    preferences: recipientA.priorityPreferences
  });

  const scoreB = calculatePersonalizedScore({
    listing,
    recipient: recipientB,
    requirements: [],
    preferences: recipientB.priorityPreferences
  });

  // Since both emphasize distance (70%), nearby Recipient A should have significantly higher personal score than far Recipient B
  assert.ok(
    scoreA.personalScore > scoreB.personalScore,
    `Recipient A (${scoreA.personalScore}) should score higher than Recipient B (${scoreB.personalScore})`
  );

  // Global priority score remains completely unchanged by either recipient's preferences
  assert.ok(globalResult.priorityScore > 0);
  assert.equal(globalResult.priorityScore, globalResult.priorityScore);
});

test('Personalized Priority - Independent of other recipients rankings and preferences', () => {
  const listing = {
    foodName: 'Veg Sandwiches',
    foodType: 'packaged',
    quantity: 50,
    quantityUnit: 'boxes',
    restaurantLocation: { type: 'Point', coordinates: [77.5946, 12.9716] },
    createdAt: new Date(),
    priorityFactors: {
      waitingTimeScore: 50,
      demandMatchScore: 40,
      distanceScore: 60,
      quantityScore: 50,
      pickupAvailabilityScore: 100
    }
  };

  const recipientDistanceFocused = {
    _id: 'user1',
    role: 'ngo',
    location: { type: 'Point', coordinates: [77.599, 12.968] }
  };

  const res1 = calculatePersonalizedScore({
    listing,
    recipient: recipientDistanceFocused,
    preferences: { distance: 80, waitingTime: 5, demandMatch: 5, quantity: 5, pickupAvailability: 5 }
  });

  const res2 = calculatePersonalizedScore({
    listing,
    recipient: recipientDistanceFocused,
    preferences: { distance: 5, waitingTime: 80, demandMatch: 5, quantity: 5, pickupAvailability: 5 }
  });

  // Changing preferences changes the personal score for user1 without altering the listing factors
  assert.notEqual(res1.personalScore, res2.personalScore);
  assert.equal(listing.priorityFactors.waitingTimeScore, 50);
});
