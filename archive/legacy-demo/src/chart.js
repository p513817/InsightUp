import { CHART_VIEWS } from "./config.js?v=20260423-2";
import {
  formatAxisTickValue,
  formatMetricSummary,
  formatMetricValue,
  formatShortDate,
  hydrateSegmentalData,
} from "./utils.js?v=20260423-2";

function buildLineDataset(label, data, color, axisId, dashed = false) {
  const rootStyle = getComputedStyle(document.documentElement);
  const pointBorderColor = rootStyle.getPropertyValue("--chart-point-border").trim() || "#ffffff";

  return {
    label,
    data,
    borderColor: color,
    backgroundColor: "transparent",
    pointBackgroundColor: color,
    pointBorderColor,
    pointBorderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 6,
    pointHitRadius: 18,
    borderWidth: 2.8,
    tension: 0.32,
    fill: false,
    borderDash: dashed ? [8, 4] : [],
    yAxisID: axisId,
  };
}

function getLatestMetricValue(metric, records, viewKey) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const value = metric.getValue(records[index], viewKey);
    if (value != null) {
      return value;
    }
  }

  return null;
}

function getPreviousMetricValue(metric, records, viewKey) {
  let foundLatest = false;

  for (let index = records.length - 1; index >= 0; index -= 1) {
    const value = metric.getValue(records[index], viewKey);
    if (value == null) {
      continue;
    }

    if (!foundLatest) {
      foundLatest = true;
      continue;
    }

    return value;
  }

  return null;
}

function getOrCreateMiniTooltip(chart) {
  const parent = chart.canvas.parentNode;
  let tooltipEl = parent.querySelector(".chart-mini-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "chart-mini-tooltip";

    const dateEl = document.createElement("div");
    dateEl.className = "chart-mini-tooltip-date";

    const rowEl = document.createElement("div");
    rowEl.className = "chart-mini-tooltip-row";

    const swatchEl = document.createElement("span");
    swatchEl.className = "chart-mini-tooltip-swatch";

    const labelEl = document.createElement("span");
    labelEl.className = "chart-mini-tooltip-label";

    rowEl.append(swatchEl, labelEl);
    tooltipEl.append(dateEl, rowEl);
    parent.appendChild(tooltipEl);
  }

  return {
    tooltipEl,
    dateEl: tooltipEl.querySelector(".chart-mini-tooltip-date"),
    swatchEl: tooltipEl.querySelector(".chart-mini-tooltip-swatch"),
    labelEl: tooltipEl.querySelector(".chart-mini-tooltip-label"),
  };
}

function renderMiniChartTooltip(context) {
  const { chart, tooltip } = context;
  const { tooltipEl, dateEl, swatchEl, labelEl } = getOrCreateMiniTooltip(chart);

  if (!tooltip || tooltip.opacity === 0) {
    tooltipEl.classList.remove("is-visible");
    return;
  }

  const title = tooltip.title?.[0] || "";
  const body = tooltip.body?.[0]?.lines?.[0] || "";
  const labelColor = tooltip.labelColors?.[0] || null;

  dateEl.textContent = title;
  labelEl.textContent = body;
  swatchEl.style.background = labelColor?.backgroundColor || labelColor?.borderColor || "#94a3b8";

  tooltipEl.classList.add("is-visible");

  const parentRect = chart.canvas.parentNode.getBoundingClientRect();
  const tooltipWidth = tooltipEl.offsetWidth;
  const tooltipHeight = tooltipEl.offsetHeight;
  const maxLeft = parentRect.width - tooltipWidth - 6;
  const preferredLeft = tooltip.caretX - (tooltipWidth / 2);
  const left = Math.min(Math.max(6, preferredLeft), Math.max(6, maxLeft));

  let top = tooltip.caretY - tooltipHeight - 14;
  if (top < 6) {
    top = tooltip.caretY + 14;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

function sortRecordsByDate(records) {
  return [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getRoundedAxisPadding(value) {
  if (value <= 0.5) return 0.5;
  if (value <= 1) return 1;
  if (value <= 3) return Math.ceil(value);
  if (value <= 10) return Math.ceil(value / 2) * 2;
  return Math.ceil(value / 5) * 5;
}

function getSuggestedAxisMax(values) {
  const numericValues = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (numericValues.length === 0) return undefined;

  const maxValue = Math.max(...numericValues);
  const minValue = Math.min(...numericValues);
  const range = maxValue - minValue;
  const minimumPadding = maxValue < 10 ? 0.5 : maxValue < 100 ? 1 : maxValue < 1000 ? 2 : 10;
  const dynamicPadding = range > 0 ? range * 0.1 : Math.abs(maxValue || 1) * 0.015;
  const padding = getRoundedAxisPadding(Math.max(minimumPadding, dynamicPadding));

  return maxValue + padding;
}

export function createChartManager({
  getRecords,
  getActiveChartView,
  setActiveChartView,
  getOverviewCharts,
  setOverviewCharts,
  dom,
  chartMetrics,
}) {
  const { recordDate, chartViewSwitch, overviewChartGrid } = dom;
  let chartViewSwitchScrollLeft = 0;
  let chartViewSwitchResizeBound = false;

  function updateChartViewSwitchAffordance() {
    if (!chartViewSwitch) return;

    const tabViewport = chartViewSwitch.querySelector(".chart-view-switch-viewport");
    const tabList = chartViewSwitch.querySelector(".chart-view-tabs");
    const scrollLeftButton = chartViewSwitch.querySelector(".chart-view-scroll-button.is-left");
    const scrollRightButton = chartViewSwitch.querySelector(".chart-view-scroll-button.is-right");
    if (!tabViewport || !tabList || !scrollLeftButton || !scrollRightButton) return;

    const maxScrollLeft = Math.max(0, tabViewport.scrollWidth - tabViewport.clientWidth);
    const canScroll = tabList.scrollWidth > tabViewport.clientWidth + 4;
    const canScrollRight = canScroll && tabViewport.scrollLeft < maxScrollLeft - 2;
    const canScrollLeft = canScroll && tabViewport.scrollLeft > 2;
    chartViewSwitchScrollLeft = tabViewport.scrollLeft;

    chartViewSwitch.classList.toggle("has-scroll", canScroll);
    chartViewSwitch.classList.toggle("has-scroll-right", canScrollRight);
    chartViewSwitch.classList.toggle("has-scroll-left", canScrollLeft);
    scrollLeftButton.disabled = !canScrollLeft;
    scrollLeftButton.setAttribute("aria-hidden", String(!canScrollLeft));
    scrollRightButton.disabled = !canScrollRight;
    scrollRightButton.setAttribute("aria-hidden", String(!canScrollRight));
  }

  function bindChartViewSwitchAffordance() {
    if (!chartViewSwitch) return;

    const tabViewport = chartViewSwitch.querySelector(".chart-view-switch-viewport");
    if (!tabViewport || tabViewport.dataset.affordanceBound === "true") return;

    const handleAffordanceChange = () => updateChartViewSwitchAffordance();
    tabViewport.addEventListener("scroll", handleAffordanceChange, { passive: true });
    tabViewport.dataset.affordanceBound = "true";

    if (!chartViewSwitchResizeBound) {
      window.addEventListener("resize", handleAffordanceChange, { passive: true });
      chartViewSwitchResizeBound = true;
    }
  }

  function destroyOverviewCharts() {
    getOverviewCharts().forEach((chart) => chart.destroy());
    setOverviewCharts([]);
  }

  function getMetricOptionsForView(viewKey = getActiveChartView()) {
    return viewKey === "overall" ? chartMetrics.overall : chartMetrics.segmental;
  }

  function renderChartViewSwitch() {
    if (!chartViewSwitch) return;

    const previousViewport = chartViewSwitch.querySelector(".chart-view-switch-viewport");
    if (previousViewport) {
      chartViewSwitchScrollLeft = previousViewport.scrollLeft;
    }

    chartViewSwitch.replaceChildren();

    const tabViewport = document.createElement("div");
    tabViewport.className = "chart-view-switch-viewport";
    tabViewport.scrollLeft = chartViewSwitchScrollLeft;

    const tabList = document.createElement("div");
    tabList.className = "chart-view-tabs";

    CHART_VIEWS.forEach((view) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "view-chip";
      button.textContent = view.label;
      button.setAttribute("aria-pressed", String(getActiveChartView() === view.key));

      if (getActiveChartView() === view.key) {
        button.classList.add("is-active");
      }

      button.addEventListener("click", () => {
        setActiveChartView(view.key);
        renderDashboard();
      });

      tabList.appendChild(button);
    });

    const scrollLeftButton = document.createElement("button");
    scrollLeftButton.type = "button";
    scrollLeftButton.className = "chart-view-scroll-button is-left";
    scrollLeftButton.setAttribute("aria-label", "Scroll chart views to the left");
    scrollLeftButton.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>';
    scrollLeftButton.addEventListener("click", () => {
      tabViewport.scrollBy({ left: -160, behavior: "smooth" });
    });

    const scrollRightButton = document.createElement("button");
    scrollRightButton.type = "button";
    scrollRightButton.className = "chart-view-scroll-button is-right";
    scrollRightButton.setAttribute("aria-label", "Scroll chart views to the right");
    scrollRightButton.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>';
    scrollRightButton.addEventListener("click", () => {
      tabViewport.scrollBy({ left: 160, behavior: "smooth" });
    });

    tabViewport.appendChild(tabList);
    chartViewSwitch.append(scrollLeftButton, tabViewport, scrollRightButton);
    bindChartViewSwitchAffordance();
    requestAnimationFrame(() => {
      const maxScrollLeft = Math.max(0, tabViewport.scrollWidth - tabViewport.clientWidth);
      tabViewport.scrollLeft = Math.min(chartViewSwitchScrollLeft, maxScrollLeft);
      updateChartViewSwitchAffordance();
    });
  }

  function getChartBaseOptions() {
    const rootStyle = getComputedStyle(document.documentElement);
    const textColor = rootStyle.getPropertyValue("--text").trim() || "#0f172a";
    const mutedColor = rootStyle.getPropertyValue("--muted").trim() || "#64748b";
    const gridColor = rootStyle.getPropertyValue("--chart-grid").trim() || "rgba(15,23,42,0.06)";

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 480,
        easing: "easeOutQuart",
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          external: renderMiniChartTooltip,
          padding: 12,
        },
      },
      scales: {
        x: {
          ticks: {
            color: mutedColor,
          },
          grid: {
            color: gridColor,
          },
        },
        yMass: {
          position: "left",
          ticks: {
            color: mutedColor,
            callback: (value) => formatAxisTickValue({ unit: "kg" }, value),
          },
          grid: {
            color: gridColor,
          },
        },
        yRatio: {
          position: "right",
          ticks: {
            color: mutedColor,
            callback: (value) => formatAxisTickValue({}, value),
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      color: textColor,
    };
  }

  function getMiniChartOptions(metric, metricValues) {
    const options = getChartBaseOptions();
    const rootStyle = getComputedStyle(document.documentElement);
    const gridColor = rootStyle.getPropertyValue("--chart-grid-soft").trim() || "rgba(15,23,42,0.035)";
    const tickColor = rootStyle.getPropertyValue("--chart-tick").trim() || "rgba(100,116,139,0.68)";
    const labelColor = rootStyle.getPropertyValue("--chart-label").trim() || "rgba(100,116,139,0.95)";
    const suggestedMax = getSuggestedAxisMax(metricValues);

    options.maintainAspectRatio = false;
    options.animation.duration = 320;
    options.layout = {
      padding: {
        top: 12,
        right: 4,
        left: 2,
        bottom: 0,
      },
    };
    options.scales.x.ticks.maxTicksLimit = 4;
    options.scales.x.ticks.color = tickColor;
    options.scales.x.grid.color = gridColor;
    options.scales.yMass.display = metric.axisId === "yMass";
    options.scales.yRatio.display = metric.axisId === "yRatio";
    options.scales.yMass.ticks.color = tickColor;
    options.scales.yRatio.ticks.color = tickColor;
    options.scales.yMass.grid.color = gridColor;
    options.scales.yMass.ticks.maxTicksLimit = 3;
    options.scales.yRatio.ticks.maxTicksLimit = 3;
    options.scales.yMass.ticks.callback = (value) => formatAxisTickValue(metric, value);
    options.scales.yRatio.ticks.callback = (value) => formatAxisTickValue(metric, value);
    options.scales.yMass.suggestedMax = metric.axisId === "yMass" ? suggestedMax : undefined;
    options.scales.yRatio.suggestedMax = metric.axisId === "yRatio" ? suggestedMax : undefined;
    options.plugins.datalabels = {
      display: true,
      align: "top",
      anchor: "end",
      offset: 2,
      clamp: true,
      clip: false,
      color: labelColor,
      font: {
        size: 9,
        weight: "700",
      },
      formatter: (value) => formatMetricValue(metric, value, false),
    };
    options.plugins.tooltip.callbacks = {
      label: (context) => `${metric.label}: ${formatMetricValue(metric, context.parsed.y)}`,
    };

    if (metric.axisId === "yRatio") {
      options.scales.yRatio.position = "left";
      options.scales.yRatio.grid.color = gridColor;
    }

    return options;
  }

  function renderOverviewChart() {
    if (!overviewChartGrid || typeof Chart === "undefined") return;

    const sortedRecords = sortRecordsByDate(getRecords());
    hydrateSegmentalData(sortedRecords);

    const chartRecords = sortedRecords.filter((item) => item.isIncludedInCharts !== false);
    const labels = chartRecords.map((item) => formatShortDate(item.date));
    const activeChartView = getActiveChartView();
    const selectedMetrics = getMetricOptionsForView(activeChartView);
    const nextCharts = [];

    destroyOverviewCharts();
    overviewChartGrid.replaceChildren();

    selectedMetrics.forEach((metric) => {
      const metricValues = chartRecords.map((item) => metric.getValue(item, activeChartView));
      const card = document.createElement("article");
      card.className = "chart-mini-card";

      const header = document.createElement("div");
      header.className = "chart-mini-header";

      const titleGroup = document.createElement("div");
      titleGroup.className = "chart-mini-title-group";

      const swatch = document.createElement("span");
      swatch.className = "chart-mini-swatch";
      swatch.style.background = metric.color;

      const title = document.createElement("h3");
      title.className = "chart-mini-title";
      title.textContent = metric.label;

      titleGroup.append(swatch, title);
      header.appendChild(titleGroup);

      const summary = document.createElement("div");
      summary.className = "chart-mini-summary";
      const latestValue = getLatestMetricValue(metric, chartRecords, activeChartView);
      const previousValue = getPreviousMetricValue(metric, chartRecords, activeChartView);
      summary.textContent = formatMetricSummary(metric, latestValue, previousValue);

      header.appendChild(summary);

      const canvasWrap = document.createElement("div");
      canvasWrap.className = "chart-mini-wrap";

      const canvas = document.createElement("canvas");
      canvasWrap.appendChild(canvas);

      card.append(header, canvasWrap);
      overviewChartGrid.appendChild(card);

      const chart = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            buildLineDataset(
              metric.label,
              metricValues,
              metric.color,
              metric.axisId,
              metric.dashed,
            ),
          ],
        },
        options: getMiniChartOptions(metric, metricValues),
      });

      nextCharts.push(chart);
    });

    setOverviewCharts(nextCharts);

    const legend = document.getElementById("overview-legend");
    if (legend) {
      legend.classList.add("hidden");
      legend.replaceChildren();
    }
  }

  function renderDashboard() {
    if (recordDate) {
      const latestRecord = sortRecordsByDate(getRecords()).at(-1) || null;
      recordDate.textContent = `Latest data ${formatShortDate(latestRecord?.date)}`;
    }

    renderChartViewSwitch();
    renderOverviewChart();
  }

  return {
    renderDashboard,
  };
}