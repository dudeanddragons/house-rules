// critical-tables.js

export async function openCriticalHitDialog(damageType = "slashing") {
    // Ensure the damage type is in lowercase for consistency and set the default to 'slashing' if undefined
    const defaultDamageType = damageType.toLowerCase() || "slashing";

    new Dialog({
        title: "Critical Hit Options",
        content: `
            <form>
                <div class="form-group">
                    <label for="weapon-type">Weapon Type:</label>
                    <select id="weapon-type">
                        <option value="slashing">Slashing</option>
                        <option value="piercing">Piercing</option>
                        <option value="bludgeoning">Bludgeoning</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="target-type">Target Type:</label>
                    <select id="target-type">
                        <option value="humanoid" selected>Humanoid</option>
                        <option value="animal">Animal</option>
                        <option value="monster">Monster</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="location">Location:</label>
                    <select id="location">
                        <!-- Location options will be populated based on the default Target Type -->
                    </select>
                </div>
                <div class="form-group">
                    <label>Severity Table:</label>
                    <div>
                        <input type="radio" id="minor" name="severity" value="minor" checked>
                        <label for="minor">Minor</label>
                    </div>
                    <div>
                        <input type="radio" id="major" name="severity" value="major">
                        <label for="major">Major</label>
                    </div>
                    <div>
                        <input type="radio" id="severe" name="severity" value="severe">
                        <label for="severe">Severe</label>
                    </div>
                    <div>
                        <input type="radio" id="mortal" name="severity" value="mortal">
                        <label for="mortal">Mortal</label>
                    </div>
                </div>
            </form>
        `,
        buttons: {
            apply: {
                label: "Apply",
                callback: async (html) => {
                    const weaponType = html.find("#weapon-type").val();
                    const targetType = html.find("#target-type").val();
                    
                    // Get both the display and value for location
                    const locationSelect = html.find("#location option:selected");
                    const locationDisplay = locationSelect.text();
                    const locationValue = locationSelect.val();
                    
                    const severity = html.find('input[name="severity"]:checked').val();

                    // Pass the display name to callCriticalMacros
                    await callCriticalMacros(weaponType, targetType, locationValue, severity, locationDisplay);
                }
            },
            cancel: {
                label: "Cancel"
            }
        },
        render: (html) => {
            // Initially populate the location options based on the default target type
            updateLocationOptions("humanoid", html);
            
            // Update location options when target type is changed
            html.find("#target-type").on("change", (event) => updateLocationOptions(event.target.value, html));
            
            // Set the weapon type based on the damage type or fallback to 'slashing'
            html.find("#weapon-type").val(defaultDamageType);
        }
    }).render(true);
}

// Function to update location options based on the target type (unchanged)
function updateLocationOptions(targetType, html) {
    const locationSelect = html.find("#location");
    locationSelect.empty();

    const locations = {
        humanoid: [
            { display: "Random", value: "random" },
            { display: "Right leg", value: "legs" },
            { display: "Left leg", value: "legs" },
            { display: "Abdomen", value: "abdomen" },
            { display: "Torso", value: "torso" },
            { display: "Right arm", value: "arms" },
            { display: "Left arm", value: "arms" },
            { display: "Head", value: "head" }
        ],
        animal: [
            { display: "Random", value: "random" },
            { display: "Right foreleg/wing", value: "foreleg" },
            { display: "Left foreleg/wing", value: "foreleg" },
            { display: "Right hind leg", value: "hind_leg" },
            { display: "Left hind leg", value: "hind_leg" },
            { display: "Tail", value: "tail" },
            { display: "Abdomen", value: "abdomen" },
            { display: "Torso/chest", value: "torso" },
            { display: "Head", value: "head" }
        ],
        monster: [
            { display: "Random", value: "random" },
            { display: "Right foreleg/claw/wing", value: "foreleg" },
            { display: "Left foreleg/claw/wing", value: "foreleg" },
            { display: "Right hind leg", value: "hind_leg" },
            { display: "Left hind leg", value: "hind_leg" },
            { display: "Tail", value: "tail" },
            { display: "Abdomen", value: "abdomen" },
            { display: "Torso/chest", value: "torso" },
            { display: "Head", value: "head" }
        ]
    };

    // Populate location options with normalized values for the selected target type
    locations[targetType.toLowerCase()].forEach(({ display, value }) => {
        const option = new Option(display, value);
        locationSelect.append(option);
    });

    // Set default to "Random"
    locationSelect.val("random");
}








async function callCriticalMacros(weaponType, targetType, location, severity, locationDisplay) {
    const weaponTypeMapping = {
        bludgeoning: "b",
        slashing: "s",
        piercing: "p"
    };

    const weaponTypeCode = weaponTypeMapping[weaponType.toLowerCase()];
    const targetTypeCode = {
        humanoid: "hum",
        animal: "anim",
        monster: "mon"
    }[targetType.toLowerCase()];
    let locationKey = location.toLowerCase().replace(/\s?(left|right)/, "").trim();
    const severityKey = severity.toLowerCase();

    console.log("Weapon Type Code:", weaponTypeCode);
    console.log("Target Type Code:", targetTypeCode);
    console.log("Location:", locationKey);
    console.log("Severity:", severityKey);

    // Handle random location first
    if (locationKey === "random") {
        const randomTableUUIDs = {
            humanoid: "RollTable.JQtGXMAh4B3VwmBe",
            animal: "RollTable.sV4Z8Vw3n7ld7h3N",
            monster: "RollTable.PwXFL7zXDthGDNA8"
        };

        const randomTableUuid = randomTableUUIDs[targetType.toLowerCase()];
        if (!randomTableUuid) {
            console.error(`No random location table found for target type '${targetType}'`);
            return;
        }

        try {
            const randomTable = await fromUuid(`Compendium.house-rules.house-rules-tables.${randomTableUuid}`);
            if (randomTable) {
                const rollResult = await randomTable.roll();
                const selectedLocation = rollResult.results[0]?.text.toLowerCase();
                locationDisplay = rollResult.results[0]?.text; // Update display for random result

                if (!selectedLocation) {
                    console.error("Random location roll produced no result.");
                    return;
                }

                console.log(`Random location selected: ${selectedLocation}`);
                
                locationKey = selectedLocation.replace(/\s?(left|right)/, "").replace(/[^a-z\s]/g, "").trim();
                console.log(`Normalized location: ${locationKey}`);
                
            } else {
                console.error("Random location table not found for UUID:", randomTableUuid);
                ui.notifications.error("Random location table not found!");
                return;
            }
        } catch (error) {
            console.error("Error accessing random location table with UUID:", randomTableUuid, error);
            ui.notifications.error("An error occurred while accessing the random location table.");
            return;
        }
    }

    // Now lookup the main critical table using weapon type, target type, and the determined location
    const tablePath = critTableUUIDs[weaponTypeCode]?.[targetTypeCode]?.[locationKey]?.[severityKey];
    if (!tablePath) {
        console.error(`Severity '${severityKey}' not found in critTableUUIDs for weapon type code '${weaponTypeCode}', target type '${targetTypeCode}', and location '${locationKey}'`);
        console.log("Available Locations for this combination: ", Object.keys(critTableUUIDs[weaponTypeCode]?.[targetTypeCode] || {}));
        return;
    }

    console.log(`Table selection UUID for ${weaponTypeCode} ${targetTypeCode} ${locationKey} ${severityKey}: ${tablePath}`);

    try {
        const table = await fromUuid(`Compendium.house-rules.house-rules-tables.${tablePath}`);
        if (table) {
            const rollResult = await table.roll();
            const resultsText = rollResult.results.map(r => r.text).join(", ");
            
            ChatMessage.create({
                content: `<strong>Critical Location:</strong> ${locationDisplay}<br><strong>Critical Table Result:</strong> ${resultsText}`,
                speaker: ChatMessage.getSpeaker(),
            });
        } else {
            console.error("Table not found for UUID:", tablePath);
            ui.notifications.error("Critical table not found!");
        }
    } catch (error) {
        console.error("Error accessing table with UUID:", tablePath, error);
        ui.notifications.error("An error occurred while accessing the critical table.");
    }
}









const critTableUUIDs = {
    b: {
        hum: {
            abdomen: {
                minor: "RollTable.476bABwYbq92UPZS",
                major: "RollTable.sPY7Gk38eoxA2pKZ",
                severe: "RollTable.gHMWLnAP9g9nulHb",
                mortal: "RollTable.VGFwKJgimJKRD6S2"
            },
            arms: {
                minor: "RollTable.VoC2dxygyfL52NlL",
                major: "RollTable.jexRMkIGXpLzfBw7",
                severe: "RollTable.xByp1MjPBAHL5IrO",
                mortal: "RollTable.9fX0U2BoqXCxtYkS"
            },
            head: {
                minor: "RollTable.pva9oEP124rgYSON",
                major: "RollTable.aOeGabcQibNe9jgj",
                severe: "RollTable.FGHIkzKpuGDCVfJU",
                mortal: "RollTable.o3Wj9Yk7z3FRTFGC"
            },
            legs: {
                minor: "RollTable.6yxRr2Dr08CFNxLN",
                major: "RollTable.iMs1DfCSniyTXYgA",
                severe: "RollTable.4Kuhe7bZD39WkCog",
                mortal: "RollTable.5ISyrzsPWGMBAs3l"
            },
            torso: {
                minor: "RollTable.hJ9GXutPc7vGWGFB",
                major: "RollTable.6KSAt34xS7OnhAXg",
                severe: "RollTable.PPYl0pklNQhpB4CE",
                mortal: "RollTable.L5uHuLIx9EDIqMXt"
            }
        }
    },

    s: {
        hum: {
            abdomen: {
                minor: "RollTable.grTKke7d7DYXZwPH",
                major: "RollTable.aXRCczpcPi3aG0rQ",
                severe: "RollTable.6oGcNxdVoLOXjUcp",
                mortal: "RollTable.lklULsJDPdhUY2jh"
            },
            arms: {
                minor: "RollTable.C0yITj6pPQ6jSyLq",
                major: "RollTable.5XSe1RqDP2Y6vRTy",
                severe: "RollTable.n7swalFhh93RvhCo",
                mortal: "RollTable.AZZ4xD2uwxa4nJdG"
            },
            head: {
                minor: "RollTable.qEDIGZ0mAmACt7Y8",
                major: "RollTable.ePITt9djnF2A75ay",
                severe: "RollTable.5o6kuEBKjTvbredR",
                mortal: "RollTable.FgQOZfUe2xYYYIKp"
            },
            legs: {
                minor: "RollTable.dTA91x59Rk0vwzLR",
                major: "RollTable.CjnmVw3Qoi1VSvP2",
                severe: "RollTable.l0QM0j68uIaHbcNn",
                mortal: "RollTable.zVRSVqGBprLsiDJK"
            },
            torso: {
                minor: "RollTable.JFxwlyfvt0ZLuiGq",
                major: "RollTable.0zE5cIRpH7a2YmPB",
                severe: "RollTable.5kFKaeqvCPSobvDp",
                mortal: "RollTable.WRjjJLJlVOTFkvgg"
            }
        }
    },

    p: {
        hum: {
            abdomen: {
                minor: "RollTable.ffHhHcgnJ3nGRVmr",
                major: "RollTable.6628UlSZM3FbDe2t",
                severe: "RollTable.W1zVjRWsE7p5anYb",
                mortal: "RollTable.kHJdwcVIY1m9x0Wd"
            },
            arms: {
                minor: "RollTable.yk8uSu6pY5VdPkOe",
                major: "RollTable.o01Gg54d4k9rHv6J",
                severe: "RollTable.DQrCp3fm3vkehHuz",
                mortal: "RollTable.HK7n9TnNwmFZRzqi"
            },
            head: {
                minor: "RollTable.IrjqXjBMRaPM9H93",
                major: "RollTable.9GmyZZx346ocSTrI",
                severe: "RollTable.sdJFqekgdcSRlbmV",
                mortal: "RollTable.ok05oC3MxEqmsLTH"
            },
            legs: {
                minor: "RollTable.YxEmLaVwiIK78Gpm",
                major: "RollTable.v8kzqlnUphqVWSTp",
                severe: "RollTable.cm8jcr3N1KKQeQed",
                mortal: "RollTable.NP1QMfYVdk0ok2BT"
            },
            torso: {
                minor: "RollTable.DToxQyHdZ2gQqKOM",
                major: "RollTable.PGGyZ94hbuJj4zUB",
                severe: "RollTable.rwoGMJZsk9u3t13t",
                mortal: "RollTable.QBz3sYnyGSWKKsFV"
            }
        }
    },
};



