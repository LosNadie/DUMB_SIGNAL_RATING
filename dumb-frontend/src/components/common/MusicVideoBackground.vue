<template>
  <div class="matte-bg">
    <div class="matte-depth" />
  </div>
</template>

<style scoped>
.matte-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background:
    linear-gradient(180deg, #050505 0%, #090909 46%, #060606 100%);
}

.matte-depth {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1200px 760px at 50% -18%, rgba(255, 255, 255, 0.055), transparent 62%),
    radial-gradient(900px 560px at 50% 118%, rgba(255, 255, 255, 0.028), transparent 68%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.018), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.012));
}
</style>
