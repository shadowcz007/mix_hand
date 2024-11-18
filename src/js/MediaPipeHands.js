export class MediaPipeHands {
  constructor(videoElement, onResultsCallback) {
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
      width: this.isMobile() ? 720 : 1280,
      height: this.isMobile() ? 1280 : 720,
    });

    // Do not start the camera automatically
    this.cameraStarted = false;
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
