// scripts/party-parts/dm-notes.js

// Import necessary ARS modules
import { ARS } from '/systems/ars/module/config.js';
import * as effectManager from '/systems/ars/module/effect/effects.js';
import { runAsGM } from '/systems/ars/module/utilities.js';

console.log("dm-notes.js loaded successfully.");

export class DMNotes {
    /**
     * Fetches the content for the DM Notes tab.
     * @param {Actor} actor - The actor object for which DM notes are fetched.
     * @returns {Promise<string>} - The rendered DM notes content.
     */
    static async getDMNotesContent(actor) {
        try {
            console.log(`DMNotes | Fetching DM notes content for actor: ${actor.name}`);

            const templatePath = "modules/house-rules/templates/party-sheet-cards.hbs";
            const members = game.actors.filter(a => a.hasPlayerOwner);

            if (!members || members.length === 0) {
                console.error("DMNotes | No party members found.");
                return `<p>No party members available.</p>`;
            }

            // Prepare context for the template
            const context = { members: members.map(a => a.toObject()) };
            console.log("DMNotes | Template context:", context);

            // Render the template
            const rendered = await renderTemplate(templatePath, context);
            console.log("DMNotes | Successfully rendered DM notes content.");
            return rendered;
        } catch (error) {
            console.error("DMNotes | Error fetching DM notes content:", error);
            return `<p>Error loading DM notes content.</p>`;
        }
    }

    /**
     * Initializes collapsible sections in the DM Notes tab.
     * @param {HTMLElement} html - The rendered HTML of the sheet.
     */
    static initializeCollapsibleSections(html) {
        html.find(".collapsible-header").on("click", (event) => {
            const content = $(event.currentTarget).next(".collapsible-content");
            content.slideToggle(200);
            $(event.currentTarget).toggleClass("collapsed");
        });
        console.log("DMNotes | Collapsible sections initialized.");
    }

    /**
     * Render the party preview for the DM Notes tab.
     * @returns {Promise<string>} - Rendered HTML of the party preview.
     */
    static async renderPartyPreview() {
        try {
            console.log("DMNotes | Rendering party preview.");

            const members = game.actors.filter(a => a.hasPlayerOwner);
            if (!members || members.length === 0) {
                console.warn("DMNotes | No party members found for preview.");
                return "<p>No party members available.</p>";
            }

            const templatePath = "modules/house-rules/templates/party-sheet-cards.hbs";
            const context = { members: members.map(a => a.toObject()) };

            const html = await renderTemplate(templatePath, context);
            console.log("DMNotes | Successfully rendered party preview.");
            return html;
        } catch (error) {
            console.error("DMNotes | Error rendering party preview:", error);
            return "<p>Error rendering party preview.</p>";
        }
    }

    /**
     * Save DM notes content to the actor's flags.
     * @param {Actor} actor - The actor instance.
     * @param {String} content - The DM notes content.
     */
    static async saveDMNotes(actor, content) {
        console.log(`DMNotes | Saving DM notes for actor: ${actor.name}`);
        await runAsGM({
            operation: 'setFlag',
            targetActorId: actor.id,
            flag: { tag: 'dmNotes', data: content },
        });
        ui.notifications.info(`DM notes for ${actor.name} have been saved.`);
    }

    /**
     * Render the party-sheet-cards.hbs template as a standalone section.
     * @param {Array} members - Array of party members.
     * @returns {Promise<string>} - Rendered HTML of the party-sheet-cards.
     */
    static async renderPartySheetCards(members) {
        const templatePath = "modules/house-rules/templates/party-sheet-cards.hbs";
        try {
            const html = await renderTemplate(templatePath, { members });
            console.log("DMNotes | Successfully rendered party-sheet-cards.");
            return html;
        } catch (error) {
            console.error("DMNotes | Error rendering party-sheet-cards:", error);
            return "<p>Error: Unable to render party-sheet-cards.</p>";
        }
    }
}
