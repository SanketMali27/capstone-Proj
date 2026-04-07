const WasteHistory = require('../models/WasteHistory');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const predictTomorrowWaste = async (restaurantId) => {
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const history = await WasteHistory.find({
    restaurantId,
    date: { $gte: since }
  }).sort({ date: 1 });

  const grouped = history.reduce((acc, entry) => {
    const day = entry.dayOfWeek;
    if (!acc[day]) {
      acc[day] = { totalWaste: 0, totalClaimed: 0, count: 0 };
    }

    acc[day].totalWaste += entry.totalWasted || 0;
    acc[day].totalClaimed += entry.totalClaimed || 0;
    acc[day].count += 1;
    return acc;
  }, {});

  const weeklyPattern = DAY_NAMES.map((day) => {
    const dayData = grouped[day] || { totalWaste: 0, totalClaimed: 0, count: 0 };
    return {
      day,
      averageWaste: dayData.count ? Number((dayData.totalWaste / dayData.count).toFixed(2)) : 0,
      averageClaimed: dayData.count ? Number((dayData.totalClaimed / dayData.count).toFixed(2)) : 0
    };
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = DAY_NAMES[tomorrow.getDay()];
  const targetPattern = weeklyPattern.find((item) => item.day === tomorrowDay) || {
    averageWaste: 0
  };

  const predictedWaste = targetPattern.averageWaste;
  const reductionPercentage = predictedWaste >= 10 ? 15 : predictedWaste >= 5 ? 10 : predictedWaste > 0 ? 5 : 0;

  return {
    tomorrowDay,
    predictedWaste,
    recommendedReductionPercentage: reductionPercentage,
    recommendation: `Based on past data, you typically waste ${predictedWaste} kg on ${tomorrowDay}. Consider preparing ${reductionPercentage}% less.`,
    weeklyPattern
  };
};

module.exports = {
  predictTomorrowWaste
};

