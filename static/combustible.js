// State and Constants for Fuel Calculator
const VEHICLES = {
  moto: { tank: 3.2, economy: 110, title: "Motocicleta", desc: "Ej: Shineray 150cc", icon: "🏍️" },
  sedan: { tank: 11.0, economy: 42, title: "Sedán Compacto", desc: "Ej: Chevrolet Sail 1.5", icon: "🚗" },
  suv: { tank: 14.3, economy: 32, title: "SUV Mediano", desc: "Ej: Kia Sportage 2.0", icon: "🚙" },
  pickup: { tank: 19.3, economy: 25, title: "Camioneta / Pickup", desc: "Ej: Chevrolet D-Max 2.4", icon: "🛻" }
};

// Comprehensive Real-world models database sold in Ecuador since 1990
const MODELS_DB = {
  chevrolet: {
    spark: { name: "Spark / Spark GT (1.0L - 1.2L)", start: 2005, end: 2024, tank: 9.2, economy: 52 },
    corsa: { name: "Corsa Wind / Evolution (1.4L - 1.8L)", start: 1996, end: 2008, tank: 12.0, economy: 38 },
    aveo: { name: "Aveo Family / Activo / Emotion (1.5L - 1.6L)", start: 2005, end: 2024, tank: 11.9, economy: 36 },
    sail: { name: "Sail Sedán (1.4L - 1.5L)", start: 2011, end: 2026, tank: 11.0, economy: 42 },
    onix: { name: "Onix / Onix Turbo (1.0T - 1.4L)", start: 2020, end: 2026, tank: 11.6, economy: 46 },
    vitara: { name: "Vitara Clásico / Grand Vitara / SZ (1.6L - 2.0L)", start: 1990, end: 2022, tank: 14.5, economy: 32 },
    tracker: { name: "Tracker SUV Compacto (1.2T - 1.8L)", start: 2013, end: 2026, tank: 13.7, economy: 35 },
    captiva: { name: "Captiva / Captiva Sport (1.5T - 2.4L)", start: 2008, end: 2026, tank: 13.7, economy: 33 },
    dmax: { name: "Luv / D-Max Camioneta (2.4L - 2.5L Gasolina)", start: 1990, end: 2026, tank: 19.3, economy: 28 },
    sanremo: { name: "San Remo / Monza Sedán (1.6L - 2.0L)", start: 1990, end: 1998, tank: 12.5, economy: 32 },
    groove: { name: "Groove SUV Compacto (1.5L)", start: 2021, end: 2026, tank: 11.9, economy: 38 },
    cruze: { name: "Cruze Sedán (1.4T - 1.8L)", start: 2010, end: 2020, tank: 15.8, economy: 34 }
  },
  hyundai: {
    i10: { name: "i10 / Grand i10 (1.0L - 1.2L)", start: 2008, end: 2026, tank: 9.2, economy: 50 },
    accent: { name: "Excel / Accent / Verna (1.3L - 1.6L)", start: 1990, end: 2026, tank: 11.9, economy: 44 },
    elantra: { name: "Elantra Sedán (1.6L - 2.0L)", start: 1991, end: 2026, tank: 12.8, economy: 39 },
    tucson: { name: "Tucson / Tucson IX (2.0L)", start: 2004, end: 2026, tank: 14.3, economy: 32 },
    santafe: { name: "Santa Fe SUV (2.4L - 2.7L)", start: 2000, end: 2026, tank: 16.9, economy: 28 },
    creta: { name: "Creta SUV Compacto (1.5L - 1.6L)", start: 2015, end: 2026, tank: 13.2, economy: 36 },
    galloper: { name: "Galloper 4x4 (3.0L Gasolina)", start: 1991, end: 2003, tank: 19.8, economy: 22 },
    getz: { name: "Getz Hatchback (1.4L - 1.6L)", start: 2002, end: 2011, tank: 11.9, economy: 40 },
    atos: { name: "Atos City Car (1.0L - 1.1L)", start: 1997, end: 2012, tank: 9.2, economy: 48 }
  },
  kia: {
    picanto: { name: "Picanto City Car (1.0L - 1.2L)", start: 2004, end: 2026, tank: 9.2, economy: 54 },
    rio: { name: "Rio Stylus / R / 4 / 5 (1.4L - 1.6L)", start: 2000, end: 2024, tank: 11.9, economy: 44 },
    soluto: { name: "Soluto Sedán (1.4L)", start: 2019, end: 2026, tank: 11.0, economy: 44 },
    cerato: { name: "Cerato / Forte (1.6L - 2.0L)", start: 2003, end: 2026, tank: 13.2, economy: 38 },
    sportage: { name: "Sportage Active / R / X-Line (2.0L)", start: 1993, end: 2026, tank: 14.3, economy: 34 },
    sorento: { name: "Sorento SUV (2.4L - 3.5L)", start: 2002, end: 2026, tank: 17.2, economy: 26 },
    seltos: { name: "Seltos SUV Compacto (1.6L)", start: 2019, end: 2026, tank: 13.2, economy: 38 },
    sonet: { name: "Sonet SUV Compacto (1.5L)", start: 2020, end: 2026, tank: 11.9, economy: 40 },
    pride: { name: "Pride Pop / Sedán (1.1L - 1.3L)", start: 1990, end: 2000, tank: 9.8, economy: 45 }
  },
  mazda: {
    m323: { name: "323 / Allegro (1.3L - 1.6L)", start: 1990, end: 2004, tank: 11.9, economy: 36 },
    m626: { name: "626 / Matsuri / Asahi (2.0L)", start: 1990, end: 2002, tank: 14.5, economy: 30 },
    mazda2: { name: "Mazda 2 Hatchback/Sedán (1.5L)", start: 2007, end: 2026, tank: 11.6, economy: 45 },
    mazda3: { name: "Mazda 3 (1.6L - 2.0L)", start: 2003, end: 2026, tank: 13.2, economy: 39 },
    mazda6: { name: "Mazda 6 Sedán (2.0L - 2.5L)", start: 2002, end: 2024, tank: 16.4, economy: 32 },
    bt50: { name: "B-Series / BT-50 Camioneta (2.2L - 2.6L Gasolina)", start: 1990, end: 2026, tank: 18.5, economy: 27 },
    cx5: { name: "CX-5 SUV (2.0L - 2.5L)", start: 2012, end: 2026, tank: 14.8, economy: 34 },
    cx30: { name: "CX-3 / CX-30 (2.0L)", start: 2015, end: 2026, tank: 12.7, economy: 38 }
  },
  shineray: {
    xy150: { name: "Shineray XY150 (Motocicleta)", start: 2005, end: 2026, tank: 3.2, economy: 110 },
    moto250: { name: "Moto Motor 250cc (Genérica)", start: 2005, end: 2026, tank: 3.7, economy: 90 }
  }
};

const CITIES = {
  quito: { factor: 0.85, name: "Quito", desc: "Altitud y pendientes" },
  guayaquil: { factor: 0.90, name: "Guayaquil", desc: "Uso de aire acondicionado (A/C)" },
  cuenca: { factor: 0.90, name: "Cuenca", desc: "Altitud y relieve Sierra" },
  loja: { factor: 0.88, name: "Loja", desc: "Topografía irregular y paradas continuas" }
};

// Average monthly driving distance per city in Ecuador
const CITY_DISTANCES = {
  quito: 1200,
  guayaquil: 1100,
  cuenca: 900,
  loja: 800
};

// Application State
let activeVehicle = "moto";
let activeCity = "quito";
let customTank = VEHICLES.moto.tank;
let customConsumption = VEHICLES.moto.economy;

// DOM Elements
const inputPriceExtra = document.getElementById("price-extra");
const inputPriceSuper = document.getElementById("price-super");
const sliderDistance = document.getElementById("monthly-distance");
const distValLabel = document.getElementById("distance-val");
const selectedDistLabel = document.getElementById("selected-dist-label");

const customTankInput = document.getElementById("custom-tank");
const customConsumptionInput = document.getElementById("custom-consumption");

const vehicleButtons = document.querySelectorAll(".vehicle-btn");
const selectBrand = document.getElementById("vehicle-brand");
const selectModel = document.getElementById("vehicle-model");
const selectYear = document.getElementById("vehicle-year");

const cityButtons = document.querySelectorAll(".city-btn");
const selectedCityNameLabel = document.getElementById("selected-city-name");

// Output Metrics Elements
const metricCostFillExtra = document.getElementById("cost-fill-extra");
const metricCostFillSuper = document.getElementById("cost-fill-super");
const metricDiffFillAbs = document.getElementById("diff-fill-abs");
const metricDiffFillPct = document.getElementById("diff-fill-pct");

const metricCostMonthExtra = document.getElementById("cost-month-extra");
const metricCostMonthSuper = document.getElementById("cost-month-super");
const metricMonthlySavings = document.getElementById("monthly-savings");

const metricHomologatedEconomy = document.getElementById("homologated-economy");
const metricAdjustedEconomy = document.getElementById("adjusted-economy");
const metricAutonomyRange = document.getElementById("autonomy-range");
const metricRefillsPerMonth = document.getElementById("refills-per-month");
const metricGalPer100 = document.getElementById("gal-per-100");
const metricSubsidyMonthly = document.getElementById("subsidy-monthly");

// Chart tab elements
const chartTabButtons = document.querySelectorAll(".chart-tab-btn");
const canvasMonthly = document.getElementById("monthlyChart");
const canvasCities = document.getElementById("citiesChart");
const canvasTank = document.getElementById("tankChart");

// Global Chart References
let chartMonthlyInstance = null;
let chartCitiesInstance = null;
let chartTankInstance = null;

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  // Set default city distance
  sliderDistance.value = CITY_DISTANCES[activeCity];
  distValLabel.innerText = CITY_DISTANCES[activeCity];
  selectedDistLabel.innerText = CITY_DISTANCES[activeCity];
  
  // Initialize with a real model on load (Chevrolet Sail 2024)
  selectBrand.value = "chevrolet";
  updateModelDropdown();
  selectModel.value = "sail";
  updateYearDropdown();
  selectYear.value = "2024";
  updateVehicleFromModel();
  
  calculateResults();
  initCharts();
});

// Sync input fields with active vehicle defaults
function syncVehicleInputs() {
  const defaults = VEHICLES[activeVehicle];
  customTank = defaults.tank;
  customConsumption = defaults.economy;
  
  customTankInput.value = customTank.toFixed(1);
  customConsumptionInput.value = customConsumption;
}

// Adjust model efficiency based on manufacturing year (technology upgrades)
function getYearAdjustmentFactor(year) {
  const y = parseInt(year);
  switch (y) {
    case 2026: return 1.02; // +2% efficiency
    case 2025: return 1.01; // +1% efficiency
    case 2024: return 1.00; // Baseline
    case 2023: return 0.99; // -1% efficiency
    case 2022: return 0.98; // -2% efficiency
    case 2021: return 0.97; // -3% efficiency
    case 2020: return 0.96; // -4% efficiency
    case 2019: return 0.95;
    case 2018: return 0.94;
    case 2017: return 0.93;
    case 2016: return 0.92;
    case 2015: return 0.91;
    case 2014: return 0.90;
    case 2013: return 0.89;
    case 2012: return 0.88;
    case 2011: return 0.87;
    case 2010: return 0.86;
    case 2009: return 0.85;
    case 2008: return 0.84;
    case 2007: return 0.83;
    case 2006: return 0.82;
    case 2005: return 0.81;
    case 2004: return 0.80;
    case 2003: return 0.79;
    case 2002: return 0.78;
    case 2001: return 0.77;
    case 2000: return 0.76;
    default: return 0.72; // Pre-2000 models are around 28% less efficient than modern baseline
  }
}

// Populate model options based on selected brand
function updateModelDropdown() {
  const brand = selectBrand.value;
  
  // Clear previous options
  selectModel.innerHTML = "";
  selectYear.innerHTML = "";
  selectYear.disabled = true;
  
  if (brand === "generic") {
    selectModel.disabled = true;
    selectModel.innerHTML = '<option value="">-- Elige una marca primero --</option>';
    selectYear.innerHTML = '<option value="">--</option>';
    
    // Reactivate generic vehicle
    const activeBtn = document.querySelector(`.vehicle-btn[data-vehicle="${activeVehicle}"]`);
    if (activeBtn) {
      activeBtn.classList.add("active");
      activeBtn.setAttribute("aria-checked", "true");
    }
    syncVehicleInputs();
  } else {
    selectModel.disabled = false;
    selectModel.innerHTML = '<option value="">-- Selecciona Modelo --</option>';
    
    // Populate model options
    const brandModels = MODELS_DB[brand];
    Object.keys(brandModels).forEach(key => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = brandModels[key].name;
      selectModel.appendChild(option);
    });
    
    // Deactivate generic buttons
    vehicleButtons.forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-checked", "false");
    });
  }
  calculateResults();
}

// Populate year options based on selected model
function updateYearDropdown() {
  const brand = selectBrand.value;
  const modelKey = selectModel.value;
  
  selectYear.innerHTML = "";
  
  if (!modelKey || brand === "generic") {
    selectYear.disabled = true;
    selectYear.innerHTML = '<option value="">--</option>';
  } else {
    selectYear.disabled = false;
    const modelData = MODELS_DB[brand][modelKey];
    
    // Populate years from end to start (newest first)
    for (let y = modelData.end; y >= modelData.start; y--) {
      const option = document.createElement("option");
      option.value = y.toString();
      option.textContent = y.toString();
      selectYear.appendChild(option);
    }
    
    // Auto-select latest year
    selectYear.value = modelData.end.toString();
    updateVehicleFromModel();
  }
  calculateResults();
}

// Sync custom inputs with selected model specifications
function updateVehicleFromModel() {
  const brand = selectBrand.value;
  const modelKey = selectModel.value;
  const year = selectYear.value;
  
  if (brand !== "generic" && modelKey && year) {
    const modelData = MODELS_DB[brand][modelKey];
    const yearFactor = getYearAdjustmentFactor(year);
    
    customTank = modelData.tank;
    customConsumption = modelData.economy * yearFactor;
    
    customTankInput.value = customTank.toFixed(1);
    customConsumptionInput.value = Math.round(customConsumption);
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Gasoline Prices
  inputPriceExtra.addEventListener("input", calculateResults);
  inputPriceSuper.addEventListener("input", calculateResults);
  
  // Distance Slider
  sliderDistance.addEventListener("input", (e) => {
    const val = e.target.value;
    distValLabel.innerText = val;
    selectedDistLabel.innerText = val;
    calculateResults();
  });
  
  // Vehicle buttons (Generic Categories)
  vehicleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      vehicleButtons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      
      activeVehicle = btn.dataset.vehicle;
      selectBrand.value = "generic"; // Reset brand selector
      updateModelDropdown();
    });
  });

  // Cascading Select Listeners
  selectBrand.addEventListener("change", updateModelDropdown);
  selectModel.addEventListener("change", updateYearDropdown);
  selectYear.addEventListener("change", () => {
    updateVehicleFromModel();
    calculateResults();
  });
  
  // Custom technical settings
  customTankInput.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      customTank = val;
      calculateResults();
    }
  });
  
  customConsumptionInput.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      customConsumption = val;
      calculateResults();
    }
  });
  
  // City buttons
  cityButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      cityButtons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      
      activeCity = btn.dataset.city;
      selectedCityNameLabel.innerText = CITIES[activeCity].name;
      
      // Auto-update to City's Average Driving Distance
      const newDist = CITY_DISTANCES[activeCity];
      sliderDistance.value = newDist;
      distValLabel.innerText = newDist;
      selectedDistLabel.innerText = newDist;
      
      calculateResults();
    });
  });
  
  // Chart Tabs
  chartTabButtons.forEach(tab => {
    tab.addEventListener("click", () => {
      chartTabButtons.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      const targetChart = tab.dataset.chart;
      
      canvasMonthly.classList.add("hidden");
      canvasCities.classList.add("hidden");
      canvasTank.classList.add("hidden");
      
      if (targetChart === "monthly") {
        canvasMonthly.classList.remove("hidden");
        if (chartMonthlyInstance) chartMonthlyInstance.resize();
      } else if (targetChart === "cities") {
        canvasCities.classList.remove("hidden");
        if (chartCitiesInstance) chartCitiesInstance.resize();
      } else if (targetChart === "tank") {
        canvasTank.classList.remove("hidden");
        if (chartTankInstance) chartTankInstance.resize();
      }
    });
  });
}

// Calculations & DOM Updates
function calculateResults() {
  const priceExtra = parseFloat(inputPriceExtra.value) || 3.312;
  const priceSuper = parseFloat(inputPriceSuper.value) || 5.70;
  const distance = parseFloat(sliderDistance.value) || 1200;
  
  const cityFactor = CITIES[activeCity].factor;
  
  // Define Homologated vs Realistic Base Consumption
  let homologatedBase = customConsumption;
  let realisticBaseline = customConsumption;
  
  if (selectBrand.value !== "generic" && selectModel.value !== "") {
    // Exact model is selected. The database represents laboratory homologated values.
    // Real-world driving is typically 20% worse than manufacturer laboratory tests.
    homologatedBase = customConsumption;
    realisticBaseline = homologatedBase * 0.8;
  } else {
    // Generic vehicle category is selected. Baseline is already considered realistic.
    homologatedBase = customConsumption;
    realisticBaseline = customConsumption;
  }
  
  // 1. Fuel Economy Adjustments
  const realEconomy = realisticBaseline * cityFactor;
  const autonomy = customTank * realEconomy;
  const consumptionPer100 = 100 / realEconomy;
  
  // 2. Refills per month (assuming refill when tank reaches a 10% reserve for realism)
  const refills = autonomy > 0 ? (distance / (autonomy * 0.9)) : 0;
  
  // Update economy UI labels
  metricHomologatedEconomy.innerText = `${homologatedBase.toFixed(1)} km/gal`;
  metricAdjustedEconomy.innerText = `${realEconomy.toFixed(1)} km/gal`;
  metricAutonomyRange.innerText = `${Math.round(autonomy)} km`;
  metricRefillsPerMonth.innerText = `${refills.toFixed(1)} veces`;
  metricGalPer100.innerText = `${consumptionPer100.toFixed(2)} gal`;
  
  // 3. Cost to Fill Tank
  const fillExtra = customTank * priceExtra;
  const fillSuper = customTank * priceSuper;
  const fillDiffAbs = fillSuper - fillExtra;
  const fillDiffPct = fillSuper > 0 ? (fillDiffAbs / fillSuper) * 100 : 0;
  
  metricCostFillExtra.innerText = `$${fillExtra.toFixed(2)}`;
  metricCostFillSuper.innerText = `$${fillSuper.toFixed(2)}`;
  metricDiffFillAbs.innerText = `$${fillDiffAbs.toFixed(2)}`;
  metricDiffFillPct.innerText = `${Math.round(fillDiffPct)}%`;
  
  // 4. Monthly Cost
  const monthlyGal = distance / realEconomy;
  const costMonthExtra = monthlyGal * priceExtra;
  const costMonthSuper = monthlyGal * priceSuper;
  const savings = costMonthSuper - costMonthExtra;
  
  metricCostMonthExtra.innerText = `$${costMonthExtra.toFixed(2)}`;
  metricCostMonthSuper.innerText = `$${costMonthSuper.toFixed(2)}`;
  metricMonthlySavings.innerText = `$${savings.toFixed(2)}`;
  
  // 5. Subsidy Calculations
  // Estimated international price without subsidy is $4.20 per gallon.
  const subsidyRate = Math.max(0, 4.20 - priceExtra);
  const monthlySubsidy = monthlyGal * subsidyRate;
  metricSubsidyMonthly.innerText = `$${monthlySubsidy.toFixed(2)} / mes`;
  
  // Update charts with new calculations
  updateCharts(priceExtra, priceSuper, distance);
}

// Chart.js Setup and Customization
function initCharts() {
  const chartFontFamily = "'Inter', -apple-system, sans-serif";
  const gridColor = "rgba(255, 255, 255, 0.07)";
  const tickColor = "hsl(222, 12%, 72%)";
  
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: tickColor,
          font: { family: chartFontFamily, size: 11, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: chartFontFamily, weight: '700' },
        bodyFont: { family: chartFontFamily },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: tickColor, font: { family: chartFontFamily, size: 11 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { 
          color: tickColor, 
          font: { family: chartFontFamily, size: 11 },
          callback: (value) => `$${value}`
        }
      }
    }
  };

  // 1. Monthly Cost Chart
  chartMonthlyInstance = new Chart(canvasMonthly, {
    type: 'bar',
    data: {
      labels: ['Extra / Ecopaís', 'Súper Premium 95'],
      datasets: [{
        label: 'Costo Operativo Mensual ($)',
        data: [0, 0],
        backgroundColor: [
          'rgba(249, 115, 22, 0.25)', // Orange/Amber Extra
          'rgba(168, 85, 247, 0.25)'  // Purple Super
        ],
        borderColor: [
          'rgba(249, 115, 22, 0.95)',
          'rgba(168, 85, 247, 0.95)'
        ],
        borderWidth: 1.5,
        borderRadius: 8,
        barThickness: 50
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        legend: { display: false } // Only 1 dataset, legend is redundant
      }
    }
  });

  // 2. City Comparison Chart
  chartCitiesInstance = new Chart(canvasCities, {
    type: 'bar',
    data: {
      labels: ['Quito', 'Guayaquil', 'Cuenca', 'Loja'],
      datasets: [
        {
          label: 'Extra / Ecopaís ($)',
          data: [0, 0, 0, 0],
          backgroundColor: 'rgba(249, 115, 22, 0.25)',
          borderColor: 'rgba(249, 115, 22, 0.95)',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Súper Premium 95 ($)',
          data: [0, 0, 0, 0],
          backgroundColor: 'rgba(168, 85, 247, 0.25)',
          borderColor: 'rgba(168, 85, 247, 0.95)',
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: commonOptions
  });

  // 3. Tank Cost Chart
  chartTankInstance = new Chart(canvasTank, {
    type: 'bar',
    data: {
      labels: ['Extra / Ecopaís', 'Súper Premium 95'],
      datasets: [{
        label: 'Costo de Llenado ($)',
        data: [0, 0],
        backgroundColor: [
          'rgba(249, 115, 22, 0.25)',
          'rgba(168, 85, 247, 0.25)'
        ],
        borderColor: [
          'rgba(249, 115, 22, 0.95)',
          'rgba(168, 85, 247, 0.95)'
        ],
        borderWidth: 1.5,
        borderRadius: 8,
        barThickness: 50
      }]
    },
    options: {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        legend: { display: false }
      }
    }
  });
}

// Update Chart Data Dynamically
function updateCharts(priceExtra, priceSuper, distance) {
  if (!chartMonthlyInstance || !chartCitiesInstance || !chartTankInstance) return;

  const currentCityFactor = CITIES[activeCity].factor;
  const currentRealEconomy = customConsumption * currentCityFactor;
  const currentMonthlyGal = distance / currentRealEconomy;
  
  // Calculate costs for active city
  const costMonthExtra = currentMonthlyGal * priceExtra;
  const costMonthSuper = currentMonthlyGal * priceSuper;

  // 1. Update Monthly Cost Chart
  chartMonthlyInstance.data.datasets[0].data = [
    parseFloat(costMonthExtra.toFixed(2)),
    parseFloat(costMonthSuper.toFixed(2))
  ];
  chartMonthlyInstance.update();

  // 2. Update Tank Cost Chart
  const fillExtra = customTank * priceExtra;
  const fillSuper = customTank * priceSuper;
  chartTankInstance.data.datasets[0].data = [
    parseFloat(fillExtra.toFixed(2)),
    parseFloat(fillSuper.toFixed(2))
  ];
  chartTankInstance.update();

  // 3. Calculate cross-city data for City Comparison Chart
  const citiesDataExtra = [];
  const citiesDataSuper = [];
  
  Object.keys(CITIES).forEach(key => {
    const factor = CITIES[key].factor;
    const economy = customConsumption * factor;
    const gals = distance / economy;
    
    citiesDataExtra.push(parseFloat((gals * priceExtra).toFixed(2)));
    citiesDataSuper.push(parseFloat((gals * priceSuper).toFixed(2)));
  });

  chartCitiesInstance.data.datasets[0].data = citiesDataExtra;
  chartCitiesInstance.data.datasets[1].data = citiesDataSuper;
  chartCitiesInstance.update();
}
