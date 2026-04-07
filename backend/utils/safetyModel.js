const FOOD_BASE_HOURS = {
  cooked: 6,
  dairy: 8,
  raw: 12,
  packaged: 48,
  bakery: 24,
  mixed: 10
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getHoursElapsed = (preparedAt, now = new Date()) => {
  const preparedTime = new Date(preparedAt).getTime();
  const currentTime = new Date(now).getTime();
  return Math.max(0, (currentTime - preparedTime) / (1000 * 60 * 60));
};

const calculateSafetyScore = (foodData, now = new Date()) => {
  const baseSafeHours = FOOD_BASE_HOURS[foodData.foodType] || FOOD_BASE_HOURS.mixed;

  let temperatureFactor = 1;
  if (foodData.storageTemperature > 30) {
    temperatureFactor = 0.7;
  } else if (foodData.storageTemperature >= 20) {
    temperatureFactor = 0.85;
  }

  let humidityFactor = 1;
  if (foodData.humidity > 80) {
    humidityFactor = 0.8;
  } else if (foodData.humidity >= 60) {
    humidityFactor = 0.9;
  }

  let seasonFactor = 1;
  if (foodData.season === 'summer') {
    seasonFactor = 0.8;
  } else if (foodData.season === 'monsoon') {
    seasonFactor = 0.85;
  }

  const safeHours = Number((baseSafeHours * temperatureFactor * humidityFactor * seasonFactor).toFixed(2));
  const hoursElapsed = getHoursElapsed(foodData.preparedAt, now);
  const rawScore = safeHours === 0 ? 0 : ((safeHours - hoursElapsed) / safeHours) * 100;
  const safetyScore = Number(clamp(rawScore, 0, 100).toFixed(2));

  let currentCategory = 'expired';
  if (safetyScore >= 60) {
    currentCategory = 'human';
  } else if (safetyScore >= 30) {
    currentCategory = 'animal';
  } else if (safetyScore > 0) {
    currentCategory = 'industry';
  }

  const preparedDate = new Date(foodData.preparedAt);
  const predictedExpiryTime = new Date(preparedDate.getTime() + safeHours * 60 * 60 * 1000);
  const humanExpiryTime = new Date(preparedDate.getTime() + safeHours * 0.4 * 60 * 60 * 1000);
  const animalExpiryTime = new Date(preparedDate.getTime() + safeHours * 0.7 * 60 * 60 * 1000);

  return {
    safetyScore,
    currentCategory,
    predictedExpiryTime,
    humanExpiryTime,
    animalExpiryTime,
    safeConsumptionWindowHours: safeHours,
    hoursElapsed
  };
};

module.exports = {
  calculateSafetyScore,
  getHoursElapsed
};

