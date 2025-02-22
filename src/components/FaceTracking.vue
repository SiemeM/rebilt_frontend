<template>
  <div class="camera-overlay">
    <video ref="videoElement" autoplay playsinline></video>
  </div>
</template>

<script>
export default {
  mounted() {
    this.initCamera();
  },

  methods: {
    async initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        this.$refs.videoElement.srcObject = stream;
        console.log("✅ Camera gestart!");
      } catch (error) {
        console.error("🚨 Camera fout:", error);
      }
    },
  },
};
</script>

<style>
.camera-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: black;
}

video {
  width: 100%;
  height: 100%;
  position: absolute;
  object-fit: cover;
}
</style>
