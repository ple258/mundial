// Global variables
let selectedTeams = [];
let densityChartInstance = null;

// DOM Elements
const docElements = {
  predictForm: document.getElementById("soccer-predict-form"),
  teamASelect: document.getElementById("soccer-team-a"),
  teamBSelect: document.getElementById("soccer-team-b"),
  neutralCheck: document.getElementById("soccer-neutral"),
  submitBtn: document.getElementById("soccer-submit-btn"),
  
  dashboardResult: document.getElementById("soccer-dashboard-result"),
  placeholder: document.getElementById("soccer-placeholder"),
  loading: document.getElementById("soccer-loading"),
  
  flagA: document.getElementById("flag-a"),
  flagB: document.getElementById("flag-b"),
  nameA: document.getElementById("result-team-a-name"),
  nameB: document.getElementById("result-team-b-name"),
  xgA: document.getElementById("xg-team-a"),
  xgB: document.getElementById("xg-team-b"),
  scoreNumbers: document.getElementById("most-likely-score"),
  
  labelWinA: document.getElementById("label-win-a"),
  labelWinB: document.getElementById("label-win-b"),
  fillWinA: document.getElementById("fill-win-a"),
  fillDraw: document.getElementById("fill-draw"),
  fillWinB: document.getElementById("fill-win-b"),
  valWinA: document.getElementById("val-win-a"),
  valDraw: document.getElementById("val-draw"),
  valWinB: document.getElementById("val-win-b"),
  
  scorelinesTableBody: document.getElementById("scorelines-table-body"),
  h2hTableBody: document.getElementById("h2h-table-body"),
  
  attBarA: document.getElementById("attack-strength-a"),
  attBarB: document.getElementById("attack-strength-b"),
  attValA: document.getElementById("att-val-a"),
  attValB: document.getElementById("att-val-b"),
  
  defBarA: document.getElementById("defense-strength-a"),
  defBarB: document.getElementById("defense-strength-b"),
  defValA: document.getElementById("def-val-a"),
  defValB: document.getElementById("def-val-b"),
  
  // XGBoost dynamic inputs
  valAInput: document.getElementById("soccer-val-a"),
  valBInput: document.getElementById("soccer-val-b"),
  injAInput: document.getElementById("soccer-inj-a"),
  injBInput: document.getElementById("soccer-inj-b"),
  restAInput: document.getElementById("soccer-rest-a"),
  restBInput: document.getElementById("soccer-rest-b"),
  tempInput: document.getElementById("soccer-temp"),
  tempVal: document.getElementById("soccer-temp-val"),
  humidityInput: document.getElementById("soccer-humidity"),
  humidityVal: document.getElementById("soccer-humidity-val"),
  densityCanvas: document.getElementById("densityChart"),
  
  toastContainer: document.getElementById("toast-container")
};

// Market Value database in Millions of Euros
const teamMarketValues = {
  "England": 1200, "Inglaterra": 1200,
  "France": 1000, "Francia": 1000,
  "Brazil": 950, "Brasil": 950,
  "Portugal": 900,
  "Spain": 800, "España": 800,
  "Argentina": 750,
  "Germany": 700, "Alemania": 700,
  "Italy": 600, "Italia": 600,
  "Netherlands": 550, "Países Bajos": 550, "Holanda": 550,
  "Belgium": 450, "Bélgica": 450,
  "Uruguay": 350,
  "Ecuador": 220,
  "Colombia": 250,
  "Morocco": 300, "Marruecos": 300,
  "Senegal": 200,
  "USA": 180, "United States": 180, "Estados Unidos": 180,
  "Mexico": 150, "México": 150,
  "Japan": 160, "Japón": 160,
  "South Korea": 130, "Corea del Sur": 130,
  "Croatia": 200, "Croacia": 200,
  "Switzerland": 180, "Suiza": 180,
  "Denmark": 160, "Dinamarca": 160,
  "Poland": 120, "Polonia": 120,
  "Chile": 80,
  "Peru": 40, "Perú": 40,
  "Qatar": 15, "Catar": 15,
  "Saudi Arabia": 25, "Arabia Saudita": 25,
  "Cameroon": 100, "Camerún": 100,
  "Ghana": 120,
  "Australia": 45,
  "Canada": 110, "Canadá": 110,
  "Costa Rica": 20,
  "Wales": 60, "Gales": 60,
  "Sweden": 140, "Suecia": 140,
  "Ukraine": 150, "Ucrania": 150,
  "Turkey": 160, "Turquía": 160,
  "Egypt": 90, "Egipto": 90,
  "Nigeria": 250,
  "Paraguay": 70,
  "Venezuela": 50,
  "Bolivia": 15,
  "Honduras": 12,
  "Panama": 18, "Panamá": 18,
  "Jamaica": 30,
  "Serbia": 180,
  "Austria": 150,
  "Slovakia": 80,
  "Slovenia": 50,
  "Czech Republic": 90, "República Checa": 90,
  "Greece": 70, "Grecia": 70,
  "Romania": 60, "Rumanía": 60,
  "Bulgaria": 25,
  "Hungary": 80, "Hungría": 80,
  "Iceland": 20, "Islandia": 20,
  "Norway": 350, "Noruega": 350,
  "Finland": 30, "Finlandia": 30,
  "Ireland": 75, "Irlanda": 75,
  "Scotland": 110, "Escocia": 110,
  "New Zealand": 15, "Nueva Zelanda": 15,
  "South Africa": 20, "Sudáfrica": 20,
  "Algeria": 90, "Argelia": 90,
  "Ivory Coast": 160, "Costa de Marfil": 160, "Cote d'Ivoire": 160
};

function getTeamMarketValue(teamName) {
  return teamMarketValues[teamName] || teamMarketValues[teamName.trim()] || 30;
}

// Common Emoji Flags Mapping for Soccer Teams
const teamFlags = {
  "Argentina": "🇦🇷",
  "France": "🇫🇷", "Francia": "🇫🇷",
  "Brazil": "🇧🇷", "Brasil": "🇧🇷",
  "Germany": "🇩🇪", "Alemania": "🇩🇪",
  "Spain": "🇪🇸", "España": "🇪🇸",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Italy": "🇮🇹", "Italia": "🇮🇹",
  "Uruguay": "🇺🇾",
  "Ecuador": "🇪🇨",
  "Colombia": "🇨🇴",
  "Portugal": "🇵🇹",
  "Morocco": "🇲🇦", "Marruecos": "🇲🇦",
  "Japan": "🇯🇵", "Japón": "🇯🇵",
  "Mexico": "🇲🇽", "México": "🇲🇽",
  "USA": "🇺🇸", "United States": "🇺🇸", "Estados Unidos": "🇺🇸",
  "Belgium": "🇧🇪", "Bélgica": "🇧🇪",
  "Croatia": "🇭🇷", "Croacia": "🇭🇷",
  "Senegal": "🇸🇳",
  "Qatar": "🇶🇦", "Catar": "🇶🇦",
  "Netherlands": "🇳🇱", "Países Bajos": "🇳🇱", "Holanda": "🇳🇱",
  "Switzerland": "🇨🇭", "Suiza": "🇨🇭",
  "Denmark": "🇩🇰", "Dinamarca": "🇩🇰",
  "Tunisia": "🇹🇳", "Túnez": "🇹🇳",
  "Saudi Arabia": "🇸🇦", "Arabia Saudita": "🇸🇦",
  "Poland": "🇵🇱", "Polonia": "🇵🇱",
  "Australia": "🇦🇺",
  "Canada": "🇨🇦", "Canadá": "🇨🇦",
  "Cameroon": "🇨🇲", "Camerún": "🇨🇲",
  "Ghana": "🇬🇭",
  "South Korea": "🇰🇷", "Corea del Sur": "🇰🇷",
  "Iran": "🇮🇷", "Irán": "🇮🇷",
  "Costa Rica": "🇨🇷",
  "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "Gales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Peru": "🇵🇪", "Perú": "🇵🇪",
  "Chile": "🇨🇱",
  "Sweden": "🇸🇪", "Suecia": "🇸🇪",
  "Ukraine": "🇺🇦", "Ucrania": "🇺🇦",
  "Turkey": "🇹🇷", "Turquía": "🇹🇷",
  "Egypt": "🇪🇬", "Egipto": "🇪🇬",
  "Nigeria": "🇳🇬",
  "Paraguay": "🇵🇾",
  "Venezuela": "🇻🇪",
  "Bolivia": "🇧🇴",
  "Honduras": "🇭🇳",
  "Panama": "🇵🇦", "Panamá": "🇵🇦",
  "Jamaica": "🇯🇲",
  "Serbia": "🇷🇸",
  "Austria": "🇦🇹",
  "Slovakia": "🇸🇰",
  "Slovenia": "🇸🇮",
  "Czech Republic": "🇨🇿", "República Checa": "🇨🇿",
  "Greece": "🇬🇷", "Grecia": "🇬🇷",
  "Romania": "🇷🇴", "Rumanía": "🇷🇴",
  "Bulgaria": "🇧🇬",
  "Hungary": "🇭🇺", "Hungría": "🇭🇺",
  "Iceland": "🇮🇸", "Islandia": "🇮🇸",
  "Norway": "🇳🇴", "Noruega": "🇳🇴",
  "Finland": "🇫🇮", "Finlandia": "🇫🇮",
  "Ireland": "🇮🇪", "Irlanda": "🇮🇪",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "New Zealand": "🇳🇿", "Nueva Zelanda": "🇳🇿",
  "South Africa": "🇿🇦", "Sudáfrica": "🇿🇦",
  "Algeria": "🇩🇿", "Argelia": "🇩🇿",
  "Ivory Coast": "🇨🇮", "Costa de Marfil": "🇨🇮", "Cote d'Ivoire": "🇨🇮"
};

function getTeamFlag(teamName) {
  return teamFlags[teamName] || teamFlags[teamName.trim()] || "⚽";
}

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
// Initialization
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadTeamsList();
  setupFormListener();
  setupSlidersAndDropdowns();
});

function setupSlidersAndDropdowns() {
  // Update temperature indicator value
  docElements.tempInput.addEventListener("input", function() {
    docElements.tempVal.textContent = this.value;
  });
  
  // Update humidity indicator value
  docElements.humidityInput.addEventListener("input", function() {
    docElements.humidityVal.textContent = this.value;
  });
  
  // Dropdown changes auto-populate market values
  docElements.teamASelect.addEventListener("change", function() {
    docElements.valAInput.value = getTeamMarketValue(this.value);
  });
  
  docElements.teamBSelect.addEventListener("change", function() {
    docElements.valBInput.value = getTeamMarketValue(this.value);
  });
}

function updateDefaultMarketValues() {
  const teamA = docElements.teamASelect.value;
  const teamB = docElements.teamBSelect.value;
  if (teamA) docElements.valAInput.value = getTeamMarketValue(teamA);
  if (teamB) docElements.valBInput.value = getTeamMarketValue(teamB);
}

// -------------------------------------------------------------
// Load Soccer Teams List
// -------------------------------------------------------------
async function loadTeamsList() {
  try {
    const res = await fetch("/api/soccer/teams");
    if (!res.ok) throw new Error("Error cargando base de datos deportiva");
    const data = await res.json();
    
    selectedTeams = data.teams;
    populateTeamsDropdowns(data.teams);
  } catch (err) {
    showToast(`Error al inicializar base de datos: ${err.message}`, "error");
    docElements.teamASelect.innerHTML = `<option value="" disabled>Error de conexión</option>`;
    docElements.teamBSelect.innerHTML = `<option value="" disabled>Error de conexión</option>`;
  }
}

function populateTeamsDropdowns(teams) {
  // Clear options
  docElements.teamASelect.innerHTML = `<option value="" disabled selected>Selecciona un país...</option>`;
  docElements.teamBSelect.innerHTML = `<option value="" disabled selected>Selecciona un país...</option>`;
  
  teams.forEach(team => {
    const optionA = document.createElement("option");
    optionA.value = team;
    optionA.textContent = `${getTeamFlag(team)} ${team}`;
    docElements.teamASelect.appendChild(optionA);
    
    const optionB = document.createElement("option");
    optionB.value = team;
    optionB.textContent = `${getTeamFlag(team)} ${team}`;
    docElements.teamBSelect.appendChild(optionB);
  });
  
  // Set default popular options if they exist
  if (teams.includes("Argentina")) docElements.teamASelect.value = "Argentina";
  if (teams.includes("France")) docElements.teamBSelect.value = "France";
  else if (teams.includes("Francia")) docElements.teamBSelect.value = "Francia";
  
  updateDefaultMarketValues();
}

// -------------------------------------------------------------
// Simulation Event Handler
// -------------------------------------------------------------
function setupFormListener() {
  docElements.predictForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const teamA = docElements.teamASelect.value;
    const teamB = docElements.teamBSelect.value;
    const neutral = docElements.neutralCheck.checked;
    
    // Retrieve external variable adjustments
    const valA = parseFloat(docElements.valAInput.value) || 100;
    const valB = parseFloat(docElements.valBInput.value) || 100;
    const injA = parseInt(docElements.injAInput.value) || 0;
    const injB = parseInt(docElements.injBInput.value) || 0;
    const restA = parseInt(docElements.restAInput.value) || 5;
    const restB = parseInt(docElements.restBInput.value) || 5;
    const temp = parseFloat(docElements.tempInput.value) || 22;
    const humidity = parseFloat(docElements.humidityInput.value) || 60;
    
    if (!teamA || !teamB) {
      showToast("Por favor selecciona ambas selecciones.", "warning");
      return;
    }
    
    if (teamA === teamB) {
      showToast("¡Una selección no puede jugar contra sí misma!", "warning");
      return;
    }
    
    // Show loading spinner and initialize progress bar
    const progressBar = document.getElementById("simulation-progress-bar");
    const loadingText = document.getElementById("loading-text");
    
    let progress = 0;
    progressBar.style.width = "0%";
    loadingText.textContent = "Iniciando entrenamiento de la Capa ML (scikit-learn)...";
    
    docElements.loading.classList.add("active");
    docElements.placeholder.style.display = "none";
    docElements.dashboardResult.style.display = "none";
    docElements.submitBtn.disabled = true;
    
    const progressInterval = setInterval(() => {
      if (progress < 30) {
        progress += 4;
        loadingText.textContent = "Entrenando modelo de ajuste ML (scikit-learn)...";
      } else if (progress < 75) {
        progress += 2;
        loadingText.textContent = "Ajustando variables de clima, descanso y lesiones...";
      } else if (progress < 95) {
        progress += 1;
        loadingText.textContent = "Calculando campana de incertidumbre final...";
      }
      progressBar.style.width = `${progress}%`;
    }, 35);
    
    try {
      const res = await fetch("/api/soccer/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_a: teamA,
          team_b: teamB,
          neutral: neutral,
          market_value_a: valA,
          market_value_b: valB,
          injuries_a: injA,
          injuries_b: injB,
          rest_days_a: restA,
          rest_days_b: restB,
          temperature: temp,
          humidity: humidity
        })
      });
      
      if (!res.ok) {
        let errMsg = "Error al simular el partido";
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (e) {
          try {
            const txt = await res.text();
            if (txt) errMsg = txt.length > 100 ? txt.substring(0, 100) + "..." : txt;
          } catch (textErr) {}
        }
        throw new Error(errMsg);
      }
      
      const data = await res.json();
      
      clearInterval(progressInterval);
      progressBar.style.width = "100%";
      loadingText.textContent = "¡Carga y análisis de IA completados!";
      
      // Delay slightly so the user sees the progress bar hit 100%
      await new Promise(resolve => setTimeout(resolve, 350));
      
      displayPrediction(data);
      showToast("Simulación completada con éxito", "success");
    } catch (err) {
      clearInterval(progressInterval);
      showToast(err.message, "error");
      docElements.placeholder.style.display = "flex";
    } finally {
      clearInterval(progressInterval);
      docElements.loading.classList.remove("active");
      docElements.submitBtn.disabled = false;
    }
  });
}

// -------------------------------------------------------------
// Display Results UI
// -------------------------------------------------------------
function displayPrediction(data) {
  // Reveal dashboard
  docElements.dashboardResult.style.display = "block";
  
  // Scoreboard
  docElements.flagA.textContent = getTeamFlag(data.team_a);
  docElements.flagB.textContent = getTeamFlag(data.team_b);
  docElements.nameA.textContent = data.team_a;
  docElements.nameB.textContent = data.team_b;
  docElements.xgA.textContent = `xG: ${data.expected_goals_a.toFixed(2)}`;
  docElements.xgB.textContent = `xG: ${data.expected_goals_b.toFixed(2)}`;
  
  // Most likely scoreline
  const topScore = data.top_scorelines[0];
  docElements.scoreNumbers.textContent = topScore.score;
  
  // Probability visualizers
  const pA = (data.prob_a_win * 100).toFixed(1);
  const pDraw = (data.prob_draw * 100).toFixed(1);
  const pB = (data.prob_b_win * 100).toFixed(1);
  
  docElements.labelWinA.textContent = data.team_a;
  docElements.labelWinB.textContent = data.team_b;
  
  docElements.fillWinA.style.width = `${pA}%`;
  docElements.fillDraw.style.width = `${pDraw}%`;
  docElements.fillWinB.style.width = `${pB}%`;
  
  docElements.valWinA.textContent = `${pA}%`;
  docElements.valDraw.textContent = `${pDraw}%`;
  docElements.valWinB.textContent = `${pB}%`;
  
  // Populating Top Scorelines Table
  docElements.scorelinesTableBody.innerHTML = "";
  data.top_scorelines.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${item.score}</strong></td>
      <td>${(item.probability * 100).toFixed(2)}%</td>
    `;
    docElements.scorelinesTableBody.appendChild(row);
  });
  
  // Attack / Defense Strength Bars
  // Ratings scale is roughly 0.2 to 3.0. Let's map 3.0 to 100% width
  const scaleRating = (rating) => `${Math.min(100, Math.max(10, (rating / 2.5) * 100))}%`;
  
  docElements.attBarA.style.width = scaleRating(data.attack_a);
  docElements.attBarB.style.width = scaleRating(data.attack_b);
  docElements.attValA.textContent = data.attack_a.toFixed(2);
  docElements.attValB.textContent = data.attack_b.toFixed(2);
  
  docElements.defBarA.style.width = scaleRating(data.defense_a);
  docElements.defBarB.style.width = scaleRating(data.defense_b);
  docElements.defValA.textContent = data.defense_a.toFixed(2);
  docElements.defValB.textContent = data.defense_b.toFixed(2);
  
  // Populating Head to Head History Table
  docElements.h2hTableBody.innerHTML = "";
  if (data.h2h.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" style="text-align: center; color: var(--text-muted); font-style: italic;">No se encontraron partidos históricos recientes entre estas selecciones.</td>`;
    docElements.h2hTableBody.appendChild(row);
  } else {
    data.h2h.forEach(match => {
      const row = document.createElement("tr");
      const scoreStr = `${match.home_score} - ${match.away_score}`;
      
      // Determine if neutral/friendly or cup
      const tourneyLabel = match.tournament.length > 25 ? match.tournament.substring(0, 22) + "..." : match.tournament;
      
      row.innerHTML = `
        <td style="font-size: 0.75rem; color: var(--text-muted);">${match.date}</td>
        <td>${getTeamFlag(match.home_team)} ${match.home_team}</td>
        <td><strong>${scoreStr}</strong></td>
        <td>${getTeamFlag(match.away_team)} ${match.away_team}</td>
        <td style="font-size: 0.75rem; color: var(--text-muted);">${tourneyLabel}</td>
      `;
      docElements.h2hTableBody.appendChild(row);
    });
  }
  
  // Render density curve using Chart.js
  renderDensityChart(data);
}

// -------------------------------------------------------------
// Render Uncertainty Density Chart
// -------------------------------------------------------------
function renderDensityChart(data) {
  const ctx = docElements.densityCanvas.getContext("2d");
  
  if (densityChartInstance) {
    densityChartInstance.destroy();
  }
  
  const points = data.density_curve; // Array of {goal_difference: d, probability: p}
  const xLabels = points.map(p => {
    const d = p.goal_difference;
    if (d > 0) return `+${d} (${data.team_a})`;
    if (d < 0) return `${d} (${data.team_b})`;
    return "Empate";
  });
  
  const yData = points.map(p => p.probability * 100); // convert to percentage
  
  // Create a fading vertical gradient for density curve filling
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, "hsla(263, 80%, 65%, 0.35)");
  gradient.addColorStop(1, "hsla(263, 80%, 65%, 0.0)");
  
  densityChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xLabels,
      datasets: [{
        label: 'Probabilidad de la Diferencia de Goles',
        data: yData,
        borderColor: 'hsl(263, 80%, 65%)',
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.45, // spline curve
        pointBackgroundColor: points.map(p => {
          const d = p.goal_difference;
          if (d > 0) return 'hsl(263, 80%, 65%)'; // Team A color
          if (d < 0) return 'hsl(34, 95%, 55%)';   // Team B color
          return 'hsl(222, 10%, 65%)';              // Draw color
        }),
        pointRadius: 4.5,
        pointHoverRadius: 6.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Outfit', size: 12, weight: '600' },
          bodyFont: { family: 'Inter', size: 11 },
          borderColor: 'hsla(0, 0%, 100%, 0.08)',
          borderWidth: 1,
          callbacks: {
            title: function(context) {
              const idx = context[0].dataIndex;
              const d = points[idx].goal_difference;
              if (d > 0) return `Victoria de ${data.team_a} por ${d} gol(es)`;
              if (d < 0) return `Victoria de ${data.team_b} por ${Math.abs(d)} gol(es)`;
              return 'Resultado de Empate';
            },
            label: function(context) {
              return ` Probabilidad: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
            tickBorderDash: [5, 5]
          },
          ticks: {
            color: 'hsl(222, 12%, 65%)',
            font: { family: 'Inter', size: 9.5 }
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
            tickBorderDash: [5, 5]
          },
          ticks: {
            color: 'hsl(222, 12%, 65%)',
            font: { family: 'monospace', size: 10 },
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          },
          suggestedMax: Math.max(...yData) * 1.15
        }
      }
    }
  });
}
