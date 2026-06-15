<div align="center">

<img src="https://img.shields.io/badge/AI-Neurodegenerative%20Screening-7F77DD?style=for-the-badge&logo=brain&logoColor=white"/>
<img src="https://img.shields.io/badge/Python-3.9%2B-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/Three.js-r128-000000?style=for-the-badge&logo=three.js&logoColor=white"/>
<img src="https://img.shields.io/badge/RandomForest-AUC%200.906-1D9E75?style=for-the-badge"/>
<img src="https://img.shields.io/badge/License-MIT-BA7517?style=for-the-badge"/>

# 🧠 NeuroPredict

**AI-assisted clinical screening and longitudinal monitoring platform**  
for early detection of Alzheimer's Disease, Parkinson's Disease, and MCI

[**Live Demo**](#running-locally) · [**Dataset**](#datasets) · [**Model**](#model--training) · [**Screenshots**](#screenshots)

</div>

---

## What is NeuroPredict?

NeuroPredict is a **software-only clinical screening platform** that uses behavioral telemetry and explainable machine learning to detect early neurological biomarkers — before severe structural symptoms appear.

> ⚠️ **Medical Disclaimer:** NeuroPredict is NOT a medical diagnostic tool. It is an AI-assisted screening and research platform designed for clinical research environments. All predictions must be reviewed by qualified medical professionals.

### Detects
| Condition | Key Biomarkers Used |
|---|---|
| 🔴 Alzheimer's Disease (AD) | MMSE score, age, hippocampal atrophy proxy, CSF dark ratio |
| 🟣 Parkinson's Disease (PD) | UPDRS-III motor score, age, tremor indicators |
| 🟡 MCI (Mild Cognitive Impairment) | MMSE, age, sex — early borderline indicators |
| 🟢 Control (CN) | Normal range across all biomarkers |

---

## Features

### 🤖 AI Prediction Engine
- **RandomForestClassifier** — 150 trees, trained on 162 real clinical subjects
- **AUC 0.906** on holdout test set
- Accepts **CSV** (batch, multi-patient) or **MRI image** (single scan)
- Returns: diagnosis, confidence %, probability distribution, affected regions

### 🧠 Dual 3D Brain Visualization (Three.js + Custom GLSL Shaders)

**Mode 1 — CSV / Clinical data:**
- Transparent glass cortex with real gyri/sulci displacement
- Visible internal structures: hippocampus, lateral ventricles, thalamus, corpus callosum, basal ganglia, substantia nigra
- AD: hippocampus shrinks and turns red; ventricles enlarge 65%
- PD: basal ganglia / substantia nigra turns purple and pulses
- Amyloid plaque particle system (AD/MCI)
- Anatomical floating region labels

**Mode 2 — MRI Image upload (JPG/PNG):**
- Your actual scan rendered in pseudo-3D using **brightness-as-depth displacement**
- 220×220 mesh plane — each vertex displaced by tissue density
- Disease-specific region overlays painted directly on your scan via fragment shader
- Depth map toggle (see the raw depth estimation)

> ⚠️ Single 2D MRI → pseudo-3D only. For true volumetric reconstruction, a full DICOM series is required (use 3D Slicer + VTK/PyVista for that).

### 📈 5-Year Growth Projection
- Year-by-year risk trajectory (Y0 → Y5)
- Treated vs untreated comparison
- Condition-specific progression rates from clinical literature

### 🏥 Clinical Dashboard
- Patient timeline & longitudinal tracking
- Assessment management (MMSE, UPDRS-III, Montreal Cognitive Assessment)
- Cohort analytics with demographic breakdowns
- Research module with dataset management

---

## Project Structure

```
NeuroPredict/
├── index.html              # SPA entry point
├── app.js                  # Client-side router + all page renderers
├── predict_page.js         # Upload & Predict page + 3D brain viewer
├── styles.css              # Design system (dark clinical theme)
├── predict_server.py       # Python inference server (port 8001)
│                           #   • Loads trained_model.pkl
│                           #   • Generates MRI depth maps (PIL)
│                           #   • Returns predictions + growth projections
├── train_neuro_sift.py     # Model training script
├── verify_model.py         # Model verification + test cases
└── backend/
    └── app/
        └── ai/
            └── trained_model.pkl   # ← regenerate with train_neuro_sift.py
```

---
---

## 📺 Project Video Demonstration

Click the thumbnail image below to watch project demo:

[![Watch the Demo Video](https://img.shields.io/badge/YouTube-Video_Walkthrough-red?style=for-the-badge&logo=youtube)](https://youtu.be/nnvMKooAmEs)

---

## Running Locally

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/neuropredict.git
cd neuropredict
```

### 2. Install Python dependencies
```bash
pip install scikit-learn numpy pillow
```

### 3. Train the model (or use pre-trained)
```bash
python train_neuro_sift.py
```
> Requires datasets in `archive/` (see [Datasets](#datasets) section)

### 4. Start the prediction server
```bash
python predict_server.py
# Listening on http://localhost:8001
```

### 5. Serve the frontend
```bash
python -m http.server 3000
# Open http://localhost:3000
```

---

## Datasets

The model was trained on 3 real clinical datasets:

| Dataset | Source | Subjects | Features |
|---|---|---|---|
| **Augmented Alzheimer MRI** | Kaggle | 40,384 MRI images | 4 classes (AD, MCI, CN) |
| **ds004504** | OpenNeuro | EEG recordings | Resting-state + cognitive tasks |
| **NTUA Parkinson** | NTUA | Clinical records | UPDRS-III, demographics |

Download and place in:
```
archive/AugmentedAlzheimerDataset/   ← Alzheimer MRI images
ds004504-main/                       ← EEG dataset
ntua-parkinson-dataset-master/       ← Parkinson clinical data
```

---

## Model & Training

```
Algorithm   : RandomForestClassifier
Trees       : 150
Max depth   : None (full depth)
Features    : Age, Sex, MMSE, UPDRS-III
Classes     : 4 (CN, AD, PD, MCI)
Train size  : 162 subjects (80% split)
Test AUC    : 0.906
```

Retrain from scratch:
```bash
python train_neuro_sift.py
```

Verify model on known test cases:
```bash
python verify_model.py
```

---

## Screenshots

> Upload an MRI scan to see your actual brain scan rendered in pseudo-3D with disease region overlays.

| Transparent Anatomical Brain | MRI Pseudo-3D Viewer |
|---|---|
| Glass cortex + internal structures | Actual scan + depth displacement |
| Hippocampal atrophy (AD) | Region overlays on real scan |
| Amyloid plaque particles | Depth map toggle |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML + CSS + JavaScript (SPA) |
| 3D Engine | Three.js r128 + custom GLSL shaders |
| AI Backend | Python 3 (stdlib only) + scikit-learn |
| Image Processing | Pillow (PIL) |
| Model | scikit-learn RandomForestClassifier |

---

## Roadmap

- [ ] DICOM series support (true 3D reconstruction via VTK/PyVista)
- [ ] NeRF-based volumetric reconstruction from multi-view MRI
- [ ] EEG signal analysis integration
- [ ] MONAI segmentation pipeline
- [ ] Export to 3D Slicer compatible format
- [ ] FHIR-compatible patient data export

---

## Contributing

Pull requests welcome! For major changes, please open an issue first.

---

## License

MIT © 2025 NeuroPredict

---

<div align="center">
<sub>Built with ❤️ for neuroscience research. Not for clinical diagnosis.</sub>
</div>
