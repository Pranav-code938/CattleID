class CattleIDApp {
    constructor() {
        this.model = null;
        this.modelUrl = 'YOUR_TENSORFLOW_MODEL_URL_HERE'; // Replace with your actual model URL
        this.isModelLoaded = false;
        this.currentImage = null;
        this.stream = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadHistory();
        this.loadModel();
    }

    initializeElements() {
        // Image elements
        this.imagePreview = document.getElementById('imagePreview');
        this.previewImage = document.getElementById('previewImage');
        this.camera = document.getElementById('camera');
        this.canvas = document.getElementById('canvas');
        this.fileInput = document.getElementById('fileInput');

        // Button elements
        this.takePictureBtn = document.getElementById('takePictureBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        // UI elements
        this.resultsSection = document.getElementById('resultsSection');
        this.predictionResults = document.getElementById('predictionResults');
        this.confidenceValue = document.getElementById('confidenceValue');
        this.confidenceFill = document.getElementById('confidenceFill');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.historyContainer = document.getElementById('historyContainer');
        this.toast = document.getElementById('toast');
        
        this.ctx = this.canvas.getContext('2d');
    }

    bindEvents() {
        this.takePictureBtn.addEventListener('click', () => this.startCamera());
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.retakeBtn.addEventListener('click', () => this.resetCamera());
        this.analyzeBtn.addEventListener('click', () => this.analyzeImage());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    async loadModel() {
        try {
            if (this.modelUrl === 'YOUR_TENSORFLOW_MODEL_URL_HERE') {
                this.showToast('Please set your TensorFlow.js model URL in the code', 'warning');
                return;
            }
            
            this.showToast('Loading AI model...', 'info');
            this.model = await tf.loadLayersModel(this.modelUrl);
            this.isModelLoaded = true;
            this.showToast('AI model loaded successfully!', 'success');
        } catch (error) {
            console.error('Error loading model:', error);
            this.showToast('Failed to load AI model', 'error');
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            this.camera.srcObject = this.stream;
            this.showCameraView();
        } catch (error) {
            console.error('Camera access denied:', error);
            this.showToast('Camera access denied', 'error');
        }
    }

    showCameraView() {
        this.imagePreview.style.display = 'none';
        this.previewImage.style.display = 'none';
        this.camera.style.display = 'block';
        
        document.querySelector('.button-group').style.display = 'none';
        document.querySelector('.action-buttons').style.display = 'grid';
        this.analyzeBtn.style.display = 'none';
    }

    capturePhoto() {
        const video = this.camera;
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        
        this.ctx.drawImage(video, 0, 0);
        const imageDataUrl = this.canvas.toDataURL('image/jpeg', 0.8);
        
        this.currentImage = imageDataUrl;
        this.showCapturedImage(imageDataUrl);
        this.stopCamera();
    }

    showCapturedImage(imageDataUrl) {
        this.previewImage.src = imageDataUrl;
        this.previewImage.style.display = 'block';
        this.camera.style.display = 'none';
        this.imagePreview.style.display = 'none';
        
        document.querySelector('.action-buttons').style.display = 'none';
        document.querySelector('.button-group').style.display = 'grid';
        this.analyzeBtn.style.display = 'block';
    }

    resetCamera() {
        this.stopCamera();
        this.showDefaultView();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.camera.style.display = 'none';
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentImage = e.target.result;
                this.showUploadedImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    showUploadedImage(imageDataUrl) {
        this.previewImage.src = imageDataUrl;
        this.previewImage.style.display = 'block';
        this.imagePreview.style.display = 'none';
        this.analyzeBtn.style.display = 'block';
    }

    showDefaultView() {
        this.imagePreview.style.display = 'flex';
        this.previewImage.style.display = 'none';
        this.camera.style.display = 'none';
        
        document.querySelector('.button-group').style.display = 'grid';
        document.querySelector('.action-buttons').style.display = 'none';
        this.analyzeBtn.style.display = 'none';
        
        this.currentImage = null;
        this.fileInput.value = '';
    }

    async analyzeImage() {
        if (!this.currentImage) {
            this.showToast('No image to analyze', 'error');
            return;
        }

        if (!this.isModelLoaded) {
            this.showToast('AI model not loaded yet', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            // Convert image to tensor
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = this.currentImage;
            });

            // Preprocess image (adjust size according to your model requirements)
            const tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224]) // Adjust size as per your model
                .toFloat()
                .div(tf.scalar(255.0))
                .expandDims();

            // Make prediction
            const predictions = await this.model.predict(tensor).data();
            
            // Process predictions (adjust according to your model output)
            const results = this.processPredictions(predictions);
            
            // Display results
            this.displayResults(results);
            
            // Save to history
            this.saveToHistory(this.currentImage, results[0]);
            
            tensor.dispose();
            
        } catch (error) {
            console.error('Error during prediction:', error);
            this.showToast('Error analyzing image', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    processPredictions(predictions) {
        // Define your cattle breeds (adjust according to your model classes)
        const breeds = [
            'Holstein', 'Angus', 'Hereford', 'Brahman', 'Jersey', 
            'Charolais', 'Simmental', 'Limousin', 'Shorthorn', 'Devon'
        ];

        const results = predictions
            .map((confidence, index) => ({
                breed: breeds[index] || `Class ${index}`,
                confidence: Math.round(confidence * 100)
            }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3); // Top 3 predictions

        return results;
    }

    displayResults(results) {
        const topPrediction = results[0];
        
        this.predictionResults.innerHTML = results
            .map(result => `
                <div class="prediction-item">
                    <span class="breed-name">${result.breed}</span>
                    <span class="confidence-badge">${result.confidence}%</span>
                </div>
            `).join('');

        this.confidenceValue.textContent = `${topPrediction.confidence}%`;
        this.confidenceFill.style.width = `${topPrediction.confidence}%`;
        
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        this.showToast(`Prediction: ${topPrediction.breed} (${topPrediction.confidence}%)`, 'success');
    }

    saveToHistory(imageDataUrl, topPrediction) {
        const historyItem = {
            id: Date.now(),
            image: imageDataUrl,
            breed: topPrediction.breed,
            confidence: topPrediction.confidence,
            timestamp: new Date().toISOString()
        };

        let history = JSON.parse(localStorage.getItem('cattleHistory') || '[]');
        history.unshift(historyItem);
        
        // Keep only last 10 items
        history = history.slice(0, 10);
        
        localStorage.setItem('cattleHistory', JSON.stringify(history));
        this.loadHistory();
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('cattleHistory') || '[]');
        
        if (history.length === 0) {
            this.historyContainer.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>No predictions yet</p>
                </div>
            `;
            return;
        }

        this.historyContainer.innerHTML = history
            .map(item => `
                <div class="history-item">
                    <img src="${item.image}" alt="Cattle" class="history-image">
                    <div class="history-content">
                        <div class="history-breed">${item.breed}</div>
                        <div class="history-confidence">Confidence: ${item.confidence}%</div>
                        <div class="history-date">${new Date(item.timestamp).toLocaleDateString()}</div>
                    </div>
                </div>
            `).join('');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history?')) {
            localStorage.removeItem('cattleHistory');
            this.loadHistory();
            this.showToast('History cleared', 'success');
        }
    }

    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'block' : 'none';
        if (show) {
            this.loadingIndicator.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CattleIDApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Stop camera when page is not visible
        const app = window.cattleApp;
        if (app && app.stream) {
            app.stopCamera();
        }
    }
});
