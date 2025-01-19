<template>
  <div class="dropdown-selected" @click="toggleDropdown">
    <!-- Trigger button for dropdown -->
    <p>{{ buttonText }}</p>

    <!-- Dropdown content -->
    <div v-if="isOpen" class="dropdown-options" @click.stop>
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
  data() {
    return {
      isAdding: false, // Flag om toe te voegen zonder de dropdown te sluiten
    };
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

    // Methode om een actie te doen zonder de dropdown te sluiten
    handleAddAction(event) {
      event.stopPropagation(); // Voorkom dat het klikken op de knop de dropdown sluit
      this.isAdding = true;

      // Doe de actie die je nodig hebt (bijv. iets toevoegen)
      // Reset na de actie
      this.isAdding = false;
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
