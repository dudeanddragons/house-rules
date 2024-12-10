// File: `scripts/magicItems/itemsScrolls.js`

const itemToCloneUUID = "Compendium.adnd2e-phb.items.Item.ka2NtExEA2grLuKq";

// Exported function to filter spells based on selected type and level
export function filterSpells(html) {
  const spellList = game.houseRulesData?.spellList || [];
  const selectedType = html.find("#scroll-type-selector").val();
  const selectedLevel = html.find("#scroll-level-selector").val();

  console.log("Selected Type:", selectedType);
  console.log("Selected Level:", selectedLevel);
  console.log("Spell List:", spellList);

  // Filter and sort spells alphabetically
  const filteredSpells = spellList
    .filter((spell) => {
      const spellType = spell.system?.type || spell.type;
      const spellLevel = spell.system?.level?.toString() || spell.level?.toString();

      const matchesType = !selectedType || spellType === selectedType;
      const matchesLevel = !selectedLevel || spellLevel === selectedLevel;

      return matchesType && matchesLevel;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log("Filtered and Sorted Spells:", filteredSpells);

  // Populate the dropdown with filtered spells
  populateSpellDropdown(html, filteredSpells);
}

// Exported function to populate the spell dropdown
export function populateSpellDropdown(html, filteredSpells) {
  const spellDropdown = html.find("#scroll-spell-selector");
  spellDropdown.empty().append(filteredSpells.map((spell) => `<option value="${spell.uuid}">${spell.name}</option>`).join(""));
}

// Exported function to create a scroll item based on the selected spell
export async function createScroll(html) {
  const selectedSpellUUID = html.find("#scroll-spell-selector").val();
  const selectedSpell = game.houseRulesData.spellList.find((spell) => spell.uuid === selectedSpellUUID);

  if (!selectedSpell) {
    ui.notifications.error("Failed to find the selected spell.");
    return;
  }

  // Clone the base scroll item
  const clonedItem = await fromUuid(itemToCloneUUID);
  if (!clonedItem) {
    ui.notifications.error("Failed to clone the scroll item.");
    return;
  }

  const clonedItemData = foundry.utils.duplicate(clonedItem);
  const { name: spellName, type: spellType, description: spellDescription, level: spellLevel, actions: spellActions } = selectedSpell;

  // Update the item name, alias, and image based on the spell type
  clonedItemData.name = `Scroll (${spellType}): ${spellName}`;
  clonedItemData.system.alias = "Scroll";
  clonedItemData.img = spellType === "Arcane"
    ? "icons/sundries/scrolls/scroll-bound-ruby-red.webp"
    : "icons/sundries/scrolls/scroll-bound-sealed-blue.webp";

  // Set the item description correctly using the fetched spell description
  clonedItemData.system.description = (clonedItemData.system.description || "") + `<p><strong>${spellName}:</strong> ${spellDescription}</p>`;

  // Determine caster level and calculate scroll cost
  const casterLevel = getCasterLevel(spellType, spellLevel);
  const scrollCost = calculateScrollCost(spellLevel, casterLevel);
  clonedItemData.system.cost = { value: scrollCost, currency: "gp" };

  // Add action groups to the cloned item
  clonedItemData.system.actionGroups = clonedItemData.system.actionGroups || [];
  const actionGroup = {
    actions: [],
    id: foundry.utils.randomID(),
    name: spellName,
    description: spellDescription || "No description available.",
  };
  clonedItemData.system.actionGroups.push(actionGroup);

  // Copy spell actions to the scroll's action group, including descriptions
  for (const action of spellActions) {
    const newAction = foundry.utils.duplicate(action);
    newAction.id = foundry.utils.randomID();
    newAction.description = action.description || spellDescription || "No action description available.";
    actionGroup.actions.push(newAction);
  }

  // Create the scroll item in the game
  await Item.create(clonedItemData);
  ui.notifications.info(`Created scroll titled 'Scroll (${spellType}): ${spellName}' with added spell effects.`);
}

// Helper function to determine the caster level based on spell type and level
function getCasterLevel(type, level) {
  const arcaneCasterLevels = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 12, 7: 14, 8: 16, 9: 18 };
  const divineCasterLevels = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 11, 7: 14, 8: 16, 9: 18 };
  return type === "Arcane" ? arcaneCasterLevels[level] : divineCasterLevels[level];
}

// Helper function to calculate scroll cost
function calculateScrollCost(level, casterLevel) {
  return level * casterLevel * 25;
}
