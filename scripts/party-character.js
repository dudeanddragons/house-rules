// party-character.js
console.log("party-character.js loaded successfully.");

import { PartyCharacterSheet } from "./party-character-sheet.js";

export class PartyCharacter extends Actor {
    /** @override */
    prepareBaseData() {
        super.prepareBaseData();
        console.log("PartyCharacter | Preparing base data.");

        // Mark this actor as a Party Character
        this.system.isPartyCharacter = true;

        // Fetch and assign party members (player-owned actors)
        this.system.partyMembers = this.getPartyMembers();
        console.log(`PartyCharacter | Found ${this.system.partyMembers.length} party members.`);
    }

    /**
     * Fetch all player-owned actors as party members.
     * @returns {Array} An array of player-owned actor data.
     */
    getPartyMembers() {
        console.log("PartyCharacter | Fetching player-owned actors as party members.");
        return game.actors.filter((actor) => actor.hasPlayerOwner);
    }
}

// Register the custom PartyCharacterSheet
Hooks.once('setup', async () => {
    console.log("PartyCharacter | Registering custom PartyCharacterSheet.");

    try {
        // Register the custom actor sheet
        Actors.registerSheet("house-rules", PartyCharacterSheet, {
            types: ["character"],
            makeDefault: false,
            label: "Custom Party Character Sheet"
        });

        // Fetch the Party Character by UUID and set its sheet class
        const uuid = "Actor.7c5kSTTDfN055dRE";
        const partyCharacter = await fromUuid(uuid);

        if (partyCharacter) {
            console.log(`PartyCharacter | Found Party Character with UUID: ${uuid}`);
            await partyCharacter.setFlag("core", "sheetClass", "house-rules.PartyCharacterSheet");
            console.log("PartyCharacter | Custom PartyCharacterSheet applied successfully.");
        } else {
            console.error(`PartyCharacter | Failed to find actor with UUID: ${uuid}`);
        }
    } catch (error) {
        console.error("PartyCharacter | Error during sheet registration or actor update:", error);
    }
});

// Hook to update the Party Character when actors are updated
Hooks.on('updateActor', (actor, data, options, userId) => {
    if (actor.system.isPartyCharacter) {
        console.log(`PartyCharacter | Actor update detected. Refreshing Party Character: ${actor.name}`);
        actor.prepareBaseData();
    }
});

/**
 * Utility function to refresh the Party Character sheet data
 */
export async function refreshPartyCharacter() {
    const uuid = "Actor.7c5kSTTDfN055dRE";
    try {
        const partyCharacter = await fromUuid(uuid);
        if (partyCharacter) {
            console.log("PartyCharacter | Refreshing Party Character data.");
            await partyCharacter.prepareBaseData();
            await partyCharacter.sheet.render(false);
        } else {
            console.warn("PartyCharacter | Could not find Party Character actor to refresh.");
        }
    } catch (error) {
        console.error("PartyCharacter | Error while refreshing Party Character data:", error);
    }
}

