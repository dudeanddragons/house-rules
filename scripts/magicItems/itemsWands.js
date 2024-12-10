// File: `scripts/magicItems/itemsWands.js`

const itemToCloneUUID = "Item.RDVuf5QlCi0CpTDd"; // UUID of the base wand item to be cloned

// Exported function to filter spells based on selected type and level for wands
export function filterSpells(html) {
  const spellList = game.houseRulesData?.spellList || [];
  const selectedType = html.find("#wand-type-selector").val();
  const selectedLevel = html.find("#wand-level-selector").val();

  console.log("Wand Filter - Selected Type:", selectedType);
  console.log("Wand Filter - Selected Level:", selectedLevel);
  console.log("Spell List:", spellList);

  // Filter spells based on type and level
  const filteredSpells = spellList
    .filter((spell) => {
      const spellType = spell.system?.type || spell.type;
      const spellLevel = spell.system?.level?.toString() || spell.level?.toString();

      const matchesType = !selectedType || spellType === selectedType;
      const matchesLevel = !selectedLevel || spellLevel === selectedLevel;

      return matchesType && matchesLevel;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log("Filtered and Sorted Spells for Wands:", filteredSpells);

  // Populate the dropdown with filtered spells
  populateSpellDropdown(html, filteredSpells);
}

// Exported function to populate the spell dropdown for wands
export function populateSpellDropdown(html, filteredSpells) {
  const spellDropdown = html.find("#wand-spell-selector");
  spellDropdown.empty().append(filteredSpells.map((spell) => `<option value="${spell.uuid}">${spell.name}</option>`).join(""));
}

// Exported function to create a wand item based on the selected spell
export async function createWand(html) {
  const selectedSpellUUID = html.find("#wand-spell-selector").val();
  const selectedSpell = game.houseRulesData.spellList.find((spell) => spell.uuid === selectedSpellUUID);

  if (!selectedSpell) {
    ui.notifications.error("Failed to find the selected spell.");
    return;
  }

  // Clone the base wand item
  const clonedItem = await fromUuid(itemToCloneUUID);
  if (!clonedItem) {
    ui.notifications.error("Failed to clone the wand item.");
    return;
  }

  const clonedItemData = foundry.utils.duplicate(clonedItem);
  const { name: spellName, type: spellType, description: spellDescription, level: spellLevel, actions: spellActions } = selectedSpell;

  // Update the item name, alias, and image based on the spell type
  clonedItemData.name = `Wand (${spellType}): ${spellName}`;
  clonedItemData.system.alias = "Wand";
  clonedItemData.img = spellType === "Arcane"
    ? "icons/weapons/wands/wand-gem-red.webp"
    : "icons/weapons/wands/wand-gem-violet.webp";

  // Set the item description using the fetched spell description
  clonedItemData.system.description = (clonedItemData.system.description || "") + `<p><strong>${spellName}:</strong> ${spellDescription}</p>`;

  // Determine caster level and calculate wand cost
  const casterLevel = getCasterLevel(spellType, spellLevel);
  const wandCost = calculateWandCost(spellLevel, casterLevel);
  clonedItemData.system.cost = { value: wandCost, currency: "gp" };

  // Add action groups to the cloned item
  clonedItemData.system.actionGroups = clonedItemData.system.actionGroups || [];
  const actionGroup = {
    actions: [],
    id: foundry.utils.randomID(),
    name: spellName,
    description: spellDescription || "No description available.",
  };
  clonedItemData.system.actionGroups.push(actionGroup);

  // Copy spell actions to the wand's action group
  for (const action of spellActions) {
    const newAction = foundry.utils.duplicate(action);
    newAction.id = foundry.utils.randomID();
    newAction.description = action.description || spellDescription || "No action description available.";
    actionGroup.actions.push(newAction);
  }

  // Create the wand item in the game
  await Item.create(clonedItemData);
  ui.notifications.info(`Created wand titled 'Wand (${spellType}): ${spellName}' with added spell effects.`);
}

// Helper function to determine the caster level based on spell type and level
function getCasterLevel(type, level) {
  const arcaneCasterLevels = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 12, 7: 14, 8: 16, 9: 18 };
  const divineCasterLevels = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 11, 7: 14, 8: 16, 9: 18 };
  return type === "Arcane" ? arcaneCasterLevels[level] : divineCasterLevels[level];
}

// Helper function to calculate wand cost
function calculateWandCost(level, casterLevel) {
  return level * casterLevel * 750;
}

// Function to clear selections in the UI
export function clearSelections(html) {
  html.find("#wand-type-selector").val("");
  html.find("#wand-level-selector").val("");
  html.find("#wand-spell-selector").val("");
}
