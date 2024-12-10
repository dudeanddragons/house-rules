// scripts/party-parts/inventory.js
console.log("inventory.js loaded successfully.");

export class Inventory {
    /**
     * Fetch and prepare dummy inventory data.
     * @returns {Array} An array of inventory item objects with placeholder data.
     */
    static getInventory() {
        console.log("Inventory | Fetching dummy inventory data.");
        return [
            { name: "Potion of Healing", quantity: 3 },
            { name: "Rope (50 ft)", quantity: 1 },
            { name: "Torch", quantity: 10 }
        ];
    }
}
