// scripts/party-parts/members.js
console.log("members.js loaded successfully.");

export class Members {
    /**
     * Fetch and prepare the list of party members safely.
     * Uses ARS Party Tracker's method if available.
     * @returns {Array} An array of actor data for party members.
     */
    static getPartyMembers() {
        try {
            console.log("Members | Fetching party members.");
            if (game.party && typeof game.party.getMemberArray === 'function') {
                const members = game.party.getMemberArray();
                console.log(`Members | Found ${members.length} members using ARS Party Tracker.`);
                return members;
            }

            // Fallback if ARS Party Tracker is not available
            const fallbackMembers = game.actors.filter((actor) => actor.hasPlayerOwner);
            console.log(`Members | Fallback: Found ${fallbackMembers.length} player-owned actors.`);
            return fallbackMembers;
        } catch (error) {
            console.error("Members | Error fetching party members:", error);
            return [];
        }
    }
}
