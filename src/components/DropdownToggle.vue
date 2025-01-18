<template>
  <div class="dropdown-selected" @click="toggleDropdown">
    <!-- Trigger button for dropdown -->
    <p>{{ buttonText }}</p>

    <!-- Dropdown content -->
    <div v-if="isOpen" class="dropdown-options">
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
.dropdown-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--gray-900);
  border-radius: 4px;
  width: 100%;
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
}
</style>
