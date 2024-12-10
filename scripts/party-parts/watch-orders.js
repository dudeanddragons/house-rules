import { Members } from './members.js';

console.log("watch-orders.js loaded successfully.");

export class WatchOrders {
    /**
     * Fetches the watch order data for the party members.
     * @returns {Array} - Array of party members with watch order data.
     */
    static getWatchOrders() {
        const members = Members.getPartyMembers();
        console.log("WatchOrders | Fetching watch orders for party members:", members);

        return members.map(member => {
            const watchOrder = member.getFlag("world", "watchOrder") ?? 0;
            return {
                id: member.id,
                img: member.img,
                name: member.name,
                watchOrder,
            };
        });
    }

    /**
     * Fetches the marching order data for the party members.
     * @returns {Array} - Array of party members with marching order data.
     */
    static getMarchingOrders() {
        const members = Members.getPartyMembers();
        console.log("WatchOrders | Fetching marching orders for party members:", members);

        return members.map(member => {
            const marchingOrder = member.getFlag("world", "marchingOrder") ?? 0;
            return {
                id: member.id,
                img: member.img,
                name: member.name,
                marchingOrder,
            };
        });
    }

    /**
     * Helper function to fetch the Actor instance safely.
     * @param {string} actorId - The ID of the actor.
     * @returns {Actor|null} - The Actor instance or null if not found.
     */
    static _getActorById(actorId) {
        const actor = game.actors.get(actorId);
        if (!actor) {
            console.warn(`WatchOrders | Actor not found for ID: ${actorId}`);
            return null;
        }
        return actor;
    }

    /**
     * Save the watch order for a specific actor.
     * @param {string} actorId - The ID of the actor.
     * @param {number} watchOrder - The watch order value.
     */
    static async saveWatchOrder(actorId, watchOrder) {
        const actor = this._getActorById(actorId);
        if (!actor) return;

        if (!actor.canUserModify(game.user, "update")) {
            console.warn(`WatchOrders | User does not have permission to update watch order for actor ${actor.name}`);
            return;
        }

        try {
            await actor.setFlag("world", "watchOrder", watchOrder);
            console.log(`WatchOrders | Successfully saved watch order for actor ${actor.name}`);
        } catch (error) {
            console.error(`WatchOrders | Error saving watch order for actor ${actor.name}:`, error);
        }
    }

    /**
     * Save the marching order for a specific actor.
     * @param {string} actorId - The ID of the actor.
     * @param {number} marchingOrder - The marching order value.
     */
    static async saveMarchingOrder(actorId, marchingOrder) {
        const actor = this._getActorById(actorId);
        if (!actor) return;

        if (!actor.canUserModify(game.user, "update")) {
            console.warn(`WatchOrders | User does not have permission to update marching order for actor ${actor.name}`);
            return;
        }

        try {
            await actor.setFlag("world", "marchingOrder", marchingOrder);
            console.log(`WatchOrders | Successfully saved marching order for actor ${actor.name}`);
        } catch (error) {
            console.error(`WatchOrders | Error saving marching order for actor ${actor.name}:`, error);
        }
    }

    /**
     * Initialize UI listeners for watch and marching orders.
     * @param {HTMLElement} html - The rendered HTML content.
     */
    static activateListeners(html) {
        console.log("WatchOrders | Activating listeners...");

        // Watch Order Input Listener
        html.find(".watch-order-input").off("change").on("change", async (event) => {
            const input = event.currentTarget;
            const actorId = input.dataset.actorId;
            const watchOrder = parseInt(input.value) ?? 0;
            await WatchOrders.saveWatchOrder(actorId, watchOrder);
            console.log(`WatchOrders | Updated watch order for actor ID: ${actorId} - Watch Order: ${watchOrder}`);
        });

        // Marching Order Input Listener
        html.find(".marching-order-input").off("change").on("change", async (event) => {
            const input = event.currentTarget;
            const actorId = input.dataset.actorId;
            const marchingOrder = parseInt(input.value) ?? 0;
            await WatchOrders.saveMarchingOrder(actorId, marchingOrder);
            console.log(`WatchOrders | Updated marching order for actor ID: ${actorId} - Marching Order: ${marchingOrder}`);
        });

        console.log("WatchOrders | Listeners for watch order and marching order inputs activated successfully.");
    }
}
