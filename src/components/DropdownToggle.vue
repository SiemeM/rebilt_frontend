<template>
  <div class="dropdown-selected" @click="toggleDropdown">
    <!-- Trigger button for dropdown, display selected value or buttonText -->
    <p>{{ selectedOption || buttonText }}</p>

    <!-- Dropdown content -->
    <div v-if="isOpen" class="dropdown-options" @click.stop>
      <!-- Dropdown options -->
      <div
        v-for="(type, index) in types"
        :key="index"
        class="dropdown-option"
        @click="selectOption(type)"
        :class="{ selected: type === selectedOption }"
      >
        <p>{{ type }}</p>
      </div>
      <!-- Input field and button for adding new option -->
      <div class="dropdown-add-option">
        <input v-model="newOption" type="text" placeholder="Add new option" />
        <button @click="handleAddOption">Add</button>
      </div>
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
      required: true,
    },
    types: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      newOption: "",
      selectedOption: null,
    };
  },
  computed: {
    isOpen() {
      return this.dropdownStates[this.fieldName];
    },
  },
  methods: {
    toggleDropdown() {
      // Sluit andere dropdowns en toggle de huidige
      for (const key in this.dropdownStates) {
        if (key !== this.fieldName) {
          this.dropdownStates[key] = false;
        }
      }
      // Toggle de dropdown
      this.dropdownStates[this.fieldName] =
        !this.dropdownStates[this.fieldName];
    },
    selectOption(type) {
      // Verander de geselecteerde waarde
      this.selectedOption = type;
      this.$emit("update:modelValue", type);
      this.toggleDropdown(); // Sluit de dropdown nadat een optie is geselecteerd
    },
    handleAddOption(event) {
      // Voorkom dat de dropdown sluit wanneer de Add knop wordt geklikt
      event.stopPropagation();

      if (this.newOption.trim()) {
        this.$emit("addOption", this.newOption.trim());
        this.newOption = "";
      }
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

.dropdown-option {
  padding: 8px;
  cursor: pointer;
}

.dropdown-option:hover,
.dropdown-option.selected {
  background-color: var(--blue-500); /* Highlight selected option */
  color: white;
}

.dropdown-add-option {
  display: flex;
  align-items: center;
  margin-top: 8px;
  gap: 8px;
}

.dropdown-add-option input {
  flex: 1;
  padding: 4px;
  border: 1px solid var(--gray-700);
  border-radius: 4px;
  background-color: var(--gray-800);
  color: white;
}

.dropdown-add-option button {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background-color: var(--blue-500);
  color: white;
  cursor: pointer;
}

.dropdown-add-option button:hover {
  background-color: var(--blue-600);
}
</style>
