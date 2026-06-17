import os
import urllib.request
import pandas as pd
import numpy as np
import math
from datetime import datetime

DATASET_URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
LOCAL_CSV_PATH = "results.csv"

class SoccerForecaster:
    def __init__(self):
        self.df = None
        self.teams = []
        self.last_loaded = None
        
    def check_and_download_data(self):
        """
        Checks if results.csv exists locally. If not, downloads it.
        """
        try:
            if not os.path.exists(LOCAL_CSV_PATH):
                print(f"Downloading historical football results from {DATASET_URL}...")
                req = urllib.request.Request(
                    DATASET_URL,
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                with urllib.request.urlopen(req) as response:
                    with open(LOCAL_CSV_PATH, 'wb') as f:
                        f.write(response.read())
            
            # Load into pandas
            self.df = pd.read_csv(LOCAL_CSV_PATH)
            self.df['date'] = pd.to_datetime(self.df['date'])
            # Sort by date
            self.df = self.df.sort_values(by='date')
            
            # Get list of unique teams
            all_teams = pd.concat([self.df['home_team'], self.df['away_team']]).unique()
            self.teams = sorted([str(t) for t in all_teams])
            self.last_loaded = datetime.now()
            return True
        except Exception as e:
            print(f"Error loading football dataset: {e}")
            return False

    def get_teams(self):
        if self.df is None:
            self.check_and_download_data()
        return self.teams

    def get_head_to_head(self, team_a, team_b):
        """
        Retrieves recent matches between team_a and team_b.
        """
        if self.df is None:
            self.check_and_download_data()
            
        h2h = self.df[
            ((self.df['home_team'] == team_a) & (self.df['away_team'] == team_b)) |
            ((self.df['home_team'] == team_b) & (self.df['away_team'] == team_a))
        ]
        # Filter out matches that haven't been played yet (NaN scores)
        h2h = h2h.dropna(subset=['home_score', 'away_score'])
        
        # Take latest 5 matches
        latest_matches = h2h.tail(5).sort_values(by='date', ascending=False)
        results = []
        for _, row in latest_matches.iterrows():
            results.append({
                "date": row['date'].strftime("%Y-%m-%d"),
                "home_team": row['home_team'],
                "away_team": row['away_team'],
                "home_score": int(row['home_score']),
                "away_score": int(row['away_score']),
                "tournament": row['tournament']
            })
        return results

    def predict_match(self, team_a, team_b, neutral=True):
        """
        Predicts match outcome using Poisson Goal model based on matches in the last 6 years.
        """
        if self.df is None:
            self.check_and_download_data()
            
        if team_a not in self.teams or team_b not in self.teams:
            return {"error": "Uno o ambos equipos no se encuentran en la base de datos."}
            
        # 1. Filter recent matches to reflect current team strengths (last 6 years)
        current_year = datetime.now().year
        cutoff_date = datetime(current_year - 6, 1, 1)
        recent_df = self.df[self.df['date'] >= cutoff_date]
        
        # Filter out matches that haven't been played yet (NaN scores)
        recent_df = recent_df.dropna(subset=['home_score', 'away_score'])
        
        if len(recent_df) < 50:
            # Fallback if no recent data
            recent_df = self.df.dropna(subset=['home_score', 'away_score']).tail(2000)
            
        # 2. Calculate global statistics
        # We compute average goals scored per team per match
        total_matches = len(recent_df)
        total_goals_scored = recent_df['home_score'].sum() + recent_df['away_score'].sum()
        avg_goals_scored = (total_goals_scored / (2 * total_matches)) if total_matches > 0 else 1.35
        
        # 3. Calculate team specific attack and defense strengths
        def get_team_stats(team):
            home_matches = recent_df[recent_df['home_team'] == team]
            away_matches = recent_df[recent_df['away_team'] == team]
            matches_played = len(home_matches) + len(away_matches)
            
            if matches_played == 0:
                # Default strength
                return 1.0, 1.0, 0
                
            # Goals Scored
            goals_scored = home_matches['home_score'].sum() + away_matches['away_score'].sum()
            avg_scored = goals_scored / matches_played
            
            # Goals Conceded
            goals_conceded = home_matches['away_score'].sum() + away_matches['home_score'].sum()
            avg_conceded = goals_conceded / matches_played
            
            # Attack Rating (Scored / average goals scored globally)
            attack_rating = avg_scored / avg_goals_scored
            
            # Defense Rating (Conceded / average goals scored globally)
            defense_rating = avg_conceded / avg_goals_scored
            
            # Clip ratings to prevent extreme values
            attack_rating = np.clip(attack_rating, 0.2, 3.5)
            defense_rating = np.clip(defense_rating, 0.2, 3.5)
            
            return float(attack_rating), float(defense_rating), matches_played

        att_a, def_a, mp_a = get_team_stats(team_a)
        att_b, def_b, mp_b = get_team_stats(team_b)
        
        # 4. Calculate Expected Goals (Lambdas)
        # Expected goals = Team Attack * Opponent Defense * Global Average
        # For neutral matches (World Cup), home advantage is 1.0
        # If not neutral, we apply a home advantage factor of 1.15 to home team
        home_advantage = 1.15
        
        if neutral:
            lambda_a = att_a * def_b * avg_goals_scored
            lambda_b = att_b * def_a * avg_goals_scored
        else:
            lambda_a = att_a * def_b * avg_goals_scored * home_advantage
            lambda_b = att_b * def_a * avg_goals_scored * (1.0 / home_advantage)
            
        # 5. Build Poisson Goal probability grid (max 6 goals for each team)
        max_goals = 7
        prob_matrix = np.zeros((max_goals, max_goals))
        
        def poisson_prob(l, k):
            return (math.exp(-l) * (l**k)) / math.factorial(k) if l > 0 else (1.0 if k == 0 else 0.0)
            
        for i in range(max_goals):
            for j in range(max_goals):
                p_i = poisson_prob(lambda_a, i)
                p_j = poisson_prob(lambda_b, j)
                prob_matrix[i, j] = p_i * p_j
                
        # Normalize to ensure sum = 1
        prob_sum = np.sum(prob_matrix)
        if prob_sum > 0:
            prob_matrix = prob_matrix / prob_sum
            
        # 6. Calculate Win, Draw, Loss probabilities
        prob_a_win = float(np.sum(np.tril(prob_matrix, -1)))
        prob_draw = float(np.sum(np.diag(prob_matrix)))
        prob_b_win = float(np.sum(np.triu(prob_matrix, 1)))
        
        # 7. Get most likely scorelines
        flat_indices = np.argsort(prob_matrix.flatten())[::-1]
        top_scores = []
        for idx in flat_indices[:5]:
            i = int(idx // max_goals)
            j = int(idx % max_goals)
            prob = float(prob_matrix[i, j])
            top_scores.append({
                "score": f"{i} - {j}",
                "team_a_goals": i,
                "team_b_goals": j,
                "probability": prob
            })
            
        # 8. Get Head to Head history
        h2h = self.get_head_to_head(team_a, team_b)
        
        return {
            "team_a": team_a,
            "team_b": team_b,
            "attack_a": att_a,
            "defense_a": def_a,
            "matches_a": mp_a,
            "attack_b": att_b,
            "defense_b": def_b,
            "matches_b": mp_b,
            "expected_goals_a": float(lambda_a),
            "expected_goals_b": float(lambda_b),
            "prob_a_win": prob_a_win,
            "prob_draw": prob_draw,
            "prob_b_win": prob_b_win,
            "top_scorelines": top_scores,
            "h2h": h2h,
            "neutral": neutral
        }
