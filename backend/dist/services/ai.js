"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImageWithAI = exports.isAIConfigured = void 0;
const axios_1 = __importDefault(require("axios"));
const isAIConfigured = () => {
    const key = process.env.ROBOFLOW_API_KEY;
    return Boolean(key && key !== 'your_roboflow_api_key' && key.trim() !== '');
};
exports.isAIConfigured = isAIConfigured;
const analyzeImageWithAI = async (imageUrl) => {
    if (!(0, exports.isAIConfigured)()) {
        return {
            configured: false,
            detections: [],
            metadata: {
                modelId: 'none',
                inferenceTimeMs: 0,
                status: 'AI detection is not configured. Add a valid ROBOFLOW_API_KEY in backend/.env to enable inference.'
            }
        };
    }
    try {
        const modelEndpoint = process.env.ROBOFLOW_MODEL_ENDPOINT || 'road-damage-nqw00/1';
        const response = await (0, axios_1.default)({
            method: 'POST',
            url: `https://detect.roboflow.com/${modelEndpoint}`,
            params: {
                api_key: process.env.ROBOFLOW_API_KEY,
                image: imageUrl
            },
            timeout: 10000
        });
        const predictions = response.data?.predictions || [];
        const detections = predictions.map((p) => ({
            class: String(p.class || 'hazard'),
            confidence: typeof p.confidence === 'number' ? Number(p.confidence) : 0,
            bbox: {
                x: Number(p.x || 0),
                y: Number(p.y || 0),
                width: Number(p.width || 0),
                height: Number(p.height || 0)
            }
        }));
        return {
            configured: true,
            detections,
            metadata: {
                modelId: modelEndpoint,
                inferenceTimeMs: response.data?.time ? Math.round(response.data.time * 1000) : 0,
                status: 'Inference completed successfully'
            }
        };
    }
    catch (error) {
        const errorMsg = error.response?.data?.message || error.message || 'Service unreachable';
        console.warn('AI Inference Notice:', errorMsg);
        return {
            configured: false,
            detections: [],
            metadata: {
                modelId: process.env.ROBOFLOW_MODEL_ENDPOINT || 'road-damage-nqw00/1',
                inferenceTimeMs: 0,
                status: `Inference unavailable: ${errorMsg}`
            }
        };
    }
};
exports.analyzeImageWithAI = analyzeImageWithAI;
