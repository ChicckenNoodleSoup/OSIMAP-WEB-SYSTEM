import React from 'react';
import { Upload, Database, Map, CheckCircle, AlertCircle } from 'lucide-react';

const ProcessingSteps = ({ currentStep, processingStage }) => {
  const steps = [
    { id: 1, label: "Upload File", icon: Upload },
    { id: 2, label: "Excel → Supabase", icon: Database },
    { id: 3, label: "Supabase → GeoJSON", icon: Map },
    { id: 4, label: "Complete", icon: CheckCircle },
  ];

  return (
    <div className="processing-steps">
      <div className="processing-steps-row">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isError = processingStage === "error" && currentStep === step.id;

          return (
            <div key={step.id} className="processing-step">
              <div className="step-icon-wrapper">
                <div
                  className={`step-circle 
                    ${isError ? "error" : ""} 
                    ${isCompleted ? "completed" : ""} 
                    ${isActive ? "active" : ""}`}
                >
                  {isError ? (
                    <AlertCircle className="icon error" />
                  ) : (
                    <Icon
                      className={`icon 
                        ${isCompleted ? "completed" : ""} 
                        ${isActive ? "active" : ""}`}
                    />
                  )}
                </div>
                <span
                  className={`step-label 
                    ${isError ? "error" : ""} 
                    ${isCompleted ? "completed" : ""} 
                    ${isActive ? "active" : ""}`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`step-connector ${
                    currentStep > step.id ? "completed" : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessingSteps;

