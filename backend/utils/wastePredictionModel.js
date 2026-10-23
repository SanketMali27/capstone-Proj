const WasteHistory = require('../models/WasteHistory');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MIN_RECORDS_REQUIRED = 3;

/**
 * Rule-based heuristic to estimate likely surplus based on past day-of-week patterns.
 *
 * NOTE:
 * This is an operational rule-based estimation based purely on historical averages.
 * It is NOT a machine-learning model and does NOT evaluate food safety or spoilage.
 */
const predictTomorrowWaste = async (restaurantId) => {
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const history = await WasteHistory.find({
    restaurantId,
    date: { $gte: since }
  }).sort({ date: 1 });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = DAY_NAMES[tomorrow.getDay()];

  // Handle insufficient overall history
  if (!history || history.length < MIN_RECORDS_REQUIRED) {
    return {
      isRuleBased: true,
      hasSufficientData: false,
      dataPointsCount: history?.length || 0,
      minRequiredDataPoints: MIN_RECORDS_REQUIRED,
      tomorrowDay,
      predictedWaste: null,
      recommendedReductionPercentage: 0,
      recommendation: `Insufficient historical data (${history?.length || 0}/${MIN_RECORDS_REQUIRED} entries). Continue recording surplus and waste history to unlock preparation estimates.`,
      disclaimer: 'Estimates are derived solely from logged historical entries as a rule-based guideline. Not an AI model; does not evaluate food safety.',
      weeklyPattern: DAY_NAMES.map((day) => ({
        day,
        averageWaste: 0,
        averageClaimed: 0,
        sampleCount: 0
      }))
    };
  }

  const grouped = history.reduce((acc, entry) => {
    const day = entry.dayOfWeek;
    if (!acc[day]) {
      acc[day] = { totalWaste: 0, totalClaimed: 0, count: 0 };
    }

    acc[day].totalWaste += Number(entry.totalWasted) || 0;
    acc[day].totalClaimed += Number(entry.totalClaimed) || 0;
    acc[day].count += 1;
    return acc;
  }, {});

  const weeklyPattern = DAY_NAMES.map((day) => {
    const dayData = grouped[day] || { totalWaste: 0, totalClaimed: 0, count: 0 };
    return {
      day,
      averageWaste: dayData.count ? Number((dayData.totalWaste / dayData.count).toFixed(2)) : 0,
      averageClaimed: dayData.count ? Number((dayData.totalClaimed / dayData.count).toFixed(2)) : 0,
      sampleCount: dayData.count
    };
  });

  const targetPattern = weeklyPattern.find((item) => item.day === tomorrowDay) || {
    averageWaste: 0,
    averageClaimed: 0,
    sampleCount: 0
  };

  // If no data points exist for this particular day of the week
  if (!targetPattern.sampleCount) {
    return {
      isRuleBased: true,
      hasSufficientData: false,
      dataPointsCount: history.length,
      minRequiredDataPoints: MIN_RECORDS_REQUIRED,
      tomorrowDay,
      predictedWaste: null,
      recommendedReductionPercentage: 0,
      recommendation: `No past records logged yet for ${tomorrowDay}s. Estimate will appear after activity is recorded for this day of the week.`,
      disclaimer: 'Estimates are derived solely from logged historical entries as a rule-based guideline. Not an AI model; does not evaluate food safety.',
      weeklyPattern
    };
  }

  const predictedWaste = targetPattern.averageWaste;
  const reductionPercentage =
    predictedWaste >= 10 ? 15 : predictedWaste >= 5 ? 10 : predictedWaste > 0 ? 5 : 0;

  return {
    isRuleBased: true,
    hasSufficientData: true,
    dataPointsCount: history.length,
    tomorrowDay,
    predictedWaste,
    averageClaimedOnDay: targetPattern.averageClaimed,
    recommendedReductionPercentage: reductionPercentage,
    recommendation: `Rule-based preparation guidance: On past ${tomorrowDay}s, you recorded an average of ${predictedWaste} kg in surplus/waste. Consider preparing ${reductionPercentage}% less to minimize excess.`,
    disclaimer: 'This guidance is an operational rule-based estimate based on your logged history. It does not predict food safety, spoilage, or suitability for human consumption.',
    weeklyPattern
  };
};

module.exports = {
  predictTomorrowWaste,
  DAY_NAMES,
  MIN_RECORDS_REQUIRED
};
