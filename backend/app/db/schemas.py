-- PostgreSQL & TimescaleDB Longitudinal Database Schema definitions
-- Relational structures optimized for rapid spatial telemetry write loops

-- Enable extension if missing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Clinicians Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('physician', 'researcher', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for username lookup
CREATE INDEX idx_users_username ON users(username);

-- 2. Patients Table
CREATE TABLE patients (
    id VARCHAR(50) PRIMARY KEY, -- Clinical patient ID format, e.g., 'NP-1082'
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    gender CHAR(1) NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    primary_cohort VARCHAR(100) NOT NULL,
    mmse_baseline INT CHECK (mmse_baseline BETWEEN 0 AND 30),
    updrs_baseline INT CHECK (updrs_baseline BETWEEN 0 AND 126),
    status VARCHAR(50) DEFAULT 'Active Monitoring',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Telemetry Session Head
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(50) REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES users(id),
    task_type VARCHAR(100) NOT NULL, -- e.g., 'reaction_latency', 'symbol_digit'
    avg_latency FLOAT NOT NULL,
    accuracy_pct FLOAT NOT NULL,
    drift_deviation FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_patient ON sessions(patient_id);

-- 4. TimescaleDB raw telemetry details
-- This table records individual click/alignment latency vectors
CREATE TABLE telemetry_streams (
    id UUID DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    trial_index INT NOT NULL,
    click_latency_ms INT NOT NULL,
    task_switching_cost_ms INT DEFAULT 0,
    is_correct BOOLEAN NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Convert to timescale hypertable if loaded inside TimescaleDB container
-- SELECT create_hypertable('telemetry_streams', 'recorded_at');

-- 5. SHAP Feature Attribution logs
CREATE TABLE shap_attributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    feature_name VARCHAR(150) NOT NULL,
    impact_score FLOAT NOT NULL,
    feature_description TEXT
);

CREATE INDEX idx_shap_session ON shap_attributions(session_id);
