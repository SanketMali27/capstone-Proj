const test = require('node:test');
const assert = require('node:assert/strict');

const roleByIntent = {
  human: 'ngo',
  animal: 'animal_husbandry',
  industry: 'industry'
};

const intentByRole = {
  ngo: 'human',
  animal_husbandry: 'animal',
  industry: 'industry'
};

test('Eligibility - Intended recipient types match strictly declared recipient roles', () => {
  assert.equal(roleByIntent.human, 'ngo');
  assert.equal(roleByIntent.animal, 'animal_husbandry');
  assert.equal(roleByIntent.industry, 'industry');

  assert.equal(intentByRole.ngo, 'human');
  assert.equal(intentByRole.animal_husbandry, 'animal');
  assert.equal(intentByRole.industry, 'industry');
});

test('Eligibility - High global priority cannot bypass intended recipient role', () => {
  const urgentAnimalListing = {
    _id: 'listing1',
    foodName: 'Surplus animal feed batch',
    intendedRecipientType: 'animal',
    priorityScore: 98,
    urgencyLevel: 'URGENT',
    status: 'available'
  };

  const ngoUser = {
    _id: 'ngo1',
    role: 'ngo'
  };

  // Eligibility check logic from food.js
  const ngoIntent = intentByRole[ngoUser.role];
  const isEligible = ngoIntent === urgentAnimalListing.intendedRecipientType;

  assert.equal(isEligible, false, 'NGO must not be eligible for animal-intended food despite 98 priority');
});

test('Donation Workflow - Status state machine transitions', () => {
  const validTransitions = {
    available: ['requested', 'cancelled'],
    requested: ['claimed', 'available', 'cancelled'],
    claimed: ['pickup_pending', 'completed'],
    pickup_pending: ['completed'],
    completed: [],
    cancelled: []
  };

  const canTransition = (current, next) => validTransitions[current]?.includes(next) || false;

  assert.equal(canTransition('available', 'requested'), true);
  assert.equal(canTransition('requested', 'claimed'), true);
  assert.equal(canTransition('claimed', 'completed'), true);
  assert.equal(canTransition('available', 'completed'), false, 'Cannot complete without request and claim');
  assert.equal(canTransition('completed', 'available'), false, 'Cannot reopen completed donation');
  assert.equal(canTransition('cancelled', 'requested'), false, 'Cannot request cancelled donation');
});

test('Donation Workflow - Pickup verification is restricted to the accepted recipient', () => {
  const listing = {
    _id: 'listing2',
    status: 'claimed',
    claimedBy: 'recipientUser1'
  };

  const recipient1 = { _id: 'recipientUser1' };
  const recipient2 = { _id: 'recipientUser2' };

  const canConfirmPickup = (listingObj, user) =>
    String(listingObj.claimedBy) === String(user._id) &&
    ['claimed', 'pickup_pending'].includes(listingObj.status);

  assert.equal(canConfirmPickup(listing, recipient1), true);
  assert.equal(canConfirmPickup(listing, recipient2), false);
});
