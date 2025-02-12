<template>
  <div>
    <!-- Dropdown voor het weergeven van kleur opties -->
    <div
      v-for="(option, index) in colorOptions"
      :key="option.optionId"
      class="dropdown-option"
    >
      <input
        type="checkbox"
        :value="option.optionId"
        :checked="isSelected(option)"
        @click="toggleColor(option)"
      />
      <span
        class="color-bullet"
        :style="{ backgroundColor: option.name || 'transparent' }"
      ></span>
      <p class="stroke">-</p>
      <p>{{ option.name || "Unnamed Color" }}</p>
    </div>

    <!-- Input veld voor het toevoegen van een nieuwe kleur -->
    <div v-if="isOpen" class="dropdown-add-option">
      <input v-model="newColor" type="text" placeholder="Add new color" />
      <button @click="addColor">Add</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "ColorSelectionToggle",
  props: {
    selectedColors: {
      type: Array,
      required: true,
    },
    dropdownStates: {
      type: Object,
      required: true,
    },
    fieldName: {
      type: String,
      required: true,
    },
    colorOptions: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      newColor: "", // Houdt de invoer voor de nieuwe kleur bij
      isAddingColor: false, // Voeg een flag toe om het toevoegen van een kleur te controleren
    };
  },
  computed: {
    isOpen() {
      return this.dropdownStates[this.fieldName];
    },
  },
  methods: {
    // Controleer of een kleur is geselecteerd
    isSelected(option) {
      return this.selectedColors.some(
        (color) => color.optionId === option.optionId
      );
    },

    // Toggle de kleur in de lijst van geselecteerde kleuren
    toggleColor(option) {
      const selectedColorsCopy = [...this.selectedColors];
      const index = selectedColorsCopy.findIndex(
        (color) => color.optionId === option.optionId
      );

      if (index === -1) {
        selectedColorsCopy.push({
          optionId: option.optionId,
          name: option.name || "Unnamed Color",
          images: Array.isArray(option.images) ? option.images : [],
        });
      } else {
        selectedColorsCopy.splice(index, 1);
      }

      // Emit de bijgewerkte lijst van geselecteerde kleuren
      this.$emit("update:selectedColors", selectedColorsCopy);

      // Sluit de dropdown alleen als een kleur is geselecteerd, niet als een kleur is toegevoegd
      if (option.name) {
        this.dropdownStates[this.fieldName] = false;
      }
    },

    // Voeg een nieuwe kleur optie toe
    addColor() {
      if (this.isAddingColor) return; // Voorkom herhaald klikken als het toevoegen bezig is
      this.isAddingColor = true; // Zet de flag om aan te geven dat een kleur wordt toegevoegd

      if (
        this.newColor.trim() &&
        !this.colorOptions.some(
          (option) => option.name === this.newColor.trim()
        )
      ) {
        const newColorOption = {
          optionId: Date.now(), // Genereer een unieke ID
          name: this.newColor.trim(),
          images: [],
        };
        this.colorOptions.push(newColorOption); // Voeg de nieuwe kleur toe aan de lijst
        this.$emit("update:colorOptions", this.colorOptions); // Emit de bijgewerkte lijst van kleuren

        this.newColor = ""; // Maak het invoerveld leeg
      }

      this.isAddingColor = false; // Reset de flag
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
  display: flex;
  align-items: center;
  padding: 5px;
}

.color-bullet {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 0.5rem;
  display: inline-block;
}

.dropdown-option p {
  opacity: 0.8;
  font-size: 0.75rem;
}

.stroke {
  margin-right: 0.5rem;
}

input[type="checkbox"] {
  margin-right: 10px;
}

p {
  margin: 0;
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
