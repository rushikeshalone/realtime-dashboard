const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ollamaController = require('../controllers/ollama.controller');
const validationMiddleware = require('../middlewares/validationMiddleware');

// Configure Multer for prompt file uploads
const prompts_dir = path.join(__dirname, '../prompts_data');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, prompts_dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Health check (no auth required)
router.get('/ollama-health', ollamaController.checkHealth);

// Chat routes
router.post('/generate', ollamaController.generateSQL);
router.post('/upload-prompt', upload.single('file'), ollamaController.uploadPromptFile);
router.post('/sync-pinecone', ollamaController.syncPinecone);

module.exports = router;
