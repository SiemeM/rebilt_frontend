<template>
  <div>
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
        :aria-label="`Select color ${option.color}`"
      />
      <span class="color-bullet" :style="{ backgroundColor: option.color }">
        {{ option.name }}
        <!-- Should display the color name -->
      </span>
    </div>

    <div v-if="isOpen" class="dropdown-add-option">
      <input v-model="newColor" type="text" placeholder="Add new color" />
      <button @click="addColor" :aria-label="`Add new color: ${newColor}`">
        Add
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "ColorSelectionToggle",
  props: {
    selectedColors: {
      type: Object,
      required: true,
      default: () => [],
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
      default: () => [],
    },
  },
  data() {
    return {
      newColor: "",
      isAddingColor: false,
    };
  },
  computed: {
    isOpen() {
      return this.dropdownStates[this.fieldName];
    },
  },
  methods: {
    isSelected(option) {
      return this.selectedColors.some(
        (color) => color.optionId === option.optionId
      );
    },
    toggleColor(option) {
      const selectedColorsCopy = [...this.selectedColors];
      const index = selectedColorsCopy.findIndex(
        (color) => color.optionId === option.optionId
      );

      if (index === -1) {
        selectedColorsCopy.push({
          optionId: option.optionId,
          name: option.color || "Unnamed Color",
          images: Array.isArray(option.images) ? option.images : [],
        });
      } else {
        selectedColorsCopy.splice(index, 1);
      }

      this.$emit("update:modelValue", selectedColorsCopy); // Correct the event emission to update:modelValue
    },
    addColor() {
      if (this.isAddingColor) return;
      this.isAddingColor = true;

      if (!this.newColor.trim()) {
        console.warn("Color name cannot be empty.");
        this.isAddingColor = false;
        return;
      }

      if (
        this.colorOptions.some(
          (option) => option.color === this.newColor.trim()
        )
      ) {
        console.warn("This color already exists.");
        this.isAddingColor = false;
        return;
      }

      const newColorOption = {
        optionId: Date.now(),
        name: this.newColor.trim(),
        images: [],
      };

      this.colorOptions.push(newColorOption);
      this.$emit("update:colorOptions", this.colorOptions);
      this.newColor = "";
      this.isAddingColor = false;
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
  margin-right: 10px;
  display: inline-block;
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
