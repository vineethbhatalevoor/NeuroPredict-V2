"""
========================================================================
   NEUROPREDICT - DATA HARMONIZATION & SYSTEM TRAINING PIPELINE
   Trains a multi-cohort classifier on the local workspace datasets:
   1. ds004504 EEG demographic indices (88 subjects)
   2. NTUA Parkinson DaT/Clinical metrics (78 subjects)
========================================================================
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
import pickle
import json

def load_eeg_dataset(path: str) -> pd.DataFrame:
    """
    Loads participants.tsv from ds004504 EEG dataset.
    """
    tsv_file = os.path.join(path, "ds004504-main", "ds004504-main", "participants.tsv")
    if not os.path.exists(tsv_file):
        print(f"[Warning] EEG metadata file not found at {tsv_file}")
        return pd.DataFrame()
    
    df = pd.read_csv(tsv_file, sep='\t')
    print(f"[Ingest] Loaded EEG participants file: {df.shape[0]} subjects")
    
    # Preprocess and align labels
    df = df.dropna(subset=['Age', 'MMSE', 'Group'])
    df['Sex'] = df['Gender'].map({'M': 1, 'F': 0})
    
    # Map groups: A -> 1 (AD), C -> 0 (Control), F -> 3 (MCI/FTD)
    df['Label'] = df['Group'].map({'C': 0, 'A': 1, 'F': 3})
    df['UPDRS_III'] = 0.0 # EEG cohort doesn't have UPDRS
    
    # Keep standardized columns
    return df[['Age', 'Sex', 'MMSE', 'UPDRS_III', 'Label']]

def load_parkinson_dataset(path: str) -> pd.DataFrame:
    """
    Loads pd_subject_info.csv and npd_subject_info.csv from NTUA Parkinson dataset.
    """
    base_dir = os.path.join(path, "ntua-parkinson-dataset-master", "ntua-parkinson-dataset-master")
    pd_file = os.path.join(base_dir, "PD Patients", "pd_subject_info.csv")
    npd_file = os.path.join(base_dir, "Non PD Patients", "npd_subject_info.csv")
    
    if not os.path.exists(pd_file) or not os.path.exists(npd_file):
        print("[Warning] Parkinson subject CSV files missing.")
        return pd.DataFrame()
    
    # Load PD
    df_pd = pd.read_csv(pd_file)
    print(f"[Ingest] Loaded PD Patients file: {df_pd.shape[0]} entries")
    df_pd = df_pd.dropna(subset=['Age (=last seen-D)'])
    df_pd['Age'] = df_pd['Age (=last seen-D)'].astype(float)
    df_pd['Sex'] = df_pd['Sex (M/F)'].map({'M': 1, 'F': 0, 'f': 0})
    # Parse MMSE
    df_pd['MMSE'] = pd.to_numeric(df_pd['MMSE (0-30)'], errors='coerce').fillna(24.0)
    # Parse UPDRS III
    df_pd['UPDRS_III'] = pd.to_numeric(df_pd['UPDRS III (0-126)'], errors='coerce').fillna(15.0)
    df_pd['Label'] = 2 # Label 2 represents Parkinson's Disease (PD)
    
    # Load Non-PD (Controls and other conditions)
    df_npd = pd.read_csv(npd_file)
    print(f"[Ingest] Loaded NPD Patients file: {df_npd.shape[0]} entries")
    df_npd = df_npd.dropna(subset=['Age (=last seen-D)'])
    df_npd['Age'] = df_npd['Age (=last seen-D)'].astype(float)
    df_npd['Sex'] = df_npd['Sex (M/F)'].map({'M': 1, 'F': 0, 'f': 0})
    df_npd['MMSE'] = pd.to_numeric(df_npd['MMSE (0-30)'], errors='coerce').fillna(29.0)
    df_npd['UPDRS_III'] = pd.to_numeric(df_npd['UPDRS III (0-126)'], errors='coerce').fillna(2.0)
    
    # Map NPD diagnosis: SWEDD/ET as MCI (3) or normal control (0)
    def map_npd_label(row):
        diag = str(row.get('DIAGN', '')).upper()
        if 'ET' in diag or 'SWEDD' in diag or 'DYSTONIA' in diag:
            return 3 # Mild Cognitive Impairment / other tremor
        return 0 # Healthy Control
        
    df_npd['Label'] = df_npd.apply(map_npd_label, axis=1)
    
    # Standardize columns
    cols = ['Age', 'Sex', 'MMSE', 'UPDRS_III', 'Label']
    combined_pd = pd.concat([
        df_pd[cols],
        df_npd[cols]
    ], ignore_index=True)
    
    return combined_pd

def generate_synthetic_data() -> pd.DataFrame:
    print("[Ingest] Datasets not found. Generating synthetic/clinical-proxy data for model calibration...")
    np.random.seed(42)
    n_samples_per_class = 100
    
    # Class 0: Control (CN)
    age_cn = np.random.normal(65, 8, n_samples_per_class)
    sex_cn = np.random.randint(0, 2, n_samples_per_class)
    mmse_cn = np.random.randint(27, 31, n_samples_per_class)
    updrs_cn = np.random.randint(0, 6, n_samples_per_class)
    label_cn = np.zeros(n_samples_per_class, dtype=int)
    
    # Class 1: Alzheimer's (AD)
    age_ad = np.random.normal(74, 7, n_samples_per_class)
    sex_ad = np.random.randint(0, 2, n_samples_per_class)
    mmse_ad = np.random.randint(10, 22, n_samples_per_class)
    updrs_ad = np.random.randint(0, 6, n_samples_per_class)
    label_ad = np.ones(n_samples_per_class, dtype=int)
    
    # Class 2: Parkinson's (PD)
    age_pd = np.random.normal(68, 8, n_samples_per_class)
    sex_pd = np.random.randint(0, 2, n_samples_per_class)
    mmse_pd = np.random.randint(24, 31, n_samples_per_class)
    updrs_pd = np.random.randint(15, 45, n_samples_per_class)
    label_pd = np.ones(n_samples_per_class, dtype=int) * 2
    
    # Class 3: MCI/Other
    age_mci = np.random.normal(70, 8, n_samples_per_class)
    sex_mci = np.random.randint(0, 2, n_samples_per_class)
    mmse_mci = np.random.randint(22, 26, n_samples_per_class)
    updrs_mci = np.random.randint(4, 15, n_samples_per_class)
    label_mci = np.ones(n_samples_per_class, dtype=int) * 3
    
    df = pd.DataFrame({
        'Age': np.concatenate([age_cn, age_ad, age_pd, age_mci]),
        'Sex': np.concatenate([sex_cn, sex_ad, sex_pd, sex_mci]),
        'MMSE': np.concatenate([mmse_cn, mmse_ad, mmse_pd, mmse_mci]),
        'UPDRS_III': np.concatenate([updrs_cn, updrs_ad, updrs_pd, updrs_mci]),
        'Label': np.concatenate([label_cn, label_ad, label_pd, label_mci])
    })
    return df

def train_neuro_sift():
    workspace = os.path.dirname(os.path.abspath(__file__))
    print("==========================================================")
    print("      NEUROPREDICT COHORT PIPELINE CALIBRATOR START")
    print("==========================================================")
    
    # 1. Ingest datasets
    df_eeg = load_eeg_dataset(workspace)
    df_pd = load_parkinson_dataset(workspace)
    
    if df_eeg.empty and df_pd.empty:
        df_all = generate_synthetic_data()
    else:
        # Unify harmonized databases
        df_all = pd.concat([df_eeg, df_pd], ignore_index=True)
        df_all = df_all.dropna()
    print(f"\n[Harmonize] Unified dataset compiled successfully: {df_all.shape[0]} subjects")
    print(f"[Cohort Distribution]:\n{df_all['Label'].value_counts().rename({0:'Control (CN)', 1:'Alzheimers (AD)', 2:'Parkinsons (PD)', 3:'MCI/Other'})}")
    
    # 2. Extract Features & Targets
    features = ['Age', 'Sex', 'MMSE', 'UPDRS_III']
    X = df_all[features].values
    y = df_all['Label'].values
    
    # 3. Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    
    # 4. Standard Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 5. Train Random Forest model (representing the NeuroSift classifier core)
    print("\n[Train] Optimizing Random Forest Screening Classifier...")
    clf = RandomForestClassifier(n_estimators=150, max_depth=6, random_state=42)
    clf.fit(X_train_scaled, y_train)
    
    # 6. Evaluation metrics
    y_pred = clf.predict(X_test_scaled)
    y_prob = clf.predict_proba(X_test_scaled)
    
    # Multi-class ROC-AUC (One-vs-Rest)
    roc_auc = roc_auc_score(y_test, y_prob, multi_class='ovr')
    
    # Confusion matrix to calculate sensitivity/specificity
    cm = confusion_matrix(y_test, y_pred)
    
    # Class-level sensitivities (Recall)
    sensitivity = []
    specificity = []
    for i in range(len(cm)):
        tp = cm[i, i]
        fn = np.sum(cm[i, :]) - tp
        fp = np.sum(cm[:, i]) - tp
        tn = np.sum(cm) - (tp + fp + fn)
        
        sens = tp / (tp + fn) if (tp + fn) > 0 else 0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0
        sensitivity.append(sens)
        specificity.append(spec)
        
    avg_sens = np.mean(sensitivity)
    avg_spec = np.mean(specificity)
    
    print("\n==========================================================")
    print("      NEUROSIFT PIPELINE COMPILATION METRICS")
    print("==========================================================")
    print(f"Validation Set Size : {len(y_test)} Cohorts")
    print(f"Unified ROC-AUC     : {roc_auc:.4f}")
    print(f"Mean Sensitivity    : {avg_sens:.4f}")
    print(f"Mean Specificity    : {avg_spec:.4f}")
    
    # Save the trained model and scaler to the backend AI layer
    ai_dir = os.path.join(workspace, "backend", "app", "ai")
    os.makedirs(ai_dir, exist_ok=True)
    
    # Serialize scaler & model
    with open(os.path.join(ai_dir, "trained_model.pkl"), "wb") as f:
        pickle.dump({"model": clf, "scaler": scaler, "features": features}, f)
        
    # Write dynamic metrics file for backend integration
    metrics = {
        "status": "calibrated",
        "unified_auc": round(float(roc_auc), 4),
        "mean_sensitivity": round(float(avg_sens), 4),
        "mean_specificity": round(float(avg_spec), 4),
        "class_distributions": df_all['Label'].value_counts().to_dict(),
        "feature_importances": dict(zip(features, [round(float(w), 4) for w in clf.feature_importances_]))
    }
    
    with open(os.path.join(ai_dir, "model_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(f"\n[Success] Model saved to {os.path.join(ai_dir, 'trained_model.pkl')}")
    print(f"[Success] Metrics saved to {os.path.join(ai_dir, 'model_metrics.json')}")
    print("==========================================================")

if __name__ == "__main__":
    train_neuro_sift()
