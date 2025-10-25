/* Credit Card Predictor — Chart.js visual theme (no data changes)
Usage:
  1) Include after Chart.js.
  2) Merge `window.ccbpChartJsThemedOptions` into your Chart options.
  3) Spread dataset style objects into your existing datasets.
*/
(function (global) {
  const themedOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // using custom legend chips in the DOM
      tooltip: {
        backgroundColor: 'rgba(16, 28, 54, .94)',
        borderColor: 'rgba(79, 213, 255, .25)',
        borderWidth: 1,
        titleColor: '#e7eefc',
        bodyColor: '#c9d3e8',
        padding: 12,
        cornerRadius: 10
      }
    },
    layout: { padding: { right: 8, left: 4, top: 6, bottom: 4 } },
    scales: {
      x: {
        ticks: { color: '#93a0b8' },
        grid:  { color: 'rgba(255,255,255,.06)', drawBorder: false }
      },
      y: {
      min: 0,
        ticks: { color: '#93a0b8', callback: v => '$' + Number(v).toLocaleString() },
        grid:  { color: 'rgba(255,255,255,.06)', drawBorder: false }
      }
    }
  };

  const datasetStyles = {
    common: { cubicInterpolationMode: 'monotone' },
    projectedBalance: { ...common,
      borderColor: '#4fd5ff',
      backgroundColor: 'rgba(79, 213, 255, .12)',
      pointRadius: 0,
      tension: .35,
      borderWidth: 2.25,
      fill: true
    },
    monthlyInterest: { ...common,
      borderColor: '#ffb770',
      borderDash: [6, 6],
      pointRadius: 0,
      tension: .35,
      borderWidth: 2,
      fill: false
    },
    extraPayment: { ...common,
      borderColor: '#b6c3ff',
      pointRadius: 0,
      borderWidth: 1.75,
      tension: .35
    }
  };

  global.ccbpChartJsThemedOptions = themedOptions;
  global.ccbpChartJsDatasetStyles = datasetStyles;
})(window);
