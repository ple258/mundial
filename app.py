import os
import io
import traceback
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

from timesfm_wrapper import TimesFMWrapper
from forecaster_simulation import simulate_forecast

app = FastAPI(title="TimesFM GUI Dashboard API")

# Enable CORS for local testing if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model wrapper instance
tfm_wrapper = TimesFMWrapper()

# Global soccer forecaster instance
from soccer_forecaster import SoccerForecaster
from soccer_xgboost import SoccerXGBClassifier
soccer_forecaster = SoccerForecaster()
soccer_xgb = SoccerXGBClassifier()

class ModelLoadRequest(BaseModel):
    checkpoint_path: str = "google/timesfm-1.0-200m"
    context_len: int = 512
    horizon_len: int = 128
    backend: str = "cpu"

class ForecastRequest(BaseModel):
    history: List[float]
    horizon_len: int = 128
    quantiles: Optional[List[float]] = [0.1, 0.5, 0.9]
    force_simulation: Optional[bool] = False

@app.get("/api/status")
def get_status():
    """
    Returns the current status of the TimesFM library and model load state.
    """
    return {
        "timesfm_installed": tfm_wrapper.check_availability(),
        "model_loaded": tfm_wrapper.is_loaded,
        "error_message": tfm_wrapper.error_msg,
        "current_checkpoint": tfm_wrapper.current_checkpoint,
        "backend": getattr(tfm_wrapper.model, 'backend', 'cpu') if tfm_wrapper.is_loaded and tfm_wrapper.model else None
    }

@app.post("/api/load-model")
def load_model(req: ModelLoadRequest):
    """
    Initializes and loads the TimesFM model from a checkpoint.
    """
    if not tfm_wrapper.check_availability():
        raise HTTPException(status_code=400, detail="TimesFM is not installed. Running in simulation mode.")
        
    success = tfm_wrapper.load_model(
        checkpoint_path=req.checkpoint_path,
        context_len=req.context_len,
        horizon_len=req.horizon_len,
        backend=req.backend
    )
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to load TimesFM: {tfm_wrapper.error_msg}")
        
    return {
        "status": "success",
        "checkpoint": req.checkpoint_path,
        "context_len": req.context_len,
        "horizon_len": req.horizon_len,
        "backend": req.backend
    }

@app.post("/api/forecast")
def run_forecast(req: ForecastRequest):
    """
    Generates a forecast given historical series. Falls back to simulation if TimesFM is unavailable.
    """
    if len(req.history) == 0:
        raise HTTPException(status_code=400, detail="History cannot be empty.")
        
    quantiles = req.quantiles or [0.1, 0.5, 0.9]
    
    # Check if we should run real TimesFM or use simulation
    use_timesfm = tfm_wrapper.is_loaded and not req.force_simulation
    
    try:
        if use_timesfm:
            # TimesFM expects batch of inputs: list of arrays/lists
            inputs = [req.history]
            results = tfm_wrapper.forecast(inputs, req.horizon_len)
            
            # TimesFM quantiles might not exactly align with requested.
            # We filter/reformat if needed, but wrapper returns dict of str(q) -> list
            return {
                "engine": "timesfm",
                "point_forecast": results["point_forecast"],
                "quantiles": results["quantiles"],
                "error": None
            }
        else:
            # Statistical Simulation fallback
            results = simulate_forecast(req.history, req.horizon_len, quantiles)
            return {
                "engine": "simulation",
                "point_forecast": results["point_forecast"],
                "quantiles": results["quantiles"],
                "error": tfm_wrapper.error_msg if req.force_simulation else None
            }
    except Exception as e:
        traceback.print_exc()
        # Fallback to simulation on error
        try:
            results = simulate_forecast(req.history, req.horizon_len, quantiles)
            return {
                "engine": "simulation",
                "point_forecast": results["point_forecast"],
                "quantiles": results["quantiles"],
                "error": f"Error running real TimesFM (fell back to simulation): {str(e)}"
            }
        except Exception as sim_err:
            raise HTTPException(status_code=500, detail=f"Forecasting engine failure: {str(sim_err)}")

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads and parses a CSV or Excel file containing time-series data.
    Auto-detects datetime and value columns.
    """
    filename = file.filename.lower()
    contents = await file.read()
    
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel.")
            
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            
        # Column auto-detection
        # 1. Look for datetime column
        date_col = None
        for col in df.columns:
            col_lower = str(col).lower()
            if col_lower in ['ds', 'date', 'timestamp', 'time', 'datetime', 'fecha', 'periodo']:
                date_col = col
                break
                
        if date_col is None:
            # Try parsing the first column as dates
            try:
                pd.to_datetime(df.iloc[:, 0], errors='raise')
                date_col = df.columns[0]
            except (ValueError, TypeError):
                pass
                
        # 2. Look for value column
        val_col = None
        # Common names
        for col in df.columns:
            col_lower = str(col).lower()
            if col_lower in ['y', 'value', 'close', 'sales', 'temp', 'temperature', 'values', 'demanda', 'precio']:
                val_col = col
                break
                
        if val_col is None:
            # First numeric column that is not the date column
            for col in df.columns:
                if col != date_col and pd.api.types.is_numeric_dtype(df[col]):
                    val_col = col
                    break
                    
        if val_col is None:
            # Fallback to the second column if first is date
            if len(df.columns) > 1:
                val_col = df.columns[1]
            else:
                val_col = df.columns[0]
                
        # Parse Dates
        if date_col is not None:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            # Drop rows with invalid dates
            df = df.dropna(subset=[date_col])
            df = df.sort_values(by=date_col)
            dates_list = df[date_col].dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
        else:
            dates_list = [str(i) for i in range(len(df))]
            
        # Parse Values
        df[val_col] = pd.to_numeric(df[val_col], errors='coerce')
        df = df.dropna(subset=[val_col])
        values_list = df[val_col].astype(float).tolist()
        
        if len(values_list) < 5:
            raise HTTPException(status_code=400, detail="Time series is too short. Please provide at least 5 points.")
            
        # Try to guess frequency if dates are present
        frequency = "Unknown"
        if date_col is not None and len(df) > 2:
            try:
                diffs = df[date_col].diff().dropna()
                median_diff = diffs.median()
                
                # Check standard frequencies
                if median_diff >= pd.Timedelta(days=27) and median_diff <= pd.Timedelta(days=32):
                    frequency = "Monthly"
                elif median_diff >= pd.Timedelta(days=6) and median_diff <= pd.Timedelta(days=8):
                    frequency = "Weekly"
                elif median_diff >= pd.Timedelta(days=1) and median_diff < pd.Timedelta(days=2):
                    frequency = "Daily"
                elif median_diff >= pd.Timedelta(hours=1) and median_diff < pd.Timedelta(hours=2):
                    frequency = "Hourly"
                else:
                    frequency = f"Interval: {median_diff}"
            except Exception:
                pass
                
        suggested_context = min(len(values_list), 512)
        suggested_horizon = max(5, min(len(values_list) // 4, 128))
        
        return {
            "filename": file.filename,
            "date_column": str(date_col) if date_col else "Index-based",
            "value_column": str(val_col),
            "dates": dates_list,
            "values": values_list,
            "frequency": frequency,
            "length": len(values_list),
            "suggested_context_len": suggested_context,
            "suggested_horizon_len": suggested_horizon
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to parse uploaded file: {str(e)}")

class TickerRequest(BaseModel):
    ticker: str
    category: str

@app.post("/api/fetch-ticker")
def fetch_ticker(req: TickerRequest):
    """
    Downloads historical daily prices from Yahoo Finance API for the given ticker.
    Exposes date and closing prices.
    """
    import urllib.request
    import json
    from datetime import datetime
    
    ticker_str = req.ticker.strip().upper()
    if not ticker_str:
        raise HTTPException(status_code=400, detail="El ticker no puede estar vacío.")
        
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_str}?range=1y&interval=1d"
    
    try:
        # Fetch data using urllib with a User-Agent header to prevent blocking
        request = urllib.request.Request(
            url, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"}
        )
        
        with urllib.request.urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode())
            
        # Parse Yahoo Finance JSON response
        result = data.get("chart", {}).get("result", [])
        if not result:
            # Check for error message
            error = data.get("chart", {}).get("error", {})
            err_desc = error.get("description", "Ticker no encontrado.")
            raise HTTPException(status_code=400, detail=f"Error de Yahoo Finance: {err_desc}")
            
        chart_data = result[0]
        timestamps = chart_data.get("timestamp", [])
        indicators = chart_data.get("indicators", {}).get("quote", [{}])[0]
        close_prices = indicators.get("close", [])
        
        if not timestamps or not close_prices:
            raise HTTPException(status_code=400, detail="No se encontraron datos históricos para este ticker.")
            
        # Convert timestamps and filter out NaNs
        dates_list = []
        values_list = []
        
        for ts, price in zip(timestamps, close_prices):
            if price is not None and not np.isnan(price):
                # Convert Unix timestamp to YYYY-MM-DD
                dt = datetime.fromtimestamp(ts)
                dates_list.append(dt.strftime("%Y-%m-%d"))
                values_list.append(float(price))
                
        if len(values_list) < 5:
            raise HTTPException(status_code=400, detail="La serie obtenida es demasiado corta (menos de 5 puntos válidos).")
            
        suggested_context = min(len(values_list), 512)
        suggested_horizon = max(5, min(len(values_list) // 4, 128))
        
        return {
            "ticker": ticker_str,
            "category": req.category,
            "dates": dates_list,
            "values": values_list,
            "length": len(values_list),
            "suggested_context_len": suggested_context,
            "suggested_horizon_len": suggested_horizon
        }
        
    except HTTPException as he:
        raise he
    except urllib.error.HTTPError as he_http:
        raise HTTPException(status_code=400, detail=f"No se pudo descargar el ticker '{ticker_str}'. Verifica si el símbolo es correcto.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al descargar datos del ticker: {str(e)}")

class SoccerPredictRequest(BaseModel):
    team_a: str
    team_b: str
    neutral: bool = True
    market_value_a: Optional[float] = 100.0
    market_value_b: Optional[float] = 100.0
    injuries_a: Optional[int] = 0
    injuries_b: Optional[int] = 0
    rest_days_a: Optional[int] = 5
    rest_days_b: Optional[int] = 5
    temperature: Optional[float] = 22.0
    humidity: Optional[float] = 60.0

@app.get("/api/soccer/teams")
def get_soccer_teams():
    """
    Returns list of all unique international teams in the database.
    """
    success = soccer_forecaster.check_and_download_data()
    if not success:
        raise HTTPException(status_code=500, detail="No se pudo cargar o descargar la base de datos de fútbol.")
    return {"teams": soccer_forecaster.get_teams()}

@app.post("/api/soccer/predict")
def predict_soccer_match(req: SoccerPredictRequest):
    """
    Predicts soccer match outcome using Poisson + XGBoost ML adjustment layer.
    """
    success = soccer_forecaster.check_and_download_data()
    if not success:
        raise HTTPException(status_code=500, detail="No se pudo cargar o descargar la base de datos de fútbol.")
        
    result = soccer_xgb.predict_adjusted(
        soccer_forecaster=soccer_forecaster,
        team_a=req.team_a,
        team_b=req.team_b,
        market_value_a=req.market_value_a or 100.0,
        market_value_b=req.market_value_b or 100.0,
        injuries_a=req.injuries_a if req.injuries_a is not None else 0,
        injuries_b=req.injuries_b if req.injuries_b is not None else 0,
        rest_days_a=req.rest_days_a if req.rest_days_a is not None else 5,
        rest_days_b=req.rest_days_b if req.rest_days_b is not None else 5,
        temperature=req.temperature if req.temperature is not None else 22.0,
        humidity=req.humidity if req.humidity is not None else 60.0,
        neutral=req.neutral
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

# Mount static folder for frontend dashboard
# We ensure static directory exists first
os.makedirs("static", exist_ok=True)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Trigger reload after TimesFM installation
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
