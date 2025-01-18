<template>
  <div class="dropdown-options">
    <div
      v-for="(option, index) in colorOptions"
      :key="option.optionId"
      class="dropdown-option"
    >
      <!-- Dynamisch de checked status van de checkbox instellen -->
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
      console.log("toggleColor function triggered"); // Dit logt als de functie wordt aangeroepen
      console.log("Selected color:", option); // Log de geselecteerde kleur

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

      // Sluit de dropdown
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
