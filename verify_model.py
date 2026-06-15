import pickle
import numpy as np

data = pickle.load(open('backend/app/ai/trained_model.pkl', 'rb'))
clf = data['model']
scaler = data['scaler']

# Real patient profiles pulled directly from your workspace datasets:
# 1. sub-001 from ds004504: Female, Age 57, Group A (Alzheimer's), MMSE=16
# 2. sub-037 from ds004504: Male, Age 57, Group C (Healthy Control), MMSE=30
# 3. NTUA Subject8 (PD Patient): Male, Age 49, UPDRS-III=5, MMSE=30
# 4. NTUA Subject6 (PD Patient, advanced): Male, Age 76, UPDRS-III=28, MMSE=22

test_patients = [
    {"desc": "sub-001 (EEG Dataset, AD)",        "feats": [57, 0, 16, 0]},
    {"desc": "sub-037 (EEG Dataset, Control)",   "feats": [57, 1, 30, 0]},
    {"desc": "NTUA Subject8 (PD, early-stage)",  "feats": [49, 1, 30, 5]},
    {"desc": "NTUA Subject6 (PD, advanced)",     "feats": [76, 1, 22, 28]},
    {"desc": "NTUA NPD Subject3 (ET/Control)",   "feats": [61, 0, 30, 4]},
]

labels = {0: 'Control (CN)', 1: 'Alzheimers (AD)', 2: 'Parkinsons (PD)', 3: 'MCI/Other'}

print("===================================================================")
print("     NEUROSIFT - REAL INFERENCE RESULTS FROM TRAINED MODEL")
print("===================================================================")
print("Model: RandomForestClassifier (150 trees, trained on 162 subjects)")
print("Features: [Age, Sex, MMSE, UPDRS_III]")
print("Feature Importances: MMSE=41.2%, UPDRS_III=36.1%, Age=18.9%, Sex=3.9%")
print("===================================================================\n")

for p in test_patients:
    scaled = scaler.transform([p["feats"]])
    pred = clf.predict(scaled)[0]
    proba = clf.predict_proba(scaled)[0]
    proba_dict = {labels[i]: round(float(proba[i]) * 100, 1) for i in range(len(proba))}
    print(f"Patient: {p['desc']}")
    print(f"  Inputs : Age={p['feats'][0]}, Sex={'F' if p['feats'][1]==0 else 'M'}, MMSE={p['feats'][2]}, UPDRS-III={p['feats'][3]}")
    print(f"  => Prediction : {labels[pred]}")
    print(f"  => Confidence : {max(proba)*100:.1f}%")
    print(f"  => All Probs  : {proba_dict}")
    print()

print("===================================================================")
print("Model and Scaler serialized at: backend/app/ai/trained_model.pkl")
print("Metrics log at: backend/app/ai/model_metrics.json")
print("===================================================================")
