import os
import random
import math
from datetime import datetime
import numpy as np
import pandas as pd

# Force scikit-learn's HistGradientBoostingClassifier directly to prevent XGBoost C++ binary crashes on macOS
USE_XGB = False
from sklearn.ensemble import HistGradientBoostingClassifier

class SoccerXGBClassifier:
    def __init__(self):
        self.model = None
        self.is_trained = False

    def train_model(self, soccer_forecaster):
        """
        Generates a synthetic historical dataset using real Poisson expectations
        adjusted by external variables, then trains the classifier.
        """
        print("Iniciando entrenamiento de la Capa de Ajuste de ML (optimizado)...")
        
        teams = soccer_forecaster.get_teams()
        if len(teams) < 2:
            print("No hay suficientes equipos cargados para entrenar el modelo.")
            return False

        # Pre-calculate team ratings once to avoid slow pandas filtering in the loop
        df = soccer_forecaster.df
        if df is None:
            soccer_forecaster.check_and_download_data()
            df = soccer_forecaster.df
            
        current_year = datetime.now().year
        cutoff_date = pd.Timestamp(current_year - 6, 1, 1)
        recent_df = df[df['date'] >= cutoff_date]
        recent_df = recent_df.dropna(subset=['home_score', 'away_score'])
        if len(recent_df) < 50:
            recent_df = df.dropna(subset=['home_score', 'away_score']).tail(2000)
            
        total_matches = len(recent_df)
        total_goals = recent_df['home_score'].sum() + recent_df['away_score'].sum()
        avg_goals = (total_goals / (2 * total_matches)) if total_matches > 0 else 1.35
        
        team_ratings = {}
        for team in teams:
            home_matches = recent_df[recent_df['home_team'] == team]
            away_matches = recent_df[recent_df['away_team'] == team]
            mp = len(home_matches) + len(away_matches)
            if mp == 0:
                team_ratings[team] = (1.0, 1.0)
                continue
            goals_scored = home_matches['home_score'].sum() + away_matches['away_score'].sum()
            goals_conceded = home_matches['away_score'].sum() + away_matches['home_score'].sum()
            att = (goals_scored / mp) / avg_goals
            deff = (goals_conceded / mp) / avg_goals
            att = np.clip(att, 0.2, 3.5)
            deff = np.clip(deff, 0.2, 3.5)
            team_ratings[team] = (float(att), float(deff))

        # Generate synthetic matches
        data_rows = []
        n_samples = 4000
        
        def poisson_prob(l, k):
            return (math.exp(-l) * (l**k)) / math.factorial(k) if l > 0 else (1.0 if k == 0 else 0.0)

        # Helper to generate random external variables
        for _ in range(n_samples):
            # Select random pair of distinct teams
            team_a, team_b = random.sample(teams, 2)
            
            att_a, def_a = team_ratings[team_a]
            att_b, def_b = team_ratings[team_b]
            
            # Base Poisson xG
            lambda_a = att_a * def_b * avg_goals
            lambda_b = att_b * def_a * avg_goals
            
            # Fast Poisson probabilities calculation
            max_g = 6
            p_matrix = np.zeros((max_g, max_g))
            for i in range(max_g):
                for j in range(max_g):
                    p_matrix[i, j] = poisson_prob(lambda_a, i) * poisson_prob(lambda_b, j)
            p_sum = np.sum(p_matrix)
            if p_sum > 0:
                p_matrix /= p_sum
                
            p_win_a = float(np.sum(np.tril(p_matrix, -1)))
            p_draw = float(np.sum(np.diag(p_matrix)))
            p_win_b = float(np.sum(np.triu(p_matrix, 1)))

            # Generate random external variables
            market_val_a = random.uniform(10.0, 1000.0)
            market_val_b = random.uniform(10.0, 1000.0)
            injuries_a = random.randint(0, 4)
            injuries_b = random.randint(0, 4)
            rest_a = random.randint(3, 10)
            rest_b = random.randint(3, 10)
            temp = random.uniform(5.0, 38.0)
            humidity = random.uniform(20.0, 95.0)

            # Calculate the physical adjustment factors
            log_val_ratio = math.log(market_val_a / market_val_b)
            adj_value = 0.22 * math.tanh(log_val_ratio / 2.0)
            
            adj_injuries = -0.06 * (injuries_a - injuries_b)
            adj_rest = 0.03 * (rest_a - rest_b)
            
            # Climate leveling effect
            climate_leveler = 1.0
            adj_lambda_a = lambda_a
            adj_lambda_b = lambda_b
            if temp > 30.0 and humidity > 70.0:
                climate_leveler = 0.5
                adj_lambda_a *= 0.85
                adj_lambda_b *= 0.85
                
            # Apply adjustments to expected goals
            adj_lambda_a *= math.exp(adj_value * climate_leveler + adj_injuries + adj_rest)
            adj_lambda_b *= math.exp(-adj_value * climate_leveler - adj_injuries - adj_rest)
            
            # Clip for safety
            adj_lambda_a = max(0.1, min(5.0, adj_lambda_a))
            adj_lambda_b = max(0.1, min(5.0, adj_lambda_b))
            
            # Simulate actual score
            goals_a = np.random.poisson(adj_lambda_a)
            goals_b = np.random.poisson(adj_lambda_b)
            
            # Outcome class: 0 = Team B wins, 1 = Draw, 2 = Team A wins
            if goals_a > goals_b:
                outcome = 2
            elif goals_a == goals_b:
                outcome = 1
            else:
                outcome = 0

            # Store feature vector
            data_rows.append({
                "p_win_a": p_win_a,
                "p_draw": p_draw,
                "p_win_b": p_win_b,
                "val_ratio": market_val_a / (market_val_a + market_val_b),
                "inj_diff": injuries_a - injuries_b,
                "rest_diff": rest_a - rest_b,
                "temp": temp,
                "humidity": humidity,
                "outcome": outcome
            })
            
        df = pd.DataFrame(data_rows)
        X = df[["p_win_a", "p_draw", "p_win_b", "val_ratio", "inj_diff", "rest_diff", "temp", "humidity"]]
        y = df["outcome"]

        # Train ML Model
        try:
            if USE_XGB:
                self.model = xgb.XGBClassifier(
                    n_estimators=100,
                    max_depth=4,
                    learning_rate=0.08,
                    objective="multi:softprob",
                    num_class=3,
                    random_state=42,
                    eval_metric="mlogloss"
                )
            else:
                self.model = HistGradientBoostingClassifier(
                    max_iter=100,
                    max_depth=4,
                    learning_rate=0.08,
                    random_state=42
                )
            
            self.model.fit(X, y)
            self.is_trained = True
            engine_name = "XGBoost" if USE_XGB else "scikit-learn HistGradientBoosting"
            print(f"Entrenamiento completado exitosamente usando el motor: {engine_name}!")
            return True
        except Exception as e:
            print(f"Error al entrenar el modelo de ML: {e}")
            return False

    def predict_adjusted(self, soccer_forecaster, team_a, team_b, market_value_a, market_value_b,
                         injuries_a, injuries_b, rest_days_a, rest_days_b, temperature, humidity, neutral=True):
        """
        Runs Poisson base forecasting, predicts ML adjustment probabilities,
        re-balances the goal probability grid, and calculates the goal difference density.
        """
        # 1. Base prediction
        base_pred = soccer_forecaster.predict_match(team_a, team_b, neutral)
        if "error" in base_pred:
            return base_pred
            
        # Ensure model is trained
        if not self.is_trained:
            success = self.train_model(soccer_forecaster)
            if not success:
                # If training failed, return base prediction directly
                return base_pred

        # 2. Extract base stats
        p_win_a = base_pred["prob_a_win"]
        p_draw = base_pred["prob_draw"]
        p_win_b = base_pred["prob_b_win"]
        lambda_a = base_pred["expected_goals_a"]
        lambda_b = base_pred["expected_goals_b"]

        # 3. Predict adjusted probabilities using XGBoost/sklearn
        val_ratio = market_value_a / (market_value_a + market_value_b) if (market_value_a + market_value_b) > 0 else 0.5
        inj_diff = injuries_a - injuries_b
        rest_diff = rest_days_a - rest_days_b
        
        feature_vector = pd.DataFrame([{
            "p_win_a": p_win_a,
            "p_draw": p_draw,
            "p_win_b": p_win_b,
            "val_ratio": val_ratio,
            "inj_diff": inj_diff,
            "rest_diff": rest_diff,
            "temp": temperature,
            "humidity": humidity
        }])
        
        # Predict outcome probabilities
        probs = self.model.predict_proba(feature_vector)[0]
        # Class mapping: 0 -> Team B Wins, 1 -> Draw, 2 -> Team A Wins
        xgb_win_b = float(probs[0])
        xgb_draw = float(probs[1])
        xgb_win_a = float(probs[2])

        # 4. Adjust the joint goal probability matrix
        # First, apply the physical factors to adjust the Poisson lambdas
        log_val_ratio = math.log(market_value_a / market_value_b) if market_value_a > 0 and market_value_b > 0 else 0
        adj_value = 0.22 * math.tanh(log_val_ratio / 2.0)
        adj_injuries = -0.06 * (injuries_a - injuries_b)
        adj_rest = 0.03 * (rest_days_a - rest_days_b)
        
        climate_leveler = 1.0
        adj_lambda_a = lambda_a
        adj_lambda_b = lambda_b
        
        if temperature > 30.0 and humidity > 70.0:
            climate_leveler = 0.5
            adj_lambda_a *= 0.85
            adj_lambda_b *= 0.85
            
        adj_lambda_a *= math.exp(adj_value * climate_leveler + adj_injuries + adj_rest)
        adj_lambda_b *= math.exp(-adj_value * climate_leveler - adj_injuries - adj_rest)
        
        adj_lambda_a = max(0.1, min(6.0, adj_lambda_a))
        adj_lambda_b = max(0.1, min(6.0, adj_lambda_b))

        # Build adjusted Poisson grid
        max_goals = 7
        prob_matrix = np.zeros((max_goals, max_goals))
        
        def poisson_prob(l, k):
            return (math.exp(-l) * (l**k)) / math.factorial(k) if l > 0 else (1.0 if k == 0 else 0.0)
            
        for i in range(max_goals):
            for j in range(max_goals):
                prob_matrix[i, j] = poisson_prob(adj_lambda_a, i) * poisson_prob(adj_lambda_b, j)
                
        # Scale grid to align with XGBoost output probabilities
        sum_a = np.sum(np.tril(prob_matrix, -1))
        sum_d = np.sum(np.diag(prob_matrix))
        sum_b = np.sum(np.triu(prob_matrix, 1))
        
        if sum_a > 0:
            for i in range(max_goals):
                for j in range(i):
                    prob_matrix[i, j] *= (xgb_win_a / sum_a)
        if sum_d > 0:
            for i in range(max_goals):
                prob_matrix[i, i] *= (xgb_draw / sum_d)
        if sum_b > 0:
            for i in range(max_goals):
                for j in range(i + 1, max_goals):
                    prob_matrix[i, j] *= (xgb_win_b / sum_b)
                    
        # Re-normalize
        total_sum = np.sum(prob_matrix)
        if total_sum > 0:
            prob_matrix /= total_sum

        # 5. Extract adjusted expected goals (xG)
        adj_xg_a = 0.0
        adj_xg_b = 0.0
        for i in range(max_goals):
            for j in range(max_goals):
                adj_xg_a += i * prob_matrix[i, j]
                adj_xg_b += j * prob_matrix[i, j]

        # 6. Extract top 5 adjusted scorelines
        flat_indices = np.argsort(prob_matrix.flatten())[::-1]
        top_scores = []
        for idx in flat_indices[:5]:
            i = int(idx // max_goals)
            j = int(idx % max_goals)
            top_scores.append({
                "score": f"{i} - {j}",
                "team_a_goals": i,
                "team_b_goals": j,
                "probability": float(prob_matrix[i, j])
            })

        # 7. Extract Goal Difference Density curve
        # Goal differences go from -5 to +5 (inclusive)
        density_data = []
        for d in range(-5, 6):
            prob_d = 0.0
            # Sum grid where goals_a - goals_b == d
            for i in range(max_goals):
                for j in range(max_goals):
                    if (i - j) == d:
                        prob_d += prob_matrix[i, j]
            density_data.append({
                "goal_difference": d,
                "probability": float(prob_d)
            })

        return {
            "team_a": team_a,
            "team_b": team_b,
            "attack_a": base_pred["attack_a"],
            "defense_a": base_pred["defense_a"],
            "matches_a": base_pred["matches_a"],
            "attack_b": base_pred["attack_b"],
            "defense_b": base_pred["defense_b"],
            "matches_b": base_pred["matches_b"],
            # Base Poisson xG
            "expected_goals_a_poisson": base_pred["expected_goals_a"],
            "expected_goals_b_poisson": base_pred["expected_goals_b"],
            "prob_a_win_poisson": base_pred["prob_a_win"],
            "prob_draw_poisson": base_pred["prob_draw"],
            "prob_b_win_poisson": base_pred["prob_b_win"],
            # XGBoost Adjusted
            "expected_goals_a": float(adj_xg_a),
            "expected_goals_b": float(adj_xg_b),
            "prob_a_win": xgb_win_a,
            "prob_draw": xgb_draw,
            "prob_b_win": xgb_win_b,
            "top_scorelines": top_scores,
            "density_curve": density_data,
            "h2h": base_pred["h2h"],
            "neutral": neutral,
            "ml_engine": "XGBoost" if USE_XGB else "scikit-learn HistGradientBoosting"
        }
