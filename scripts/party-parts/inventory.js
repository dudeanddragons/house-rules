export class Inventory {
    /**
     * Process inventory data for the party sheet.
     * @param {Array} inventory - The raw inventory data array.
     * @returns {Array} Processed inventory array with additional derived data.
     */
    static prepareInventory(inventory) {
        if (!Array.isArray(inventory)) {
            console.error("Inventory | Invalid inventory data:", inventory);
            return [];
        }

        console.log("Inventory | Preparing inventory data.");
        return inventory.map(item => ({
            ...item,
            weight: (item.weight || 0).toFixed(2), // Ensure weight is formatted
            displayName: item.isIdentified ? item.name : "Unknown Item", // Handle unidentified items
        }));
    }
}
