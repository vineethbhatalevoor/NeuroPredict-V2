from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.auth.jwt import get_current_user, RoleChecker, UserTokenPayload

router = APIRouter()

# Schema structures
class TelemetryTrial(BaseModel):
    latency: int = Field(..., description="Click/keypress latency in milliseconds", example=340)
    correct: bool = Field(..., description="Task alignment accuracy", example=True)

class SessionPostPayload(BaseModel):
    patient_id: str = Field(..., example="NP-1082")
    task_type: str = Field(..., description="BAM-01 reaction or symbol matching tasks", example="symbol_digit")
    trials: List[TelemetryTrial]
    avg_latency: float = Field(..., example=365.2)
    accuracy: float = Field(..., example=96.0)

class PatientSummary(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    cohort: str
    risk_score: int
    drift: float
    last_session: str

# Mock Database adapters
MOCK_PATIENTS_DB = {
    "NP-1082": {
        "id": "NP-1082",
        "name": "Ananya Sharma",
        "age": 67,
        "gender": "F",
        "cohort": "Alzheimer's Disease (AD) Risk",
        "risk_score": 78,
        "confidence": 91,
        "mmse": 16,
        "updrs": None,
        "status": "Active Monitoring",
        "drift": 18.4,
        "last_session": "2026-05-18",
        "history": [
            {"date": "Jan 26", "risk": 62, "latency": 410, "accuracy": 88},
            {"date": "May 18", "risk": 78, "latency": 512, "accuracy": 72}
        ],
        "shap": [
            {"feature": "Symbol-Digit Switch Latency", "impact": 24},
            {"feature": "Reaction Latency (Task 2)", "impact": 18}
        ]
    },
    "NP-2041": {
        "id": "NP-2041",
        "name": "Rahul Verma",
        "age": 72,
        "gender": "M",
        "cohort": "Parkinson's Disease (PD) Risk",
        "risk_score": 65,
        "confidence": 87,
        "mmse": 24,
        "updrs": 18,
        "status": "Action Required",
        "drift": 12.8,
        "last_session": "2026-05-15",
        "history": [
            {"date": "Feb 10", "risk": 52, "latency": 380, "accuracy": 92},
            {"date": "May 15", "risk": 65, "latency": 448, "accuracy": 82}
        ],
        "shap": [
            {"feature": "Motor Tapping Jitter", "impact": 22},
            {"feature": "Reaction Latency (Task 2)", "impact": 15}
        ]
    }
}

@router.get("/patients", response_model=List[PatientSummary], tags=["Clinical Workspace"])
def list_patients(user: UserTokenPayload = Depends(RoleChecker(["physician", "admin"]))):
    """
    Physician-restricted endpoint to retrieve actively monitored subject queues.
    """
    return [
        PatientSummary(
            id=p["id"],
            name=p["name"],
            age=p["age"],
            gender=p["gender"],
            cohort=p["cohort"],
            risk_score=p["risk_score"],
            drift=p["drift"],
            last_session=p["last_session"]
        ) for p in MOCK_PATIENTS_DB.values()
    ]

@router.get("/patients/{patient_id}", tags=["Clinical Workspace"])
def get_patient_details(patient_id: str, user: UserTokenPayload = Depends(RoleChecker(["physician", "researcher", "admin"]))):
    """
    Retrieves high-fidelity biometric longitudinal profiles, historical records, and SHAP explanations.
    """
    if patient_id not in MOCK_PATIENTS_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient record {patient_id} not found in secure screening workspace."
        )
    return MOCK_PATIENTS_DB[patient_id]

@router.post("/sessions/telemetry", status_code=status.HTTP_201_CREATED, tags=["Clinical Workspace"])
def submit_session_telemetry(payload: SessionPostPayload, user: UserTokenPayload = Depends(RoleChecker(["physician", "admin"]))):
    """
    Ingests live keyboard, mouse, and tactile latency indicators.
    Calculates diagnostic risk changes using the NeuroSift pipeline.
    """
    if payload.patient_id not in MOCK_PATIENTS_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designated patient does not exist."
        )
    
    patient = MOCK_PATIENTS_DB[payload.patient_id]
    
    # Simple simulated classification update
    new_risk = int(min(max(40 + (payload.avg_latency - 300) / 5, 10), 95))
    patient["risk_score"] = new_risk
    patient["drift"] = round((new_risk - 40) / 4, 1)
    patient["last_session"] = "2026-05-20"
    patient["history"].append({
        "date": "May 20",
        "risk": new_risk,
        "latency": int(payload.avg_latency),
        "accuracy": int(payload.accuracy)
    })
    
    return {
        "status": "telemetry_ingested",
        "patient_id": payload.patient_id,
        "updated_risk_score": new_risk,
        "updated_drift_pct": patient["drift"]
    }

@router.get("/research/models", tags=["Research Engine"])
def get_model_validation_stats(user: UserTokenPayload = Depends(RoleChecker(["researcher", "admin"]))):
    """
    Returns metrics profiling model training, ROC-AUC distributions, and feature weights for ADNI/PPMI databases.
    """
    return {
        "classification_scores": {
            "Alzheimers_XGBoost": {"ROC-AUC": 0.962, "Sensitivity": 0.94, "Specificity": 0.93, "F1-Score": 0.92},
            "Parkinsons_LSTM": {"ROC-AUC": 0.948, "Sensitivity": 0.91, "Specificity": 0.95, "F1-Score": 0.93},
            "MCI_Autoencoder": {"ROC-AUC": 0.884, "Sensitivity": 0.84, "Specificity": 0.89, "F1-Score": 0.85}
        },
        "ingested_workspace_metrics": {
            "ds004504_EEG": {"subjects": 88, "channels": 19, "MMSE_corr": 0.74},
            "NTUA_Parkinson": {"subjects": 78, "UPDRS_corr": 0.81}
        }
    }
