<script setup>
import router from "../router";
</script>

<template>
  <div class="textbox">
    <input type="checkbox" id="checkbox1" name="checkbox1" />
    <label for="checkbox1">Check me!</label>
  </div>
</template>

<style scoped>
.textbox {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.textbox input {
  width: 24px;
  height: 24px;
}
</style>
