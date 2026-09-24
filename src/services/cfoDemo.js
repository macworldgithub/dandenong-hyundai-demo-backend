// Temporary presentation data, isolated from posted journals and stock records.
export function cfoDemoManagement(periodCode) {
  const end = /^\d{4}-\d{2}$/.test(periodCode || '')
    ? new Date(`${periodCode}-01T00:00:00Z`) : new Date();
  const labels = Array.from({ length: 6 }, (_, i) =>
    new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5 + i, 1))
      .toLocaleDateString('en-AU', { month: 'short', timeZone: 'UTC' }));
  const series = [
    { name: 'New', color: '#202020', values: [1270, 1330, 1190, 1390, 1510, 1450] },
    { name: 'Used', color: '#2936ff', values: [790, 830, 870, 900, 920, 940] },
    { name: 'F&I', color: '#858580', values: [580, 590, 610, 650, 690, 700] },
    { name: 'Parts', color: '#a08122', values: [1190, 1230, 1220, 1290, 1360, 1420] },
    { name: 'Service', color: '#277956', values: [1650, 1720, 1730, 1820, 1890, 1960] },
    { name: 'Body', color: '#d62323', values: [240, 260, 250, 270, 290, 310] },
  ];
  const revenues = [1842750000, 1096400000, 84200000, 367500000, 298000000, 96500000];
  return {
    sixMonthGrossTrend: { labels, series },
    departmentContributions: series.map((s, i) => {
      const net = s.values[5] * 100000;
      return { name: s.name, revenue: revenues[i], costs: revenues[i] - net, net };
    }),
  };
}
