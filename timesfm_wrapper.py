import os
import sys
import numpy as np

TIMESFM_AVAILABLE = False
try:
    import timesfm
    TIMESFM_AVAILABLE = True
except ImportError:
    pass

class TimesFMWrapper:
    def __init__(self):
        self.model = None
        self.is_loaded = False
        self.error_msg = None
        self.current_checkpoint = None
        self.use_2p5_api = False
        
    def check_availability(self):
        global TIMESFM_AVAILABLE
        if not TIMESFM_AVAILABLE:
            try:
                import timesfm
                TIMESFM_AVAILABLE = True
            except ImportError:
                pass
        return TIMESFM_AVAILABLE
        
    def load_model(self, checkpoint_path="google/timesfm-1.0-200m", context_len=512, horizon_len=128, backend="cpu"):
        if not self.check_availability():
            self.error_msg = "TimesFM package is not installed."
            self.is_loaded = False
            return False
            
        try:
            import timesfm
            
            # Check if 2.5 API is available (TimesFM version 2.0+)
            if hasattr(timesfm, "TimesFM_2p5_200M_torch"):
                from timesfm import TimesFM_2p5_200M_torch, ForecastConfig
                self.use_2p5_api = True
                
                # Map old checkpoint names to 2.5 compatible PyTorch checkpoint
                # if the user selects the default 1.0 checkpoint in the UI.
                if "1.0" in checkpoint_path or "timesfm-1.0" in checkpoint_path:
                    checkpoint_path = "google/timesfm-2.5-200m-pytorch"
                
                print(f"Loading TimesFM 2.5 model from: {checkpoint_path}...")
                
                # In PyTorch 2.5 class, we load model using from_pretrained
                # The model loads weights automatically from HuggingFace
                self.model = TimesFM_2p5_200M_torch.from_pretrained(
                    checkpoint_path
                )
                
                # Compile model configuration
                max_ctx = max(context_len, 1024)
                max_hor = max(horizon_len, 256)
                
                print(f"Compiling model with max_context={max_ctx}, max_horizon={max_hor}...")
                self.model.compile(
                    ForecastConfig(
                        max_context=max_ctx,
                        max_horizon=max_hor,
                        normalize_inputs=True,
                        use_continuous_quantile_head=True,
                        fix_quantile_crossing=True
                    )
                )
            else:
                # Fallback to TimesFM 1.0 legacy class if present
                from timesfm import TimesFm
                self.use_2p5_api = False
                
                print(f"Loading legacy TimesFM 1.0 model from: {checkpoint_path}...")
                self.model = TimesFm(
                    context_len=context_len,
                    horizon_len=horizon_len,
                    input_patch_len=32,
                    output_patch_len=128,
                    num_layers=20,
                    model_dims=1280,
                    backend=backend
                )
                self.model.load_from_checkpoint(repo_id=checkpoint_path)
                
            self.is_loaded = True
            self.current_checkpoint = checkpoint_path
            self.error_msg = None
            return True
        except Exception as e:
            self.is_loaded = False
            self.error_msg = str(e)
            print(f"Error loading TimesFM model: {e}")
            import traceback
            traceback.print_exc()
            return False
            
    def forecast(self, history_list, horizon_len):
        """
        Runs forecast using TimesFM model.
        history_list should be a list of lists of floats.
        """
        if not self.is_loaded or self.model is None:
            raise ValueError(f"TimesFM Model not loaded. Status: {self.error_msg}")
            
        if self.use_2p5_api:
            # 2.5 API takes: horizon (int) and inputs (list of np.ndarray)
            inputs = [np.array(h, dtype=np.float32) for h in history_list]
            
            point_forecast, quantile_forecast = self.model.forecast(
                horizon=horizon_len,
                inputs=inputs
            )
            
            # Prepare response (batch_size = 1)
            pf = point_forecast[0].tolist()
            
            # Map quantiles
            # In TimesFM 2.5 compiled_decode, full_forecast shape is (batch_size, horizon, 10)
            # index 1 to 9 maps to [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
            q_results = {}
            quantiles_keys = ["0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9"]
            
            for i, q_key in enumerate(quantiles_keys):
                idx = i + 1  # Index 1 is 0.1, index 5 is 0.5, index 9 is 0.9
                if idx < quantile_forecast.shape[2]:
                    q_results[q_key] = quantile_forecast[0, :, idx].tolist()
            
            return {
                "point_forecast": pf,
                "quantiles": q_results
            }
        else:
            # Legacy 1.0 API
            point_forecast, quantile_forecast = self.model.forecast(history_list)
            pf = point_forecast[0].tolist()
            
            q_results = {}
            quantiles_list = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
            if hasattr(self.model, 'quantiles') and self.model.quantiles is not None:
                quantiles_list = self.model.quantiles
                
            for i, q in enumerate(quantiles_list):
                try:
                    q_results[str(q)] = quantile_forecast[0, :, i].tolist()
                except Exception:
                    pass
                    
            return {
                "point_forecast": pf,
                "quantiles": q_results
            }
