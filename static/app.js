// Global state variables
let currentSeriesData = {
  dates: [],
  values: [],
  name: "Airline Passengers"
};

let activeDatasetSource = "presets"; // 'presets', 'upload' or 'finance'
let uploadSeriesData = null; // Stores parsed upload data
let financeSeriesData = null; // Stores parsed finance ticker data
let forecastResults = null;
let chartInstance = null;

// DOM Elements
const docElements = {
  presetsTabBtn: document.getElementById("tab-presets-btn"),
  financeTabBtn: document.getElementById("tab-finance-btn"),
  uploadTabBtn: document.getElementById("tab-upload-btn"),
  presetsPane: document.getElementById("pane-presets"),
  financePane: document.getElementById("pane-finance"),
  uploadPane: document.getElementById("pane-upload"),
  presetSelect: document.getElementById("dataset-preset"),
  loadPresetBtn: document.getElementById("load-preset-btn"),
  fetchTickerBtn: document.getElementById("fetch-ticker-btn"),
  tickerInput: document.getElementById("ticker-input"),
  tickerSuggestionsList: document.getElementById("ticker-suggestions-list"),
  dragDropArea: document.getElementById("drag-drop-area"),
  fileInput: document.getElementById("file-input"),
  fileInfoContainer: document.getElementById("file-info-container"),
  fileNameText: document.getElementById("preview-file-name"),
  fileLenText: document.getElementById("preview-file-len"),
  fileFreqText: document.getElementById("preview-file-freq"),
  colDateText: document.getElementById("preview-col-date"),
  colValText: document.getElementById("preview-col-val"),
  
  contextLenSlider: document.getElementById("param-context-len"),
  horizonLenSlider: document.getElementById("param-horizon-len"),
  contextLenVal: document.getElementById("val-context-len"),
  horizonLenVal: document.getElementById("val-horizon-len"),
  forceSimCheckbox: document.getElementById("param-force-sim"),
  paramsForm: document.getElementById("forecast-params-form"),
  forecastSubmitBtn: document.getElementById("forecast-submit-btn"),
  
  exportCsvBtn: document.getElementById("export-csv-btn"),
  exportPngBtn: document.getElementById("export-png-btn"),
  loadingSpinner: document.getElementById("loading-spinner"),
  chartPlaceholder: document.getElementById("chart-placeholder"),
  chartCanvas: document.getElementById("forecast-chart"),
  
  metricHistoryLen: document.getElementById("metric-history-len"),
  metricHistoryMean: document.getElementById("metric-history-mean"),
  metricHistoryStd: document.getElementById("metric-history-std"),
  metricTrendType: document.getElementById("metric-trend-type"),
  metricForecastPeak: document.getElementById("metric-forecast-peak"),
  metricForecastTrough: document.getElementById("metric-forecast-trough"),
  
  statusBar: document.getElementById("engine-status-bar"),
  openConfigBtn: document.getElementById("open-config-btn"),
  configDialog: document.getElementById("config-dialog"),
  closeConfigBtn: document.getElementById("close-config-btn"),
  cancelConfigBtn: document.getElementById("cancel-config-btn"),
  configForm: document.getElementById("config-model-form"),
  configCheckpointInput: document.getElementById("config-checkpoint"),
  configBackendSelect: document.getElementById("config-backend"),
  dialogAlert: document.getElementById("dialog-status-alert"),
  toastContainer: document.getElementById("toast-container")
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkBackendStatus();
  loadSelectedPreset(); // Load default preset on startup
});

// -------------------------------------------------------------
// Toast Notifications Helper
// -------------------------------------------------------------
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "";
  if (type === "success") icon = "&check;";
  else if (type === "error") icon = "&times;";
  else if (type === "warning") icon = "&#9888;";
  else icon = "&#8505;";
  
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  docElements.toastContainer.appendChild(toast);
  
  // Slide out and remove
  setTimeout(() => {
    toast.style.animation = "slide-in 0.3s ease reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -------------------------------------------------------------
// API & Backend Status Checks
// -------------------------------------------------------------
async function checkBackendStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error("Error fetching API status");
    const data = await res.json();
    updateStatusUI(data);
  } catch (err) {
    console.error("Backend offline:", err);
    updateStatusUI({ timesfm_installed: false, error_message: "Servidor desconectado" });
  }
}

function updateStatusUI(status) {
  const dot = docElements.statusBar.querySelector(".status-dot");
  const text = docElements.statusBar.querySelector(".status-text");
  
  // Reset classes
  dot.className = "status-dot";
  
  if (status.timesfm_installed) {
    if (status.model_loaded) {
      dot.classList.add("pulse-green");
      text.textContent = `TimesFM Activo (${status.current_checkpoint.split('/').pop()} | ${status.backend.toUpperCase()})`;
      docElements.dialogAlert.className = "dialog-alert success";
      docElements.dialogAlert.innerHTML = `<p><strong>TimesFM listo.</strong> Modelo cargado: <code>${status.current_checkpoint}</code> en ${status.backend.toUpperCase()}.</p>`;
    } else {
      dot.classList.add("pulse-yellow");
      text.textContent = "TimesFM Disponible (Modelo sin cargar)";
      docElements.dialogAlert.className = "dialog-alert warning";
      docElements.dialogAlert.innerHTML = `<p><strong>TimesFM instalado.</strong> Por favor carga un modelo en los ajustes de abajo.</p>`;
    }
  } else {
    dot.classList.add("pulse-red");
    text.textContent = "Modo Simulación Activo";
    docElements.dialogAlert.className = "dialog-alert error";
    docElements.dialogAlert.innerHTML = `<p><strong>TimesFM no detectado.</strong> El servidor funcionará en modo simulación estadística avanzada.</p>`;
  }
}

// -------------------------------------------------------------
// Navigation Tabs (Presets vs Uploads)
// -------------------------------------------------------------
function setupEventListeners() {
  docElements.presetsTabBtn.addEventListener("click", () => {
    docElements.presetsTabBtn.classList.add("active");
    docElements.financeTabBtn.classList.remove("active");
    docElements.uploadTabBtn.classList.remove("active");
    docElements.presetsPane.classList.add("active");
    docElements.financePane.classList.remove("active");
    docElements.uploadPane.classList.remove("active");
    activeDatasetSource = "presets";
    loadSelectedPreset();
  });

  docElements.financeTabBtn.addEventListener("click", () => {
    docElements.financeTabBtn.classList.add("active");
    docElements.presetsTabBtn.classList.remove("active");
    docElements.uploadTabBtn.classList.remove("active");
    docElements.financePane.classList.add("active");
    docElements.presetsPane.classList.remove("active");
    docElements.uploadPane.classList.remove("active");
    activeDatasetSource = "finance";
    if (financeSeriesData) {
      currentSeriesData = { ...financeSeriesData };
      syncSlidersToData(currentSeriesData.values.length);
      runForecastPipeline();
    } else {
      // Trigger a default load (e.g. BTC-USD)
      docElements.tickerInput.value = "BTC-USD";
      fetchFinancialTicker();
    }
  });

  docElements.uploadTabBtn.addEventListener("click", () => {
    docElements.uploadTabBtn.classList.add("active");
    docElements.presetsTabBtn.classList.remove("active");
    docElements.financeTabBtn.classList.remove("active");
    docElements.uploadPane.classList.add("active");
    docElements.presetsPane.classList.remove("active");
    docElements.financePane.classList.remove("active");
    activeDatasetSource = "upload";
    if (uploadSeriesData) {
      currentSeriesData = { ...uploadSeriesData };
      syncSlidersToData(currentSeriesData.values.length);
      runForecastPipeline();
    }
  });

  // Category switch listener (radios)
  const categoryRadios = document.getElementsByName("finance-category");
  categoryRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      updateTickerSuggestions(e.target.value);
    });
  });

  // Fetch Ticker Button
  docElements.fetchTickerBtn.addEventListener("click", fetchFinancialTicker);

  // Load Preset Button
  docElements.loadPresetBtn.addEventListener("click", loadSelectedPreset);

  // Sync range slider display values
  docElements.contextLenSlider.addEventListener("input", (e) => {
    docElements.contextLenVal.textContent = e.target.value;
  });
  docElements.horizonLenSlider.addEventListener("input", (e) => {
    docElements.horizonLenVal.textContent = e.target.value;
  });

  // Drag & Drop File Handlers
  const dragArea = docElements.dragDropArea;
  
  dragArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dragArea.classList.add("dragover");
  });

  dragArea.addEventListener("dragleave", () => {
    dragArea.classList.remove("dragover");
  });

  dragArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dragArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  });

  dragArea.addEventListener("click", () => {
    docElements.fileInput.click();
  });

  docElements.fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelected(file);
  });

  // Forecasting Parameters Form Submit
  docElements.paramsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    runForecastPipeline();
  });

  // Modal Settings Config Dialog
  docElements.openConfigBtn.addEventListener("click", () => {
    checkBackendStatus();
    docElements.configDialog.showModal();
  });
  
  const closeConfig = () => docElements.configDialog.close();
  docElements.closeConfigBtn.addEventListener("click", closeConfig);
  docElements.cancelConfigBtn.addEventListener("click", closeConfig);
  
  docElements.configForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const checkpoint = docElements.configCheckpointInput.value;
    const backend = docElements.configBackendSelect.value;
    
    showToast("Cargando modelo. Puede tomar unos minutos la primera vez...", "info");
    docElements.configDialog.close();
    
    try {
      const res = await fetch("/api/load-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkpoint_path: checkpoint,
          backend: backend,
          context_len: parseInt(docElements.contextLenSlider.value),
          horizon_len: parseInt(docElements.horizonLenSlider.value)
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast("Modelo cargado exitosamente en el servidor", "success");
        checkBackendStatus();
      } else {
        throw new Error(data.detail || "Error cargando modelo");
      }
    } catch (err) {
      showToast(`Error al cargar: ${err.message}`, "error");
      checkBackendStatus();
    }
  });

  // Export Buttons
  docElements.exportCsvBtn.addEventListener("click", exportResultsToCSV);
  docElements.exportPngBtn.addEventListener("click", exportChartToPNG);
}

// -------------------------------------------------------------
// Financial Market Data Fetcher & Suggestions
// -------------------------------------------------------------
const tickerSuggestions = {
  crypto: [
    { value: "BTC-USD", text: "Bitcoin (USD)" },
    { value: "ETH-USD", text: "Ethereum (USD)" },
    { value: "SOL-USD", text: "Solana (USD)" },
    { value: "BNB-USD", text: "Binance Coin (USD)" },
    { value: "DOGE-USD", text: "Dogecoin (USD)" },
    { value: "XRP-USD", text: "Ripple (USD)" }
  ],
  stock: [
    { value: "AAPL", text: "Apple Inc." },
    { value: "MSFT", text: "Microsoft Corp." },
    { value: "TSLA", text: "Tesla Inc." },
    { value: "NVDA", text: "NVIDIA Corp." },
    { value: "AMZN", text: "Amazon.com Inc." },
    { value: "GOOGL", text: "Alphabet/Google" },
    { value: "META", text: "Meta Platforms" },
    { value: "MELI", text: "MercadoLibre Inc." }
  ],
  commodity: [
    { value: "GC=F", text: "Oro (Gold Futures)" },
    { value: "CL=F", text: "Petróleo Crudo (Crude Oil Futures)" },
    { value: "SI=F", text: "Plata (Silver Futures)" },
    { value: "HG=F", text: "Cobre (Copper Futures)" },
    { value: "NG=F", text: "Gas Natural (Natural Gas)" }
  ]
};

function updateTickerSuggestions(category) {
  const datalist = docElements.tickerSuggestionsList;
  const input = docElements.tickerInput;
  
  // Clear datalist
  datalist.innerHTML = "";
  
  // Get suggestions for category
  const suggestions = tickerSuggestions[category] || [];
  suggestions.forEach(item => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.text;
    datalist.appendChild(option);
  });
  
  // Set default placeholder and first value
  if (suggestions.length > 0) {
    input.placeholder = `ej. ${suggestions[0].value}`;
    input.value = suggestions[0].value;
  }
}

async function fetchFinancialTicker() {
  const ticker = docElements.tickerInput.value.trim().toUpperCase();
  const categoryEl = document.querySelector('input[name="finance-category"]:checked');
  const category = categoryEl ? categoryEl.value : "crypto";
  
  if (!ticker) {
    showToast("Por favor ingresa un ticker válido.", "warning");
    return;
  }
  
  docElements.fetchTickerBtn.disabled = true;
  showToast(`Descargando datos para ${ticker}...`, "info");
  
  try {
    const res = await fetch("/api/fetch-ticker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, category })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error al descargar el ticker");
    
    // Store data in finance state variable
    financeSeriesData = {
      dates: data.dates,
      values: data.values,
      name: `${data.ticker} (${getCategoryLabel(data.category)})`
    };
    
    // Set as active series
    currentSeriesData = { ...financeSeriesData };
    
    // Sync sliders
    syncSlidersToData(data.values.length);
    
    // Clear preview box
    docElements.fileInfoContainer.style.display = "none";
    
    showToast(`Datos cargados para ${data.ticker} (${data.length} puntos)`, "success");
    
    // Immediately forecast
    runForecastPipeline();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    docElements.fetchTickerBtn.disabled = false;
  }
}

function getCategoryLabel(category) {
  if (category === "crypto") return "Cripto";
  if (category === "stock") return "Acción";
  if (category === "commodity") return "Commodity";
  return category;
}

// -------------------------------------------------------------
// Preset Data Generators (Local Generation)
// -------------------------------------------------------------
function loadSelectedPreset() {
  const selected = docElements.presetSelect.value;
  let dates = [];
  let values = [];
  let name = "";
  
  if (selected === "airline") {
    name = "Pasajeros de Aerolíneas (Mensual)";
    // Generate 12 years (144 months) of airline乘客 pattern: trend + seasonal wave + noise
    let val = 112.0;
    const startDate = new Date(2014, 0, 1);
    for (let i = 0; i < 144; i++) {
      const date = new Date(startDate);
      date.setMonth(startDate.getMonth() + i);
      dates.push(date.toISOString().split("T")[0]);
      
      // Box-Jenkins-like shape
      const trend = i * 2.4;
      const seasonal = 28 * Math.sin((2 * Math.PI * (i % 12)) / 12) + 12 * Math.cos((4 * Math.PI * (i % 12)) / 12);
      const noise = (Math.random() - 0.5) * 8;
      values.push(Math.round(val + trend + seasonal + noise));
    }
  } else if (selected === "stock") {
    name = "Precio Acción Tecnológica (Diario)";
    // Random walk with positive drift
    let val = 150.0;
    const startDate = new Date(2025, 0, 1);
    for (let i = 0; i < 300; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
      
      const change = (Math.random() - 0.47) * 4.5; // slight positive bias (drift)
      val += change;
      if (val < 10) val = 10;
      values.push(parseFloat(val.toFixed(2)));
    }
  } else if (selected === "temp") {
    name = "Temperatura Ciudad (Horario)";
    // 7 Days (168 Hours) of temperature
    const startDate = new Date(2026, 5, 1, 0, 0, 0);
    for (let i = 0; i < 168; i++) {
      const date = new Date(startDate);
      date.setHours(startDate.getHours() + i);
      dates.push(date.toISOString().replace("T", " ").substring(0, 19));
      
      const dailyCycle = 8 * Math.sin((2 * Math.PI * (i % 24 - 6)) / 24); // peak at 2 PM (14h)
      const weeklyCycle = 2 * Math.sin((2 * Math.PI * i) / 168);
      const base = 21.0;
      const noise = (Math.random() - 0.5) * 1.5;
      values.push(parseFloat((base + dailyCycle + weeklyCycle + noise).toFixed(1)));
    }
  } else if (selected === "sine") {
    name = "Onda Senoidal Teórica";
    for (let i = 0; i < 180; i++) {
      dates.push(`T-${180 - i}`);
      const val = 10 * Math.sin((2 * Math.PI * i) / 30);
      values.push(parseFloat(val.toFixed(4)));
    }
  }
  
  currentSeriesData = { dates, values, name };
  syncSlidersToData(values.length);
  runForecastPipeline();
}

function syncSlidersToData(length) {
  // Set context max and default
  const defaultContext = Math.min(length, 512);
  docElements.contextLenSlider.max = length;
  docElements.contextLenSlider.value = defaultContext;
  docElements.contextLenVal.textContent = defaultContext;
  
  // Set horizon max and default
  const defaultHorizon = Math.max(5, Math.min(Math.round(length / 4), 128));
  docElements.horizonLenSlider.max = Math.max(100, Math.round(length));
  docElements.horizonLenSlider.value = defaultHorizon;
  docElements.horizonLenVal.textContent = defaultHorizon;
}

// -------------------------------------------------------------
// File Upload Handler
// -------------------------------------------------------------
async function handleFileSelected(file) {
  const formData = new FormData();
  formData.append("file", file);
  
  showToast("Subiendo y analizando archivo...", "info");
  
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error al procesar el archivo");
    
    // Store upload data
    uploadSeriesData = {
      dates: data.dates,
      values: data.values,
      name: data.filename
    };
    
    // Display file stats
    docElements.fileNameText.textContent = data.filename;
    docElements.fileLenText.textContent = `${data.length} puntos`;
    docElements.fileFreqText.textContent = `Frecuencia: ${data.frequency}`;
    docElements.colDateText.textContent = data.date_column;
    docElements.colValText.textContent = data.value_column;
    docElements.fileInfoContainer.style.display = "block";
    
    showToast("Archivo importado correctamente", "success");
    
    // Switch to upload source if active
    if (activeDatasetSource === "upload") {
      currentSeriesData = { ...uploadSeriesData };
      syncSlidersToData(data.length);
      runForecastPipeline();
    }
  } catch (err) {
    showToast(err.message, "error");
    docElements.fileInfoContainer.style.display = "none";
  }
}

// -------------------------------------------------------------
// Forecasting Pipeline Trigger
// -------------------------------------------------------------
async function runForecastPipeline() {
  if (currentSeriesData.values.length === 0) {
    showToast("No hay datos disponibles para predecir.", "warning");
    return;
  }
  
  // Show spinner overlay
  docElements.loadingSpinner.classList.add("active");
  docElements.chartPlaceholder.style.display = "none";
  docElements.exportCsvBtn.disabled = true;
  docElements.exportPngBtn.disabled = true;
  
  const contextLen = parseInt(docElements.contextLenSlider.value);
  const horizonLen = parseInt(docElements.horizonLenSlider.value);
  const forceSim = docElements.forceSimCheckbox.checked;
  
  // Gather quantiles
  const checkedQuantiles = Array.from(document.querySelectorAll('.quantiles-fieldset input[type="checkbox"]:checked'))
                                .map(el => parseFloat(el.value));
                                
  // Ensure we include standard quantiles for shading bounds
  if (!checkedQuantiles.includes(0.1)) checkedQuantiles.push(0.1);
  if (!checkedQuantiles.includes(0.9)) checkedQuantiles.push(0.9);
  
  // We slice the history array to match the requested Context Length.
  // TimesFM forecasts are based on the latest context_len points.
  const historyValues = currentSeriesData.values;
  const historySlice = historyValues.slice(-contextLen);
  
  try {
    const res = await fetch("/api/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: historySlice,
        horizon_len: horizonLen,
        quantiles: checkedQuantiles,
        force_simulation: forceSim
      })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error en el servidor");
    
    forecastResults = data;
    
    // Plot
    plotForecast(currentSeriesData, data, contextLen, horizonLen);
    
    // Update metrics UI
    updateMetricsUI(currentSeriesData.values, data);
    
    // Enable exports
    docElements.exportCsvBtn.disabled = false;
    docElements.exportPngBtn.disabled = false;
    
    if (data.engine === "timesfm") {
      showToast("Predicción completada por el motor neural TimesFM", "success");
    } else {
      showToast("Predicción completada por el motor de Simulación Estadística", "info");
    }
  } catch (err) {
    showToast(`Error al pronosticar: ${err.message}`, "error");
    docElements.chartPlaceholder.style.display = "flex";
  } finally {
    docElements.loadingSpinner.classList.remove("active");
  }
}

// -------------------------------------------------------------
// Metric Calculator & UI Updater
// -------------------------------------------------------------
function updateMetricsUI(history, forecast) {
  const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
  const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
  const std = Math.sqrt(variance);
  
  docElements.metricHistoryLen.textContent = history.length;
  docElements.metricHistoryMean.textContent = mean.toFixed(2);
  docElements.metricHistoryStd.textContent = std.toFixed(2);
  
  // Check trend direction
  let trendStr = "Estable";
  if (history.length > 10) {
    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));
    const diff = (secondHalf.reduce((s,v) => s+v, 0)/secondHalf.length) - (firstHalf.reduce((s,v) => s+v, 0)/firstHalf.length);
    if (diff > std * 0.15) trendStr = "Ascendente ↗";
    else if (diff < -std * 0.15) trendStr = "Descendente ↘";
  }
  docElements.metricTrendType.textContent = trendStr;
  
  // Forecast peak & trough
  const pf = forecast.point_forecast;
  const peak = Math.max(...pf);
  const trough = Math.min(...pf);
  docElements.metricForecastPeak.textContent = peak.toFixed(2);
  docElements.metricForecastTrough.textContent = trough.toFixed(2);
}

// -------------------------------------------------------------
// Chart.js Visualization Plotting
// -------------------------------------------------------------
function plotForecast(historyData, forecastData, contextLen, horizonLen) {
  const ctx = docElements.chartCanvas.getContext("2d");
  
  const historyVals = historyData.values;
  const historyDates = historyData.dates;
  
  const pointForecast = forecastData.point_forecast;
  
  // Prepare combined labels list (x-axis)
  // Determine if dates are actual calendar dates or just indices
  const isIndexLabel = historyDates[0] && historyDates[0].startsWith("T-");
  const labels = [...historyDates];
  
  // Add future labels
  let lastDateStr = historyDates[historyDates.length - 1];
  for (let i = 1; i <= horizonLen; i++) {
    if (isIndexLabel) {
      labels.push(`F+${i}`);
    } else {
      // Parse last date and add appropriate increment based on length
      try {
        const lastDate = new Date(lastDateStr);
        if (historyData.name.includes("Mensual") || historyVals.length === 144) {
          lastDate.setMonth(lastDate.getMonth() + 1);
        } else if (historyData.name.includes("Horario") || historyVals.length === 168) {
          lastDate.setHours(lastDate.getHours() + 1);
        } else {
          // Default daily step
          lastDate.setDate(lastDate.getDate() + 1);
        }
        
        let dateString = "";
        if (historyData.name.includes("Horario")) {
          dateString = lastDate.toISOString().replace("T", " ").substring(0, 19);
        } else {
          dateString = lastDate.toISOString().split("T")[0];
        }
        labels.push(dateString);
        lastDateStr = dateString;
      } catch (e) {
        labels.push(`Futuro +${i}`);
      }
    }
  }
  
  // Align history data points on graph (fill with nulls in forecast region)
  const historyDataset = [...historyVals];
  
  // Align forecast series (nulls in history region except the last point of history
  // which acts as the connector point for a smooth continuous visual line)
  const forecastDataset = Array(historyVals.length - 1).fill(null);
  forecastDataset.push(historyVals[historyVals.length - 1]); // Connect line
  forecastDataset.push(...pointForecast);
  
  // Confidence Interval Datasets (10% and 90% quantiles)
  // Ensure we connect it to the last history point as well
  const q10 = forecastData.quantiles["0.1"] || forecastData.quantiles["0.2"] || [];
  const q90 = forecastData.quantiles["0.9"] || forecastData.quantiles["0.8"] || [];
  
  const q10Dataset = Array(historyVals.length - 1).fill(null);
  q10Dataset.push(historyVals[historyVals.length - 1]);
  q10Dataset.push(...q10);
  
  const q90Dataset = Array(historyVals.length - 1).fill(null);
  q90Dataset.push(historyVals[historyVals.length - 1]);
  q90Dataset.push(...q90);
  
  // Render Chart
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Histórico Real",
          data: historyDataset,
          borderColor: "hsl(263, 80%, 65%)",
          backgroundColor: "rgba(140, 99, 242, 0.05)",
          borderWidth: 2,
          pointRadius: historyVals.length > 200 ? 0 : 2.5,
          pointHoverRadius: 5,
          tension: 0.15,
          fill: true
        },
        {
          label: "Pronóstico (TimesFM)",
          data: forecastDataset,
          borderColor: "hsl(34, 95%, 55%)",
          borderDash: [5, 4],
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.15
        },
        {
          label: "Límite Inferior (10%)",
          data: q10Dataset,
          borderColor: "hsla(34, 95%, 55%, 0.25)",
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.15,
          fill: false
        },
        {
          label: "Límite Superior (90%)",
          data: q90Dataset,
          borderColor: "hsla(34, 95%, 55%, 0.25)",
          backgroundColor: "rgba(255, 165, 0, 0.08)", // Shaded prediction interval
          borderWidth: 1,
          pointRadius: 0,
          tension: 0.15,
          fill: "-1" // Fill down to the Límite Inferior dataset
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: "#8c92a4",
            font: { family: "Inter", size: 11 }
          }
        },
        tooltip: {
          backgroundColor: "hsl(222, 20%, 12%)",
          titleColor: "#fff",
          bodyColor: "#ccc",
          borderColor: "hsla(222, 20%, 25%, 0.5)",
          borderWidth: 1,
          titleFont: { family: "Outfit", weight: "bold" },
          bodyFont: { family: "Inter" }
        }
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.06)"
          },
          ticks: {
            color: "#8c92a4",
            maxTicksLimit: 12,
            font: { family: "Inter", size: 10 }
          }
        },
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.06)"
          },
          ticks: {
            color: "#8c92a4",
            font: { family: "Inter", size: 10 }
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// Export Functions
// -------------------------------------------------------------
function exportResultsToCSV() {
  if (!forecastResults || !currentSeriesData.values.length) return;
  
  const history = currentSeriesData.values;
  const dates = currentSeriesData.dates;
  const pf = forecastResults.point_forecast;
  
  const q10 = forecastResults.quantiles["0.1"] || forecastResults.quantiles["0.2"] || [];
  const q90 = forecastResults.quantiles["0.9"] || forecastResults.quantiles["0.8"] || [];
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Index,Timestamp,Actual_Value,Forecast_Point,Quantile_10,Quantile_90\n";
  
  // Fill History rows
  dates.forEach((date, i) => {
    csvContent += `${i},"${date}",${history[i]},,, \n`;
  });
  
  // Fill Forecast rows
  const offset = dates.length;
  pf.forEach((val, i) => {
    const q10Val = q10[i] !== undefined ? q10[i].toFixed(4) : "";
    const q90Val = q90[i] !== undefined ? q90[i].toFixed(4) : "";
    csvContent += `${offset + i},Future_Step_${i + 1},,${val.toFixed(4)},${q10Val},${q90Val}\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `timesfm_forecast_${currentSeriesData.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Archivo CSV descargado", "success");
}

function exportChartToPNG() {
  if (!chartInstance) return;
  const link = document.createElement("a");
  link.download = `timesfm_chart_${currentSeriesData.name.replace(/\s+/g, '_')}.png`;
  link.href = chartInstance.toBase64Image();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Imagen del gráfico guardada", "success");
}
