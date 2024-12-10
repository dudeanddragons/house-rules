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





    
    html.find(".item").on("dragstart", (event) => {
        const li = event.currentTarget;
        const itemId = li.dataset.id;
        const item = this.actor.items.get(itemId);
    
        if (!item) {
            console.error("PartyCharacterSheet | Item not found for drag:", itemId);
            return;
        }
    
        // Prepare drag data
        const dragData = {
            type: "Item",
            id: item.id,
            uuid: item.uuid, // Ensure ARS has access to the UUID
            actorId: this.actor.id,
            sourceUuid: this.actor.uuid, // Add the source actor's UUID
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
 * Handle the onDrop logic with data types.
 * @param {DragEvent} event - The drag event.
 * @param {Object} data - The data associated with the drag.
 */
async _handleOnDrop(event, data) {
    console.log("PartyCharacterSheet | Handling drop event", { event, data });

    if (!data) {
        console.error("PartyCharacterSheet | Drop data is undefined.");
        return ui.notifications.error("Invalid drop data. Please try again.");
    }

    // Determine data type and process accordingly
    const type = data.type || (data.items && data.items[0]?.type);

    if (!type) {
        console.error("PartyCharacterSheet | Drop type is undefined:", data);
        return ui.notifications.error("Unsupported drop type.");
    }

    switch (type) {
        case "Item":
            return this._onDropItem(event, data);
        default:
            console.warn("Unsupported drop type:", type);
            break;
    }
}

/**
 * Handle dropped items specifically for the inventory.
 * Supports ARS-like data structure for cross-actor interaction.
 * @param {DragEvent} event - The drag event.
 * @param {Object} data - The data associated with the dropped item.
 */
async _onDropItem(event, data) {
    console.log("PartyCharacterSheet | Dropping item data:", data);

    let item;
    try {
        // Support ARS-style drag data structure
        if (data.uuid) {
            item = await fromUuid(data.uuid);
        } else if (data.id && data.actorId) {
            const sourceActor = game.actors.get(data.actorId);
            item = sourceActor ? sourceActor.items.get(data.id) : null;
        }

        if (!item) {
            console.error("PartyCharacterSheet | Item not found in drop data:", data);
            return ui.notifications.error("Item not found.");
        }
    } catch (err) {
        console.error("PartyCharacterSheet | Failed to resolve item from drop data:", err);
        return;
    }

    // Determine target actor
    const targetActor = this.actor;

    if (!targetActor) {
        console.error("PartyCharacterSheet | Target actor not found.");
        return ui.notifications.error("Target actor not found.");
    }

    // Clone the item to the target actor
    const newItem = await targetActor.createEmbeddedDocuments("Item", [item.toObject()]);
    if (newItem) {
        ui.notifications.info(`Added "${item.name}" to ${targetActor.name}.`);
        console.log("PartyCharacterSheet | Item added to target actor:", newItem);

        // Optionally remove the item from the source actor (if ARS logic is followed)
        if (data.actorId && data.actorId !== targetActor.id) {
            const sourceActor = game.actors.get(data.actorId);
            if (sourceActor) {
                await sourceActor.deleteEmbeddedDocuments("Item", [item.id]);
                console.log(`PartyCharacterSheet | Removed "${item.name}" from source actor.`);
            }
        }
    } else {
        ui.notifications.error("Failed to add item to target inventory.");
    }
}





/**
 * Handle dropped actors.
 * @param {DragEvent} event - The drag event.
 * @param {Object} data - The data associated with the dropped actor.
 */
async _onDropActor(event, data) {
    console.log("PartyCharacterSheet | Dropping actor data:", data);

    const actor = await Actor.implementation.fromDropData(data);

    if (!actor) {
        console.error("PartyCharacterSheet | Dropped actor could not be resolved.");
        return;
    }

    ui.notifications.info(`Actor "${actor.name}" dropped onto the Party Character Sheet.`);
    console.log(`PartyCharacterSheet | Actor dropped:`, actor);
}

/**
 * Handle dropped folders (if applicable).
 * @param {DragEvent} event - The drag event.
 * @param {Object} data - The data associated with the dropped folder.
 */
async _onDropFolder(event, data) {
    console.warn("PartyCharacterSheet | Folder drops are not implemented.");
    ui.notifications.warn("Folder drops are not supported on the Party Character Sheet.");
}

/**
 * Handle dropped active effects (if applicable).
 * @param {DragEvent} event - The drag event.
 * @param {Object} data - The data associated with the dropped effect.
 */
async _onDropActiveEffect(event, data) {
    console.warn("PartyCharacterSheet | Active Effect drops are not implemented.");
    ui.notifications.warn("Active Effect drops are not supported on the Party Character Sheet.");
}














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
