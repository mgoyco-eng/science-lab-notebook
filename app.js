(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const SECTION_ORDER = [
    ["researchQuestion", "Research Question"],
    ["backgroundInformation", "Background Information"],
    ["variables", "Variables"],
    ["hypothesis", "Hypothesis"],
    ["materials", "Materials"],
    ["procedure", "Procedure"],
    ["rawData", "Raw Data"],
    ["processedData", "Processed Data"],
    ["conclusion", "Conclusion"],
    ["evaluation", "Evaluation"],
    ["improvements", "Improvements"],
    ["references", "References"]
  ];

  const SECTION_LABEL = Object.fromEntries(SECTION_ORDER);

  function toRoman(value) {
    const map = [
      [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
      [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
      [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
    ];
    let number = Math.max(1, Number(value) || 1);
    let result = "";
    for (const [amount, numeral] of map) {
      while (number >= amount) {
        result += numeral;
        number -= amount;
      }
    }
    return result;
  }

  const COLORS = {
    navy: [11, 43, 91],
    teal: [15, 138, 161],
    ink: [29, 43, 60],
    muted: [92, 108, 126],
    pale: [244, 248, 251],
    line: [193, 207, 220],
    orange: [239, 125, 35]
  };

  const startedAt = new Date();

  const state = {
    unlocked: false,
    submitted: false,
    submittedAt: null,
    dirty: false,
    allowUnload: false,
    activeSections: new Set(SECTION_ORDER.map(([key]) => key)),
    pendingRemoveKey: null,
    blockedAttempts: 0,
    blockedEvents: [],
    leftPageCount: 0,
    focusLossEvents: [],
    focusExitCount: 0,
    focusExitEvents: [],
    inactiveCount: 0,
    inactiveEvents: [],
    monitoringStartedAt: null,
    awaySession: null,
    authorizedUntil: 0,
    lastHeartbeat: Date.now(),
    focusModeActive: false,
    focusModeEverEntered: false,
    focusGatePassed: false,
    wakeLock: null,
    controlledVariables: [
      { variable: "", control: "", effect: "" },
      { variable: "", control: "", effect: "" },
      { variable: "", control: "", effect: "" }
    ],
    tables: {
      rawData: [makeTable()],
      processedData: [makeTable()]
    },
    calculationImage: null,
    figures: [],
    references: [{ text: "" }]
  };

  const els = {
    experimentTitle: $("experimentTitle"),
    teacher: $("teacher"),
    studentName: $("studentName"),
    date: $("date"),
    time: $("time"),
    classCode: $("classCode"),
    programme: $("programme"),
    reportFields: $("reportFields"),
    gateNotice: $("gateNotice"),
    outlineList: $("outlineList"),
    removedSections: $("removedSections"),
    restoreButtons: $("restoreButtons"),
    documentStatus: $("documentStatus"),
    blockedCount: $("blockedCount"),
    leftPageCount: $("leftPageCount"),
    focusExitCount: $("focusExitCount"),
    inactiveCount: $("inactiveCount"),
    monitoringBadge: $("monitoringBadge"),
    monitoringStatus: $("monitoringStatus"),
    focusModeButton: $("focusModeButton"),
    focusControlCard: $("focusControlCard"),
    focusControlMessage: $("focusControlMessage"),
    focusControlBadge: $("focusControlBadge"),
    controlledVariablesEditor: $("controlledVariablesEditor"),
    rawDataEditor: $("rawDataEditor"),
    processedDataEditor: $("processedDataEditor"),
    calculationImage: $("calculationImage"),
    calculationImagePreview: $("calculationImagePreview"),
    calculationImageStatus: $("calculationImageStatus"),
    removeCalculationImage: $("removeCalculationImage"),
    figureEntries: $("figureEntries"),
    referenceEntries: $("referenceEntries"),
    previewReport: $("previewReport"),
    downloadFinal: $("downloadFinal"),
    startNewReport: $("startNewReport"),
    saveStatus: $("saveStatus"),
    blockedDialog: $("blockedDialog"),
    blockedMessage: $("blockedMessage"),
    focusDialog: $("focusDialog"),
    focusMessage: $("focusMessage"),
    removeSectionDialog: $("removeSectionDialog"),
    removeSectionMessage: $("removeSectionMessage"),
    previewDialog: $("previewDialog"),
    reportPreview: $("reportPreview"),
    downloadDialog: $("downloadDialog"),
    newReportDialog: $("newReportDialog")
  };

  init();

  function init() {
    fillDateAndTime();
    renderOutline();
    renderControlledVariables();
    renderTableEditor("rawData");
    renderTableEditor("processedData");
    renderFigures();
    renderReferences();
    attachStaticListeners();
    attachRestrictions();
    attachMonitoring();
    document.querySelectorAll("textarea.auto-grow").forEach(autoGrow);
    updateCounts();
  }

  function makeTable() {
    return {
      title: "",
      headers: ["", "", "", ""],
      rows: Array.from({ length: 4 }, () => ["", "", "", ""]),
      groupedHeading: null
    };
  }

  function fillDateAndTime() {
    const now = startedAt;
    els.date.value = new Intl.DateTimeFormat(undefined, {
      year: "numeric", month: "long", day: "numeric"
    }).format(now);
    els.time.value = new Intl.DateTimeFormat(undefined, {
      hour: "numeric", minute: "2-digit"
    }).format(now);
  }

  function attachStaticListeners() {
    [els.experimentTitle, els.teacher, els.studentName, els.classCode].forEach((field) => {
      field.addEventListener("input", () => {
        markDirty();
            tryUnlock();
      });
    });

    els.programme.addEventListener("change", () => {
      markDirty();
      tryUnlock();
    });

    document.querySelectorAll("textarea, input[type='text'], select").forEach((field) => {
      field.addEventListener("input", () => {
        if (state.unlocked) markDirty();
        if (field.tagName === "TEXTAREA") autoGrow(field);
      });
    });

    document.querySelectorAll("[data-remove-section]").forEach((button) => {
      button.addEventListener("click", () => requestRemoveSection(button.dataset.removeSection));
    });

    $("addControlledVariable").addEventListener("click", () => {
      if (state.submitted) return;
      state.controlledVariables.push({ variable: "", control: "", effect: "" });
      renderControlledVariables();
      markDirty();
    });

    document.querySelectorAll("[data-add-table]").forEach((button) => {
      button.addEventListener("click", () => {
        if (state.submitted) return;
        const key = button.dataset.addTable;
        if (state.tables[key].length >= 5) return;
        state.tables[key].push(makeTable());
        renderTableEditor(key);
        markDirty();
      });
    });

    els.calculationImage.addEventListener("pointerdown", authorizeFilePicker);
    els.calculationImage.addEventListener("change", handleCalculationImage);
    els.removeCalculationImage.addEventListener("click", () => {
      if (state.submitted) return;
      state.calculationImage = null;
      renderCalculationImage();
      markDirty();
    });

    $("addFigure").addEventListener("click", () => {
      if (state.submitted || state.figures.length >= 6) return;
      state.figures.push({ title: "", description: "", dataUrl: "" });
      renderFigures();
      markDirty();
    });

    $("addReference").addEventListener("click", () => {
      if (state.submitted || state.references.length >= 20) return;
      state.references.push({ text: "" });
      renderReferences();
      markDirty();
    });

    els.focusModeButton.addEventListener("click", toggleFocusMode);

    els.previewReport.addEventListener("click", openPreview);
    $("returnToEditing").addEventListener("click", () => els.previewDialog.close());
    $("downloadFromPreview").addEventListener("click", () => {
      if (state.submitted) {
        generatePdf();
        return;
      }
      els.previewDialog.close();
      els.downloadDialog.showModal();
    });

    els.downloadFinal.addEventListener("click", () => {
      if (!state.unlocked) return;
      if (state.submitted) {
        generatePdf();
      } else {
        els.downloadDialog.showModal();
      }
    });

    $("cancelDownload").addEventListener("click", () => els.downloadDialog.close());
    $("confirmDownload").addEventListener("click", async () => {
      els.downloadDialog.close();
      const ok = await generatePdf();
      if (ok) lockSubmittedReport();
    });

    $("cancelRemoveSection").addEventListener("click", () => {
      state.pendingRemoveKey = null;
      els.removeSectionDialog.close();
    });
    $("confirmRemoveSection").addEventListener("click", confirmRemoveSection);

    els.startNewReport.addEventListener("click", () => els.newReportDialog.showModal());
    $("cancelNewReport").addEventListener("click", () => els.newReportDialog.close());
    $("confirmNewReport").addEventListener("click", () => {
      state.allowUnload = true;
      window.location.reload();
    });

    window.addEventListener("beforeunload", (event) => {
      if (state.allowUnload || state.submitted || !state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function tryUnlock() {
    if (state.unlocked) return;
    const required = [els.experimentTitle, els.teacher, els.studentName, els.classCode];
    const ready = required.every((field) => field.value.trim().length > 0);
    if (!ready) return;

    state.unlocked = true;
    state.monitoringStartedAt = new Date().toISOString();
    els.reportFields.disabled = true;
    els.previewReport.disabled = true;
    els.downloadFinal.disabled = true;
    els.focusModeButton.disabled = false;
    els.gateNotice.textContent = "Student Information complete. Enter Focus Mode below before beginning your report.";
    els.gateNotice.classList.add("unlocked");
    els.monitoringBadge.textContent = "ACTIVE";
    els.monitoringBadge.className = "status-chip active";
    els.monitoringStatus.textContent = "Monitoring is active. Enter Focus Mode above the report before you begin writing.";
    els.focusControlCard.classList.add("ready");
    els.focusControlBadge.textContent = "READY";
    els.focusControlBadge.className = "status-chip warning";
    els.focusControlMessage.textContent = "Student Information is complete. Enter Focus Mode now to unlock the report-writing sections.";
  }

  function activateReportAfterFocus(fallback = false) {
    if (!state.unlocked || state.submitted || state.focusGatePassed) return;
    state.focusGatePassed = true;
    els.reportFields.disabled = false;
    els.previewReport.disabled = false;
    els.downloadFinal.disabled = false;
    els.gateNotice.textContent = fallback
      ? "Your browser did not allow full-screen Focus Mode, but monitoring remains active and the report is unlocked."
      : "Focus Mode entered. Your report is unlocked. Keep this page open until your final PDF has downloaded.";
    els.focusControlCard.classList.remove("ready");
    els.focusControlCard.classList.add("active");
    els.focusControlBadge.textContent = fallback ? "MONITORED" : "ACTIVE";
    els.focusControlBadge.className = "status-chip active";
    els.focusControlMessage.textContent = fallback
      ? "Full-screen mode was not available in this browser. Assessment Monitoring is still active while you work."
      : "Focus Mode is active. You may begin writing your report.";
  }

  function markDirty() {
    if (!state.submitted) state.dirty = true;
  }

  function autoGrow(textarea) {
    if (!textarea || textarea.tagName !== "TEXTAREA") return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 90)}px`;
  }

  function renderOutline() {
    els.outlineList.replaceChildren();
    const active = SECTION_ORDER.filter(([key]) => state.activeSections.has(key));
    active.forEach(([key, label], index) => {
      const li = document.createElement("li");
      const number = document.createElement("span");
      number.className = "outline-number";
      number.textContent = `${toRoman(index + 1)}.`;
      const text = document.createElement("span");
      text.textContent = label;
      li.append(number, text);
      els.outlineList.append(li);
    });

    document.querySelectorAll(".report-section").forEach((section) => {
      const key = section.dataset.sectionKey;
      section.hidden = !state.activeSections.has(key);
      if (!section.hidden) {
        const index = active.findIndex(([activeKey]) => activeKey === key);
        const badge = section.querySelector("[data-part-number]");
        if (badge) badge.textContent = toRoman(index + 1);
      }
    });

    const removed = SECTION_ORDER.filter(([key]) => !state.activeSections.has(key));
    els.removedSections.hidden = removed.length === 0;
    els.restoreButtons.replaceChildren();
    removed.forEach(([key, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "restore-button";
      button.textContent = `Restore: ${label}`;
      button.disabled = state.submitted;
      button.addEventListener("click", () => {
        state.activeSections.add(key);
        renderOutline();
        markDirty();
        document.querySelector(`[data-section-key="${key}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      els.restoreButtons.append(button);
    });
  }

  function requestRemoveSection(key) {
    if (state.submitted || !state.activeSections.has(key)) return;
    state.pendingRemoveKey = key;
    els.removeSectionMessage.textContent = `${SECTION_LABEL[key]} will not be included in your report preview or final PDF.`;
    els.removeSectionDialog.showModal();
  }

  function confirmRemoveSection() {
    const key = state.pendingRemoveKey;
    if (!key) return;
    state.activeSections.delete(key);
    state.pendingRemoveKey = null;
    els.removeSectionDialog.close();
    renderOutline();
    markDirty();
  }

  function renderControlledVariables() {
    els.controlledVariablesEditor.replaceChildren();
    state.controlledVariables.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "controlled-row";

      const variableWrap = labeledDynamicField("Factor", "textarea", item.variable, (value) => {
        item.variable = value;
        markDirty();
      });
      const controlWrap = labeledDynamicField("Details", "textarea", item.control, (value) => {
        item.control = value;
        markDirty();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.title = `Remove controlled variable ${index + 1}`;
      remove.setAttribute("aria-label", remove.title);
      remove.textContent = "×";
      remove.disabled = state.submitted;
      remove.addEventListener("click", () => {
        state.controlledVariables.splice(index, 1);
        renderControlledVariables();
        markDirty();
      });

      row.append(variableWrap, controlWrap, remove);
      els.controlledVariablesEditor.append(row);
    });

    if (!state.controlledVariables.length) {
      const empty = document.createElement("p");
      empty.className = "fine-print";
      empty.textContent = "No controlled-variable rows are currently included. Use “Add controlled variable” to add one.";
      els.controlledVariablesEditor.append(empty);
    }
  }

  function labeledDynamicField(labelText, tagName, value, onInput) {
    const wrap = document.createElement("div");
    const label = document.createElement("div");
    label.className = "row-label";
    label.textContent = labelText;
    const field = document.createElement(tagName);
    field.value = value;
    field.disabled = state.submitted;
    field.addEventListener("input", () => {
      onInput(field.value);
      if (tagName === "textarea") autoGrow(field);
    });
    wrap.append(label, field);
    queueMicrotask(() => tagName === "textarea" && autoGrow(field));
    return wrap;
  }

  function renderTableEditor(key) {
    const container = key === "rawData" ? els.rawDataEditor : els.processedDataEditor;
    container.replaceChildren();

    state.tables[key].forEach((table, tableIndex) => {
      const card = document.createElement("div");
      card.className = "table-card";

      const head = document.createElement("div");
      head.className = "table-card-head";

      const titleWrap = document.createElement("div");
      titleWrap.className = "table-title-wrap";
      const titleLabel = document.createElement("div");
      titleLabel.className = "row-label";
      titleLabel.textContent = `Table ${tableIndex + 1} Title`;
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.maxLength = 140;
      titleInput.value = table.title;
      titleInput.disabled = state.submitted;
      titleInput.addEventListener("input", () => {
        table.title = titleInput.value;
        markDirty();
      });
      titleWrap.append(titleLabel, titleInput);

      const toolbar = document.createElement("div");
      toolbar.className = "table-toolbar";
      toolbar.append(
        tableToolButton("+ Row", () => addTableRow(key, tableIndex), table.rows.length >= 40),
        tableToolButton("− Row", () => removeTableRow(key, tableIndex), table.rows.length <= 1),
        tableToolButton("+ Column", () => addTableColumn(key, tableIndex), table.headers.length >= 10),
        tableToolButton("− Column", () => removeTableColumn(key, tableIndex), table.headers.length <= 2),
        table.groupedHeading
          ? tableToolButton("Remove grouped heading", () => removeGroupedHeading(key, tableIndex), false)
          : tableToolButton("+ Grouped heading", () => addGroupedHeading(key, tableIndex), table.headers.length < 2)
      );
      if (state.tables[key].length > 1) {
        const removeTable = tableToolButton("Remove table", () => {
          state.tables[key].splice(tableIndex, 1);
          renderTableEditor(key);
          markDirty();
        }, false, true);
        toolbar.append(removeTable);
      }

      head.append(titleWrap, toolbar);

      if (table.groupedHeading) {
        card.append(makeGroupedHeadingControls(key, tableIndex, table));
      }

      const scroll = document.createElement("div");
      scroll.className = "table-scroll";
      const tableEl = document.createElement("table");
      tableEl.className = "editable-table";
      const thead = document.createElement("thead");

      if (table.groupedHeading) {
        thead.append(makeEditableGroupedHeadingRow(key, tableIndex, table));
      }

      const headerRow = document.createElement("tr");
      table.headers.forEach((headerValue, colIndex) => {
        const th = document.createElement("th");
        const input = document.createElement("input");
        input.type = "text";
        input.value = headerValue;
        input.disabled = state.submitted;
        input.placeholder = "Heading";
        input.setAttribute("aria-label", `Table ${tableIndex + 1} column ${colIndex + 1} heading`);
        input.addEventListener("input", () => {
          table.headers[colIndex] = input.value;
          markDirty();
        });
        th.append(input);
        headerRow.append(th);
      });
      thead.append(headerRow);

      const tbody = document.createElement("tbody");
      table.rows.forEach((rowData, rowIndex) => {
        const tr = document.createElement("tr");
        rowData.forEach((cellValue, colIndex) => {
          const td = document.createElement("td");
          const input = document.createElement("input");
          input.type = "text";
          input.value = cellValue;
          input.disabled = state.submitted;
          input.setAttribute("aria-label", `Table ${tableIndex + 1}, row ${rowIndex + 1}, column ${colIndex + 1}`);
          input.addEventListener("input", () => {
            table.rows[rowIndex][colIndex] = input.value;
            markDirty();
          });
          td.append(input);
          tr.append(td);
        });
        tbody.append(tr);
      });

      tableEl.append(thead, tbody);
      scroll.append(tableEl);
      const footnote = document.createElement("div");
      footnote.className = "table-footnote";
      footnote.textContent = "Click any heading cell to enter or change its heading. Use Preview Report to check how this table will appear before downloading the PDF.";
      card.prepend(head);
      card.append(scroll, footnote);
      container.append(card);
    });
  }

  function addGroupedHeading(key, tableIndex) {
    const table = state.tables[key][tableIndex];
    if (!table || table.groupedHeading || table.headers.length < 2) return;
    const span = Math.min(3, table.headers.length);
    table.groupedHeading = {
      label: "",
      start: Math.max(0, table.headers.length - span),
      span
    };
    renderTableEditor(key);
    markDirty();
  }

  function removeGroupedHeading(key, tableIndex) {
    const table = state.tables[key][tableIndex];
    if (!table || !table.groupedHeading) return;
    table.groupedHeading = null;
    renderTableEditor(key);
    markDirty();
  }

  function normalizeGroupedHeading(table) {
    if (!table.groupedHeading) return;
    const maxStart = Math.max(0, table.headers.length - 1);
    table.groupedHeading.start = Math.min(Math.max(0, table.groupedHeading.start), maxStart);
    const maxSpan = table.headers.length - table.groupedHeading.start;
    table.groupedHeading.span = Math.min(Math.max(1, table.groupedHeading.span), maxSpan);
  }

  function makeGroupedHeadingControls(key, tableIndex, table) {
    normalizeGroupedHeading(table);
    const group = table.groupedHeading;
    const wrap = document.createElement("div");
    wrap.className = "grouped-heading-controls";

    const note = document.createElement("p");
    note.className = "grouped-heading-note";
    note.textContent = "Grouped heading: use this when several adjacent columns belong under one shared label.";

    const controls = document.createElement("div");
    controls.className = "grouped-heading-options";

    const startLabel = document.createElement("label");
    startLabel.textContent = "Starts at column";
    const startSelect = document.createElement("select");
    startSelect.disabled = state.submitted;
    table.headers.forEach((_, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = String(index + 1);
      option.selected = index === group.start;
      startSelect.append(option);
    });
    startSelect.addEventListener("change", () => {
      group.start = Number(startSelect.value);
      const maxSpan = table.headers.length - group.start;
      group.span = Math.min(group.span, maxSpan);
      renderTableEditor(key);
      markDirty();
    });
    startLabel.append(startSelect);

    const spanLabel = document.createElement("label");
    spanLabel.textContent = "Number of columns";
    const spanSelect = document.createElement("select");
    spanSelect.disabled = state.submitted;
    const maxSpan = table.headers.length - group.start;
    for (let span = 1; span <= maxSpan; span += 1) {
      const option = document.createElement("option");
      option.value = String(span);
      option.textContent = String(span);
      option.selected = span === group.span;
      spanSelect.append(option);
    }
    spanSelect.addEventListener("change", () => {
      group.span = Number(spanSelect.value);
      renderTableEditor(key);
      markDirty();
    });
    spanLabel.append(spanSelect);

    controls.append(startLabel, spanLabel);
    wrap.append(note, controls);
    return wrap;
  }

  function makeEditableGroupedHeadingRow(key, tableIndex, table) {
    normalizeGroupedHeading(table);
    const group = table.groupedHeading;
    const row = document.createElement("tr");
    row.className = "grouped-heading-row";

    let col = 0;
    while (col < table.headers.length) {
      const th = document.createElement("th");
      if (col === group.start) {
        th.colSpan = group.span;
        th.className = "grouped-heading-cell";
        const input = document.createElement("input");
        input.type = "text";
        input.value = group.label;
        input.disabled = state.submitted;
        input.placeholder = "Grouped heading";
        input.setAttribute("aria-label", `Table ${tableIndex + 1} grouped heading`);
        input.addEventListener("input", () => {
          group.label = input.value;
          markDirty();
        });
        th.append(input);
        col += group.span;
      } else {
        th.className = "grouped-heading-empty";
        th.setAttribute("aria-hidden", "true");
        col += 1;
      }
      row.append(th);
    }
    return row;
  }

  function tableToolButton(text, handler, disabled = false, danger = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-small ${danger ? "btn-danger" : "btn-secondary"}`;
    button.textContent = text;
    button.disabled = state.submitted || disabled;
    button.addEventListener("click", handler);
    return button;
  }

  function addTableRow(key, tableIndex) {
    const table = state.tables[key][tableIndex];
    if (!table || table.rows.length >= 40) return;
    table.rows.push(Array.from({ length: table.headers.length }, () => ""));
    renderTableEditor(key);
    markDirty();
  }

  function removeTableRow(key, tableIndex) {
    const table = state.tables[key][tableIndex];
    if (!table || table.rows.length <= 1) return;
    table.rows.pop();
    renderTableEditor(key);
    markDirty();
  }

  function addTableColumn(key, tableIndex) {
    const table = state.tables[key][tableIndex];
    if (!table || table.headers.length >= 10) return;
    table.headers.push("");
    table.rows.forEach((row) => row.push(""));
    normalizeGroupedHeading(table);
    renderTableEditor(key);
    markDirty();
  }

  function removeTableColumn(key, tableIndex) {
    const table = state.tables[key][tableIndex];
    if (!table || table.headers.length <= 2) return;
    table.headers.pop();
    table.rows.forEach((row) => row.pop());
    normalizeGroupedHeading(table);
    renderTableEditor(key);
    markDirty();
  }

  function authorizeFilePicker() {
    state.authorizedUntil = Date.now() + 60000;
  }

  async function handleCalculationImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || state.submitted) return;
    els.calculationImageStatus.textContent = "Preparing image…";
    try {
      const dataUrl = await prepareImage(file);
      state.calculationImage = { dataUrl, name: file.name };
      renderCalculationImage();
      markDirty();
      els.calculationImageStatus.textContent = "Image added for this open session only.";
    } catch (error) {
      els.calculationImageStatus.textContent = error.message || "The image could not be opened.";
    } finally {
      setTimeout(() => { state.authorizedUntil = 0; }, 750);
    }
  }

  function renderCalculationImage() {
    if (state.calculationImage?.dataUrl) {
      els.calculationImagePreview.src = state.calculationImage.dataUrl;
      els.calculationImagePreview.hidden = false;
      els.removeCalculationImage.hidden = false;
      els.removeCalculationImage.disabled = state.submitted;
    } else {
      els.calculationImagePreview.removeAttribute("src");
      els.calculationImagePreview.hidden = true;
      els.removeCalculationImage.hidden = true;
      els.calculationImageStatus.textContent = "";
    }
  }

  function renderFigures() {
    els.figureEntries.replaceChildren();
    state.figures.forEach((figure, index) => {
      const card = document.createElement("div");
      card.className = "figure-card";

      const head = document.createElement("div");
      head.className = "figure-card-head";
      const heading = document.createElement("h4");
      heading.textContent = `Figure ${index + 1}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "×";
      remove.title = `Remove Figure ${index + 1}`;
      remove.disabled = state.submitted;
      remove.addEventListener("click", () => {
        state.figures.splice(index, 1);
        renderFigures();
        markDirty();
      });
      head.append(heading, remove);

      const title = document.createElement("input");
      title.type = "text";
      title.placeholder = "Figure title";
      title.maxLength = 160;
      title.value = figure.title;
      title.disabled = state.submitted;
      title.addEventListener("input", () => {
        figure.title = title.value;
        markDirty();
      });

      const description = document.createElement("textarea");
      description.rows = 4;
      description.placeholder = "Brief description or analysis";
      description.value = figure.description;
      description.disabled = state.submitted;
      description.addEventListener("input", () => {
        figure.description = description.value;
        markDirty();
        autoGrow(description);
      });

      const file = document.createElement("input");
      file.type = "file";
      file.accept = "image/png,image/jpeg,image/webp";
      file.disabled = state.submitted;
      file.addEventListener("pointerdown", authorizeFilePicker);
      file.addEventListener("change", async () => {
        const selected = file.files?.[0];
        file.value = "";
        if (!selected || state.submitted) return;
        try {
          figure.dataUrl = await prepareImage(selected);
          renderFigures();
          markDirty();
        } catch (error) {
          showBlockedMessage(error.message || "The image could not be opened.", "Image upload blocked");
        } finally {
          setTimeout(() => { state.authorizedUntil = 0; }, 750);
        }
      });

      card.append(head, title, file);
      if (figure.dataUrl) {
        const img = document.createElement("img");
        img.src = figure.dataUrl;
        img.alt = figure.title || `Figure ${index + 1} preview`;
        img.className = "figure-preview";
        card.append(img);
      }
      card.append(description);
      els.figureEntries.append(card);
      queueMicrotask(() => autoGrow(description));
    });
  }

  function renderReferences() {
    els.referenceEntries.replaceChildren();
    state.references.forEach((reference, index) => {
      const row = document.createElement("div");
      row.className = "reference-row";
      const textarea = document.createElement("textarea");
      textarea.rows = 3;
      textarea.placeholder = `Reference ${index + 1}`;
      textarea.value = reference.text;
      textarea.disabled = state.submitted;
      textarea.addEventListener("input", () => {
        reference.text = textarea.value;
        markDirty();
        autoGrow(textarea);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "×";
      remove.title = `Remove reference ${index + 1}`;
      remove.disabled = state.submitted;
      remove.addEventListener("click", () => {
        state.references.splice(index, 1);
        if (!state.references.length) state.references.push({ text: "" });
        renderReferences();
        markDirty();
      });
      row.append(textarea, remove);
      els.referenceEntries.append(row);
      queueMicrotask(() => autoGrow(textarea));
    });
  }

  async function prepareImage(file) {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) throw new Error("Choose a PNG, JPG, or WebP image.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Choose an image smaller than 8 MB.");

    const source = await readFileAsDataUrl(file);
    const image = new Image();
    image.src = source;
    await image.decode();

    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("The image could not be read."));
      reader.readAsDataURL(file);
    });
  }

  function attachRestrictions() {
    const blockedEvents = ["copy", "cut", "paste", "dragstart", "drop"];
    blockedEvents.forEach((type) => {
      document.addEventListener(type, (event) => {
        if (state.submitted) return;
        event.preventDefault();
        const labels = {
          copy: "Copy attempt",
          cut: "Cut attempt",
          paste: "Paste attempt",
          dragstart: "Drag attempt",
          drop: "Drag-and-drop attempt"
        };
        recordBlocked(labels[type], "Copying, cutting, pasting, and drag-and-drop are disabled. Please type your own work directly in the Science Lab Notebook.");
      }, true);
    });

    document.addEventListener("contextmenu", (event) => {
      if (state.submitted) return;
      event.preventDefault();
      recordBlocked("Context menu attempt", "The context menu is disabled while you are working in the Science Lab Notebook.");
    }, true);

    document.addEventListener("beforeinput", (event) => {
      if (state.submitted) return;
      const blockedTypes = new Set(["insertFromPaste", "insertFromDrop", "deleteByCut"]);
      if (!blockedTypes.has(event.inputType)) return;
      event.preventDefault();
      recordBlocked("Blocked text insertion", "Pasted or dragged text is disabled. Please type your work directly.");
    }, true);

    document.addEventListener("keydown", (event) => {
      if (state.submitted) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      if (["c", "x", "v", "s", "p"].includes(key)) {
        event.preventDefault();
        let action = "Blocked keyboard shortcut";
        let message = "That shortcut is disabled while you are working in the Science Lab Notebook.";
        if (key === "c") action = "Copy shortcut attempt";
        if (key === "x") action = "Cut shortcut attempt";
        if (key === "v") action = "Paste shortcut attempt";
        if (key === "s") { action = "Save-page shortcut attempt"; message = "Saving the webpage is disabled. Your report must be downloaded using Download Final Report."; }
        if (key === "p") { action = "Print shortcut attempt"; message = "Printing from the browser is disabled. Use Preview Report and Download Final Report instead."; }
        recordBlocked(action, message);
      }
    }, true);
  }

  let lastBlockedModalAt = 0;

  function recordBlocked(action, message) {
    if (!state.unlocked || state.submitted) return;
    state.blockedAttempts += 1;
    state.blockedEvents.push({ action, at: new Date().toISOString() });
    updateCounts();
    const now = Date.now();
    if (now - lastBlockedModalAt > 900) {
      lastBlockedModalAt = now;
      showBlockedMessage(message, action);
    }
  }

  function showBlockedMessage(message) {
    els.blockedMessage.textContent = message;
    if (!els.blockedDialog.open) els.blockedDialog.showModal();
  }

  function attachMonitoring() {
    setInterval(() => {
      state.lastHeartbeat = Date.now();
    }, 1000);

    document.addEventListener("visibilitychange", () => {
      if (!state.unlocked || state.submitted) return;
      if (document.hidden) {
        beginAway("tab-hidden");
      } else {
        finishAway();
        if (state.focusModeActive) requestWakeLock();
      }
    });

    window.addEventListener("blur", () => {
      if (document.hidden) return;
      beginAway("window-blur");
    });

    window.addEventListener("focus", () => {
      if (!document.hidden) finishAway();
      if (state.authorizedUntil) {
        setTimeout(() => { state.authorizedUntil = 0; }, 250);
      }
    });

    document.addEventListener("freeze", () => {
      if (state.awaySession) state.awaySession.frozen = true;
    });

    document.addEventListener("fullscreenchange", handleFullscreenChange);
  }

  function beginAway(reason) {
    if (!state.unlocked || state.submitted) return;
    if (Date.now() < state.authorizedUntil) return;
    if (state.awaySession) return;
    state.awaySession = {
      reason,
      startedAt: Date.now(),
      lastHeartbeatAtStart: state.lastHeartbeat,
      frozen: false
    };
  }

  function finishAway() {
    const session = state.awaySession;
    if (!session) return;
    state.awaySession = null;
    if (Date.now() < state.authorizedUntil) return;

    const now = Date.now();
    const durationMs = now - session.startedAt;
    const heartbeatGap = now - state.lastHeartbeat;
    const looksLikeSleep = session.frozen || (durationMs >= 90000 && heartbeatGap >= 45000);

    if (looksLikeSleep) {
      state.inactiveCount += 1;
      state.inactiveEvents.push({ at: new Date().toISOString(), durationMs });
      updateCounts();
      els.monitoringStatus.textContent = "A long inactive interval was recorded separately as possible device sleep/inactivity.";
      return;
    }

    state.leftPageCount += 1;
    state.focusLossEvents.push({ reason: session.reason, at: new Date().toISOString(), durationMs });
    updateCounts();
    els.focusMessage.textContent = "The Science Lab Notebook was no longer the active assessment page. This event has been recorded.";
    if (!els.focusDialog.open && !anyBlockingDialogOpen()) els.focusDialog.showModal();
  }

  function anyBlockingDialogOpen() {
    return [els.removeSectionDialog, els.downloadDialog, els.newReportDialog].some((dialog) => dialog.open);
  }

  async function toggleFocusMode() {
    if (!state.unlocked || state.submitted) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      }
    } catch (error) {
      els.monitoringStatus.textContent = "This browser did not allow full-screen Focus Mode. Monitoring remains active.";
      activateReportAfterFocus(true);
    }
  }

  function handleFullscreenChange() {
    if (document.fullscreenElement) {
      state.focusModeActive = true;
      state.focusModeEverEntered = true;
      els.focusModeButton.textContent = "Exit Focus Mode";
      els.monitoringBadge.textContent = "FOCUS MODE";
      els.focusControlCard.classList.remove("ready");
      els.focusControlCard.classList.add("active");
      els.focusControlBadge.textContent = "ACTIVE";
      els.focusControlBadge.className = "status-chip active";
      els.focusControlMessage.textContent = "Focus Mode is active. You may continue working on your report.";
      els.monitoringBadge.className = "status-chip active";
      els.monitoringStatus.textContent = "Focus Mode is active. Screen wake lock will be requested when supported.";
      activateReportAfterFocus(false);
      requestWakeLock();
      return;
    }

    if (!state.focusModeActive) return;
    state.focusModeActive = false;
    els.focusModeButton.textContent = "Enter Focus Mode";
    if (state.focusGatePassed && !state.submitted) {
      els.focusControlCard.classList.remove("active");
      els.focusControlCard.classList.add("ready");
      els.focusControlBadge.textContent = "FOCUS EXITED";
      els.focusControlBadge.className = "status-chip warning";
      els.focusControlMessage.textContent = "Focus Mode was exited. Re-enter Focus Mode to return to the monitored full-screen view.";
    }
    releaseWakeLock();
    if (!state.unlocked || state.submitted) return;

    const heartbeatGap = Date.now() - state.lastHeartbeat;
    if (document.hidden || heartbeatGap > 45000) {
      els.monitoringStatus.textContent = "Focus Mode ended during a long inactive/hidden interval. It was not automatically counted as a focus exit.";
      return;
    }

    state.focusExitCount += 1;
    state.focusExitEvents.push({ at: new Date().toISOString() });
    updateCounts();
    els.focusMessage.textContent = "Focus Mode was exited. This event has been recorded.";
    if (!els.focusDialog.open && !anyBlockingDialogOpen()) els.focusDialog.showModal();
  }

  async function requestWakeLock() {
    if (!state.focusModeActive || document.hidden || !("wakeLock" in navigator)) return;
    try {
      if (state.wakeLock && !state.wakeLock.released) return;
      state.wakeLock = await navigator.wakeLock.request("screen");
      state.wakeLock.addEventListener("release", () => {
        state.wakeLock = null;
      });
    } catch (_) {
      state.wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    try {
      if (state.wakeLock && !state.wakeLock.released) await state.wakeLock.release();
    } catch (_) {
      // Browser owns wake-lock behavior; failure to release is non-critical.
    }
    state.wakeLock = null;
  }

  function updateCounts() {
    els.blockedCount.textContent = String(state.blockedAttempts);
    els.leftPageCount.textContent = String(state.leftPageCount);
    els.focusExitCount.textContent = String(state.focusExitCount);
    els.inactiveCount.textContent = String(state.inactiveCount);
  }

  function getWatermarkDate() {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric", month: "2-digit", day: "2-digit"
    }).format(startedAt);
  }

  function getWatermarkText() {
    return `${els.studentName.value.trim() || "Student"} • ${getWatermarkDate()}`;
  }

  function openPreview() {
    if (!state.unlocked) return;
    buildPreview();
    $("downloadFromPreview").textContent = state.submitted ? "Download Submitted Report ↓" : "Download Final Report ↓";
    els.previewDialog.showModal();
  }

  function buildPreview() {
    const root = els.reportPreview;
    root.replaceChildren();
    delete root.dataset.watermark;

    const titleBlock = document.createElement("div");
    titleBlock.className = "preview-report-title";
    const big = document.createElement("div");
    big.className = "big-title";
    big.textContent = "Science Lab Notebook";
    const experiment = document.createElement("div");
    experiment.className = "experiment-title";
    experiment.textContent = els.experimentTitle.value.trim() || "Untitled Experiment";
    titleBlock.append(big, experiment);

    const info = document.createElement("div");
    info.className = "preview-info-grid";
    [
      ["Student", els.studentName.value],
      ["Teacher", els.teacher.value],
      ["Date", els.date.value],
      ["Time", els.time.value],
      ["Class Code", els.classCode.value],
      ["Programme", els.programme.value]
    ].forEach(([label, value]) => {
      const div = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      div.append(strong, document.createTextNode(value || "—"));
      info.append(div);
    });

    root.append(titleBlock, info);

    getActiveSections().forEach(([key, label], index) => {
      const section = document.createElement("section");
      section.className = "preview-section";
      const heading = document.createElement("h2");
      heading.textContent = `${toRoman(index + 1)}. ${label}`;
      section.append(heading);
      appendPreviewSectionContent(section, key);
      root.append(section);
    });

    root.append(buildPreviewMonitoring());
    appendPreviewWatermarks(root);
  }

  function appendPreviewWatermarks(root) {
    const layer = document.createElement("div");
    layer.className = "preview-watermark-layer";
    layer.setAttribute("aria-hidden", "true");
    const text = getWatermarkText();
    const rows = 8;
    const columns = 3;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const mark = document.createElement("span");
        mark.className = "preview-watermark-item";
        mark.textContent = text;
        mark.style.top = `${7 + row * 13}%`;
        mark.style.left = `${18 + column * 33 + (row % 2 ? 7 : 0)}%`;
        layer.append(mark);
      }
    }
    root.append(layer);
  }

  function appendPreviewSectionContent(section, key) {
    const textSectionIds = {
      researchQuestion: "researchQuestion",
      backgroundInformation: "backgroundInformation",
      hypothesis: "hypothesis",
      conclusion: "conclusion",
      evaluation: "evaluation",
      improvements: "improvements"
    };

    if (textSectionIds[key]) {
      appendPreviewText(section, $(textSectionIds[key]).value);
      return;
    }

    if (key === "variables") {
      appendPreviewLabeledText(section, "Independent Variable", $("independentVariable").value);
      appendPreviewLabeledText(section, "Dependent Variable", $("dependentVariable").value);
      const rows = state.controlledVariables.filter((row) => row.variable.trim() || row.control.trim());
      const title = document.createElement("p");
      title.className = "preview-table-title";
      title.textContent = "Controlled Variables";
      section.append(title);
      if (rows.length) {
        section.append(makePreviewTable(
          ["Factor", "Details"],
          rows.map((row) => [row.variable, row.control])
        ));
      } else {
        appendPreviewEmpty(section, "No controlled variables entered.");
      }
      return;
    }

    if (key === "materials" || key === "procedure") {
      const value = $(key).value;
      const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return appendPreviewEmpty(section);
      lines.forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        section.append(p);
      });
      return;
    }

    if (key === "rawData") {
      appendPreviewTables(section, state.tables.rawData);
      return;
    }

    if (key === "processedData") {
      appendPreviewLabeledText(section, "Description of Calculation", $("calculationDescription").value);
      appendPreviewLabeledText(section, "Sample Calculation", $("sampleCalculation").value);
      if (state.calculationImage?.dataUrl) {
        const img = document.createElement("img");
        img.className = "preview-image";
        img.src = state.calculationImage.dataUrl;
        img.alt = "Handwritten sample calculation";
        section.append(img);
      }
      appendPreviewTables(section, state.tables.processedData);
      state.figures.forEach((figure, index) => {
        if (!figure.dataUrl && !figure.title.trim() && !figure.description.trim()) return;
        const figTitle = document.createElement("p");
        figTitle.className = "preview-table-title";
        figTitle.textContent = figure.title.trim() || `Figure ${index + 1}`;
        section.append(figTitle);
        if (figure.dataUrl) {
          const img = document.createElement("img");
          img.className = "preview-image";
          img.src = figure.dataUrl;
          img.alt = figure.title || `Figure ${index + 1}`;
          section.append(img);
        }
        if (figure.description.trim()) appendPreviewText(section, figure.description);
      });
      return;
    }

    if (key === "references") {
      const references = state.references.map((reference) => reference.text.trim()).filter(Boolean);
      if (!references.length) return appendPreviewEmpty(section, "No references entered.");
      references.forEach((reference) => {
        const p = document.createElement("p");
        p.className = "preview-reference";
        p.textContent = reference;
        section.append(p);
      });
    }
  }

  function appendPreviewLabeledText(section, label, value) {
    const title = document.createElement("p");
    title.className = "preview-table-title";
    title.textContent = label;
    section.append(title);
    appendPreviewText(section, value, "No response entered.");
  }

  function appendPreviewText(section, value, emptyText = "No response entered.") {
    const p = document.createElement("p");
    if (String(value).trim()) {
      p.textContent = String(value).trim();
    } else {
      p.className = "preview-empty";
      p.textContent = emptyText;
    }
    section.append(p);
  }

  function appendPreviewEmpty(section, text = "No response entered.") {
    const p = document.createElement("p");
    p.className = "preview-empty";
    p.textContent = text;
    section.append(p);
  }

  function appendPreviewTables(section, tables) {
    tables.forEach((table) => {
      if (table.title.trim()) {
        const title = document.createElement("p");
        title.className = "preview-table-title";
        title.textContent = table.title.trim();
        section.append(title);
      }
      section.append(makePreviewTable(table));
    });
  }

  function makePreviewTable(tableData, legacyRows = null) {
    if (Array.isArray(tableData)) {
      tableData = { headers: tableData, rows: legacyRows || [], groupedHeading: null };
    }
    const table = document.createElement("table");
    table.className = "preview-table";
    const thead = document.createElement("thead");

    if (tableData.groupedHeading) {
      normalizeGroupedHeading(tableData);
      const group = tableData.groupedHeading;
      const groupedRow = document.createElement("tr");
      groupedRow.className = "preview-grouped-heading-row";
      let col = 0;
      while (col < tableData.headers.length) {
        const th = document.createElement("th");
        if (col === group.start) {
          th.colSpan = group.span;
          th.textContent = group.label.trim() || " ";
          th.className = "preview-grouped-heading-cell";
          col += group.span;
        } else {
          th.textContent = " ";
          th.className = "preview-grouped-heading-empty";
          col += 1;
        }
        groupedRow.append(th);
      }
      thead.append(groupedRow);
    }

    const trh = document.createElement("tr");
    tableData.headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header || " ";
      trh.append(th);
    });
    thead.append(trh);
    const tbody = document.createElement("tbody");
    tableData.rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((cell) => {
        const td = document.createElement("td");
        td.textContent = cell || " ";
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    return table;
  }

  function buildPreviewMonitoring() {
    const box = document.createElement("div");
    box.className = "preview-monitoring";
    const heading = document.createElement("strong");
    heading.textContent = "Assessment activity summary";
    const note = document.createElement("p");
    note.textContent = "These indicators provide classroom context and should not be treated as proof of misconduct by themselves.";
    const grid = document.createElement("div");
    grid.className = "preview-monitoring-grid";
    [
      [state.blockedAttempts, "Blocked actions"],
      [state.leftPageCount, "Left notebook"],
      [state.focusExitCount, "Focus exits"],
      [state.inactiveCount, "Possible sleep / long inactive"]
    ].forEach(([count, label]) => {
      const div = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = String(count);
      const span = document.createElement("span");
      span.textContent = label;
      div.append(strong, span);
      grid.append(div);
    });
    box.append(heading, note, grid);
    return box;
  }

  function getActiveSections() {
    return SECTION_ORDER.filter(([key]) => state.activeSections.has(key));
  }

  async function generatePdf() {
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      showBlockedMessage("The PDF generator did not load. Keep this page open and check your internet connection before trying again.");
      return false;
    }

    try {
      const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait", compress: true });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 46;
      const usableWidth = pageWidth - margin * 2;
      let y = 42;

      doc.setFillColor(...COLORS.navy);
      doc.roundedRect(margin, y, usableWidth, 56, 7, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("SCIENCE LAB NOTEBOOK", margin + 16, y + 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Final laboratory report", margin + 16, y + 41);
      y += 72;

      doc.setTextColor(...COLORS.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      const titleLines = doc.splitTextToSize(els.experimentTitle.value.trim() || "Untitled Experiment", usableWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 17 + 10;

      doc.autoTable({
        startY: y,
        theme: "grid",
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: COLORS.ink, lineColor: COLORS.line, lineWidth: 0.5 },
        headStyles: { fillColor: COLORS.pale, textColor: COLORS.navy, fontStyle: "bold" },
        body: [
          ["Student", els.studentName.value || "—", "Teacher", els.teacher.value || "—"],
          ["Date", els.date.value || "—", "Time", els.time.value || "—"],
          ["Class Code", els.classCode.value || "—", "Programme", els.programme.value || "—"]
        ],
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 62 }, 2: { fontStyle: "bold", cellWidth: 70 } }
      });
      y = doc.lastAutoTable.finalY + 22;

      const active = getActiveSections();
      for (let index = 0; index < active.length; index += 1) {
        const [key, label] = active[index];
        y = ensurePdfSpace(doc, y, 54, pageHeight, margin);
        y = addPdfSectionHeading(doc, y, index + 1, label, margin, usableWidth);
        y = await addPdfSectionContent(doc, key, y, margin, usableWidth, pageHeight);
        y += 14;
      }

      y = ensurePdfSpace(doc, y, 120, pageHeight, margin);
      doc.setDrawColor(...COLORS.line);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;
      doc.setTextColor(...COLORS.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("ASSESSMENT ACTIVITY SUMMARY", margin, y);
      y += 8;
      doc.autoTable({
        startY: y,
        theme: "grid",
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", fontSize: 7.8, halign: "center", cellPadding: 4, lineColor: COLORS.line, lineWidth: 0.45 },
        head: [["Blocked actions", "Left notebook", "Focus exits", "Possible sleep / long inactive"]],
        body: [[state.blockedAttempts, state.leftPageCount, state.focusExitCount, state.inactiveCount]],
        headStyles: { fillColor: COLORS.pale, textColor: COLORS.navy, fontStyle: "bold" }
      });
      y = doc.lastAutoTable.finalY + 10;
      y = addPdfParagraph(doc, "Monitoring indicators provide classroom context and should not be treated as proof of misconduct by themselves.", y, margin, usableWidth, pageHeight, 7.5, COLORS.muted);
      const activityLines = buildActivityLines();
      if (activityLines.length) {
        y += 5;
        y = addPdfParagraph(doc, activityLines.join("\n"), y, margin, usableWidth, pageHeight, 7.2, COLORS.muted);
      }

      const pages = doc.getNumberOfPages();
      const watermarkText = getWatermarkText();
      for (let p = 1; p <= pages; p += 1) {
        doc.setPage(p);

        // Student-specific watermark: repeated across every preview/PDF page as a sharing deterrent.
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12.5);
        doc.setTextColor(230, 234, 240);
        const watermarkXs = [95, pageWidth / 2, pageWidth - 95];
        const watermarkYs = [125, 265, 405, 545, 685];
        watermarkYs.forEach((watermarkY, rowIndex) => {
          watermarkXs.forEach((watermarkX, columnIndex) => {
            const stagger = rowIndex % 2 ? 28 : 0;
            const x = Math.min(pageWidth - 68, watermarkX + (columnIndex === 0 ? stagger : columnIndex === 2 ? -stagger : 0));
            doc.text(watermarkText, x, watermarkY, { align: "center", angle: -28 });
          });
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(120, 132, 146);
        doc.text(watermarkText, margin, pageHeight - 24);
        doc.text(`Page ${p} of ${pages}`, pageWidth - margin, pageHeight - 24, { align: "right" });
      }

      const filename = `${safeFileName(els.studentName.value || "Student")}_${safeFileName(els.experimentTitle.value || "Science_Lab_Report")}.pdf`;
      state.authorizedUntil = Date.now() + 5000;
      doc.save(filename);
      setTimeout(() => { state.authorizedUntil = 0; }, 1500);
      return true;
    } catch (error) {
      console.error(error);
      showBlockedMessage("The PDF could not be generated. Keep this page open and try Preview Report again before retrying the download.");
      return false;
    }
  }

  function addPdfSectionHeading(doc, y, number, label, margin, usableWidth) {
    doc.setFillColor(...COLORS.navy);
    doc.circle(margin + 11, y + 2, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(toRoman(number), margin + 11, y + 5, { align: "center" });
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(12);
    doc.text(label, margin + 29, y + 6);
    doc.setDrawColor(...COLORS.line);
    doc.line(margin + 29, y + 12, margin + usableWidth, y + 12);
    return y + 27;
  }

  async function addPdfSectionContent(doc, key, y, margin, usableWidth, pageHeight) {
    const textMap = {
      researchQuestion: $("researchQuestion").value,
      backgroundInformation: $("backgroundInformation").value,
      hypothesis: $("hypothesis").value,
      conclusion: $("conclusion").value,
      evaluation: $("evaluation").value,
      improvements: $("improvements").value
    };

    if (Object.prototype.hasOwnProperty.call(textMap, key)) {
      return addPdfParagraph(doc, textMap[key] || "No response entered.", y, margin, usableWidth, pageHeight);
    }

    if (key === "variables") {
      y = addPdfSubheading(doc, "Independent Variable", y, margin);
      y = addPdfParagraph(doc, $("independentVariable").value || "No response entered.", y, margin, usableWidth, pageHeight);
      y += 6;
      y = addPdfSubheading(doc, "Dependent Variable", y, margin);
      y = addPdfParagraph(doc, $("dependentVariable").value || "No response entered.", y, margin, usableWidth, pageHeight);
      y += 8;
      y = addPdfSubheading(doc, "Controlled Variables", y, margin);
      const rows = state.controlledVariables.filter((row) => row.variable.trim() || row.control.trim());
      if (!rows.length) return addPdfParagraph(doc, "No controlled variables entered.", y, margin, usableWidth, pageHeight, 9, COLORS.muted);
      doc.autoTable({
        startY: y,
        theme: "grid",
        margin: { left: margin, right: margin },
        head: [["Factor", "Details"]],
        body: rows.map((row) => [row.variable, row.control]),
        styles: { font: "helvetica", fontSize: 8, cellPadding: 4, lineColor: COLORS.line, lineWidth: 0.45, textColor: COLORS.ink, overflow: "linebreak" },
        headStyles: { fillColor: [234, 247, 250], textColor: COLORS.navy, fontStyle: "bold" }
      });
      return doc.lastAutoTable.finalY + 4;
    }

    if (key === "materials" || key === "procedure") {
      const lines = $(key).value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return addPdfParagraph(doc, "No response entered.", y, margin, usableWidth, pageHeight, 9, COLORS.muted);
      for (const line of lines) {
        y = addPdfParagraph(doc, line, y, margin, usableWidth, pageHeight, 9.2, COLORS.ink, 4);
        y += 3;
      }
      return y;
    }

    if (key === "rawData") {
      return addPdfTables(doc, state.tables.rawData, y, margin, usableWidth, pageHeight);
    }

    if (key === "processedData") {
      y = addPdfSubheading(doc, "Description of Calculation", y, margin);
      y = addPdfParagraph(doc, $("calculationDescription").value || "No response entered.", y, margin, usableWidth, pageHeight);
      y += 7;
      y = addPdfSubheading(doc, "Sample Calculation", y, margin);
      y = addPdfParagraph(doc, $("sampleCalculation").value || "No response entered.", y, margin, usableWidth, pageHeight);
      if (state.calculationImage?.dataUrl) {
        y += 7;
        y = addPdfImage(doc, state.calculationImage.dataUrl, y, margin, usableWidth, pageHeight, "Handwritten sample calculation");
      }
      y += 8;
      y = await addPdfTables(doc, state.tables.processedData, y, margin, usableWidth, pageHeight);
      for (let i = 0; i < state.figures.length; i += 1) {
        const figure = state.figures[i];
        if (!figure.dataUrl && !figure.title.trim() && !figure.description.trim()) continue;
        y += 8;
        y = addPdfSubheading(doc, figure.title.trim() || `Figure ${i + 1}`, y, margin);
        if (figure.dataUrl) y = addPdfImage(doc, figure.dataUrl, y, margin, usableWidth, pageHeight, figure.title || `Figure ${i + 1}`);
        if (figure.description.trim()) y = addPdfParagraph(doc, figure.description, y + 4, margin, usableWidth, pageHeight, 8.8);
      }
      return y;
    }

    if (key === "references") {
      const references = state.references.map((reference) => reference.text.trim()).filter(Boolean);
      if (!references.length) return addPdfParagraph(doc, "No references entered.", y, margin, usableWidth, pageHeight, 9, COLORS.muted);
      for (const reference of references) {
        y = addPdfParagraph(doc, reference, y, margin + 16, usableWidth - 16, pageHeight, 8.8, COLORS.ink, 4);
        y += 5;
      }
      return y;
    }

    return y;
  }

  function addPdfTables(doc, tables, y, margin, usableWidth, pageHeight) {
    tables.forEach((table) => {
      y = ensurePdfSpace(doc, y, table.title.trim() ? 52 : 43, pageHeight, margin);
      if (table.title.trim()) {
        doc.setTextColor(...COLORS.ink);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.2);
        doc.text(table.title.trim(), margin, y);
        y += 7;
      }
      const colCount = table.headers.length;
      const fontSize = Math.max(6.2, 8.4 - Math.max(0, colCount - 5) * 0.45);
      const headRows = [];
      if (table.groupedHeading) {
        normalizeGroupedHeading(table);
        const group = table.groupedHeading;
        const groupedRow = [];
        let col = 0;
        while (col < table.headers.length) {
          if (col === group.start) {
            groupedRow.push({
              content: group.label.trim() || " ",
              colSpan: group.span,
              styles: { halign: "center", fontStyle: "bold" }
            });
            col += group.span;
          } else {
            groupedRow.push(" ");
            col += 1;
          }
        }
        headRows.push(groupedRow);
      }
      headRows.push(table.headers.map((header) => header || " "));
      doc.autoTable({
        startY: y,
        theme: "grid",
        margin: { left: margin, right: margin },
        head: headRows,
        body: table.rows.map((row) => row.map((cell) => cell || " ")),
        styles: { font: "helvetica", fontSize, cellPadding: 3.2, lineColor: [135, 155, 175], lineWidth: 0.45, textColor: COLORS.ink, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: [234, 247, 250], textColor: COLORS.navy, fontStyle: "bold", halign: "center" },
        tableWidth: usableWidth
      });
      y = doc.lastAutoTable.finalY + 13;
    });
    return y;
  }

  function addPdfSubheading(doc, text, y, margin) {
    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(text, margin, y);
    return y + 12;
  }

  function addPdfParagraph(doc, text, y, x, width, pageHeight, fontSize = 9.4, color = COLORS.ink, extraLeading = 2) {
    const marginBottom = 44;
    doc.setTextColor(...color);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const lineHeight = fontSize + extraLeading;
    const paragraphs = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
    for (let p = 0; p < paragraphs.length; p += 1) {
      const paragraph = paragraphs[p] || " ";
      const lines = doc.splitTextToSize(paragraph, width);
      for (const line of lines) {
        if (y + lineHeight > pageHeight - marginBottom) {
          doc.addPage();
          y = 48;
        }
        doc.text(line, x, y);
        y += lineHeight;
      }
      if (p < paragraphs.length - 1) y += 3;
    }
    return y;
  }

  function addPdfImage(doc, dataUrl, y, margin, usableWidth, pageHeight, label) {
    const imgProps = doc.getImageProperties(dataUrl);
    const maxWidth = usableWidth;
    const maxHeight = 360;
    const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height, 1);
    const width = imgProps.width * ratio;
    const height = imgProps.height * ratio;
    if (y + height + 16 > pageHeight - 44) {
      doc.addPage();
      y = 48;
    }
    const x = margin + (usableWidth - width) / 2;
    doc.addImage(dataUrl, "JPEG", x, y, width, height, undefined, "FAST");
    y += height + 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(label, margin, y);
    return y + 8;
  }

  function ensurePdfSpace(doc, y, needed, pageHeight, margin) {
    if (y + needed <= pageHeight - margin) return y;
    doc.addPage();
    return 48;
  }

  function buildActivityLines() {
    const lines = [];
    state.blockedEvents.slice(0, 12).forEach((event) => lines.push(`Blocked: ${event.action} — ${formatTime(event.at)}`));
    state.focusLossEvents.slice(0, 12).forEach((event) => lines.push(`Left notebook: ${humanFocusReason(event.reason)} — ${formatTime(event.at)}`));
    state.focusExitEvents.slice(0, 12).forEach((event) => lines.push(`Focus Mode exit — ${formatTime(event.at)}`));
    state.inactiveEvents.slice(0, 8).forEach((event) => lines.push(`Possible sleep / long inactive — ${formatTime(event.at)} (${formatDuration(event.durationMs)})`));
    const totalEvents = state.blockedEvents.length + state.focusLossEvents.length + state.focusExitEvents.length + state.inactiveEvents.length;
    if (totalEvents > lines.length) lines.push(`Additional activity events not listed: ${totalEvents - lines.length}`);
    return lines;
  }

  function humanFocusReason(reason) {
    return reason === "window-blur" ? "Window/app switch" : "Tab/page hidden";
  }

  function formatTime(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(date);
  }

  function formatDuration(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  function safeFileName(value) {
    return String(value || "Science_Lab_Report")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 70) || "Science_Lab_Report";
  }

  function lockSubmittedReport() {
    state.submitted = true;
    state.submittedAt = new Date().toISOString();
    state.dirty = false;
    els.reportFields.disabled = true;
    [els.experimentTitle, els.teacher, els.studentName, els.classCode, els.programme].forEach((field) => { field.disabled = true; });
    els.focusModeButton.disabled = true;
    releaseWakeLock();
    els.documentStatus.textContent = "SUBMITTED";
    els.documentStatus.className = "status-chip submitted";
    els.saveStatus.textContent = "Submitted — PDF downloaded";
    els.downloadFinal.textContent = "Download Submitted Report ↓";
    els.previewReport.disabled = false;
    els.startNewReport.hidden = false;
    renderOutline();
    renderControlledVariables();
    renderTableEditor("rawData");
    renderTableEditor("processedData");
    renderCalculationImage();
    renderFigures();
    renderReferences();
  }
})();
