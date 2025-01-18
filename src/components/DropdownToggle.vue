<template>
  <div class="dropdown-selected">
    <!-- Trigger button for dropdown -->
    <p @click="toggleDropdown">{{ buttonText }}</p>

    <!-- Dropdown content -->
    <div v-if="isOpen">
      <slot></slot>
      <!-- Slot voor dynamische inhoud in de dropdown -->
    </div>
  </div>
</template>

<script>
export default {
  name: "DropdownToggle",
  props: {
    fieldName: {
      type: String,
      required: true,
    },
    dropdownStates: {
      type: Object,
      required: true,
    },
    buttonText: {
      type: String,
      default: "Toggle Dropdown",
    },
  },
  computed: {
    isOpen() {
      return this.dropdownStates[this.fieldName];
    },
  },
  methods: {
    toggleDropdown() {
      // Sluit alle andere dropdowns
      for (const key in this.dropdownStates) {
        if (key !== this.fieldName) {
          this.dropdownStates[key] = false;
        }
      }
      // Toggle de huidige dropdown
      this.dropdownStates[this.fieldName] =
        !this.dropdownStates[this.fieldName];
    },
  },
};
</script>

<style scoped>
/* Voeg stijlen toe voor de dropdown */
button {
  margin-bottom: 10px;
}
</style>
