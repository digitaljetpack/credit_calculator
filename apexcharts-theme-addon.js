/* Credit Card Predictor — ApexCharts visual theme (no data changes)
Usage:
  1) Include after ApexCharts.
  2) Merge `window.ccbpApexThemedOptions` into your Apex options (Object.assign).
*/
(function (global) {
  const themedApex = {
    chart: {
      foreColor: '#93a0b8',
      background: 'transparent',
      toolbar: { show: false }
    },
    grid: { borderColor: 'rgba(255,255,255,.06)' },
    xaxis: { labels: { style: { colors: '#93a0b8' } } },
    yaxis: {
      labels: {
        style: { colors: '#93a0b8' },
        formatter: val => '$' + Math.round(val).toLocaleString()
      }
    },
    stroke: { width: [2.25, 2, 1.75], curve: 'smooth', dashArray: [0, 6, 0] },
    fill:   { type: ['gradient','solid','solid'], gradient: { opacityFrom: .22, opacityTo: 0 } },
    colors: ['#4fd5ff', '#ffb770', '#b6c3ff'],
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px' },
      fillSeriesColor: false
    }
  };

  global.ccbpApexThemedOptions = themedApex;
})(window);
