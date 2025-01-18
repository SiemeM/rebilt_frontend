// store/modules/color.js
export default {
  // State: Hier sla je de geselecteerde kleuren op
  state: {
    selectedColors: [], // Dit is een array van geselecteerde kleuren
  },

  // Mutaties: Methoden die de state kunnen veranderen
  mutations: {
    setSelectedColors(state, colors) {
      state.selectedColors = colors;
    },

    toggleColorSelection(state, color) {
      // Zoek of de kleur al geselecteerd is
      const index = state.selectedColors.findIndex(
        (selectedColor) => selectedColor.optionId === color.optionId
      );

      if (index === -1) {
        // Voeg toe als de kleur nog niet geselecteerd is
        state.selectedColors.push(color);
      } else {
        // Verwijder als de kleur al geselecteerd is
        state.selectedColors.splice(index, 1);
      }
    },
  },

  // Getters: Voor het ophalen van de state
  getters: {
    // Functie om te controleren of een kleur geselecteerd is
    isColorSelected: (state) => (color) => {
      return state.selectedColors.some(
        (selectedColor) => selectedColor.optionId === color.optionId
      );
    },
  },
};
