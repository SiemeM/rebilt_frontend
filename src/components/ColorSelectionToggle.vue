<template>
  <div>
    <!-- Displaying color options as a list -->
    <div v-for="(option, index) in colorOptions" :key="option.optionId">
      <button @click="toggleColor(option)">
        {{ option.name || "Unnamed Color" }}
      </button>
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
    toggleColor(option) {
      // Zorg ervoor dat selectedColors een array is
      if (!Array.isArray(this.selectedColors)) {
        this.selectedColors = [];
      }

      // Zoek naar de kleur in selectedColors om te controleren of deze al geselecteerd is
      const index = this.selectedColors.findIndex(
        (color) => color.optionId === option.optionId
      );

      if (index === -1) {
        // Voeg de kleur toe aan de geselecteerde kleuren als deze nog niet is geselecteerd
        this.selectedColors.push({
          optionId: option.optionId,
          name: option.name || "Unnamed Color",
          images: Array.isArray(option.images) ? option.images : [],
        });
      } else {
        // Verwijder de kleur uit selectedColors als deze al geselecteerd is
        this.selectedColors.splice(index, 1);
      }

      // Sluit de dropdown na selectie
      this.dropdownStates[this.fieldName] = false;
    },
  },
};
</script>

<style scoped>
button {
  display: block;
  margin: 5px 0;
  padding: 5px 10px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #ddd;
}
</style>
