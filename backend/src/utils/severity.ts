import { SeverityLabel } from '../models/HazardReport';

/**
 * Deterministic Municipal Hazard Severity Calculation Engine
 * 
 * Rules:
 * 1. Base category score (0-70):
 *    - Fallen Tree / Obstruction: 70 (high immediate danger to road users)
 *    - Pothole / Road Damage: 50 (moderate-to-high vehicle and cyclist risk)
 *    - Waterlogging / Flooding: 40 (navigational hazard and structural risk)
 *    - Broken Streetlight: 30 (visibility / security issue)
 *    - Illegal Dumping / Garbage / Other: 20 (sanitary and aesthetic issue)
 * 
 * 2. AI Confidence Boost (0-30):
 *    - If real AI detections exist: adds (maxConfidence * 30).
 *    - If no detections: 0 boost. Never fabricates values.
 * 
 * 3. AI Multi-detection Impact Factor (0-20):
 *    - Adds 5 points per detected hazard up to a maximum of 20 points.
 * 
 * 4. Deterministic Clamping & Thresholds:
 *    - Clamped strictly between 0 and 100.
 *    - Critical: score >= 80
 *    - High:     60 <= score < 80
 *    - Medium:   35 <= score < 60
 *    - Low:      score < 35
 */
export const calculateSeverity = (category?: string, aiDetections?: any[]): { score: number, label: SeverityLabel } => {
  let score = 0;
  
  const lowerCat = String(category || '').toLowerCase().trim();
  if (/\b(tree|trees|fallen|obstruction)\b/i.test(lowerCat)) {
    score += 70;
  } else if (/\b(pothole|potholes|damage|road)\b/i.test(lowerCat)) {
    score += 50;
  } else if (/\b(water|flood|flooding|waterlogging)\b/i.test(lowerCat)) {
    score += 40;
  } else if (/\b(light|lights|streetlight|streetlights|street)\b/i.test(lowerCat)) {
    score += 30;
  } else {
    score += 20;
  }
  
  if (Array.isArray(aiDetections) && aiDetections.length > 0) {
    const validConfidences = aiDetections
      .map(d => typeof d?.confidence === 'number' && !isNaN(d.confidence) ? d.confidence : 0)
      .filter(c => c > 0);
      
    if (validConfidences.length > 0) {
      const maxConfidence = Math.max(...validConfidences);
      score += maxConfidence * 30;
    }
    
    const countBoost = Math.min(20, aiDetections.length * 5);
    score += countBoost;
  }
  
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  
  let label = SeverityLabel.Low;
  if (clampedScore >= 80) label = SeverityLabel.Critical;
  else if (clampedScore >= 60) label = SeverityLabel.High;
  else if (clampedScore >= 35) label = SeverityLabel.Medium;
  
  return { score: clampedScore, label };
};
