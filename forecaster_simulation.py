import numpy as np
import scipy.fftpack as fftpack
from scipy.optimize import least_squares

def simulate_forecast(history, horizon_len, quantiles=[0.1, 0.5, 0.9]):
    """
    Fits a statistical model (trend + seasonality + AR residual decay) to the history
    and extrapolates it into the future.
    
    Args:
        history (list or np.ndarray): Historical values.
        horizon_len (int): Number of steps to forecast.
        quantiles (list): List of float quantiles to calculate.
        
    Returns:
        dict: Containing 'point_forecast' (list) and 'quantiles' (dict of quantile_str -> list)
    """
    history = np.array(history, dtype=float)
    n = len(history)
    
    if n < 3:
        # Fallback for very short history
        last_val = history[-1] if n > 0 else 0.0
        point = [last_val] * horizon_len
        q_results = {}
        for q in quantiles:
            offset = (q - 0.5) * 2.0
            q_results[str(q)] = [last_val + offset * (i + 1) * 0.1 for i in range(horizon_len)]
        return {"point_forecast": point, "quantiles": q_results}
        
    # Time indices
    t = np.arange(n)
    t_future = np.arange(n, n + horizon_len)
    
    # 1. Fit Linear Trend
    slope, intercept = np.polyfit(t, history, 1)
    trend_history = slope * t + intercept
    trend_future = slope * t_future + intercept
    
    # Detrended history
    detrended = history - trend_history
    
    # 2. Seasonality Detection via FFT
    # Clean the signal and find dominant frequencies
    fft_vals = fftpack.fft(detrended)
    power = np.abs(fft_vals[:n // 2])
    frequencies = fftpack.fftfreq(n)[:n // 2]
    
    # Skip the DC component (freq = 0)
    power[0] = 0
    
    # Get top 3 frequencies
    top_indices = np.argsort(power)[-3:]
    dominant_freqs = frequencies[top_indices]
    dominant_freqs = dominant_freqs[dominant_freqs > 0] # only positive frequencies
    
    # Fit sine/cosine components for dominant frequencies using least squares
    def seasonal_model(params, x, freqs):
        # params: [A_1, B_1, A_2, B_2, ...]
        y = np.zeros_like(x, dtype=float)
        for idx, f in enumerate(freqs):
            A = params[2 * idx]
            B = params[2 * idx + 1]
            y += A * np.sin(2 * np.pi * f * x) + B * np.cos(2 * np.pi * f * x)
        return y
        
    def residuals_fn(params, x, y, freqs):
        return seasonal_model(params, x, freqs) - y

    # Initial guess: all zeros
    if len(dominant_freqs) > 0:
        init_params = np.zeros(2 * len(dominant_freqs))
        try:
            res_fit = least_squares(residuals_fn, init_params, args=(t, detrended, dominant_freqs))
            fitted_params = res_fit.x
            seasonal_history = seasonal_model(fitted_params, t, dominant_freqs)
            seasonal_future = seasonal_model(fitted_params, t_future, dominant_freqs)
        except Exception:
            seasonal_history = np.zeros_like(t, dtype=float)
            seasonal_future = np.zeros_like(t_future, dtype=float)
    else:
        seasonal_history = np.zeros_like(t, dtype=float)
        seasonal_future = np.zeros_like(t_future, dtype=float)
        
    # Residuals after trend + seasonality
    residuals = detrended - seasonal_history
    
    # 3. Autoregressive AR(1) modeling on residuals
    # r_t = phi * r_{t-1} + noise
    if n > 1:
        # Simple least squares for AR(1)
        r_t = residuals[1:]
        r_t_minus_1 = residuals[:-1]
        phi = np.sum(r_t * r_t_minus_1) / (np.sum(r_t_minus_1**2) + 1e-8)
        phi = np.clip(phi, -0.95, 0.95) # keep stable
    else:
        phi = 0.0
        
    # Standard deviation of residuals
    residual_std = np.std(residuals)
    if residual_std < 1e-5:
        residual_std = np.std(history) * 0.05 + 1e-4
        
    # Extrapolate AR(1) residuals
    last_residual = residuals[-1]
    ar_future = np.zeros(horizon_len)
    current_res = last_residual
    for i in range(horizon_len):
        current_res = phi * current_res
        ar_future[i] = current_res
        
    # 4. Combine parts for point forecast
    point_forecast = trend_future + seasonal_future + ar_future
    
    # 5. Calculate prediction intervals (uncertainty increases over time)
    # The variance of h-step ahead forecast in AR(1) grows as:
    # Var(h) = sigma^2 * sum_{j=0}^{h-1} phi^{2j}
    # For simplicity, let's use: SE_h = residual_std * sqrt(1 + sum_{j=1}^{h-1} (1 + j * 0.05))
    # which grows nicely to show the classic "cone of uncertainty".
    q_results = {}
    
    # Standard normal distribution quantiles (Z-scores)
    # Z(0.9) approx 1.28
    # Z(0.5) = 0.0
    # Z(0.1) approx -1.28
    z_scores = {
        0.1: -1.2815,
        0.2: -0.8416,
        0.3: -0.5244,
        0.4: -0.2533,
        0.5: 0.0,
        0.6: 0.2533,
        0.7: 0.5244,
        0.8: 0.8416,
        0.9: 1.2815
    }
    
    for q in quantiles:
        q_key = str(q)
        # Find closest Z-score or approximate
        z = z_scores.get(q, (q - 0.5) * 2.5) # linear fallback
        
        forecast_q = []
        for h in range(1, horizon_len + 1):
            # Uncertainty multiplier grows with horizon step h
            uncertainty_mult = np.sqrt(h) * 0.8 + 0.2
            se_h = residual_std * uncertainty_mult
            val = point_forecast[h - 1] + z * se_h
            forecast_q.append(float(val))
            
        q_results[q_key] = forecast_q
        
    return {
        "point_forecast": point_forecast.tolist(),
        "quantiles": q_results
    }
