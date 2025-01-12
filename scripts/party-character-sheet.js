// scripts/party-character-sheet.js

// Import modules for each tab section
import { Members } from './party-parts/members.js';
import { Skills } from './party-parts/skills.js';
import { Inventory } from './party-parts/inventory.js';
import { WatchOrders } from './party-parts/watch-orders.js';
import { Quests } from './party-parts/quests.js';
import { DMNotes } from './party-parts/dm-notes.js';



// Register partials manually
Hooks.once('init', () => {
    loadTemplates([
        "modules/house-rules/templates/party-sheet-cards.hbs"
    ]);
    console.log("House Rules | Templates registered successfully.");
});

export class PartyCharacterSheet extends ActorSheet {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["custom-party-character-sheet"],
            template: "modules/house-rules/templates/party-character.hbs",
            width: 800,
            height: 600,
            resizable: true,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "members" }],
            dragDrop: [{ dragSelector: ".item-list .item", dropSelector: ".tab-content.inventory" }],
        });
    }

/** @override */
async getData() {
    const data = await super.getData();

    try {
        // Ensure GM-specific data is set
        data.isGM = game.user.isGM;
        data.showDMNotesTab = game.user.isGM;

        // Fetch the full party members list for the Members tab
        const partyMembers = Members.getPartyMembers();
        data.partyMembers = partyMembers;

        // Prepare Watch Order data
        const watchOrdersData = partyMembers.map(member => ({
            id: member.id,
            img: member.img,
            name: member.name,
            watchOrder: member.getFlag("world", "watchOrder") ?? 0,
        }));

        // Prepare Marching Order data
        const marchingOrdersData = partyMembers.map(member => ({
            id: member.id,
            img: member.img,
            name: member.name,
            marchingOrder: member.getFlag("world", "marchingOrder") ?? 0,
        }));

        // Merge Watch Order and Marching Order data into a single array without affecting `partyMembers`
        data.orderData = partyMembers.map(member => {
            const watchOrder = watchOrdersData.find(w => w.id === member.id)?.watchOrder ?? 0;
            const marchingOrder = marchingOrdersData.find(m => m.id === member.id)?.marchingOrder ?? 0;
            return {
                id: member.id,
                img: member.img,
                name: member.name,
                watchOrder,
                marchingOrder,
            };
        });

        // Fetch currency for the party character actor
        const currency = {
            cp: this.actor.currency?.cp || 0,
            sp: this.actor.currency?.sp || 0,
            ep: this.actor.currency?.ep || 0,
            gp: this.actor.currency?.gp || 0,
            pp: this.actor.currency?.pp || 0,
        };

        // Assign currency to data object
        data.currency = currency;

        // Fetch and prepare Party Inventory data for the Party Character Actor only
        const inventory = this.actor.items.map(item => ({
            id: item.id,
            name: item.name,
            img: item.img,
            type: item.type,
            quantity: item.system?.quantity || 1,
            weight: (item.system?.weight || 0) * (item.system?.quantity || 1),
            isEquipped: item.system?.location?.state === 'equipped',
            isIdentified: item.system?.attributes?.identified ?? true,
            // Add additional fields or derived data if needed
        }));

        // Process inventory data
        data.partyInventory = this.prepareInventory(inventory);

        console.log("PartyCharacterSheet | Data prepared:", data);
        return data;
    } catch (error) {
        console.error("PartyCharacterSheet | Error preparing data:", error);
        return data;
    }
}

/**
 * Process inventory data for the party character actor.
 * @param {Array} inventory - The raw inventory data array.
 * @returns {Array} Processed inventory array with additional derived data.
 */
prepareInventory(inventory) {
    if (!Array.isArray(inventory)) {
        console.error("Inventory | Invalid inventory data:", inventory);
        return [];
    }

    console.log("Inventory | Preparing inventory data.");
    return inventory.map(item => ({
        ...item,
        weight: (item.weight || 0).toFixed(2), // Format weight to two decimal places
        displayName: item.isIdentified ? item.name : "Unknown Item", // Handle unidentified items
    }));
}


/** @override */
activateListeners(html) {
    super.activateListeners(html);

    const userRole = game.user.isGM ? "GM" : "Player";
    console.log(`PartyCharacterSheet activated by: ${game.user.name} (${userRole})`);

    // Initialize collapsible sections for GM users
    if (game.user.isGM) {
        DMNotes.initializeCollapsibleSections(html);
    }

    // Initialize tab navigation and drag-and-drop functionality
    this._initializeTabs(html);

    // Watch Order Input Listener
    html.find(".watch-order-input").on("change", async (event) => {
        const input = event.currentTarget;
        const actorId = input.dataset.actorId;
        const watchOrder = parseInt(input.value) ?? 0;

        const actor = game.actors.get(actorId);
        if (!actor) {
            console.error(`PartyCharacterSheet | Actor not found for ID: ${actorId}`);
            return;
        }

        if (!actor.canUserModify(game.user, "update")) {
            console.warn(`PartyCharacterSheet | User does not have permission to update watch order for actor ${actor.name}`);
            return;
        }

        await actor.setFlag("world", "watchOrder", watchOrder);
        console.log(`Updated watch order for actor ID: ${actorId} - Watch Order: ${watchOrder}`);
    });

    // Marching Order Input Listener
    html.find(".marching-order-input").on("change", async (event) => {
        const input = event.currentTarget;
        const actorId = input.dataset.actorId;
        const marchingOrder = parseInt(input.value) ?? 0;

        const actor = game.actors.get(actorId);
        if (!actor) {
            console.error(`PartyCharacterSheet | Actor not found for ID: ${actorId}`);
            return;
        }

        if (!actor.canUserModify(game.user, "update")) {
            console.warn(`PartyCharacterSheet | User does not have permission to update marching order for actor ${actor.name}`);
            return;
        }

        await actor.setFlag("world", "marchingOrder", marchingOrder);
        console.log(`Updated marching order for actor ID: ${actorId} - Marching Order: ${marchingOrder}`);
    });

        // #region controls

        let actor = this.actor,
            dragLinks = html.find('#drag-link'),
            btnCreateSpellLists = html.find('.createspelllist-button'),
            btnCreateActionLists = html.find('.createactions-button'),
            btnRandomSpellListPopulation = html.find('.memslot-random-populate-control'),
            invItems = html.find('li.item'),
            invLootCoins = html.find('li.coin-loot'),
            btnLongrest = html.find('.actor-longrest'),
            btnInit = html.find('.roll-initiative'),
            btnApplyExp = html.find('button.apply-experience'),
            revealHidden = html.find('.reveal-hidden'),
            btnItemEdit = html.find('.item-edit'),
            btnProfMissing = html.find('.click-prof-missing'),
            btnProvisionsEdit = html.find('.item-provisions-edit'),
            btnProvisionsDelete = html.find('.item-provisions-delete'),
            btnProvisionsSelect = html.find('.item-provisions-select'),
            btnItemPreview = html.find('.item-preview'),
            btnItemView = html.find('.item-view'),
            btnItemDelete = html.find('.item-delete'),
            btnAbilityCheck = html.find('.ability-check'),
            btnAbilitySkillCheck = html.find('.ability-skill-check'), // todo: comma seperated different keys for different variants,
            btnSaveCheck = html.find('.save-check'),
            btnSpellCardRoll = html.find('.spellCard-roll'),
            btnChatCardRoll = html.find('.chatCard-roll'),
            // btnActionCardRoll = html.find('.actionCard-roll'),
            btnActionCardRoll = html.find('.actionCard-roll-V2'),
            btnEffectControl = html.find('.effect-control'),
            btnMemorizationControls = html.find('.memorization-controls'),
            btnMemspellSelect = html.find('.memspell-select'),
            // actionSheetBlock = html.find('.action-sheet-block'),
            // btnActionControls = html.find('.action-controls'),
            btnActionControlsV2 = html.find('.action-controlsV2'),
            btnActionGroupControlsV2 = html.find('.action-group-controlsV2'),
            btnActionToggleView = html.find('.action-toggle-view'),
            btnClassControl = html.find('.class-control'),
            btnWeaponMetalControls = html.find('.weapon-metal-controls'),
            // btnItemLocationControls = html.find('.item-location-controls'),
            btnItemImage = html.find('.item-image'),
            btnCloneCovertActor = html.find('.clone-covert-actor'),
            btnGeneralPropertiesControls = html.find('.general-properties-controls'),
            searchControls = html.find('.pnl_search_controls'),
            selFilter = html.find('.sel_inventory_filter'),
            txtSearch = html.find('.txt_inventory_search'),
            btnToggleSearchControls = html.find('.btn_toggle_search'),
            btnCollapsible = html.find('.ars_clps'),
            btnSyncOwnedSpells = html.find('.sync-owned-spells'),
            btnSyncOwnedPowers = html.find('.sync-owned-powers'),
            btnToggleItemMagic = html.find('.item-show-magic'),
            btnToggleItemIdentified = html.find('.item-show-identified'),
            btnItemQuantity = html.find('.item-quantity-control'),
            btnCharacterBrowserDirector = html.find('.character-browser-director'),
            btnCreateItem = html.find('.item-create'),
            btnLearnMagic = html.find('.btn-learn-magic'),
            itemBulkSelect = html.find('.item-image'),
            btnSelectAll = html.find('.btn_select_all'),
            btnToggleExpand = html.find('.btn_expand_all'),
            psiInputs = html.find('.psi-inputs, .psp-points-value'),
            btnResetClosedMind = html.find('.reset-closed-mind');

            // delete item button
            btnItemDelete.click((event) => this._confirmItemDelete(event));

    // Add listeners for marching order buttons
    html.find(".marching-order-style").on("click", async (event) => {
        const formation = $(event.currentTarget).data("style");
        console.log(`Marching Order | Selected formation: ${formation}`);
        await this._dropMarchingOrder(formation);
    });


    html.find(".direction-button[data-direction='N']").on("click", () => {
        this.selectedDirection = "N";
        html.find(".direction-button").removeClass("selected");
        html.find(".direction-button[data-direction='N']").addClass("selected");
        console.log("Direction selected: North");
    });

    html.find(".direction-button[data-direction='NE']").on("click", () => {
        this.selectedDirection = "NE";
        html.find(".direction-button").removeClass("selected");
        html.find(".direction-button[data-direction='NE']").addClass("selected");
        console.log("Direction selected: North-East");
    });

    html.find(".direction-button[data-direction='E']").on("click", () => {
        this.selectedDirection = "E";
        html.find(".direction-button").removeClass("selected");
        html.find(".direction-button[data-direction='E']").addClass("selected");
        console.log("Direction selected: East");
    });

    html.find(".direction-button[data-direction='SE']").on("click", () => {
        this.selectedDirection = "SE";
        html.find(".direction-button").removeClass("selected");
        html.find(".direction-button[data-direction='SE']").addClass("selected");
        console.log("Direction selected: South-East");
    });

    html.find(".direction-button[data-direction='S']").on("click", () => {
        this.selectedDirection = "S";
        html.find(".direction-button").removeClass("selected");
        html.find(".direction-button[data-direction='S']").addClass("selected");
        console.log("Direction selected: South");
    });

    html.find(".direction-button[data-direction='SW']").on("click", () => {
        this.selectedDirection = "SW";
        html.find(".direction-button").removeClass("selected");
        html.find(".direction-button[data-direction='SW']").addClass("selected");
        console.log("Direction selected: South-West");
    });

    html.find(".direction-button[data-direction='W']").on("click", () => {
        this.selectedDirection = "W";
        html.find(".direction-button").removeClass("selected");
        html.find(".direction-button[data-direction='W']").addClass("selected");
        console.log("Direction selected: West");
    });

    html.find(".direction-button[data-direction='NW']").on("click", () => {
        this.selectedDirection = "NW";
        html.find(".direction-button").removeClass("selected");
        html.find(".direction-button[data-direction='NW']").addClass("selected");
        console.log("Direction selected: North-West");
    });

    html.find(".activate-formation-button").on("click", async (event) => {
        const formation = $(event.currentTarget).data("style");
        const direction = this.selectedDirection || "N"; // Default to "N" if no direction selected
        console.log(`Activating formation: ${formation} with direction: ${direction}`);
        await this._dropMarchingOrder(formation, direction);
    });
            //modify owned items context menu
            html.find('.item-context-controls').click((event) => {
                const li = $(event.currentTarget).closest('.item');
                const item = this.actor.items.get(li.data('itemId'));
                this._openItemModifyContextMenu(event, item);
            });
    








    /**
 * Initialize dragstart for inventory items.
 */
html.find(".item").on("dragstart", (event) => {
    const li = event.currentTarget;
    const itemId = li.dataset.id; // Ensure this matches your item ID attribute
    const item = this.actor.items.get(itemId);

    if (!item) {
        console.error("PartyCharacterSheet | Item not found for drag:", itemId);
        return;
    }

    // Prepare drag data
    const dragData = {
        type: "Item",
        id: item.id, // Item ID being dragged
        actorId: this.actor.id, // Source actor's ID
        uuid: item.uuid, // Use the item's UUID, not the actor's
    };

    event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    console.log("PartyCharacterSheet | Dragging item:", dragData);
});
}


/**
 * Initialize drag-and-drop functionality.
 * @param {HTMLElement} html - The rendered HTML content.
 */
_activateDragDrop(html) {
    const dragDrop = new DragDrop({
        dragSelector: ".item-list .item",
        dropSelector: ".tab-content.inventory, .sheet-body",
        callbacks: {
            drop: this._handleOnDrop.bind(this),
        },
    });
    dragDrop.bind(html[0]);
}


/**
 * Handle dropped items specifically for the inventory.
 * @param {DragEvent} event - The drag event.
 * @param {Object} data - The data associated with the dropped item.
 */
async _onDropItem(event, data) {
    console.log("PartyCharacterSheet | Dropping item data:", data);

    // Validate drop data
    if (!data.uuid) {
        console.error("PartyCharacterSheet | Drop data does not include a valid UUID:", data);
        return ui.notifications.error("Invalid drop data.");
    }

    // Fetch the dropped item from UUID
    const item = await fromUuid(data.uuid);
    if (!item) {
        console.error("PartyCharacterSheet | Item not found from UUID:", data.uuid);
        return;
    }

    // Fetch source and target actors
    const sourceActor = game.actors.get(data.actorId);
    const targetActor = this.actor;

    if (!sourceActor || !targetActor) {
        console.error("PartyCharacterSheet | Source or target actor not found.");
        return;
    }

    console.log(`PartyCharacterSheet | Source Actor: ${sourceActor.name}, Target Actor: ${targetActor.name}`);
    console.log(`PartyCharacterSheet | Dropped item:`, item);

    // Locate the source item in the prepared inventory
    const sourceInventoryItem = sourceActor.items.find(i => i.id === item.id);
    if (!sourceInventoryItem) {
        console.error("PartyCharacterSheet | Source item not found in inventory:", item.id);
        return;
    }

    // Prompt for transfer quantity if item is stackable
    let transferQuantity = 1;
    if (sourceInventoryItem.system?.quantity > 1) {
        transferQuantity = await new Promise((resolve) => {
            new Dialog({
                title: `Transfer Quantity: ${sourceInventoryItem.name}`,
                content: `<p>Enter quantity to transfer:</p>
                          <input type="number" min="1" max="${sourceInventoryItem.system.quantity}" value="1" style="width:100%">`,
                buttons: {
                    ok: {
                        label: "Transfer",
                        callback: (html) => resolve(parseInt(html.find('input').val(), 10) || 1),
                    },
                    cancel: {
                        label: "Cancel",
                        callback: () => resolve(null),
                    },
                },
                default: "ok",
            }).render(true);
        });

        if (!transferQuantity) {
            console.log("PartyCharacterSheet | Transfer canceled by user.");
            return;
        }
    }

    // Clone the item to the target actor with the specified quantity
    const newItemData = {
        ...item.toObject(),
        system: { ...item.system, quantity: transferQuantity },
    };
    await targetActor.createEmbeddedDocuments("Item", [newItemData]);

    // Adjust the quantity or remove the item from the source actor
    const remainingQuantity = sourceInventoryItem.system.quantity - transferQuantity;

    if (remainingQuantity > 0) {
        // Update the source item's quantity
        try {
            console.log(`PartyCharacterSheet | Updating ${sourceInventoryItem.name} quantity on ${sourceActor.name}: ${remainingQuantity}`);
            await sourceActor.updateEmbeddedDocuments("Item", [
                { _id: sourceInventoryItem.id, "system.quantity": remainingQuantity },
            ]);
        } catch (error) {
            console.error("PartyCharacterSheet | Failed to update quantity on source actor:", error);
        }
    } else {
        // Delete the item if quantity reaches zero
        try {
            console.log(`PartyCharacterSheet | Removing ${sourceInventoryItem.name} from ${sourceActor.name} (quantity 0).`);
            await sourceActor.deleteEmbeddedDocuments("Item", [sourceInventoryItem.id]);
        } catch (error) {
            console.error("PartyCharacterSheet | Failed to delete item from source actor:", error);
        }
    }

    ui.notifications.info(`Transferred ${transferQuantity}x ${item.name} to ${targetActor.name}.`);
}


//--------------------------------------------------------------//
//
//From ARS
//
//
/**
     *  toggle item magic state
     * @param {*} event
     * @returns
     */
async #toggleItemMagic(event) {
    if (!game.user.isGM) return;
    const li = $(event.currentTarget).closest('.item');
    const item = this.actor.items.get(li.data('itemId'));
    const oldValue = item.system.attributes.magic;
    if (await dialogManager.confirm(`Toggle magic state for ${item.name}?`, 'Toggle Magic'))
        item.update({ 'system.attributes.magic': !oldValue });
}

/**
 * toggle item identified state
 * @param {*} event
 * @returns
 */
async #toggleItemIdentification(event) {
    if (!game.user.isGM) return;
    const li = $(event.currentTarget).closest('.item');
    const item = this.actor.items.get(li.data('itemId'));
    const oldValue = item.system.attributes.identified;
    if (await dialogManager.confirm(`Toggle identified state for ${item.name}?`, 'Toggle Magic'))
        item.update({ 'system.attributes.identified': !oldValue });
}

/**
 * set item quantity value
 * @param {*} event
 * @returns
 */
async #setItemQuantity(event) {
    const li = $(event.currentTarget).closest('.item');
    const item = this.actor.items.get(li.data('itemId'));
    const oldValue = item.system.quantity;
    const newValue = await dialogManager.getQuantity(
        0,
        Infinity,
        oldValue,
        `New Quantity`,
        `Quantity for ${item.name}`,
        'Update',
        'Cancel'
    );
    if (newValue == undefined) return;
    item.update({ 'system.quantity': newValue });
    console.warn(
        `${game.user.name} changed quantity of ${item.name} from ${oldValue} to ${newValue} on ${item.actor.name}`,
        {
            item,
        }
    );
}
/**
 *
 * Context menu to modify items owned by actor
 *
 * @param {*} event
 * @param {*} item
 */
_openItemModifyContextMenu(event, item) {
    if (!item) return;
    // Generate the HTML for the context menu using divs
    let menuHtml = `
        <div class="modify-context-menu">
            <div class="action" data-action="edit"><i class="fas fa-edit"></i> Edit</div>
            <div class="action" data-action="delete"><i class="fas fa-trash"></i> Delete</div>
            <div class="action" data-action="duplicate"><i class="fas fa-copy"></i> Duplicate</div>
            ${
                item.system.quantity > 1
                    ? '<div class="action" data-action="split"><i class="fa-solid fa-arrows-left-right"></i> Split</div>'
                    : ''
            }
            <div class="action" data-action="cancel"><i class='fa-solid fa-circle-xmark'></i></i> Cancel</div>                
        </div>
    `;

    let menu = $(menuHtml).appendTo(document.body);

    // Position the menu at the event's pageX and pageY slightly adjusted to make sure
    // mouse is inside the context menu
    menu.css({
        top: `${event.clientY - 15}px`,
        left: `${event.clientX - 15}px`,
    });

    // Handle clicks on the menu options
    menu.on('click', 'div[data-action]', async (e) => {
        const action = $(e.target).closest('div[data-action]').data('action');
        switch (action) {
            case 'edit':
                item.sheet.render(true);
                break;
            case 'delete':
                if (
                    await dialogManager.confirm(
                        `<b>Delete ${item?.name} ${
                            item?.system?.itemList?.length ? ' (and its contents)' : ''
                        }</b><p/>Are you sure?`,
                        'Confirm Delete'
                    )
                ) {
                    // ! bulk selection support
                    if (window.bulkItemSelection?.length) {
                        for (const itemId of window.bulkItemSelection) {
                            try {
                                await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
                            } catch (e) {}
                        }
                    } else {
                        this.actor.deleteEmbeddedDocuments('Item', [item.id]);
                    }
                }

                break;
            case 'duplicate':
                if (item.contains) {
                    ui.notifications.error(`${item.name} contains items and cannot be duplicated.`);
                } else if (
                    await dialogManager.confirm(
                        `<b>Duplicate ${item?.name} ${
                            item?.system?.itemList?.length ? ' (and its contents)' : ''
                        }</b><p/>Are you sure?`,
                        'Confirm Duplication'
                    )
                ) {
                    item.clone({}, { save: true }).then((duplicated) =>
                        console.log(`${this.actor.name} duplicated item ${duplicated.name}`)
                    );
                }
                break;
            case 'split':
                {
                    // dialog to get amount to split
                    const count = await dialogManager.getQuantity(
                        0,
                        item.system.quantity,
                        1,
                        `Split ${item.name} by how much?`,
                        'Split Item',
                        'Split',
                        'Cancel'
                    );
                    if (count > 0) {
                        if (count >= item.system.quantity) {
                            ui.notifications.error(`There are only ${item.system.quantity}`);
                        } else {
                            const itemData = item.toObject();
                            const leftOver = item.system.quantity - count;
                            itemData.system.quantity = count;
                            if (leftOver > 0) {
                                item.update({
                                    'system.quantity': item.system.quantity - count,
                                });
                            } else {
                                this.actor.deleteEmbeddedDocuments('Item', [item.id]);
                            }
                            this.actor.createEmbeddedDocuments('Item', [itemData]);
                        }
                    }
                }
                break;
            case 'cancel':
                menu.remove();
                break;
        }
        menu.remove(); // Remove the menu after an action is selected
    });

    // Use 'mouseleave' event to remove the menu when the mouse leaves the menu area
    menu.on('mouseleave', () => {
        menu.remove();
    });
}
/**
 *
 * Context menu to select specific item location, nocarried, carried, equipped
 *
 * @param {*} event
 * @param {*} item
 * @returns
 */
_openItemLocationContextMenu(event, item) {
    if (!item) return;
    // Generate the HTML for the context menu using divs
    let menuHtml = `
        <div class="modify-context-menu">
            <div class="action" data-action="notcarried"><i class="fas fa-exclamation-circle"></i> Not-Carried</div>
            <div class="action" data-action="carried"><i class="fas fa-box"></i> Carried</div>
            <div class="action" data-action="equipped"><i class="fas fa-shield-halved"></i> Equipped</div>
            <div class="action" data-action="cancel"><i class='fa-solid fa-circle-xmark'></i></i> Cancel</div>                
        </div>
    `;

    let menu = $(menuHtml).appendTo(document.body);

    // Position the menu at the event's pageX and pageY slightly adjusted to make sure
    // mouse is inside the context menu
    menu.css({
        top: `${event.clientY + 5}px`,
        left: `${event.clientX + 10}px`,
    });

    // Handle clicks on the menu options
    menu.on('click', 'div[data-action]', async (e) => {
        const action = $(e.target).closest('div[data-action]').data('action');
        const currentLocationState = item.system.location.state;
        switch (action) {
            case 'notcarried':
                if (currentLocationState !== 'nocarried') await item.update({ 'system.location.state': 'nocarried' });
                break;
            case 'carried':
                if (currentLocationState !== 'carried') await item.update({ 'system.location.state': 'carried' });
                break;
            case 'equipped':
                if (currentLocationState !== 'equipped') await item.update({ 'system.location.state': 'equipped' });
                break;
            case 'cancel':
                menu.remove();
                break;
        }
        menu.remove(); // Remove the menu after an action is selected
    });

    // Use 'mouseleave' event to remove the menu when the mouse leaves the menu area
    menu.on('mouseleave', () => {
        menu.remove();
    });
}

/**
 * Initialize collapsables
 */
initializeCollapseables(html) {
    // initialize containers
    const listContainers = html[0].querySelectorAll('.container-collapse');
    listContainers.forEach((item) => {
        const containerId = item.getAttribute('data-container-id');
        const containerKey = containerId;
        this.toggleInventoryCollapseable(html, containerKey, true);
    });
}

/**
 *
 * toggle collapsing containers and store state in localStorage
 *
 * @param {*} html
 * @param {*} localKey
 * @param {*} skipSet
 * @returns
 */
toggleInventoryCollapseable(html, localKey, skipSet = false) {
    const id = this.actor.id;
    const saveKey = `${id}-${localKey}}`;

    const expandElem = html.find(`#inventory-container-expand-${localKey}`)[0];

    const iconElem = html.find(`#inventory-container-icon-${localKey}`)[0];

    // container with nothing in it
    if (!iconElem) return;

    const localStorageData = localStorage.getItem(saveKey);
    let isCollapsed = localStorageData === 'true' || localStorageData === undefined || localStorageData === null;

    if (!skipSet) localStorage.setItem(saveKey, !isCollapsed);
    const currentCollapsed = skipSet ? isCollapsed : !isCollapsed;
    if (currentCollapsed) {
        iconElem.classList?.remove('fa-caret-down');
        iconElem.classList.add('fa-caret-right');
        expandElem.style.display = 'none';
    } else {
        iconElem.classList?.remove('fa-caret-right');
        iconElem.classList.add('fa-caret-down');
        expandElem.style.display = 'block';
    }
}

    /**
     * Confirm a click to delete item
     * @param {Event} event
     */
    async _confirmItemDelete(event) {
        // console.log("actor-sheet.js", "_confirmItemDelete");
        const li = $(event.currentTarget).parents('.item');
        const item = this.actor.getEmbeddedDocument('Item', li.data('id'));
        if (
            await dialogManager.confirm(
                `<b>Delete ${item?.name} ${item?.system?.itemList?.length ? ' (and its contents)' : ''}</b><p/>Are you sure?`,
                'Confirm Delete'
            )
        ) {
            if (window.bulkItemSelection?.length) {
                for (const itemId of window.bulkItemSelection) {
                    try {
                        await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
                    } catch (e) {}
                }
            } else {
                this.actor.deleteEmbeddedDocuments('Item', [li.data('id')]);
            }
        }
    }

    /**
     * Handle deleting of items
     * @param {Event} event
     */
    _onItemDelete(event) {
        const li = $(event.currentTarget).parents('.item');
        // console.log("actor-sheet.js _onItemDelete", { li });
        // console.log("actor-sheet.js _onItemDelete li.data(id)", li.data("id"));
        this.actor.deleteEmbeddedDocuments('Item', [li.data('id')]);
        li.slideUp(200, () => this.render(false));
    }
//---------------------------------end-------------------------------//

    


/**
 * Get the facing direction of a token based on its rotation.
 * @param {Token} token - The token to check.
 * @returns {string} - The facing direction ("N", "E", "S", "W").
 */
_getFacingDirection(token) {
    const rotation = token.document.rotation;
    if (rotation >= 45 && rotation < 135) return "E";
    if (rotation >= 135 && rotation < 225) return "S";
    if (rotation >= 225 && rotation < 315) return "W";
    return "N";
}

/**
 * Drop party members on the canvas based on the selected marching order formation and direction.
 * @param {string} formation - The selected marching order formation.
 * @param {string} direction - The selected facing direction.
 */
async _dropMarchingOrder(formation, direction) {
    const marchingOrdersData = WatchOrders.getMarchingOrders().sort((a, b) => a.marchingOrder - b.marchingOrder);
    if (!marchingOrdersData.length) {
        ui.notifications.warn("No marching order data found. Please set marching order values.");
        return;
    }

    // Get the "Party Character" token and its position
    const partyCharacterToken = canvas.tokens.placeables.find(token => token.actor?.uuid === "Actor.7c5kSTTDfN055dRE");
    if (!partyCharacterToken) {
        ui.notifications.error("Party Character token not found on the canvas.");
        return;
    }
    const startPoint = { x: partyCharacterToken.x, y: partyCharacterToken.y };

    // Calculate token positions based on formation and selected direction
    const positions = this._calculatePositions(formation, startPoint, direction, marchingOrdersData.length);

    // Drop tokens on the canvas
    for (let i = 0; i < marchingOrdersData.length; i++) {
        const { id } = marchingOrdersData[i];
        const actor = game.actors.get(id);
        if (!actor) {
            console.warn(`Marching Order | Actor not found for ID: ${id}`);
            continue;
        }

        await this._spawnToken(actor, positions[i]);
    }

    // Remove the Party Character token from the canvas
    try {
        await partyCharacterToken.document.delete();
        console.log("PartyCharacterSheet | Party Character token removed from the canvas.");
    } catch (error) {
        console.error("Failed to remove Party Character token:", error);
    }

    ui.notifications.info(`Marching order "${formation}" deployed successfully.`);
}

/**
 * Prompt the user to click on the canvas for the starting point.
 * @returns {Promise<Object>} - The {x, y} coordinates of the starting point.
 */
async _getStartingPoint() {
    return new Promise((resolve) => {
        const handler = (event) => {
            canvas.stage.off("click", handler);
            const { x, y } = event.data.getLocalPosition(canvas.tokens);
            resolve({ x, y });
        };
        canvas.stage.on("click", handler);
        ui.notifications.info("Click on the canvas to set the starting point for the marching order.");
    });
}

/**
 * Initialize directional control listeners for all formations.
 * @param {HTMLElement} html - The rendered HTML content.
 */
_activateDirectionalControlListeners(html) {
    this.selectedDirection = "N"; // Default direction

    // Handle direction button clicks
    html.find(".direction-button").on("click", (event) => {
        const direction = $(event.currentTarget).data("direction");
        this.selectedDirection = direction;
        html.find(".direction-button").removeClass("selected");
        $(event.currentTarget).addClass("selected");
        console.log(`Selected direction: ${this.selectedDirection}`);
    });

    // Handle formation activation button click
    html.find(".activate-formation-button").on("click", async (event) => {
        const formation = $(event.currentTarget).data("style");
        const direction = this.selectedDirection || "N"; // Use the selected direction, default to "N"
        console.log(`Activating formation: ${formation} with direction: ${direction}`);

        // Directly call the token placement function
        await this._dropMarchingOrder(formation, direction);
    });
}

/**
 * Prompt the user to select a facing direction.
 * @returns {Promise<string>} - The selected direction ("N", "E", "S", "W").
 */
async _selectFacingDirection() {
    return new Promise((resolve) => {
        new Dialog({
            title: "Select Facing Direction",
            content: `
                <div style="text-align: center;">
                    <button data-direction="N">North</button>
                    <button data-direction="E">East</button>
                    <button data-direction="S">South</button>
                    <button data-direction="W">West</button>
                </div>
            `,
            buttons: {
                close: {
                    label: "Cancel",
                    callback: () => resolve(null),
                },
            },
            close: () => resolve(null),
        }).render(true);
        // Capture button clicks
        $(document).on("click", "button[data-direction]", (event) => {
            const direction = $(event.currentTarget).data("direction");
            resolve(direction);
        });
    });
}

/**
 * Calculate token positions based on formation and facing direction.
 * @param {string} formation - The selected formation style.
 * @param {Object} startPoint - The starting point {x, y}.
 * @param {string} direction - The facing direction ("N", "E", "S", "W", "NE", "SE", "SW", "NW").
 * @param {number} count - The number of tokens to place.
 * @returns {Array<Object>} - Array of {x, y} positions for each token.
 */
_calculatePositions(formation, startPoint, direction, count) {
    const gridSize = canvas.grid.size;
    const positions = [];

// Updated offset helper function with reversed logic for "E", "W", and diagonal directions
const offset = (dx, dy) => {
    switch (direction) {
        case "N": return { x: startPoint.x + dx * gridSize, y: startPoint.y + dy * gridSize };
        case "E": return { x: startPoint.x - dy * gridSize, y: startPoint.y + dx * gridSize };
        case "S": return { x: startPoint.x - dx * gridSize, y: startPoint.y - dy * gridSize };
        case "W": return { x: startPoint.x + dy * gridSize, y: startPoint.y - dx * gridSize };
        case "NE": return { x: startPoint.x - dx * gridSize, y: startPoint.y - dx * gridSize };
        case "SE": return { x: startPoint.x - dx * gridSize, y: startPoint.y + dx * gridSize }; 
        case "SW": return { x: startPoint.x + dx * gridSize, y: startPoint.y + dx * gridSize }; 
        case "NW": return { x: startPoint.x + dx * gridSize, y: startPoint.y - dx * gridSize }; 
        default: return startPoint;
    }
};

    // Adjust starting point to be 1 square directly behind the "Party Character"
    switch (direction) {
        case "N": startPoint = offset(0, 1); break;
        case "E": startPoint = offset(-1, 0); break;
        case "S": startPoint = offset(0, -1); break;
        case "W": startPoint = offset(1, 0); break;
        case "NE": startPoint = offset(-1, 1); break;
        case "SE": startPoint = offset(-1, -1); break;
        case "SW": startPoint = offset(1, -1); break;
        case "NW": startPoint = offset(1, 1); break;
    }

    // Define formations with diagonal direction handling
    switch (formation) {
        case "single-file":
            for (let i = 0; i < count; i++) {
                positions.push(offset(0, i)); // Line up tokens directly behind each other
            }
            break;

        case "dual-column":
            for (let i = 0; i < count; i++) {
                const col = i % 2 === 0 ? 0 : 1;
                const row = Math.floor(i / 2);
                positions.push(offset(col, row)); // No gap between columns
            }
            break;

        case "t-formation":
            positions.push(offset(0, 0)); // Top center
            positions.push(offset(-1, 0)); // Top left
            positions.push(offset(1, 0)); // Top right
            for (let i = 3; i < count; i++) {
                positions.push(offset(0, i - 2)); // Straight back
            }
            break;

            case "hex-formation":
                // Center of the hexagon
                positions.push(offset(0, 0)); // Center
            
                // First ring (6 surrounding positions)
                if (count > 1) positions.push(offset(0, 3));     // Bottom
                if (count > 2) positions.push(offset(3, 0));     // Right
                if (count > 3) positions.push(offset(2, -2));    // Top Right
                if (count > 4) positions.push(offset(0, -3));    // Top
                if (count > 5) positions.push(offset(-2, -2));   // Top Left
                if (count > 6) positions.push(offset(-3, 0));    // Left
            
                // Second ring (expanding the hexagon outwards)
                if (count > 7) positions.push(offset(0, 3));     // Bottom
                if (count > 8) positions.push(offset(5, 2));     // Right
                if (count > 9) positions.push(offset(4, -2));    // Top Right
                if (count > 10) positions.push(offset(0, -4));   // Top
                if (count > 11) positions.push(offset(-4, -2));  // Top Left
                if (count > 12) positions.push(offset(-5, 2));   // Left
            
                // Additional tokens (expand the hexagon in a spiral pattern)
                let hexLayer = 3;
                let hexIndex = 13;
                while (hexIndex < count) {
                    positions.push(offset(0, hexLayer));               // Bottom
                    positions.push(offset(hexLayer, hexLayer - 1));    // Right
                    positions.push(offset(hexLayer, -hexLayer + 1));   // Top Right
                    positions.push(offset(0, -hexLayer));              // Top
                    positions.push(offset(-hexLayer, -hexLayer + 1));  // Top Left
                    positions.push(offset(-hexLayer, hexLayer - 1));   // Left
                    hexLayer++;
                    hexIndex += 6;
                }
                break;

            case "triangle":
                // Top center
                positions.push(offset(0, 0));
            
                // First row (left and right positions)
                if (count > 1) positions.push(offset(-1, 1)); // Left
                if (count > 2) positions.push(offset(1, 1));  // Right
            
                // Second row (left, center, right)
                if (count > 3) positions.push(offset(-2, 2)); // Far left
                if (count > 4) positions.push(offset(0, 2));  // Center
                if (count > 5) positions.push(offset(2, 2));  // Far right
            
                // Additional rows (expand backwards in a triangle shape)
                let row = 3;
                let j = 6;
                while (j < count) {
                    positions.push(offset(-row, row)); // Far left
                    if (j + 1 < count) positions.push(offset(0, row));  // Center
                    if (j + 2 < count) positions.push(offset(row, row)); // Far right
                    j += 3;
                    row++;
                }
                break;
        default:
            ui.notifications.error("Invalid formation style selected.");
            return [];
    }
    return positions.slice(0, count);
}

/**
 * Spawn a token for the actor at the specified position using ARS-specific logic.
 * @param {Actor} actor - The actor to spawn.
 * @param {Object} position - The {x, y} position to place the token.
 */
async _spawnToken(actor, position) {
    try {
        // Fetch the token document using ARS-specific method
        const tokenDocument = await actor.getTokenDocument(
            {
                hidden: game.user.isGM && event.altKey,
                sort: Math.max(canvas.tokens.placeables.length + 1, 0),
            },
            { parent: canvas.scene }
        );

        if (!tokenDocument) {
            console.error(`PartyCharacterSheet | Failed to retrieve token document for actor ${actor.name}`);
            return;
        }

        // Set the token position
        tokenDocument.updateSource({ x: position.x, y: position.y });

        // Ensure the position is within canvas bounds
        if (!canvas.dimensions.rect.contains(tokenDocument.x, tokenDocument.y)) {
            console.warn(`PartyCharacterSheet | Position (${position.x}, ${position.y}) is out of bounds`);
            return;
        }

        // Create the token on the canvas
        await canvas.scene.createEmbeddedDocuments("Token", [tokenDocument.toObject()]);
        console.log(`Spawned token for actor ${actor.name} at (${position.x}, ${position.y})`);
    } catch (error) {
        console.error(`Failed to spawn token for actor ${actor.name}:`, error);
    }
}

_initializeTabs(html) {
    const tabs = new Tabs({
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "members",
    });
    tabs.bind(html[0]);
    this._showActiveTab(html);
    html.find(".tab-item").on("click", (event) => {
        const tab = event.currentTarget.dataset.tab;
        this._switchTab(html, tab);
    });
}

_switchTab(html, tab) {
    html.find(".tab-content").hide();
    html.find(`.tab-content[data-tab="${tab}"]`).show();
}

_showActiveTab(html) {
    const initialTab = this.options.tabs[0]?.initial || "members";
    html.find(`.tab-content[data-tab="${initialTab}"]`).show();
}
}
