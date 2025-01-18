<template>
  <div class="dropdown-options">
    <!-- Displaying color options as a list with checkbox and color bullet -->
    <div
      v-for="(option, index) in colorOptions"
      :key="option.optionId"
      class="dropdown-option"
    >
      <input
        type="checkbox"
        :value="option.optionId"
        :checked="isSelected(option)"
        @change="toggleColor(option)"
      />
      <span
        class="color-bullet"
        :style="{ backgroundColor: option.name || 'transparent' }"
      ></span>
      <p>{{ option.name || "Unnamed Color" }}</p>
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
  methods: {
    // Controleer of een kleur is geselecteerd
    isSelected(option) {
      return this.selectedColors.some(
        (color) => color.optionId === option.optionId
      );
    },

    // Toggle de kleur in de geselecteerde kleuren
    toggleColor(option) {
      const selectedColorsCopy = [...this.selectedColors];
      const index = selectedColorsCopy.findIndex(
        (color) => color.optionId === option.optionId
      );

      if (index === -1) {
        // Voeg de kleur toe als deze nog niet geselecteerd is
        selectedColorsCopy.push({
          optionId: option.optionId,
          name: option.name || "Unnamed Color",
          images: Array.isArray(option.images) ? option.images : [],
        });
      } else {
        // Verwijder de kleur als deze al geselecteerd is
        selectedColorsCopy.splice(index, 1);
      }

      // Emit de update voor selectedColors
      this.$emit("update:selectedColors", selectedColorsCopy);

      // Sluit de dropdown na selectie
      this.dropdownStates[this.fieldName] = false;
    },
  },
};
</script>

<style scoped>
/* Style for the checkbox, bullet, and dropdown options */
.dropdown-option {
  display: flex;
  align-items: center;
  padding: 5px;
}

.color-bullet {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 10px;
  display: inline-block;
}

input[type="checkbox"] {
  margin-right: 10px;
}

p {
  margin: 0;
}
</style>
