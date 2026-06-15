import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List
import xgboost as xgb
import torch
import torch.nn as nn
import shap
from sklearn.preprocessing import StandardScaler

# 1. Digital Signal Preprocessing Pipeline (scalp EEG Butterworth filter)
class SignalPreprocessor:
    def __init__(self, sfreq: float = 250.0):
        self.sfreq = sfreq

    def apply_butterworth_filter(self, data: np.ndarray, l_freq: float = 0.5, h_freq: float = 45.0, order: int = 4) -> np.ndarray:
        """
        Applies a zero-phase Butterworth filter on raw EEG channel signals, replicating the Butterworth preprocessing
        validated in the local ds004504 workspace database.
        """
        from scipy.signal import butter, filtfilt
        nyq = 0.5 * self.sfreq
        low = l_freq / nyq
        high = h_freq / nyq
        b, a = butter(order, [low, high], btype='band')
        return filtfilt(b, a, data, axis=-1)

    def extract_power_bands(self, eeg_data: np.ndarray) -> Dict[str, float]:
        """
        Extracts Delta (0.5-4Hz), Theta (4-8Hz), Alpha (8-12Hz), and Beta (12-30Hz) absolute band powers.
        """
        # Simulated Fast Fourier Transform spectral power band integration
        freqs = np.fft.rfftfreq(eeg_data.shape[-1], d=1/self.sfreq)
        psd = np.abs(np.fft.rfft(eeg_data, axis=-1)) ** 2
        
        bands = {
            "delta": (0.5, 4.0),
            "theta": (4.0, 8.0),
            "alpha": (8.0, 12.0),
            "beta": (12.0, 30.0)
        }
        
        band_powers = {}
        for band_name, (low, high) in bands.items():
            idx = np.logical_and(freqs >= low, freqs <= high)
            band_powers[band_name] = float(np.mean(psd[:, idx]))
            
        return band_powers

# 2. PyTorch Bi-modal Deep ResNet structure
class BiModalCognitiveNet(nn.Module):
    def __init__(self, telemetry_dim: int = 5, spatial_dim: int = 4, hidden_dim: int = 32, num_classes: int = 3):
        super(BiModalCognitiveNet, self).__init__()
        # Telemetry processing branch (Latency, Switches, Accuracies)
        self.telemetry_branch = nn.Sequential(
            nn.Linear(telemetry_dim, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim)
        )
        
        # Spatial processing branch (EEG, MRI power features)
        self.spatial_branch = nn.Sequential(
            nn.Linear(spatial_dim, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim)
        )
        
        # Combined dense block
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, num_classes) # Outputs logits for [AD, PD, MCI]
        )

    def forward(self, telemetry_feats: torch.Tensor, spatial_feats: torch.Tensor) -> torch.Tensor:
        x_tel = self.telemetry_branch(telemetry_feats)
        x_spat = self.spatial_branch(spatial_feats)
        x_comb = torch.cat((x_tel, x_spat), dim=1)
        return self.classifier(x_comb)

# 3. XGBoost & SHAP Ensemble screening classifier
class NeuroSiftPredictor:
    def __init__(self):
        self.model = xgb.XGBClassifier(
            max_depth=5,
            learning_rate=0.05,
            n_estimators=100,
            objective="multi:softprob",
            num_class=3,
            eval_metric="mlogloss"
        )
        self.scaler = StandardScaler()
        self.feature_names = [
            "symbol_switch_latency",
            "reaction_latency_avg",
            "symbol_accuracy_rate",
            "motor_jitter_rate",
            "mmse_deviation_delta"
        ]

    def fit_model(self, X: np.ndarray, y: np.ndarray):
        """
        Trains the XGBoost classifier and calibrates standard scaling parameters.
        """
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)

    def predict_risk_and_explain(self, X_sample: np.ndarray) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Computes multi-class probability projections and generates SHAP attribution explanation vectors.
        """
        X_scaled = self.scaler.transform(X_sample)
        probabilities = self.model.predict_proba(X_scaled)[0] # Multi-class probability array
        
        # Compute SHAP attributions using TreeExplainer
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(X_scaled)
        
        # Format feature attributions
        attributions = []
        for idx, feat_name in enumerate(self.feature_names):
            # Sum attribution weight across classes
            impact = float(np.mean([shap_values[c][0, idx] for c in range(3)]))
            attributions.append({
                "feature": feat_name,
                "impact": round(impact * 100, 2),
                "description": f"Model attribution factor for {feat_name.replace('_', ' ')}"
            })
            
        return probabilities, attributions
