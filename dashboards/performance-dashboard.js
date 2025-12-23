/**
 * Load Time Dashboard Web Component
 * Displays form block load time statistics with hour-by-hour breakdown
 */
import '../charts/load-time-chart.js';
import '../charts/load-time-histogram.js';
import '../charts/resource-time-table.js';
import '../charts/user-agent-pie-chart.js';

class PerformanceDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.dataChunks = null;
    this.url = '';
    this.selectedDeviceType = 'All';
    this.compareDeviceType = '';
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    // Cleanup handled by child components
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        .dashboard-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          padding: 24px;
          margin-bottom: 20px;
        }

        .dashboard-header {
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 16px;
        }

        .dashboard-header h2 {
          margin: 0 0 12px 0;
          color: #1e40af;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
          margin: 12px 0 8px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 180px;
        }

        .filter-group label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        select.device-select {
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
          background: white;
          transition: all 0.2s;
        }

        select.device-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-hint {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .clear-compare {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
          height: 42px;
        }

        .clear-compare:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-top: 12px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .stat-item.highlight {
          background: #eff6ff;
          border-left-color: #2563eb;
          border-left-width: 5px;
        }

        .stat-item.clickable {
          cursor: pointer;
          transition: all 0.2s;
        }

        .stat-item.clickable:hover {
          background: #dbeafe;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-item.clickable.active {
          background: #2563eb;
          border-left-color: #1e40af;
        }

        .stat-item.clickable.active .stat-label,
        .stat-item.clickable.active .stat-value,
        .stat-item.clickable.active .stat-subtext {
          color: white !important;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }

        .stat-value.fast {
          color: #059669;
        }

        .stat-value.moderate {
          color: #d97706;
        }

        .stat-value.slow {
          color: #dc2626;
        }

        .stat-subtext {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 4px;
        }

        .stat-compare {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 6px;
          display: none;
        }

        .stat-compare.visible {
          display: block;
        }

        load-time-chart {
          margin-bottom: 24px;
        }

        load-time-histogram {
          margin-top: 32px;
        }

        resource-time-table {
          margin-top: 32px;
        }

        .user-agent-section {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 2px solid #e5e7eb;
        }

        .user-agent-section h3 {
          margin: 0 0 16px 0;
          color: #1e40af;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .chart-section {
          background: #f9fafb;
          border-radius: 6px;
          padding: 16px;
        }

        .chart-section h4 {
          margin: 0 0 16px 0;
          color: #374151;
          font-size: 1rem;
          font-weight: 600;
        }

        .performance-insights {
          margin-top: 24px;
          padding: 16px;
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
        }

        .performance-insights h3 {
          margin: 0 0 12px 0;
          color: #1e40af;
          font-size: 1rem;
          font-weight: 600;
        }

        .performance-insights p {
          margin: 0;
          color: #374151;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .no-data {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
          font-style: italic;
        }

        .loading {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .summary-stats {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
      </style>

      <div class="dashboard-container">
        <div class="dashboard-header">
          <h2>Performance</h2>
          <h3>Engagement Readiness Time (Form Visibility)</h3>
          <p class="description">
            How long does it take for the form to be visible on the screen?
          </p>

          <div class="filters-row">
            <div class="filter-group">
              <label for="device-primary">Device type</label>
              <select class="device-select" id="device-primary">
                <option value="All">All</option>
              </select>
              <div class="filter-hint">Filter performance metrics by device type.</div>
            </div>
            <div class="filter-group">
              <label for="device-compare">Compare to</label>
              <select class="device-select" id="device-compare">
                <option value="">None</option>
              </select>
              <div class="filter-hint">Overlay comparison in charts (e.g., Android vs iOS).</div>
            </div>
            <button class="clear-compare" id="clear-compare" title="Clear comparison">Clear compare</button>
          </div>

          <div class="summary-stats" id="summary-stats">
            <div class="stat-item">
              <span class="stat-label">Fastest (Min)</span>
              <span class="stat-value fast" id="min-load-time">-</span>
              <div class="stat-compare" id="min-compare"></div>
            </div>
            <div class="stat-item highlight clickable active" id="stat-p50" data-percentile="p50">
              <span class="stat-label">p50 (Median)</span>
              <span class="stat-value" id="p50-load-time">-</span>
              <span class="stat-subtext">50% of loads are faster</span>
              <div class="stat-compare" id="p50-compare"></div>
            </div>
            <div class="stat-item highlight clickable" id="stat-p75" data-percentile="p75">
              <span class="stat-label">p75</span>
              <span class="stat-value" id="p75-load-time">-</span>
              <span class="stat-subtext">75% of loads are faster</span>
              <div class="stat-compare" id="p75-compare"></div>
            </div>
          </div>
        </div>

        <load-time-chart id="load-time-chart"></load-time-chart>

        <load-time-histogram id="load-time-histogram"></load-time-histogram>

        <resource-time-table id="resource-time-table"></resource-time-table>

        <div class="user-agent-section">
          <h3>User Agent Distribution</h3>
          <div class="chart-section">
            <h4>Device Breakdown</h4>
            <user-agent-pie-chart id="user-agent-chart"></user-agent-pie-chart>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const statP50 = this.shadowRoot.getElementById('stat-p50');
    const statP75 = this.shadowRoot.getElementById('stat-p75');
    const chart = this.shadowRoot.getElementById('load-time-chart');

    statP50.addEventListener('click', () => {
      statP50.classList.add('active');
      statP75.classList.remove('active');
      chart.setAttribute('percentile', 'p50');
    });

    statP75.addEventListener('click', () => {
      statP75.classList.add('active');
      statP50.classList.remove('active');
      chart.setAttribute('percentile', 'p75');
    });

    const primarySelect = this.shadowRoot.getElementById('device-primary');
    const compareSelect = this.shadowRoot.getElementById('device-compare');
    const clearCompare = this.shadowRoot.getElementById('clear-compare');

    if (primarySelect) {
      primarySelect.addEventListener('change', () => {
        this.selectedDeviceType = primarySelect.value || 'All';
        // Prevent comparing a device type to itself
        if (this.compareDeviceType && this.compareDeviceType === this.selectedDeviceType) {
          this.compareDeviceType = '';
          if (compareSelect) compareSelect.value = '';
        }
        this.refresh();
      });
    }

    if (compareSelect) {
      compareSelect.addEventListener('change', () => {
        const value = compareSelect.value || '';
        this.compareDeviceType = (value && value !== this.selectedDeviceType) ? value : '';
        if (value && value === this.selectedDeviceType) {
          compareSelect.value = '';
        }
        this.refresh();
      });
    }

    if (clearCompare) {
      clearCompare.addEventListener('click', () => {
        this.compareDeviceType = '';
        if (compareSelect) compareSelect.value = '';
        this.refresh();
      });
    }
  }

  setData(dataChunks, url) {
    this.dataChunks = dataChunks;
    this.url = url;
    this.populateDeviceSelectors();
    this.refresh();
  }

  getDeviceLabel(deviceType) {
    if (!deviceType || deviceType === 'All') return 'All devices';
    return deviceType;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  populateDeviceSelectors() {
    if (!this.dataChunks) return;
    const primarySelect = this.shadowRoot.getElementById('device-primary');
    const compareSelect = this.shadowRoot.getElementById('device-compare');
    if (!primarySelect || !compareSelect) return;

    // Read available device types from unfiltered facets (best effort)
    const prevFilter = this.dataChunks.filter;
    this.dataChunks.filter = {};
    const deviceFacets = this.dataChunks.facets.deviceType || [];
    this.dataChunks.filter = prevFilter || {};

    const available = deviceFacets.map(f => f.value).filter(Boolean);

    // Stable ordering
    const order = ['Android', 'iOS', 'Windows', 'macOS', 'Linux', 'ChromeOS', 'Other Mobile', 'Other Desktop', 'Other'];
    const unique = Array.from(new Set(available));
    unique.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    primarySelect.innerHTML = [
      `<option value="All">All</option>`,
      unique.map(v => `<option value="${this.escapeHtml(v)}">${this.escapeHtml(v)}</option>`).join('')
    ].join('');

    compareSelect.innerHTML = [
      `<option value="">None</option>`,
      unique.map(v => `<option value="${this.escapeHtml(v)}">${this.escapeHtml(v)}</option>`).join('')
    ].join('');

    primarySelect.value = this.selectedDeviceType || 'All';
    compareSelect.value = this.compareDeviceType || '';
  }

  getFilterForDevice(deviceType) {
    if (!deviceType || deviceType === 'All') return {};
    return { deviceType: [deviceType] };
  }

  snapshotForDevice(deviceType) {
    const filter = this.getFilterForDevice(deviceType);
    this.dataChunks.filter = filter;

    const totals = this.dataChunks.totals;
    const stats = {
      minLoadTime: totals.formBlockLoadTime?.min || 0,
      p50LoadTime: totals.formBlockLoadTime?.percentile(50) || 0,
      p75LoadTime: totals.formBlockLoadTime?.percentile(75) || 0,
    };

    return {
      hourFacets: this.dataChunks.facets.hour || [],
      loadTimeFacet: this.dataChunks.facets.formBlockLoadTime || [],
      stats
    };
  }

  refresh() {
    if (!this.dataChunks) return;

    const primaryLabel = this.getDeviceLabel(this.selectedDeviceType);
    const compareLabel = this.getDeviceLabel(this.compareDeviceType);

    const primarySnap = this.snapshotForDevice(this.selectedDeviceType);
    const compareSnap = this.compareDeviceType ? this.snapshotForDevice(this.compareDeviceType) : null;

    // Clear filter before updating child components
    this.dataChunks.filter = {};

    this.updateSummaryStats(primarySnap, compareSnap, compareLabel);
    this.updateChart(primarySnap, compareSnap, primaryLabel, compareLabel);
    this.updateHistogram(primarySnap, compareSnap, primaryLabel, compareLabel);
    this.updateResourceTable(this.selectedDeviceType);
    this.updateUserAgentChart();
  }

  updateUserAgentChart() {
    if (!this.dataChunks) return;
    const uaChart = this.shadowRoot.getElementById('user-agent-chart');
    if (!uaChart) return;
    // Always show overall distribution for the current URL/date range (not the primary device filter),
    // otherwise selecting a specific device type makes the chart uninformative.
    const prevFilter = this.dataChunks.filter;
    this.dataChunks.filter = {};
    const userAgentFacets = this.dataChunks.facets.userAgent || [];
    this.dataChunks.filter = prevFilter || {};
    uaChart.setData(userAgentFacets);
  }

  updateChart(primarySnap, compareSnap, primaryLabel, compareLabel) {
    if (!primarySnap) return;
    const chart = this.shadowRoot.getElementById('load-time-chart');
    if (!chart) return;
    chart.setData(primarySnap.hourFacets, {
      compareHourFacets: compareSnap?.hourFacets || null,
      primaryLabel,
      compareLabel
    });
  }

  updateHistogram(primarySnap, compareSnap, primaryLabel, compareLabel) {
    if (!primarySnap) return;
    const histogram = this.shadowRoot.getElementById('load-time-histogram');
    if (!histogram) return;
    const bucketThresholds = [0, 10, 20, 60, Infinity];
    histogram.setData(primarySnap.loadTimeFacet, bucketThresholds, {
      compareFacet: compareSnap?.loadTimeFacet || null,
      primaryLabel,
      compareLabel
    });
  }

  updateResourceTable(deviceType) {
    if (!this.dataChunks) return;

    const resourceTable = this.shadowRoot.getElementById('resource-time-table');
    if (!resourceTable) return;
    this.dataChunks.filter = this.getFilterForDevice(deviceType);
    resourceTable.setData(this.dataChunks);
    this.dataChunks.filter = {};
  }

  updateSummaryStats(primarySnap, compareSnap, compareLabel) {
    if (!primarySnap) return;
    const { minLoadTime, p50LoadTime, p75LoadTime } = primarySnap.stats;

    const minElement = this.shadowRoot.getElementById('min-load-time');
    minElement.textContent = this.formatTime(minLoadTime);
    minElement.className = 'stat-value ' + this.getPerformanceClass(minLoadTime);

    const p50Element = this.shadowRoot.getElementById('p50-load-time');
    p50Element.textContent = this.formatTime(p50LoadTime);
    p50Element.className = 'stat-value ' + this.getPerformanceClass(p50LoadTime);

    const p75Element = this.shadowRoot.getElementById('p75-load-time');
    p75Element.textContent = this.formatTime(p75LoadTime);
    p75Element.className = 'stat-value ' + this.getPerformanceClass(p75LoadTime);

    const minCompare = this.shadowRoot.getElementById('min-compare');
    const p50Compare = this.shadowRoot.getElementById('p50-compare');
    const p75Compare = this.shadowRoot.getElementById('p75-compare');

    const setCompare = (el, value) => {
      if (!el) return;
      if (compareSnap) {
        el.textContent = `${compareLabel}: ${this.formatTime(value)}`;
        el.classList.add('visible');
      } else {
        el.textContent = '';
        el.classList.remove('visible');
      }
    };

    if (compareSnap) {
      setCompare(minCompare, compareSnap.stats.minLoadTime);
      setCompare(p50Compare, compareSnap.stats.p50LoadTime);
      setCompare(p75Compare, compareSnap.stats.p75LoadTime);
    } else {
      setCompare(minCompare, 0);
      setCompare(p50Compare, 0);
      setCompare(p75Compare, 0);
    }
  }

  getPerformanceClass(loadTime) {
    if (loadTime <= 1) return 'fast';
    if (loadTime <= 2) return 'moderate';
    return 'slow';
  }

  getLCPPerformanceClass(lcpTime) {
    // LCP thresholds based on Core Web Vitals
    if (lcpTime <= 2.5) return 'fast';
    if (lcpTime <= 4) return 'moderate';
    return 'slow';
  }

  getPerformanceLabel(loadTime) {
    if (loadTime <= 1) return 'Excellent';
    if (loadTime <= 2) return 'Good';
    if (loadTime <= 3) return 'Needs Improvement';
    return 'Poor';
  }

  formatTime(seconds) {
    if (seconds < 1) {
      return `${(seconds * 1000).toFixed(0)}ms`;
    }
    return `${seconds.toFixed(2)}s`;
  }

  reset() {
    const chart = this.shadowRoot.getElementById('load-time-chart');
    if (chart) {
      chart.reset();
    }
    const histogram = this.shadowRoot.getElementById('load-time-histogram');
    if (histogram) {
      histogram.reset();
    }
    const resourceTable = this.shadowRoot.getElementById('resource-time-table');
    if (resourceTable) {
      resourceTable.reset();
    }
    this.dataChunks = null;
    this.url = '';
    this.selectedDeviceType = 'All';
    this.compareDeviceType = '';
  }
}

// Define the custom element
customElements.define('performance-dashboard', PerformanceDashboard);

export default PerformanceDashboard;

