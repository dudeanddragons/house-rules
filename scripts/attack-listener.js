// attack-listener.js

import { openCriticalHitDialog } from "./critical-tables.js"; // Import the critical tables module

Hooks.on("createChatMessage", async (message) => {
    console.log("New ARS chat message detected:", message);

    // Avoid processing the macro's own output
    if (message.content.includes("Attack Roll Information:")) {
        console.log("This message is from the macro itself. Skipping...");
        return;
    }

    // Parse the HTML content of the chat message
    const htmlContent = $('<div>').html(message.content);
    console.log("Parsed HTML Content:", htmlContent);

    // Check if the message contains an attack card (class="attack-card")
    const attackCard = htmlContent.find(".attack-card");
    console.log("Attack Card Detected:", attackCard);

    if (attackCard.length > 0) {
        console.log("Attack card detected!");

        // Extract Target AC
        const targetAC = attackCard.find(".grid-item-attack-details:contains('Target AC')").text().replace("Target AC", "").trim() || "Unknown";

        // Extract Hit AC from the 'attack-text' section
        const hitAC = attackCard.find(".attack-text").text().match(/AC ([\-]?\d+)/)?.[1] || "Unknown";

        // Extract and break up the dice tooltip (e.g., "15 + 3")
        const diceTooltip = attackCard.find(".rolledText.dice-tooltip").text().trim();
        const diceComponents = diceTooltip.split("+").map(part => part.trim());
        const naturalRoll = parseInt(diceComponents[0], 10); // Parse as an integer

        // Extract the actor and item IDs
        const cardButtons = attackCard.find(".card-buttons");
        const actorId = cardButtons.attr("data-source-actor-id");
        const itemId = cardButtons.attr("data-item-id");
        let damageType = "slashing";

        // Ensure actor is defined and get the item
        let actor, item;
        if (actorId && itemId) {
            actor = game.actors.get(actorId);
            if (actor) {
                item = actor.items.get(itemId);
                console.log("Item retrieved from actor:", item);

                // Extract damage type from item
                if (item && item.system?.damage?.type) {
                    damageType = item.system.damage.type || "slashing";
                }
            } else {
                console.error("Actor not found with ID:", actorId);
            }
        } else {
            console.error("Actor ID or Item ID missing.");
        }

        // Default critical threat range
        let critRange = 18;

        // Adjust critical range based on item skill modifier, if it exists
        let critModValue = 0; // Initialize the modifier value

        if (actor && item) {
            const skillMods = item.system.attributes?.skillmods;
            if (skillMods && Array.isArray(skillMods)) {
                const critMod = skillMods.find(mod => mod.name.toLowerCase() === "crit");
                if (critMod) {
                    critModValue = critMod.value;
                    critRange -= critModValue; // Adjust the crit range by the modifier value
                    console.log(`Critical threat range modified by ${critModValue}, new range: ${critRange}`);
                }
            } else {
                console.log("No skillmods found on item or skillmods is not an array.");
            }
        }

        // Determine the result of the attack
        let attackResult = "";
        if (naturalRoll === 1) {
            // Handle Fumble Threat
            attackResult = "Fumble Threat";
            if (game.user.isGM && actor) {
                await performFumbleCheck(actor, message.rolls[0].formula, targetAC, hitAC);
            }
        } else if (naturalRoll === 20 || (naturalRoll >= critRange && parseInt(hitAC) <= parseInt(targetAC))) {
            attackResult = "Critical Threat";
            if (game.user.isGM && actor) {
                await performSecondaryAttack(actor, message.rolls[0].formula, targetAC, hitAC, damageType); // Pass damageType to performSecondaryAttack
            }
        } else if (parseInt(hitAC) <= parseInt(targetAC)) {
            attackResult = "Hit";
        } else {
            attackResult = "Miss";
        }

        // Log extracted values including critModValue
        console.log("Target AC:", targetAC);
        console.log("Hit AC:", hitAC);
        console.log("Natural Roll:", naturalRoll);
        console.log("Dice Tooltip:", diceTooltip);
        console.log("Damage Type:", damageType);
        console.log("Attack Result:", attackResult);
        console.log("Critical Modifier Value:", critModValue); // Added for verification

        // Create output message
        const output = `
            <b>Attack Roll Information:</b><br>
            <b>Target AC:</b> ${targetAC}<br>
            <b>Hit AC:</b> ${hitAC}<br>
            <b>Natural Roll:</b> ${naturalRoll}<br>
            <b>Dice Tooltip:</b> ${diceTooltip}<br>
            <b>Damage Type:</b> ${damageType}<br>
            <b>Attack Result:</b> ${attackResult}<br>
            <b>Critical Modifier Value:</b> ${critModValue}<br> <!-- Added to output for visibility -->
        `;

        // Optionally send the result to chat
        // ChatMessage.create({
        //     speaker: message.speaker,
        //     content: output,
        // });
    } else {
        console.log("No attack card found in this message.");
    }
});

// Function to roll secondary attack for critical hits
async function performSecondaryAttack(actor, formula, targetAC, hitAC, damageType) {
    if (!game.user.isGM) return; // Ensure only the GM can execute

    const secondaryRoll = new Roll(formula);
    await secondaryRoll.evaluate();  // Asynchronous by default in v12, no need for async parameter

    await secondaryRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: "Critical Threat",
    });

    const secondaryRollResult = secondaryRoll.total;
    const acHit = actor.acHit(secondaryRollResult);

    // Check if the secondary roll confirms the critical hit
    if (acHit <= targetAC) {
        console.log("Secondary roll hit: Confirmed critical hit!");
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: `<strong>Confirmed Critical Hit!</strong>`,
        });

        // Only the GM should open the critical hit dialog
        if (game.user.isGM) {
            await openCriticalHitDialog(damageType); // Pass the damageType to openCriticalHitDialog
        }
    } else {
        console.log("Secondary roll did not hit: Not a critical hit.");
        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: `<strong>Critical Hit Not Confirmed!</strong>`,
        });
    }
}

// Function to handle fumble check
async function performFumbleCheck(actor, formula, targetAC, hitAC) {
    if (!game.user.isGM) return; // Ensure only the GM can execute

    const fumbleRoll = new Roll(formula);
    await fumbleRoll.evaluate();  // Evaluate the roll

    await fumbleRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: "Fumble Check",
    });

    const fumbleRollResult = fumbleRoll.total;
    const acHit = actor.acHit(fumbleRollResult);

    // If the second roll misses, roll on the fumble table
    if (acHit > targetAC) {
        console.log("Fumble confirmed: Rolling on fumble table.");
        const fumbleTableUuid = "RollTable.NzKiksAhUOe3UPSg";
        try {
            const fumbleTable = await fromUuid(`Compendium.house-rules.house-rules-tables.${fumbleTableUuid}`);
            if (fumbleTable) {
                const fumbleResult = await fumbleTable.roll();
                const resultsText = fumbleResult.results.map(r => r.text).join(", ");
                
                ChatMessage.create({
                    content: `<strong>Fumble Table Result:</strong> ${resultsText}`,
                    speaker: ChatMessage.getSpeaker(),
                });
            } else {
                console.error("Fumble table not found for UUID:", fumbleTableUuid);
                ui.notifications.error("Fumble table not found!");
            }
        } catch (error) {
            console.error("Error accessing fumble table with UUID:", fumbleTableUuid, error);
            ui.notifications.error("An error occurred while accessing the fumble table.");
        }
    } else {
        console.log("Fumble not confirmed.");
    }
}
