/* Cockpit Home — client-side Day/Week interactivity for the frozen export.
 * Reads the already-rendered month grid (.ck-day[data-ck-date]) and projects
 * it into Week and Day views. No external data, no Obsidian runtime. */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // escape text before interpolating into innerHTML (defensive — content is the
  // user's own roster, but never trust strings flowing into markup)
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // only allow a hex colour through into style attributes
  function safeColor(c) {
    return /^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : "#22d3ee";
  }

  ready(function () {
    const grid = document.querySelector(".ck-grid");
    if (!grid) return; // roster widget not on this page
    const monthWrap = grid.parentElement;
    const navRow = document.querySelector("[data-ck-nav]")
      ? document.querySelector("[data-ck-nav]").closest("div")
      : null;
    const tabs = Array.from(document.querySelectorAll("[data-ck-view]"));

    // ---- 1. Parse day cells into a model -------------------------------
    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const WD_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const days = {}; // iso -> {iso, label, sub, block, accent, type}
    document.querySelectorAll(".ck-day[data-ck-date]").forEach(function (cell) {
      const iso = cell.getAttribute("data-ck-date");
      if (!ISO.test(iso)) return;
      const kids = Array.from(cell.children).filter((n) => n.tagName === "DIV");
      // kids: [header, accent-bar, mainLabel, sub, block?]
      const main = kids[2];
      const sub = kids[3];
      const blockEl = kids.find((d) =>
        /^\s*\d{1,2}:\d{2}\s*$/.test(d.textContent || "")
      );
      const label = main ? (main.textContent || "").trim() : "";
      const accent =
        (main && main.style && main.style.color) ||
        (kids[1] && (kids[1].style.background.match(/#[0-9a-f]{3,8}/i) || [])[0]) ||
        "#22d3ee";
      const subTxt = sub ? (sub.textContent || "").trim() : "";
      const block = blockEl ? (blockEl.textContent || "").trim() : "";

      let type = "Ground Duty";
      if (label === "—" || label === "") type = "Day Off";
      else if (/standby/i.test(subTxt) || /^SBY/i.test(label)) type = "Standby";
      else if (block || /✈/.test(cell.textContent)) type = "Flight Duty";

      days[iso] = { iso, label: label || "—", sub: subTxt, block, accent, type };
      // make the existing cell obviously clickable
      cell.classList.add("ck-clickable");
    });

    const allISO = Object.keys(days).sort();
    if (!allISO.length) return;

    function parseISO(iso) {
      const [y, m, d] = iso.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    function toISO(dt) {
      return (
        dt.getFullYear() +
        "-" +
        String(dt.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dt.getDate()).padStart(2, "0")
      );
    }
    function shift(iso, n) {
      const dt = parseISO(iso);
      dt.setDate(dt.getDate() + n);
      return toISO(dt);
    }
    function dayData(iso) {
      return days[iso] || { iso, label: "—", sub: "", block: "", accent: "#2a3348", type: "No data" };
    }

    // default selection: today-if-in-range, else the highlighted cell, else first
    const todayISO = toISO(new Date());
    let selected = days[todayISO]
      ? todayISO
      : allISO[Math.floor(allISO.length / 2)];

    // ---- 2. Build view containers --------------------------------------
    const weekView = document.createElement("div");
    weekView.className = "ck-view ck-week-view";
    weekView.style.display = "none";
    const dayView = document.createElement("div");
    dayView.className = "ck-view ck-day-view";
    dayView.style.display = "none";
    monthWrap.parentNode.insertBefore(weekView, monthWrap.nextSibling);
    monthWrap.parentNode.insertBefore(dayView, weekView.nextSibling);

    function fmtLong(iso) {
      const dt = parseISO(iso);
      return WD_LONG[dt.getDay()] + ", " + dt.getDate() + " " + MO[dt.getMonth()] + " " + dt.getFullYear();
    }

    // ---- 3. Renderers --------------------------------------------------
    function renderDay() {
      const d = dayData(selected);
      const ac = safeColor(d.accent);
      dayView.innerHTML =
        '<div class="ck-nav-bar">' +
          '<button class="ck-step" data-step-day="-1">◄ PREV</button>' +
          '<span class="ck-nav-title">' + esc(fmtLong(selected)) + "</span>" +
          '<button class="ck-step" data-step-day="1">NEXT ►</button>' +
        "</div>" +
        '<div class="ck-day-card" style="border-color:' + ac + '55">' +
          '<div class="ck-day-bar" style="background:' + ac + '"></div>' +
          '<div class="ck-day-type" style="color:' + ac + '">' + esc(d.type) + "</div>" +
          '<div class="ck-day-label" style="color:' + ac + '">' + esc(d.label) + "</div>" +
          (d.sub ? '<div class="ck-day-sub">' + esc(d.sub) + "</div>" : "") +
          (d.block ? '<div class="ck-day-block">BLOCK <b style="color:' + ac + '">' + esc(d.block) + "</b></div>" : "") +
        "</div>";
    }

    function renderWeek() {
      // Monday-based week containing `selected`
      const dt = parseISO(selected);
      const dow = (dt.getDay() + 6) % 7; // 0 = Monday
      const monday = shift(selected, -dow);
      let rows = "";
      for (let i = 0; i < 7; i++) {
        const iso = shift(monday, i);
        const d = dayData(iso);
        const pdt = parseISO(iso);
        const isSel = iso === selected;
        const ac = safeColor(d.accent);
        rows +=
          '<button class="ck-week-row' + (isSel ? " is-sel" : "") + '" data-go-day="' + esc(iso) + '" style="border-left-color:' + ac + '">' +
            '<span class="ck-week-dow">' + esc(WD[pdt.getDay()] + " " + pdt.getDate()) + "</span>" +
            '<span class="ck-week-label" style="color:' + ac + '">' + esc(d.label) + "</span>" +
            '<span class="ck-week-sub">' + esc(d.sub || "") + "</span>" +
            '<span class="ck-week-block">' + esc(d.block || "") + "</span>" +
          "</button>";
      }
      const sun = shift(monday, 6);
      weekView.innerHTML =
        '<div class="ck-nav-bar">' +
          '<button class="ck-step" data-step-week="-1">◄ PREV</button>' +
          '<span class="ck-nav-title">' + parseISO(monday).getDate() + " " + MO[parseISO(monday).getMonth()] +
            " – " + parseISO(sun).getDate() + " " + MO[parseISO(sun).getMonth()] + "</span>" +
          '<button class="ck-step" data-step-week="1">NEXT ►</button>' +
        "</div>" +
        '<div class="ck-week-list">' + rows + "</div>";
    }

    // ---- 4. View switching ---------------------------------------------
    let view = "month";
    function setTab(name) {
      view = name;
      monthWrap.style.display = name === "month" ? "" : "none";
      if (navRow) navRow.style.display = name === "month" ? "" : "none";
      weekView.style.display = name === "week" ? "" : "none";
      dayView.style.display = name === "day" ? "" : "none";
      tabs.forEach(function (b) {
        const active = b.getAttribute("data-ck-view") === name;
        b.style.background = active ? "rgba(255,255,255,0.13)" : "transparent";
        b.style.color = active ? "#e2e8f0" : "#3a4458";
      });
      if (name === "week") renderWeek();
      if (name === "day") renderDay();
    }

    // ---- 5. Wire events ------------------------------------------------
    tabs.forEach(function (b) {
      b.addEventListener("click", function () {
        setTab(b.getAttribute("data-ck-view"));
      });
    });

    grid.addEventListener("click", function (e) {
      const cell = e.target.closest(".ck-day[data-ck-date]");
      if (!cell) return;
      selected = cell.getAttribute("data-ck-date");
      setTab("day");
    });

    dayView.addEventListener("click", function (e) {
      const step = e.target.closest("[data-step-day]");
      if (step) {
        selected = shift(selected, Number(step.getAttribute("data-step-day")));
        renderDay();
      }
    });

    weekView.addEventListener("click", function (e) {
      const step = e.target.closest("[data-step-week]");
      if (step) {
        selected = shift(selected, 7 * Number(step.getAttribute("data-step-week")));
        renderWeek();
        return;
      }
      const go = e.target.closest("[data-go-day]");
      if (go) {
        selected = go.getAttribute("data-go-day");
        setTab("day");
      }
    });

    // start on month (current behaviour), tabs now live
    setTab("month");
  });
})();
