 
export class MediaPipeHands {
  constructor(videoElement, onResultsCallback) {
    console.log('Initializing MediaPipeHands');
    try {
      const hands = new Hands({
        locateFile: (file) => {
          return `/models/hands/${file}`;
        },
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      hands.onResults(onResultsCallback);

      this.camera = new Camera(videoElement, {
        async onFrame() {
          await hands.send({ image: videoElement });
        },
        width: 1920,
        height: 1080,
      });

      // Do not start the camera automatically
      this.cameraStarted = false;
      console.log('MediaPipeHands initialized successfully');
    } catch (error) {
      console.error('Error initializing MediaPipeHands:', error);
    }
  }

  // Check if the device is mobile based on window dimensions
  isMobile() {
    return window.innerWidth < window.innerHeight;
  }

  // Start the camera
  start() {
    if (this.camera && !this.cameraStarted) {
      this.camera.start();
      this.cameraStarted = true;
    }
  }

  // Stop the camera
  stop() {
    if (this.camera && this.cameraStarted) {
      this.camera.stop();
      this.cameraStarted = false;
    }
  }
}
