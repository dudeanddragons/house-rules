// File: `scripts/treasureBuilder.js`

import { filterSpells, createPotion } from "./magicItems/itemsPotions.js";
import { createScroll } from "./magicItems/itemsScrolls.js";
import { createWand } from "./magicItems/itemsWands.js";

export class TreasureBuilder extends Application {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "treasure-builder",
      title: "Treasure Builder",
      template: "modules/house-rules/templates/treasureBuilder.hbs",
      width: 600,
      height: "auto",
      resizable: true,
      classes: ["treasure-builder"],
    };
  }

  // Data for item types
  getData() {
    const itemTypes = [
      "Currency",
      "Potions",
      "Scrolls",
      "Wands",
      "Magic Weapons",
      "Magic Armor",
      "Misc Magic",
      "Gems",
      "Art",
    ];
    const storedItems = game.houseRulesData?.storedItems || [];
    return { itemTypes, storedItems };
  }

  // Activate listeners for button clicks and dropdown selections
  async activateListeners(html) {
    super.activateListeners(html);

    if (!game.houseRulesData) {
      game.houseRulesData = { storedItems: [], spellList: [] };
    }

    // Load spells once
    if (game.houseRulesData.spellList.length === 0) {
      await this.loadSpells();
    }

    html.find(".random-item-button").on("click", () => this.populateRandomItemType(html));
    html.find("#item-type-selector").on("change", (e) => this.renderItemOptions(e.target.value, html));
    html.find(".generate-item-button").on("click", () => this.generateSelectedItem(html));
    html.find(".store-item-button").on("click", () => this.storeSelectedItem(html));
    html.find(".delete-item-button").on("click", (e) => this.deleteStoredItem(e));
    html.find("#potion-type-selector, #potion-level-selector").on("change", () => this.filterSpells(html, "Potion"));
    html.find("#scroll-type-selector, #scroll-level-selector").on("change", () => this.filterSpells(html, "Scroll"));
  }

  // Fetch all spells with detailed data from compendiums
  async loadSpells() {
    console.log("Fetching detailed spell data from compendiums...");
    const spellList = [];
    const allPacks = game.packs.filter((p) => p.documentName === "Item");

    for (const pack of allPacks) {
      try {
        const packItems = await pack.getDocuments();
        const spells = packItems.filter((item) => item.type === "spell" || item.system?.type === "spell");

        spells.forEach((item) => {
          const spellDescription = item.system?.description?.value || item.system?.description || "No description available.";

          const spellData = {
            uuid: item.uuid,
            name: item.name,
            type: item.system.type,
            level: item.system.level,
            description: spellDescription,
            actions: item.system.actionGroups?.flatMap((group) => group.actions) || [],
          };

          spellList.push(spellData);
        });

        console.log(`Loaded ${spells.length} spells from ${pack.metadata.label}`);
      } catch (error) {
        console.error(`Error loading spells from ${pack.metadata.label}: ${error.message}`);
      }
    }

    game.houseRulesData.spellList = spellList.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Total detailed spells loaded: ${spellList.length}`);
  }

  filterSpells(html, itemType) {
    const spellList = game.houseRulesData?.spellList || [];
  
    // Determine the correct selectors based on the item type
    let typeSelector, levelSelector, spellSelector;
    if (itemType === "Potion") {
      typeSelector = "#potion-type-selector";
      levelSelector = "#potion-level-selector";
      spellSelector = "#potion-spell-selector";
    } else if (itemType === "Scroll") {
      typeSelector = "#scroll-type-selector";
      levelSelector = "#scroll-level-selector";
      spellSelector = "#scroll-spell-selector";
    } else if (itemType === "Wand") {
      typeSelector = "#wand-type-selector";
      levelSelector = "#wand-level-selector";
      spellSelector = "#wand-spell-selector";
    }
  
    // Fetch selected type and level values
    const selectedType = html.find(typeSelector).val();
    const selectedLevel = html.find(levelSelector).val();
  
    console.log(`Filtering spells for ${itemType}: Type - ${selectedType}, Level - ${selectedLevel}`);
  
    // Filter and sort spells based on the selected type and level
    const filteredSpells = spellList
      .filter((spell) => {
        const spellType = spell.system?.type || spell.type;
        const spellLevel = spell.system?.level?.toString() || spell.level?.toString();
  
        const matchesType = !selectedType || spellType === selectedType;
        const matchesLevel = !selectedLevel || spellLevel === selectedLevel;
  
        return matchesType && matchesLevel;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  
    console.log(`Filtered and Sorted Spells for ${itemType}:`, filteredSpells);
  
    // Populate the spell dropdown with the filtered spells
    this.populateSpellDropdown(html, spellSelector, filteredSpells);
  }
  
  

  populateSpellDropdown(html, selector, filteredSpells) {
    const spellDropdown = html.find(selector);
    spellDropdown.empty().append(filteredSpells.map((spell) => `<option value="${spell.uuid}">${spell.name}</option>`).join(""));
  }

  populateRandomItemType(html) {
    const itemTypes = ["Currency", "Potions", "Scrolls", "Wands", "Magic Weapons", "Magic Armor", "Misc Magic", "Gems", "Art"];
    const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    html.find("#item-type-selector").val(randomType).trigger("change");
  }

  renderItemOptions(type, html) {
    const optionsContainer = html.find(".item-options-container");
    optionsContainer.empty();

    if (type === "Potions") {
      this.renderPotionOptions(html);
    } else if (type === "Scrolls") {
      this.renderScrollOptions(html);
    } else if (type === "Wands") {
      this.renderWandOptions(html);
    }
  }

  renderPotionOptions(html) {
    const optionsHtml = `
      <div class="potion-options">
        <select id="potion-type-selector" title="Select Spell Type">
          <option value="">All Types</option>
          <option value="Arcane">Arcane</option>
          <option value="Divine">Divine</option>
        </select>
        <select id="potion-level-selector" title="Select Spell Level">
          <option value="">All Levels</option>
          ${Array.from({ length: 10 }, (_, i) => `<option value="${i}">${i}</option>`).join("")}
        </select>
        <select id="potion-spell-selector" title="Select a Spell">
          <option value="">Select a spell</option>
        </select>
      </div>
    `;

    html.find(".item-options-container").html(optionsHtml);
    html.find("#potion-type-selector, #potion-level-selector").on("change", () => this.filterSpells(html, "Potion"));
    this.filterSpells(html, "Potion");
  }

  renderScrollOptions(html) {
    const optionsHtml = `
      <div class="scroll-options">
        <select id="scroll-type-selector" title="Select Spell Type">
          <option value="">All Types</option>
          <option value="Arcane">Arcane</option>
          <option value="Divine">Divine</option>
        </select>
        <select id="scroll-level-selector" title="Select Spell Level">
          <option value="">All Levels</option>
          ${Array.from({ length: 10 }, (_, i) => `<option value="${i}">${i}</option>`).join("")}
        </select>
        <select id="scroll-spell-selector" title="Select a Spell">
          <option value="">Select a spell</option>
        </select>
      </div>
    `;

    html.find(".item-options-container").html(optionsHtml);
    html.find("#scroll-type-selector, #scroll-level-selector").on("change", () => this.filterSpells(html, "Scroll"));
    this.filterSpells(html, "Scroll");
  }

  renderWandOptions(html) {
    const optionsHtml = `
      <div class="wand-options">
        <select id="wand-type-selector" title="Select Spell Type">
          <option value="">All Types</option>
          <option value="Arcane">Arcane</option>
          <option value="Divine">Divine</option>
        </select>
        <select id="wand-level-selector" title="Select Spell Level">
          <option value="">All Levels</option>
          ${Array.from({ length: 10 }, (_, i) => `<option value="${i}">${i}</option>`).join("")}
        </select>
        <select id="wand-spell-selector" title="Select a Spell">
          <option value="">Select a spell</option>
        </select>
      </div>
    `;
  
    html.find(".item-options-container").html(optionsHtml);
  
    // Attach change event listeners for filtering
    html.find("#wand-type-selector, #wand-level-selector").on("change", () => this.filterSpells(html, "Wand"));
  
    // Initial call to filter spells for Wands
    this.filterSpells(html, "Wand");
  }
  
  
  
  

  async generateSelectedItem(html) {
    const selectedType = html.find("#item-type-selector").val();
    if (selectedType === "Potions") {
      await createPotion(html);
    } else if (selectedType === "Scrolls") {
      await createScroll(html);
    } else if (selectedType === "Wands") {
      await createWand(html);
    }
  }


  storeSelectedItem(html) {
    const selectedSpellUUID = html.find("#potion-spell-selector, #scroll-spell-selector").val();
    const selectedSpell = game.houseRulesData.spellList.find((spell) => spell.uuid === selectedSpellUUID);

    if (!selectedSpell) {
      ui.notifications.error("No item selected to store.");
      return;
    }

    const itemData = {
      id: foundry.utils.randomID(),
      ...selectedSpell,
    };

    game.houseRulesData.storedItems.push(itemData);
    ui.notifications.info(`Stored item: ${itemData.name}`);
    this.render();
  }

  deleteStoredItem(event) {
    const itemId = $(event.currentTarget).data("item-id");
    game.houseRulesData.storedItems = game.houseRulesData.storedItems.filter((item) => item.id !== itemId);
    ui.notifications.info("Item removed from stored list.");
    this.render();
  }
}

// Function to open the Treasure Builder window
export function openTreasureBuilderWindow() {
  new TreasureBuilder().render(true);
}

// Hook to add a button to the Items Sidebar to open the Treasure Builder
Hooks.on("renderSidebarTab", (app, html) => {
  const isItemsTab = html.closest("#items");
  if (!isItemsTab.length) return;

  if (html.find(".treasure-builder-button").length > 0) return;

  const button = $(`<button class="treasure-builder-button"><i class="fas fa-gem"></i> Treasure Builder</button>`);
  html.find(".directory-header").prepend(button);

  button.on("click", () => openTreasureBuilderWindow());
});
