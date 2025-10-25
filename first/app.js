// Credit Card Balance Predictor — demo logic (front-end only)
// Keeps math client-side. If you already have backend logic, call it and feed the same chart/update functions.

(function(){
  const $ = sel => document.querySelector(sel);
  const formatMoney = n => (n ?? 0).toLocaleString(undefined, {style:'currency', currency:'USD'});

  const els = {
    start: $('#starting-balance'),
    apr: $('#apr'),
    pay: $('#monthly-payment'),
    horizon: $('#horizon'),
    project: $('#project-btn'),
    fullscreen: $('#fullscreen-btn'),
    export: $('#export-btn'),
    reset: $('#reset-btn'),
    extraDate: $('#extra-date'),
    extraAmt: $('#extra-amount'),
    addExtra: $('#add-extra'),
    extrasList: $('#extras-list'),
    payoffText: $('#payoff-text'),
    totalInterest: $('#total-interest'),
    statusBadge: $('#status-badge'),
    chartCanvas: $('#ccbpChart')
  };

  // Local extra payments store: [{date: Date, amount: number}]
  let extras = [];

  function renderExtras(){
    els.extrasList.innerHTML = '';
    if(extras.length === 0) return;
    extras
      .sort((a,b)=>a.date - b.date)
      .forEach((e, idx) => {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.gap = '10px';
        item.innerHTML = `
          <div>
            <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Extra Payment</div>
            <div style="font-weight:600">${formatMoney(e.amount)}</div>
            <div style="color:var(--muted-2);font-size:12px">${e.date.toLocaleDateString()}</div>
          </div>
          <button class="btn btn-ghost" data-idx="${idx}">Remove</button>
        `;
        item.querySelector('button').addEventListener('click', ev => {
          const i = +ev.currentTarget.getAttribute('data-idx');
          extras.splice(i,1);
          renderExtras();
          project();
        });
        els.extrasList.appendChild(item);
      });
  }

  // Core projection logic — monthly compounding; segment within a month if an extra occurs
  function computeProjection({balance, aprPct, monthlyPayment, months, baseDate, extras}){
    const rMonthly = (aprPct/100) / 12;
    const labels = [];
    const balances = [];
    const monthlyInterestSeries = [];
    const extraSeries = [];
    const eventsByMonth = {};

    // Pre-bin extras by month index with in-month day fraction for segmented interest
    const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    (extras||[]).forEach(e => {
      const d = new Date(e.date.getFullYear(), e.date.getMonth(), 1);
      const idx = (d.getFullYear() - base.getFullYear())*12 + (d.getMonth() - base.getMonth());
      const daysInMonth = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
      const day = Math.min(Math.max(e.date.getDate(),1), daysInMonth);
      const frac = (day-1)/daysInMonth; // event happens after 'frac' of the month elapsed
      eventsByMonth[idx] ||= [];
      eventsByMonth[idx].push({amount: +e.amount, frac});
    });

    let totalInterest = 0;
    let payoffMonthIndex = null;

    let current = balance;
    for(let m=0; m<months; m++){
      if(current <= 0){
        // If we just paid off previously, stop drawing further points (nulls break the line)
        payoffMonthIndex = payoffMonthIndex ?? m;
        labels.push(labelForMonth(baseDate, m));
        balances.push(null); // stop the line after payoff
        monthlyInterestSeries.push(0);
        extraSeries.push(0);
        continue;
      }

      const monthEvents = (eventsByMonth[m]||[]).sort((a,b)=>a.frac-b.frac);
      const steps = monthEvents.length + 1;
      let monthInterest = 0;

      let prevFrac = 0;
      for(let s=0; s<steps; s++){
        const fracEnd = s < monthEvents.length ? monthEvents[s].frac : 1;
        const fracLen = Math.max(fracEnd - prevFrac, 0);
        // interest accrues proportionally for the fraction of the month
        const i = current * rMonthly * fracLen;
        monthInterest += i;
        totalInterest += i;
        if(s < monthEvents.length){
          // apply extra payment at this moment
          current = Math.max(0, current + i - monthEvents[s].amount);
        } else {
          // end-of-month: apply scheduled monthly payment
          const payment = Math.min(monthlyPayment, current + i);
          current = Math.max(0, current + i - payment);
        }
        prevFrac = fracEnd;
      }

      labels.push(labelForMonth(baseDate, m));
      balances.push(current);
      monthlyInterestSeries.push(monthInterest);
      // Visualize total extra paid in this month for the chart
      const extraSum = (monthEvents||[]).reduce((a,e)=>a+e.amount,0);
      extraSeries.push(extraSum);

      if(current <= 0 && payoffMonthIndex === null) {
        payoffMonthIndex = m+1; // payoff by end of this month
        // Replace the last pushed balance (which reflects end-of-month) to exact zero
        balances[balances.length-1] = 0;
      }
    }

    return { labels, balances, monthlyInterestSeries, extraSeries, totalInterest, payoffMonthIndex };
  }

  function labelForMonth(startDate, offset){
    const d = new Date(startDate.getFullYear(), startDate.getMonth()+offset, 1);
    return d.toLocaleString(undefined, { month:'short'}) + ' ' + d.getFullYear();
  }

  function payoffTextFromIndex(startDate, idx){
    if(idx == null) return '—';
    const d = new Date(startDate.getFullYear(), startDate.getMonth()+idx, 1);
    // difference in years/months
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const months = (d.getFullYear()-start.getFullYear())*12 + (d.getMonth()-start.getMonth());
    const years = Math.floor(months/12);
    const remM = months%12;
    return `${years} yr${years!==1?'s':''} ${remM} mo (by ${d.toLocaleDateString()})`;
  }

  // CSV export for the table of results
  function toCSV(rows){
    return rows.map(r => r.map(v => (typeof v === 'string' && v.includes(',')) ? `"${v}"` : v).join(',')).join('\n');
  }

  // Chart setup
  let chart;
  function drawChart(data){
    const ctx = els.chartCanvas.getContext('2d');
    if(chart) { chart.destroy(); }
    const datasets = [
      {
        label: 'Projected Balance',
        data: data.balances,
        spanGaps: false,
        ...window.ccbpChartJsDatasetStyles?.projectedBalance
      },
      {
        label: 'Monthly Interest',
        data: data.monthlyInterestSeries,
        ...window.ccbpChartJsDatasetStyles?.monthlyInterest
      },
      {
        label: 'Extra Payment',
        data: data.extraSeries,
        ...window.ccbpChartJsDatasetStyles?.extraPayment
      }
    ];
    chart = new Chart(ctx, {
      type: 'line',
      data: { labels: data.labels, datasets },
      options: {
        plugins: { legend: { display: false } },
        elements: { point: { radius: 0, hoverRadius: 3, hitRadius: 8 } },
        ...window.ccbpChartJsThemedOptions,
        interaction: { mode:'index', intersect:false },
        normalized: true,
        parsing: false,
        scales: {
          ...window.ccbpChartJsThemedOptions?.scales,
          y: {
            ...window.ccbpChartJsThemedOptions?.scales?.y,
            min: 0,
            ticks: {
              ...window.ccbpChartJsThemedOptions?.scales?.y?.ticks,
              callback: v => '$' + Number(v).toLocaleString()
            }
          }
        }
      }
    });
  }

  // Main projection orchestrator
  function project(){
    const startBalance = Math.max(0, +els.start.value || 0);
    const apr = Math.max(0, +els.apr.value || 0);
    const monthly = Math.max(0, +els.pay.value || 0);
    const months = Math.max(1, Math.floor(+els.horizon.value || 1));
    const baseDate = new Date(); // today as reference for labeling and in-month extra fractions

    const result = computeProjection({
      balance: startBalance,
      aprPct: apr,
      monthlyPayment: monthly,
      months,
      baseDate,
      extras
    });

    // Update stats
    els.totalInterest.textContent = formatMoney(result.totalInterest);
    els.payoffText.textContent = payoffTextFromIndex(baseDate, result.payoffMonthIndex);

    // Status badge
    const rMonthly = (apr/100)/12;
    const firstMonthInterest = startBalance * rMonthly;
    const statusOK = monthly >= firstMonthInterest || startBalance === 0;
    els.statusBadge.innerHTML = statusOK
      ? '<span class="dot"></span> On track to $0'
      : '<span class="dot"></span> Payment < interest (balance grows)';
    if(statusOK){
      els.statusBadge.style.setProperty('--success', '#38d399');
    } else {
      els.statusBadge.style.setProperty('--success', '#ff6b6b');
    }

    // Draw chart
    drawChart(result);

    return result;
  }

  // Wire controls
  ['change','keyup','blur'].forEach(ev => {
    els.start.addEventListener(ev, project);
    els.apr.addEventListener(ev, project);
    els.pay.addEventListener(ev, project);
    els.horizon.addEventListener(ev, project);
  });

  els.project.addEventListener('click', project);

  els.addExtra.addEventListener('click', () => {
    const dateStr = els.extraDate.value;
    const amt = +els.extraAmt.value;
    if(!dateStr || !isFinite(amt) || amt <= 0) return;
    const d = new Date(dateStr + 'T00:00:00');
    extras.push({ date: d, amount: amt });
    els.extraAmt.value = '';
    renderExtras();
    project();
  });

  els.reset.addEventListener('click', () => {
    els.start.value = 9271;
    els.apr.value = 25;
    els.pay.value = 300;
    els.horizon.value = 53;
    extras = [];
    renderExtras();
    project();
  });

  els.fullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      els.chartCanvas.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  els.export.addEventListener('click', () => {
    const res = project();
    const rows = [['Month','Projected Balance','Monthly Interest','Extra Payment']];
    for(let i=0;i<res.labels.length;i++){
      rows.push([res.labels[i], res.balances[i].toFixed(2), res.monthlyInterestSeries[i].toFixed(2), res.extraSeries[i].toFixed(2)]);
    }
    const csv = toCSV(rows);
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'credit-card-projection.csv';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  });

  // Initial paint
  renderExtras();
  project();
})();
