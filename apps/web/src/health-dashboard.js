/**
 * Ported from h5.xiaotaozi.cc/health (build:20260914-1735-ai-now).
 * Chart/DOM/copy/plugins are unchanged; only session-gated URLs differ.
 */
export function startHealthDashboard(onUnauthorized) {
  const API = "/api/me/daily?days=90";
  const BUILD = "20260914-1732-ai-report";
  const SLEEP_LABELS = {
    deep_sleep: "深睡",
    efficiency: "效率",
    latency: "入睡",
    rem_sleep: "REM",
    restfulness: "安稳",
    timing: "时段",
    total_sleep: "总时长"
  };
  const READY_LABELS = {
    activity_balance: "活动平衡",
    body_temperature: "体温",
    hrv_balance: "HRV",
    previous_day_activity: "前日活动",
    previous_night: "前夜睡眠",
    recovery_index: "恢复指数",
    resting_heart_rate: "静息心率",
    sleep_balance: "睡眠平衡"
  };
  const READY_SHORT = {
    activity_balance: "活动",
    body_temperature: "体温",
    hrv_balance: "HRV",
    previous_day_activity: "前日",
    previous_night: "前夜",
    recovery_index: "恢复",
    resting_heart_rate: "静息",
    sleep_balance: "睡平"
  };

  let allDays = [];
  let rangeDays = 7;
  let chartSRA = null;
  let chartSteps = null;
  let chartGauge = null;
  let chartRadar = null;
  let chartDonut = null;

  const $ = (id) => document.getElementById(id);
  const statusEl = $("status");
  const narrow = () => window.matchMedia("(max-width:520px)").matches;

  function avg(nums) {
    const v = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
    if (!v.length) return null;
    return v.reduce((a, b) => a + b, 0) / v.length;
  }
  function round1(n) {
    return n == null ? "—" : (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
  }
  function round0(n) {
    return n == null ? "—" : String(Math.round(n));
  }
  function sliceDays(n) {
    if (!allDays.length) return [];
    return allDays.slice(Math.max(0, allDays.length - n));
  }
  function shortDate(d) {
    if (!d) return "";
    const p = d.split("-");
    return p[1] + "/" + p[2];
  }
  function isWeekend(dateStr) {
    if (!dateStr) return false;
    const wd = new Date(dateStr + "T00:00:00").getDay();
    return wd === 0 || wd === 6;
  }
  function weekendTag(dateStr) {
    if (!dateStr) return "";
    const wd = new Date(dateStr + "T00:00:00").getDay();
    if (wd === 6) return "六";
    if (wd === 0) return "日";
    return "";
  }
  function axisLabel(dateStr) {
    const base = shortDate(dateStr);
    const tag = weekendTag(dateStr);
    return tag ? base + tag : base;
  }
  function weekendBandPlugin(dayList) {
    return {
      id: "weekendBands",
      beforeDatasetsDraw(chart) {
        const xScale = chart.scales.x;
        const { ctx, chartArea } = chart;
        if (!xScale || !chartArea || !dayList || !dayList.length) return;
        ctx.save();
        dayList.forEach((d, i) => {
          if (!isWeekend(d.date)) return;
          const x = xScale.getPixelForValue(i);
          let w;
          if (dayList.length === 1) w = Math.max(16, (chartArea.right - chartArea.left) * 0.12);
          else if (i < dayList.length - 1) w = Math.abs(xScale.getPixelForValue(i + 1) - x);
          else w = Math.abs(x - xScale.getPixelForValue(i - 1));
          ctx.fillStyle = "rgba(249,115,22,0.08)";
          ctx.fillRect(x - w / 2, chartArea.top, w, chartArea.bottom - chartArea.top);
        });
        ctx.restore();
      }
    };
  }
  function trendDelta(series) {
    if (series.length < 8) return null;
    const half = Math.floor(series.length / 2);
    const a = avg(series.slice(0, half));
    const b = avg(series.slice(half));
    if (a == null || b == null) return null;
    return b - a;
  }
  function fmtDelta(d) {
    if (d == null) return "";
    const sign = d > 0 ? "+" : "";
    return sign + round1(d);
  }
  function setTake(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
  }
  function meanAnnotationPlugin(yValue, label) {
    return {
      id: "meanLine_" + label,
      // label sits OUTSIDE plot (right padding), never covers curves
      afterDatasetsDraw(chart) {
        if (yValue == null || !Number.isFinite(yValue)) return;
        const yScale = chart.scales.y;
        if (!yScale) return;
        const y = yScale.getPixelForValue(yValue);
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "rgba(249,115,22,0.45)";
        ctx.lineWidth = 1.25;
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        const tipOn = chart.tooltip && chart.tooltip.getActiveElements && chart.tooltip.getActiveElements().length;
        if (!tipOn) {
          ctx.font = "600 11px -apple-system,BlinkMacSystemFont,sans-serif";
          const padX = 7;
          const tw = ctx.measureText(label).width;
          const bw = tw + padX * 2;
          const bh = 18;
          const r = 999;
          // outside plot, right gutter, vertically centered on mean line
          const bx = chartArea.right + 6;
          const by = y - bh / 2;
          ctx.beginPath();
          ctx.moveTo(bx + bh / 2, by);
          ctx.arcTo(bx + bw, by, bx + bw, by + bh, bh / 2);
          ctx.arcTo(bx + bw, by + bh, bx, by + bh, bh / 2);
          ctx.arcTo(bx, by + bh, bx, by, bh / 2);
          ctx.arcTo(bx, by, bx + bw, by, bh / 2);
          ctx.closePath();
          ctx.fillStyle = "rgba(255,255,255,0.96)";
          ctx.fill();
          ctx.strokeStyle = "#edd5c4";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = "#ea580c";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(label, bx + padX, y);
        }
        ctx.restore();
      }
    };
  }

  function rangeLabelText(n) {
    if (n === 7) return "睡眠 · 准备度 · 活动 · 近一周";
    return "睡眠 · 准备度 · 活动 · 近 " + n + " 天";
  }
  function rangeAvgWord(n) {
    return n === 7 ? "周均" : (n + " 天均");
  }

  function sparkSvg(series) {
    const vals = series.filter((n) => typeof n === "number" && !Number.isNaN(n));
    if (vals.length < 2) return "";
    const w = 120, h = 56;
    let min = Math.min.apply(null, vals);
    let max = Math.max.apply(null, vals);
    if (max === min) { min -= 1; max += 1; }
    const pad = 2;
    const pts = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
      return [x, y];
    });
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + " L" + pts[pts.length - 1][0].toFixed(1) + " " + h +
      " L" + pts[0][0].toFixed(1) + " " + h + " Z";
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="area" d="' + area + '"></path>' +
      '<path class="line" d="' + line + '"></path></svg>';
  }

  function setRange(n) {
    rangeDays = n;
    ["7", "30", "90"].forEach((d) => {
      const b = $("btn" + d);
      if (b) b.classList.toggle("on", String(n) === d);
    });
    const sw = $("rangeSwitch");
    if (sw) sw.setAttribute("data-on", String(n));
    $("rangeLabel").textContent = rangeLabelText(n);
    render();
  }

  $("btn7").addEventListener("click", () => setRange(7));
  $("btn30").addEventListener("click", () => setRange(30));
  $("btn90").addEventListener("click", () => setRange(90));
  // keep thumb in sync with default without re-fetching
  (function syncRangeUI() {
    ["7", "30", "90"].forEach((d) => {
      const b = $("btn" + d);
      if (b) b.classList.toggle("on", String(rangeDays) === d);
    });
    const sw = $("rangeSwitch");
    if (sw) sw.setAttribute("data-on", String(rangeDays));
    const lab = $("rangeLabel");
    if (lab) lab.textContent = rangeLabelText(rangeDays);
  })();

  function techTooltip() {
    return {
      backgroundColor: "rgba(255,255,255,.98)",
      titleColor: "#0f172a",
      bodyColor: "#334155",
      borderColor: "#edd5c4",
      borderWidth: 1,
      titleFont: { size: 12 },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      displayColors: true
    };
  }

  function xTicksOpts() {
    const isN = narrow();
    return {
      color: (ctx) => {
        const v = ctx.tick && ctx.tick.label;
        if (typeof v === "string" && (v.endsWith("六") || v.endsWith("日"))) return "#ea580c";
        return "#64748b";
      },
      font: (ctx) => {
        const v = ctx.tick && ctx.tick.label;
        const we = typeof v === "string" && (v.endsWith("六") || v.endsWith("日"));
        return { size: isN ? 9 : 10, weight: we ? "700" : "400" };
      },
      maxRotation: isN ? 45 : 0,
      minRotation: isN ? 45 : 0,
      autoSkip: true,
      maxTicksLimit: isN ? (rangeDays > 40 ? 7 : 6) : (rangeDays > 40 ? 12 : (rangeDays <= 7 ? 7 : 10))
    };
  }

  function renderBars(el, labels, contrib, takeId) {
    el.innerHTML = "";
    if (!contrib) {
      el.innerHTML = '<div class="n" style="font-size:12px;color:var(--muted)">暂无贡献项</div>';
      if (takeId) setTake(takeId, "暂无贡献项数据");
      return;
    }
    const entries = Object.keys(labels).map((k) => ({
      key: k,
      label: labels[k],
      val: contrib[k]
    })).filter((e) => typeof e.val === "number");
    entries.sort((a, b) => a.val - b.val);
    const weakKeys = new Set(entries.slice(0, 2).map((e) => e.key));
    entries.forEach((e) => {
      const row = document.createElement("div");
      row.className = "bar-row" + (weakKeys.has(e.key) ? " weak" : "");
      const pct = Math.max(0, Math.min(100, e.val));
      const badge = weakKeys.has(e.key) ? " ·瓶颈" : "";
      row.innerHTML =
        '<div class="n" title="' + e.key + '">' + e.label + badge + "</div>" +
        '<div class="track"><div class="fill" style="width:' + pct + '%"></div></div>' +
        '<div class="t">' + Math.round(e.val) + "</div>";
      el.appendChild(row);
    });
    if (takeId && entries.length) {
      const w = entries.slice(0, 2);
      setTake(takeId, "瓶颈「" + w.map((x) => x.label + " " + Math.round(x.val)).join("」「") + "」· 已按低→高排序");
    }
  }

  function readinessColor(score) {
    if (score == null) return "#fff7ed";
    if (score >= 85) return "#f97316";
    if (score >= 75) return "#fb923c";
    if (score >= 65) return "#fdba74";
    if (score >= 50) return "#fed7aa";
    return "#ffedd5";
  }

  const WDAY = ["一", "二", "三", "四", "五", "六", "日"];
  function wdayLabel(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return WDAY[(d.getDay() + 6) % 7];
  }
  function makeHeatCell(key, v) {
    const cell = document.createElement("div");
    cell.className = "hm-cell";
    if (v != null) {
      cell.style.background = readinessColor(v);
      cell.setAttribute("data-v", String(v));
      cell.tabIndex = 0;
      const tip = document.createElement("span");
      tip.className = "tip";
      tip.textContent = key.slice(5) + " · " + v;
      cell.appendChild(tip);
      cell.title = key + " · 准备度 " + v;
    } else {
      cell.style.opacity = "0.25";
      cell.title = key + " · 无数据";
    }
    return cell;
  }
  function renderHeatmap(days) {
    const el = $("heatmap");
    const wdays = $("hmWdays");
    const title = $("heatTitle");
    const hint = $("heatHint");
    el.innerHTML = "";
    if (!days.length) return;
    const strip = days.length <= 7 || rangeDays === 7;
    if (strip) {
      el.className = "heatmap hm-strip";
      if (title) title.textContent = "准备度热力 · 近一周";
      if (hint) hint.textContent = "按日顺序一排展示，不再按日历错位";
      if (wdays) {
        wdays.innerHTML = days.map((d) => "<span>" + wdayLabel(d.date) + "</span>").join("");
        // pad to 7 columns if fewer days
        for (let i = days.length; i < 7; i++) wdays.innerHTML += "<span></span>";
      }
      days.forEach((d) => {
        const v = d.readiness && typeof d.readiness.score === "number" ? d.readiness.score : null;
        el.appendChild(makeHeatCell(d.date, v));
      });
      for (let i = days.length; i < 7; i++) {
        const pad = document.createElement("div");
        pad.className = "hm-cell";
        pad.style.opacity = "0";
        pad.setAttribute("aria-hidden", "true");
        el.appendChild(pad);
      }
      return;
    }
    el.className = "heatmap hm-cal";
    if (title) title.textContent = "准备度热力日历";
    if (hint) hint.textContent = "按周一对齐的日历格 · 空格为区间外";
    if (wdays) {
      wdays.innerHTML = WDAY.map((w) => "<span>" + w + "</span>").join("");
    }
    const byDate = {};
    days.forEach((d) => {
      byDate[d.date] = d.readiness && typeof d.readiness.score === "number" ? d.readiness.score : null;
    });
    const start = new Date(days[0].date + "T00:00:00");
    const end = new Date(days[days.length - 1].date + "T00:00:00");
    let dow = (start.getDay() + 6) % 7;
    for (let i = 0; i < dow; i++) {
      const pad = document.createElement("div");
      pad.className = "hm-cell";
      pad.style.opacity = "0";
      pad.setAttribute("aria-hidden", "true");
      el.appendChild(pad);
    }
    const cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const dd = String(cur.getDate()).padStart(2, "0");
      const key = y + "-" + m + "-" + dd;
      el.appendChild(makeHeatCell(key, byDate[key] != null ? byDate[key] : null));
      cur.setDate(cur.getDate() + 1);
    }
  }

  function buildInsights(days30, days90) {
    const items = [];
    const s30 = avg(days30.map((d) => d.sleep && d.sleep.score));
    const r30 = avg(days30.map((d) => d.readiness && d.readiness.score));
    const a30 = avg(days30.map((d) => d.activity && d.activity.score));
    const steps30 = avg(days30.map((d) => d.activity && d.activity.steps));
    const s90 = avg(days90.map((d) => d.sleep && d.sleep.score));
    const r90 = avg(days90.map((d) => d.readiness && d.readiness.score));

    const sleepTrend = trendDelta(days30.map((d) => d.sleep && d.sleep.score));
    const readyTrend = trendDelta(days30.map((d) => d.readiness && d.readiness.score));
    const actTrend = trendDelta(days30.map((d) => d.activity && d.activity.score));

    if (s30 != null && r30 != null) {
      items.push("近 30 天睡眠均值 " + round1(s30) + "，准备度均值 " + round1(r30) + "。");
    }
    if (sleepTrend != null) {
      if (sleepTrend >= 2) items.push("近半程睡眠得分相对前半程提升 " + round1(sleepTrend) + "，恢复趋势向好。");
      else if (sleepTrend <= -2) items.push("近半程睡眠得分相对前半程下降 " + round1(Math.abs(sleepTrend)) + "，建议关注入睡与总时长。");
      else items.push("近 30 天睡眠得分整体平稳（半程差 " + fmtDelta(sleepTrend) + "）。");
    }
    if (readyTrend != null) {
      if (readyTrend >= 2) items.push("准备度近半程上升 " + round1(readyTrend) + "，恢复状态改善。");
      else if (readyTrend <= -2) items.push("准备度近半程下降 " + round1(Math.abs(readyTrend)) + "，留意体温与前夜睡眠贡献项。");
    }
    if (steps30 != null) {
      items.push("近 30 天日均步数约 " + round0(steps30) + " 步" + (actTrend != null && Math.abs(actTrend) >= 2 ? "，活动得分半程差 " + fmtDelta(actTrend) + "。" : "。"));
    }
    if (s30 != null && s90 != null) {
      const d = s30 - s90;
      if (Math.abs(d) >= 1.5) {
        items.push("近 30 天睡眠相对 90 天均值" + (d > 0 ? "偏高 " : "偏低 ") + round1(Math.abs(d)) + " 分。");
      } else {
        items.push("近 30 天与 90 天睡眠均值接近（差 " + fmtDelta(d) + "）。");
      }
    }
    if (r30 != null && r90 != null && Math.abs(r30 - r90) >= 1.5) {
      items.push("准备度 30 天相对 90 天" + (r30 > r90 ? "偏高 " : "偏低 ") + round1(Math.abs(r30 - r90)) + " 分。");
    }

    const latest = days90[days90.length - 1];
    if (latest && latest.sleep && latest.sleep.contributors) {
      const c = latest.sleep.contributors;
      const ranked = Object.keys(SLEEP_LABELS)
        .map((k) => ({ k, v: c[k] }))
        .filter((x) => typeof x.v === "number")
        .sort((a, b) => a.v - b.v);
      if (ranked.length) {
        const weak = ranked[0];
        items.push("最新睡眠最弱项是「" + SLEEP_LABELS[weak.k] + "」（" + Math.round(weak.v) + "）。");
      }
    }
    if (latest && latest.readiness && typeof latest.readiness.temperature_deviation === "number") {
      const td = latest.readiness.temperature_deviation;
      if (Math.abs(td) >= 0.2) {
        items.push("最新体温偏差 " + (td > 0 ? "+" : "") + td.toFixed(2) + "°C，可结合准备度体温项一并看。");
      }
    }
    return items.slice(0, 6);
  }

  function destroyCharts() {
    if (chartSRA) { chartSRA.destroy(); chartSRA = null; }
    if (chartSteps) { chartSteps.destroy(); chartSteps = null; }
    if (chartGauge) { chartGauge.destroy(); chartGauge = null; }
    if (chartRadar) { chartRadar.destroy(); chartRadar = null; }
    if (chartDonut) { chartDonut.destroy(); chartDonut = null; }
  }

  function metricTrendPhrase(name, delta) {
    if (delta == null) return name + "数据不足";
    if (delta >= 2) return name + "后半程↑" + round1(delta);
    if (delta <= -2) return name + "后半程↓" + round1(Math.abs(delta));
    return name + "平稳(" + fmtDelta(delta) + ")";
  }

  function render() {
    if (!allDays.length) return;
    const days = sliceDays(rangeDays);
    const days30 = sliceDays(30);
    const days90 = sliceDays(90);
    const latest = days[days.length - 1];

    const sAvg = avg(days.map((d) => d.sleep && d.sleep.score));
    const rAvg = avg(days.map((d) => d.readiness && d.readiness.score));
    const aAvg = avg(days.map((d) => d.activity && d.activity.score));
    const stepsAvg = avg(days.map((d) => d.activity && d.activity.steps));
    const calAvg = avg(days.map((d) => d.activity && d.activity.active_calories));

    const s30 = avg(days30.map((d) => d.sleep && d.sleep.score));
    const r30 = avg(days30.map((d) => d.readiness && d.readiness.score));
    const a30 = avg(days30.map((d) => d.activity && d.activity.score));
    const st30 = avg(days30.map((d) => d.activity && d.activity.steps));
    const s90 = avg(days90.map((d) => d.sleep && d.sleep.score));
    const r90 = avg(days90.map((d) => d.readiness && d.readiness.score));
    const a90 = avg(days90.map((d) => d.activity && d.activity.score));
    const st90 = avg(days90.map((d) => d.activity && d.activity.steps));

    const sleepTrend = trendDelta(days.map((d) => d.sleep && d.sleep.score));
    const readyTrend = trendDelta(days.map((d) => d.readiness && d.readiness.score));
    const actTrend = trendDelta(days.map((d) => d.activity && d.activity.score));

    // Summary cards — sparkline background + equal min-height
    const cards = $("summaryCards");
    cards.innerHTML = "";
    const avgWord = rangeAvgWord(rangeDays);
    const cardData = [
      {
        label: "睡眠",
        score: latest && latest.sleep ? latest.sleep.score : null,
        meta: "最新 " + (latest ? latest.date : "—") + " · " + avgWord + " " + round1(sAvg),
        delta: sleepTrend,
        series: days.map((d) => d.sleep && d.sleep.score)
      },
      {
        label: "准备度",
        score: latest && latest.readiness ? latest.readiness.score : null,
        meta: "最新 " + (latest ? latest.date : "—") + " · " + avgWord + " " + round1(rAvg),
        delta: readyTrend,
        series: days.map((d) => d.readiness && d.readiness.score)
      },
      {
        label: "活动",
        score: latest && latest.activity ? latest.activity.score : null,
        meta: "最新步数 " + (latest && latest.activity ? round0(latest.activity.steps) : "—") +
          " · " + avgWord + " " + round1(aAvg),
        delta: actTrend,
        series: days.map((d) => d.activity && d.activity.score)
      }
    ];
    cardData.forEach((c) => {
      const el = document.createElement("div");
      el.className = "card";
      let deltaHtml = "";
      if (c.delta != null && Math.abs(c.delta) >= 0.5) {
        deltaHtml = '<span class="delta">半程趋势 ' + fmtDelta(c.delta) + "</span>";
      }
      el.innerHTML =
        sparkSvg(c.series) +
        '<div class="label">' + c.label + "</div>" +
        '<div class="score">' + (c.score != null ? c.score : "—") + "<em>/100</em></div>" +
        '<div class="meta">' + c.meta + "</div>" + deltaHtml;
      cards.appendChild(el);
    });

    // SRA takeaway
    const trends = [
      { n: "睡眠", d: sleepTrend },
      { n: "准备度", d: readyTrend },
      { n: "活动", d: actTrend }
    ].filter((t) => t.d != null);
    let sraMsg = "区间内均值：睡 " + round1(sAvg) + " · 备 " + round1(rAvg) + " · 活 " + round1(aAvg);
    if (trends.length) {
      const ranked = trends.slice().sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
      const top = ranked[0];
      if (Math.abs(top.d) >= 2) {
        sraMsg = "<span class=\"hi\">" + metricTrendPhrase(top.n, top.d) + "</span> · " +
          trends.filter((t) => t !== top).map((t) => metricTrendPhrase(t.n, t.d)).join(" · ");
      } else {
        sraMsg = "三项半程均较平稳 · 睡/备/活均值 " + round1(sAvg) + "/" + round1(rAvg) + "/" + round1(aAvg);
      }
    }
    const wdDays = days.filter((d) => !isWeekend(d.date));
    const weDays = days.filter((d) => isWeekend(d.date));
    const rWd = avg(wdDays.map((d) => d.readiness && d.readiness.score));
    const rWe = avg(weDays.map((d) => d.readiness && d.readiness.score));
    const sWd = avg(wdDays.map((d) => d.sleep && d.sleep.score));
    const sWe = avg(weDays.map((d) => d.sleep && d.sleep.score));
    if (rWd != null && rWe != null && weDays.length) {
      const dlt = rWe - rWd;
      sraMsg += " · <span class=\"hi\">周末备均 " + round1(rWe) + "</span> / 工作日 " + round1(rWd) +
        "（" + fmtDelta(dlt) + "）";
      if (sWd != null && sWe != null) {
        sraMsg += " · 睡 " + round1(sWe) + "/" + round1(sWd);
      }
    } else if (!weDays.length) {
      sraMsg += " · 本区间无周末样本";
    }
    setTake("takeSRA", sraMsg);

    // Gauge takeaway
    const readyScore = latest && latest.readiness && typeof latest.readiness.score === "number"
      ? latest.readiness.score : null;
    const rRef = rAvg;
    let gaugeMsg = "暂无准备度";
    if (readyScore != null && rRef != null) {
      const diff = readyScore - rRef;
      const verdict = readyScore >= 85 ? "适合练" : readyScore >= 70 ? "可轻度活动" : "宜恢复";
      const span = rangeDays === 7 ? "近一周" : ("近" + rangeDays + "天");
      gaugeMsg = (diff >= 0 ? "高于" : "低于") + span + "均值（" + fmtDelta(diff) + "）· <span class=\"hi\">" + verdict + "</span>";
    } else if (readyScore != null) {
      gaugeMsg = "今日有分 · 区间均值不足";
    }
    setTake("takeGauge", gaugeMsg);
    $("gaugeHint").textContent = latest ? latest.date : "";
    const gs = $("gaugeScore");
    const gsub = $("gaugeSub");
    if (gs) gs.textContent = readyScore != null ? String(readyScore) : "—";
    if (gsub) gsub.textContent = rRef != null ? ("均 " + round1(rRef)) : "";

    // Donut takeaway
    let high = 0, mid = 0, low = 0;
    days.forEach((d) => {
      const s = d.activity && d.activity.steps;
      if (typeof s !== "number") return;
      if (s >= 8000) high++;
      else if (s >= 4000) mid++;
      else low++;
    });
    const donutTotal = high + mid + low;
    const buckets = [
      { label: "活跃≥8k", n: high },
      { label: "适中4–8k", n: mid },
      { label: "偏低<4k", n: low }
    ].sort((a, b) => b.n - a.n);
    if (donutTotal) {
      const top = buckets[0];
      const pct = Math.round((top.n / donutTotal) * 100);
      setTake("takeDonut", "主导档「<span class=\"hi\">" + top.label + "</span>」占 " + pct + "%（" + top.n + "/" + donutTotal + " 天）");
    } else {
      setTake("takeDonut", "暂无步数档位数据");
    }

    // Steps takeaway
    let peakDay = null, peakSteps = -1;
    days.forEach((d) => {
      const s = d.activity && d.activity.steps;
      if (typeof s === "number" && s > peakSteps) {
        peakSteps = s;
        peakDay = d.date;
      }
    });
    if (peakDay != null && stepsAvg != null) {
      setTake("takeSteps", "峰值 <span class=\"hi\">" + shortDate(peakDay) + " · " + round0(peakSteps) + "</span> 步 · 日均 " + round0(stepsAvg) + " · 橙=高于均值");
    } else {
      setTake("takeSteps", "暂无步数数据");
    }

    // Radar takeaway
    const readyKeys = Object.keys(READY_LABELS);
    const radarPairs = readyKeys.map((k) => {
      const c = latest && latest.readiness && latest.readiness.contributors;
      return { k, label: READY_LABELS[k], v: c && typeof c[k] === "number" ? c[k] : null };
    }).filter((x) => x.v != null);
    radarPairs.sort((a, b) => a.v - b.v);
    if (radarPairs.length) {
      const weak = radarPairs[0];
      setTake("takeRadar", "瓶颈「<span class=\"hi\">" + weak.label + "</span>」" + Math.round(weak.v) + " · 最强「" + radarPairs[radarPairs.length - 1].label + "」" + Math.round(radarPairs[radarPairs.length - 1].v));
    } else {
      setTake("takeRadar", "暂无贡献项");
    }
    $("radarHint").textContent = latest ? (latest.date + " · readiness contributors") : "最新一日贡献项";

    // Heatmap takeaway
    const rScores = days.map((d) => d.readiness && d.readiness.score).filter((n) => typeof n === "number");
    const lowDays = rScores.filter((n) => n < 70).length;
    const highDays = rScores.filter((n) => n >= 85).length;
    let wdSum = 0, wdN = 0, weSum = 0, weN = 0;
    days.forEach((d) => {
      const s = d.readiness && d.readiness.score;
      if (typeof s !== "number") return;
      const dow = new Date(d.date + "T00:00:00").getDay();
      if (dow === 0 || dow === 6) { weSum += s; weN++; }
      else { wdSum += s; wdN++; }
    });
    let heatMsg = "低日(<70) " + lowDays + " · 高日(≥85) " + highDays;
    if (wdN && weN) {
      heatMsg += " · 工作日均 " + round1(wdSum / wdN) + " / 周末均 " + round1(weSum / weN);
    }
    setTake("takeHeat", heatMsg);

    // Avg / cmp takeaways
    setTake("takeAvg", "近" + rangeDays + "天综合：睡 " + round1(sAvg) + " · 备 " + round1(rAvg) + " · 活 " + round1(aAvg) + " · 步 " + round0(stepsAvg));
    const cmpParts = [];
    if (s30 != null && s90 != null) cmpParts.push("睡眠30天" + (s30 >= s90 ? "↑" : "↓") + round1(Math.abs(s30 - s90)));
    if (r30 != null && r90 != null) cmpParts.push("准备度" + (r30 >= r90 ? "↑" : "↓") + round1(Math.abs(r30 - r90)));
    if (st30 != null && st90 != null) cmpParts.push("步数" + (st30 >= st90 ? "↑" : "↓") + round0(Math.abs(st30 - st90)));
    setTake("takeCmp", cmpParts.length ? ("相对90天：" + cmpParts.join(" · ")) : "对比数据不足");

    $("avgHint").textContent = "近 " + rangeDays + " 天（" + (days[0] ? days[0].date : "") + " → " + (latest ? latest.date : "") + "）";
    $("avgTable").querySelector("tbody").innerHTML =
      "<tr><td>睡眠得分</td><td>" + round1(sAvg) + "</td></tr>" +
      "<tr><td>准备度得分</td><td>" + round1(rAvg) + "</td></tr>" +
      "<tr><td>活动得分</td><td>" + round1(aAvg) + "</td></tr>" +
      "<tr><td>日均步数</td><td>" + round0(stepsAvg) + "</td></tr>" +
      "<tr><td>日均活动卡路里</td><td>" + round0(calAvg) + "</td></tr>";

    $("cmpTable").querySelector("tbody").innerHTML =
      "<tr><td>睡眠</td><td>" + round1(s30) + "</td><td>" + round1(s90) + "</td></tr>" +
      "<tr><td>准备度</td><td>" + round1(r30) + "</td><td>" + round1(r90) + "</td></tr>" +
      "<tr><td>活动</td><td>" + round1(a30) + "</td><td>" + round1(a90) + "</td></tr>" +
      "<tr><td>步数</td><td>" + round0(st30) + "</td><td>" + round0(st90) + "</td></tr>";

    const insights = buildInsights(days30, days90);
    $("insightList").innerHTML = insights.map((t) => "<li>" + t + "</li>").join("") || "<li>数据不足，暂无洞察。</li>";

    if (latest) {
      $("sleepContribDate").textContent = latest.date + " · 睡眠得分 " + (latest.sleep ? latest.sleep.score : "—");
      $("readyContribDate").textContent = latest.date + " · 准备度 " + (latest.readiness ? latest.readiness.score : "—") +
        (latest.readiness && typeof latest.readiness.temperature_deviation === "number"
          ? " · 体温偏差 " + (latest.readiness.temperature_deviation > 0 ? "+" : "") + latest.readiness.temperature_deviation.toFixed(2) + "°C"
          : "");
      renderBars($("sleepContrib"), SLEEP_LABELS, latest.sleep && latest.sleep.contributors, "takeSleepContrib");
      renderBars($("readyContrib"), READY_LABELS, latest.readiness && latest.readiness.contributors, "takeReadyContrib");
    }

    renderHeatmap(days);

    const labels = days.map((d) => axisLabel(d.date));
    const sleepSeries = days.map((d) => (d.sleep && typeof d.sleep.score === "number" ? d.sleep.score : null));
    const readySeries = days.map((d) => (d.readiness && typeof d.readiness.score === "number" ? d.readiness.score : null));
    const actSeries = days.map((d) => (d.activity && typeof d.activity.score === "number" ? d.activity.score : null));
    const stepsSeries = days.map((d) => (d.activity && typeof d.activity.steps === "number" ? d.activity.steps : null));

    const gridColor = "rgba(148,163,184,0.28)";
    const tickColor = "#64748b";
    const isN = narrow();

    destroyCharts();

    // Gauge
    const gScore = readyScore != null ? readyScore : 0;
    const gaugeRest = Math.max(0, 100 - gScore);
    chartGauge = new Chart($("chartGauge"), {
      type: "doughnut",
      data: {
        labels: ["得分", "余量"],
        datasets: [{
          data: [gScore, gaugeRest],
          backgroundColor: ["#f97316", "rgba(237,213,196,0.5)"],
          borderWidth: 0,
          hoverOffset: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "84%",
        rotation: -90,
        circumference: 360,
        layout: { padding: 6 },
        plugins: {
          legend: { display: false },
          title: { display: false },
          subtitle: { display: false },
          tooltip: {
            enabled: true,
            filter: (item) => item.dataIndex === 0,
            callbacks: {
              title: () => "",
              label: () => "准备度 " + (readyScore != null ? readyScore : "—")
            },
            backgroundColor: "rgba(255,255,255,.97)",
            bodyColor: "#334155",
            borderColor: "#edd5c4",
            borderWidth: 1,
            padding: 8,
            cornerRadius: 8
          }
        }
      }
    });

    chartDonut = new Chart($("chartDonut"), {
      type: "doughnut",
      data: {
        labels: ["活跃 ≥8k", "适中 4–8k", "偏低 <4k"],
        datasets: [{
          data: [high, mid, low],
          backgroundColor: ["#f97316", "#fb923c", "#fed7aa"],
          borderColor: ["#ea580c", "#f97316", "#edd5c4"],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "58%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: tickColor,
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: "circle",
              font: { size: isN ? 10 : 11 },
              padding: 10
            }
          },
          tooltip: techTooltip()
        }
      }
    });

    const radarVals = readyKeys.map((k) => {
      const c = latest && latest.readiness && latest.readiness.contributors;
      return c && typeof c[k] === "number" ? c[k] : 0;
    });
    chartRadar = new Chart($("chartRadar"), {
      type: "radar",
      data: {
        labels: readyKeys.map((k) => READY_SHORT[k]),
        datasets: [{
          label: "准备度贡献",
          data: radarVals,
          borderColor: "#f97316",
          backgroundColor: "rgba(249,115,22,0.22)",
          pointBackgroundColor: "#fdba74",
          pointBorderColor: "#f97316",
          pointRadius: isN ? 2 : 3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: isN ? 2 : 6 },
        plugins: {
          legend: { display: false },
          tooltip: techTooltip()
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              display: !isN,
              backdropColor: "transparent",
              color: "#64748b",
              font: { size: 9 },
              stepSize: 25
            },
            grid: { color: gridColor },
            angleLines: { color: "rgba(249,115,22,0.18)" },
            pointLabels: {
              color: "#334155",
              font: { size: isN ? 9 : 11 }
            }
          }
        }
      }
    });

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 4, right: isN ? 52 : 60, bottom: 0, left: 0 } },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            boxWidth: 8, boxHeight: 8,
            usePointStyle: true, pointStyle: "circle",
            color: tickColor,
            font: { size: isN ? 10 : 11 },
            padding: isN ? 8 : 12
          }
        },
        tooltip: techTooltip()
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: xTicksOpts(),
          border: { display: false }
        },
        y: {
          min: 40,
          max: 100,
          grid: { color: gridColor },
          border: { display: false },
          ticks: { color: tickColor, font: { size: isN ? 9 : 10 }, stepSize: 20 }
        }
      }
    };

    chartSRA = new Chart($("chartSRA"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "睡眠",
            data: sleepSeries,
            borderColor: "#f97316",
            backgroundColor: "rgba(249,115,22,0.12)",
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            spanGaps: true,
            fill: false
          },
          {
            label: "准备度",
            data: readySeries,
            borderColor: "#ea580c",
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            spanGaps: true
          },
          {
            label: "活动",
            data: actSeries,
            borderColor: "#fdba74",
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            spanGaps: true,
            borderDash: [4, 3]
          }
        ]
      },
      options: commonOpts,
      plugins: [weekendBandPlugin(days), meanAnnotationPlugin(rAvg, "均" + round1(rAvg))]
    });

    const stepColors = stepsSeries.map((s) => {
      if (s == null || stepsAvg == null) return "rgba(249,115,22,0.45)";
      return s >= stepsAvg ? "rgba(249,115,22,0.85)" : "rgba(253,186,116,0.55)";
    });
    const nBars = Math.max(1, days.length);
    let barPct = 0.55;
    let catPct = 0.7;
    let maxThick = isN ? 10 : 14;
    if (nBars <= 7) { barPct = 0.72; catPct = 0.88; maxThick = isN ? 36 : 48; }
    else if (nBars <= 14) { barPct = 0.65; catPct = 0.8; maxThick = isN ? 22 : 28; }
    else if (nBars <= 31) { barPct = 0.6; catPct = 0.75; maxThick = isN ? 14 : 18; }
    else { barPct = 0.5; catPct = 0.65; maxThick = isN ? 5 : 8; }
    chartSteps = new Chart($("chartSteps"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "步数",
          data: stepsSeries,
          backgroundColor: stepColors,
          hoverBackgroundColor: "#ea580c",
          borderColor: "rgba(249,115,22,0.35)",
          borderWidth: 1,
          borderRadius: nBars <= 7 ? 6 : 3,
          borderSkipped: false,
          maxBarThickness: maxThick,
          categoryPercentage: catPct,
          barPercentage: barPct
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 4, right: isN ? 48 : 56, bottom: 0, left: 0 } },
        plugins: {
          legend: { display: false },
          tooltip: techTooltip()
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: xTicksOpts(),
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            border: { display: false },
            ticks: {
              color: tickColor,
              font: { size: isN ? 9 : 10 },
              callback: (v) => (v >= 1000 ? (v / 1000) + "k" : v)
            }
          }
        }
      },
      plugins: [weekendBandPlugin(days), meanAnnotationPlugin(stepsAvg, "均" + round0(stepsAvg))]
    });

    statusEl.textContent = "已加载 " + allDays.length + " 天 · 展示近 " + days.length + " 天 · " +
      (days[0] ? days[0].date : "") + " → " + (latest ? latest.date : "") + " · " + BUILD;
    statusEl.classList.remove("err");
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (allDays.length) render(); }, 200);
  });

  async function load() {
    try {
      statusEl.textContent = "正在加载 Oura 数据…";
      const res = await fetch(API, { cache: "no-store", credentials: "include" });
      if (res.status === 401) {
        if (typeof onUnauthorized === "function") onUnauthorized();
        return;
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.days)) throw new Error("响应格式异常");
      allDays = data.days.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      render();
    } catch (err) {
      console.error(err);
      statusEl.textContent = "加载失败：" + (err && err.message ? err.message : String(err));
      statusEl.classList.add("err");
      $("insightList").innerHTML = "<li>无法拉取数据，请稍后刷新。CORS/网络异常时也会出现此提示。</li>";
    }
  }


  const AI_API = "/api/me/ai";
  let aiBusy = false;
  let aiTypeTimer = null;

  function openAiDrawer() {
    const mask = $("aiMask");
    const drawer = $("aiDrawer");
    if (!mask || !drawer) return;
    mask.hidden = false;
    requestAnimationFrame(() => {
      mask.classList.add("open");
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
    });
  }

  function closeAiDrawer() {
    const mask = $("aiMask");
    const drawer = $("aiDrawer");
    if (!mask || !drawer) return;
    mask.classList.remove("open");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    setTimeout(() => { mask.hidden = true; }, 220);
  }

  function stripMarkdown(text) {
    let t = String(text || "");
    t = t.replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, "").replace(/```/g, ""));
    t = t.replace(/^#{1,6}\s+/gm, "");
    t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
    t = t.replace(/__([^_]+)__/g, "$1");
    t = t.replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, "$1");
    t = t.replace(/(?<![\w_])_([^_\n]+)_(?![\w_])/g, "$1");
    t = t.replace(/`([^`]+)`/g, "$1");
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
    t = t.replace(/^\s{0,3}[-*+]\s+/gm, "· ");
    t = t.replace(/^\s{0,3}>\s?/gm, "");
    t = t.replace(/\n{3,}/g, "\n\n");
    return t.trim();
  }

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clearAiAnim() {
    clearAiThinking();
    if (aiTypeTimer) { clearTimeout(aiTypeTimer); aiTypeTimer = null; }
  }

  function revealReportBlocks(root) {
    return new Promise((resolve) => {
      clearAiAnim();
      const blocks = root ? root.querySelectorAll(".rpt-block") : [];
      if (!blocks.length) { resolve(); return; }
      let i = 0;
      const tick = () => {
        if (i >= blocks.length) { aiTypeTimer = null; resolve(); return; }
        blocks[i].classList.add("in");
        i += 1;
        aiTypeTimer = setTimeout(tick, 100);
      };
      tick();
    });
  }


  let aiThinkTimer = null;
  const AI_THINK_LINES = [
    "正在读睡眠与准备度…",
    "对照这几天的波动…",
    "在写主要发现…",
    "生成今日处方…"
  ];
  function clearAiThinking() {
    if (aiThinkTimer) { clearInterval(aiThinkTimer); aiThinkTimer = null; }
  }
  function showAiThinking(out, days) {
    clearAiThinking();
    let i = 0;
    out.innerHTML =
      '<div class="ai-loading" id="aiLoading">'
      + '<div class="ai-loading-ring" aria-hidden="true"></div>'
      + '<div class="ai-loading-title">正在诊断</div>'
      + '<div class="ai-loading-sub" id="aiLoadingSub">整理近 ' + days + ' 天的 Oura 信号…</div>'
      + '<div class="ai-loading-dots" aria-hidden="true"><i></i><i></i><i></i></div>'
      + '</div>';
    const sub = $("aiLoadingSub");
    aiThinkTimer = setInterval(() => {
      if (!sub) return;
      i = (i + 1) % AI_THINK_LINES.length;
      sub.textContent = AI_THINK_LINES[i];
    }, 1600);
  }

  function renderReport(out, data) {
    clearAiThinking();
    const report = data && data.report;
    if (!report || typeof report !== "object") {
      out.classList.add("plain-fallback");
      out.textContent = stripMarkdown(String((data && data.text) || ""));
      return Promise.resolve();
    }
    out.classList.remove("plain-fallback");
    const train = report.train === "宜歇" ? "宜歇" : "宜练";
    const trainCls = train === "宜练" ? "go" : "rest";
    const nowBit = (data.now && data.now.timeStr)
      ? (" · 现在 " + escHtml(data.now.timeStr) + (data.now.hoursToSleep != null ? (" · 距睡觉约 " + escHtml(data.now.hoursToSleep) + "h") : ""))
      : "";
    const rangeLabel = "近 " + escHtml(data.days || rangeDays) + " 天 · " + escHtml(data.from || "") + " → " + escHtml(data.to || "") + nowBit;
    const findings = Array.isArray(report.findings) ? report.findings : [];
    const actions = Array.isArray(report.actions) ? report.actions : [];
    const rx = (report.prescription && typeof report.prescription === "object") ? report.prescription : {};
    let findingsHtml = findings.map((f) => {
      const lv = escHtml(f.level || "注意");
      return '<div class="rpt-finding rpt-block">'
        + '<div class="rpt-finding-top">'
        + '<div class="rpt-finding-title">' + escHtml(f.title || "") + '</div>'
        + '<span class="rpt-chip lv-' + lv + '">' + lv + '</span>'
        + '</div>'
        + '<div class="rpt-finding-detail">' + escHtml(f.detail || "") + '</div>'
        + '</div>';
    }).join("");
    let actionsHtml = actions.map((a, idx) => {
      return '<li class="rpt-block"><span class="num">' + (idx + 1) + '</span><span>' + escHtml(a) + '</span></li>';
    }).join("");
    out.innerHTML =
      '<div class="rpt-meta rpt-block">'
      + '<div class="rpt-range">' + rangeLabel + '</div>'
      + '<span class="rpt-train ' + trainCls + '">' + escHtml(train) + '</span>'
      + '</div>'
      + '<div class="rpt-verdict rpt-block">'
      + '<div class="rpt-verdict-label">结论</div>'
      + '<div class="rpt-verdict-text">' + escHtml(report.verdict || "") + '</div>'
      + (report.trainReason ? '<div class="rpt-verdict-reason">' + escHtml(train) + ' · ' + escHtml(report.trainReason) + '</div>' : '')
      + '</div>'
      + '<div class="rpt-sec">'
      + '<div class="rpt-sec-title rpt-block">主要发现</div>'
      + '<div class="rpt-findings">' + findingsHtml + '</div>'
      + '</div>'
      + '<div class="rpt-sec">'
      + '<div class="rpt-sec-title rpt-block">分项解读</div>'
      + '<div class="rpt-rows">'
      + '<div class="rpt-row rpt-block"><div class="rpt-row-k">睡眠</div><div class="rpt-row-v">' + escHtml(report.sleep || "") + '</div></div>'
      + '<div class="rpt-row rpt-block"><div class="rpt-row-k">准备度</div><div class="rpt-row-v">' + escHtml(report.readiness || "") + '</div></div>'
      + '<div class="rpt-row rpt-block"><div class="rpt-row-k">活动</div><div class="rpt-row-v">' + escHtml(report.activity || "") + '</div></div>'
      + '</div></div>'
      + '<div class="rpt-sec">'
      + '<div class="rpt-sec-title rpt-block">今日处方</div>'
      + '<div class="rpt-rx">'
      + '<div class="rpt-rx-card rpt-block"><div class="rpt-rx-k">运动</div><div class="rpt-rx-v">' + escHtml(rx.workout || "") + '</div></div>'
      + '<div class="rpt-rx-card rpt-block"><div class="rpt-rx-k">睡眠</div><div class="rpt-rx-v">' + escHtml(rx.sleep || "") + '</div></div>'
      + '<div class="rpt-rx-card rpt-block"><div class="rpt-rx-k">补活动</div><div class="rpt-rx-v">' + escHtml(rx.move || "") + '</div></div>'
      + '</div></div>'
      + '<div class="rpt-sec">'
      + '<div class="rpt-sec-title rpt-block">接下来</div>'
      + '<ol class="rpt-actions">' + actionsHtml + '</ol>'
      + '</div>';
    return revealReportBlocks(out);
  }

  async function runAiAnalysis() {
    if (aiBusy) {
      const st = $("aiStatus");
      if (st) st.textContent = "正在分析中，请稍候…";
      openAiDrawer();
      return;
    }
    aiBusy = true;
    const btn = $("btnAi");
    if (btn) btn.disabled = true;
    openAiDrawer();
    const st = $("aiStatus");
    const out = $("aiOut");
    clearAiAnim();
    if (st) { st.textContent = ""; st.classList.remove("err"); }
    if (out) {
      out.classList.remove("plain-fallback");
      showAiThinking(out, rangeDays);
    }
    try {
      const nowIso = new Date().toISOString();
      const url = AI_API + "?days=" + encodeURIComponent(String(rangeDays)) + "&now=" + encodeURIComponent(nowIso);
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      const hasReport = data && data.report && typeof data.report === "object";
      if (!res.ok || !data || !data.ok || (!hasReport && !data.text)) {
        const err = (data && data.error) ? data.error : ("HTTP " + res.status);
        throw new Error(err);
      }
      const nowLabel = (data.now && data.now.label) ? data.now.label : "";
      if (st) st.textContent = "近 " + (data.days || rangeDays) + " 天 · " + (data.from || "") + " → " + (data.to || "") + (nowLabel ? " · 现在 " + nowLabel : "") + " · " + (data.model || "MiniMax-M3");
      await renderReport(out, data);
    } catch (err) {
      console.error(err);
      if (st) { st.textContent = "分析失败：" + (err && err.message ? err.message : String(err)); st.classList.add("err"); }
      clearAiThinking();
      if (out) { out.classList.remove("plain-fallback"); out.innerHTML = ""; }
    } finally {
      aiBusy = false;
      if (btn) btn.disabled = false;
    }
  }

  const btnAi = $("btnAi");
  if (btnAi) btnAi.addEventListener("click", runAiAnalysis);
  const aiClose = $("aiClose");
  if (aiClose) aiClose.addEventListener("click", closeAiDrawer);
  const aiMask = $("aiMask");
  if (aiMask) aiMask.addEventListener("click", closeAiDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAiDrawer();
  });

  load();
}
