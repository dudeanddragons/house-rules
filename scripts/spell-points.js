// Dynamically inject hover styles if necessary
const style = document.createElement('style');
style.innerHTML = `
    .spell-level-group .spell-name-clickable {
        cursor: pointer;
        transition: font-size 0.3s, font-weight 0.3s, text-shadow 0.3s;
    }
    .spell-level-group .spell-name-clickable:hover {
        font-size: calc(100%);
        font-weight: bold;
        color: #1e90ff;
        text-shadow: 0px 0px 10px rgba(30, 144, 255, 0.7);
    }
`;
document.head.appendChild(style);

// Utility to manage active tab
function getActiveTabFlag(app) {
    return app._tabs[0]?.active;
}

function setActiveTabFlag(app, tabName) {
    if (app._tabs[0]?.active !== tabName) {
        app._tabs[0].activate(tabName);
    }
}


// Spell slot to spell point conversion table
const spellPointConversion = {
    0: 2,  // Level 0 spells cost 2 spell points
    1: 4,
    2: 6,
    3: 10,
    4: 15,
    5: 22,
    6: 30,
    7: 40,
    8: 50,
    9: 60
};

function calculateSpellPointsFromSlots(spellSlots) {
    let totalSpellPoints = 0;
    for (let level = 1; level <= 9; level++) {
        const slots = spellSlots[level] || 0;
        const pointsPerSlot = spellPointConversion[level] || 0;
        totalSpellPoints += (parseInt(slots) || 0) * pointsPerSlot;
    }
    return totalSpellPoints;
}



// Function to get collapse state from localStorage
function getCollapseState(actorId, level) {
    const key = `spellLevel-${actorId}-${level}`;
    return localStorage.getItem(key) === "true"; // Returns true if collapsed, false otherwise
}

// Function to set collapse state in localStorage
function setCollapseState(actorId, level, state) {
    const key = `spellLevel-${actorId}-${level}`;
    localStorage.setItem(key, state);
}

// Function to calculate the status bar color based on percentage
function getStatusBarColor(percentage) {
    if (percentage > 75) return "#4caf50"; // Green for >75%
    else if (percentage > 25) return "#ffeb3b"; // Yellow for 25%-75%
    else return "#f44336"; // Red for <=25%
}

// Function to bind the collapsibility functionality to spell levels
function bindCollapsibility(html, actorId) {
    html.find('.spell-level-header').off('click').on('click', function () {
        const level = $(this).data('level');
        const isCollapsed = getCollapseState(actorId, level);
        setCollapseState(actorId, level, !isCollapsed);

        $(this).find('i').toggleClass('fa-angle-right fa-angle-down');
        $(this).next('.spell-level-group').toggle();
    });
}

function enforceSpellPointsTab(html, app) {
    const activeTab = getActiveTabFlag(app);
    if (!activeTab) return; // Do nothing if there's no active tab flagged
    setActiveTabFlag(app, activeTab); // Restore the flagged tab
}







// Calculate Bonus Spell Points for Actor
function calculateBonusSpellPoints(actor) {
    let totalBonusPoints = 0;
    let attributesUsed = [];

    if (actor.classes) {
        const classesArray = Array.isArray(actor.classes) ? actor.classes : Object.values(actor.classes);

        classesArray.forEach((cls) => {
            let className = cls?.name ? cls.name.toLowerCase() : "";
            console.log(`Detected Class Name: "${className}"`);

            const intScore = actor.system.abilities?.int?.value ?? 0;
            const chaScore = actor.system.abilities?.cha?.value ?? 0;
            console.log(`Intelligence Score: ${intScore}`);
            console.log(`Charisma Score: ${chaScore}`);

            let abilityScore = 0;
            let attributeUsed = "";

            if (
                className.includes("mage") ||
                className.includes("elementalist") ||
                ["bard", "invoker", "transmuter", "necromancer", "enchanter", "illusionist", "diviner", "conjurer", "abjurer", "alchemist", "witch", "arcanist"].includes(className)
            ) {
                if (className === "bard") {
                    abilityScore = chaScore;
                    attributeUsed = "Charisma";
                } else {
                    abilityScore = intScore;
                    attributeUsed = "Intelligence";
                }
            } else {
                console.log(`Class "${className}" does not qualify for bonus spell points.`);
                return;
            }

            let bonusPoints = 0;
            if (abilityScore >= 20) bonusPoints = 9;
            else if (abilityScore === 19) bonusPoints = 8;
            else if (abilityScore === 18) bonusPoints = 7;
            else if (abilityScore === 17) bonusPoints = 6;
            else if (abilityScore === 16) bonusPoints = 5;
            else if (abilityScore >= 14) bonusPoints = 4;
            else if (abilityScore >= 12) bonusPoints = 3;
            else if (abilityScore >= 9) bonusPoints = 2;

            totalBonusPoints += bonusPoints;
            attributesUsed.push(attributeUsed);

            console.log(`Bonus Spell Points for class "${className}" with ability score ${abilityScore}: ${bonusPoints}`);
        });
    }

    return { bonusPoints: totalBonusPoints, attributesUsed: [...new Set(attributesUsed)] };
}










Hooks.on("renderARSCharacterSheet", async (app, html, data) => {
    const actor = app.actor;
    if (!actor.isOwner && !game.user.isGM) return;

    const actorId = actor.id;
    const dataKey = `viewState.${actorId}`; // Key to track tab state for re-renders

    // Restore the last active tab state
    const viewState = await game.user.getFlag("ars", dataKey) || {};
    const lastTab = viewState.tab || app._tabs[0]?.active;
    if (!app._tabs[0].active) {
        app._tabs[0].activate(lastTab); // Activate the last tab if not already active
    }

    // Save active tab on tab clicks
    html.find('.item.tab-item').on("click", async function () {
        const selectedTab = $(this).data("tab");
        await game.user.setFlag("ars", dataKey, { tab: selectedTab }); // Save the clicked tab
    });

    // Preserve active tab during specific actions
    const preserveActiveTab = async () => {
        const activeTab = app._tabs[0]?.active;
        await game.user.setFlag("ars", dataKey, { tab: activeTab });
    };

    // Ensure tab state preservation in all event handlers
    html.find(".spell-cast").on("click", async function (event) {
        event.preventDefault();
        await preserveActiveTab();
    });

    html.find("#reset-spell-points").on("click", async function (event) {
        event.preventDefault();
        await preserveActiveTab();
    });

    html.find(".spell-name-clickable").on("click", async function (event) {
        event.preventDefault();
        await preserveActiveTab();
    });

    // Existing code continues unaltered below
    const spellSlots = actor.system.spellInfo?.slots?.arcane?.value || {};
    let totalSpellPoints = calculateSpellPointsFromSlots(spellSlots);
    const { bonusPoints, attributeUsed } = calculateBonusSpellPoints(actor);
    totalSpellPoints += bonusPoints;

    let currentSpellPoints = actor.getFlag("world", "currentSpellPoints") ?? totalSpellPoints;
    let spellPointsPercentage = (currentSpellPoints / totalSpellPoints) * 100;
    let statusBarColor = getStatusBarColor(spellPointsPercentage);

    let tab = html.find('.tab.spell-points');
    if (tab.length === 0) {
        html.find('.sheet-tabs .tabs').append(`
            <a class="item tab-item" data-tab="spell-points" data-tooltip="Spell Points">
                <i class="fas fa-magic"></i>
            </a>
        `);
        html.find('.sheet-body').append(`
            <div class="tab spell-points" data-group="primary" data-tab="spell-points">
                <div class="spell-points-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0;">Spell Points</h2>
                    <a id="reset-spell-points" style="cursor: pointer;" title="Study Spell Book">
                        <img src="icons/svg/book.svg" alt="Study Spell Book" style="width: 30px; height: 30px;" />
                    </a>
                </div>
                <div class="spell-points-content"></div>
            </div>
        `);
    }

    enforceSpellPointsTab(html, app);



    

    const spellPointsSection = html.find('.spell-points-content');
    spellPointsSection.empty();

    spellPointsSection.append(`
        <div class="spell-points-info">
            <span>Bonus Spell Points from ${attributeUsed || "None"}: ${bonusPoints}</span>
        </div>
    `);

    spellPointsSection.append(`
        <div class="spell-points-bar" style="border: 1px solid #000; padding: 2px; margin-bottom: 10px; width: 100%;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span>Max Spell Points: ${totalSpellPoints}</span>
                <span id="current-spell-points">Current Spell Points: ${currentSpellPoints}</span>
            </div>
            <div style="width: 100%; height: 20px; background-color: #ccc; border-radius: 5px;">
                <div class="status-bar-fill" style="width: ${spellPointsPercentage}%; height: 100%; background-color: ${statusBarColor}; border-radius: 5px;"></div>
            </div>
        </div>
    `);

    // Prevent Multiple Bindings by Checking for .bound Class
    if (!html.hasClass('spell-points-bound')) {
        html.addClass('spell-points-bound');
    }

    // Group spells by level and filter by "Arcane" type
    const spellsByLevel = actor.items
        .filter(i => i.type === "spell" && i.system.type === "Arcane") // Only include spells with type "Arcane"
        .reduce((acc, spell) => {
            const level = spell.system.level || 0;
            if (!acc[level]) acc[level] = [];
            acc[level].push(spell);
            return acc;
        }, {});

    // Add headers in table format (excluding Level and Status)
    spellPointsSection.append(`
        <table class="spell-header" style="width: 100%; font-size: 10pt; border-bottom: 1px solid #000;">
            <tr>
                <th style="width: 20%; text-align: left;">Name</th>
                <th style="width: 10%; text-align: left;">CMP</th>
                <th style="width: 10%; text-align: left;">CT</th>
                <th style="width: 10%; text-align: left;">Range</th>
                <th style="width: 10%; text-align: left;">AOE</th>
                <th style="width: 5%; text-align: center;">Actions</th>
            </tr>
        </table>
    `);

    // Add Level 0 spells group
    const level0Spells = spellsByLevel[0] || [];
    const isLevel0Collapsed = getCollapseState(actor.id, 0);
    
    spellPointsSection.append(`
        <div class="spell-level-header" data-level="0" style="font-size: 10pt; margin-bottom: 5px;">
            <h4><i class="fas fa-angle-${isLevel0Collapsed ? 'right' : 'down'}"></i> Level 0 Spells</h4>
        </div>
        <table class="spell-level-group" style="width: 100%; display: ${isLevel0Collapsed ? 'none' : 'table'};">
            ${level0Spells.length > 0 ? level0Spells.map(spell => {
                const spellImage = spell.img || 'icons/svg/mystery-man.svg';
                return `
                <tr class="spell-row" style="font-size: 10pt;">
                    <td style="width: 20%;">
                        <div class="item-image" style="display: inline-block; width: 30px; height: 30px;">
                            <img src="${spellImage}" alt="${spell.name}" style="width: 100%; height: 100%;" />
                        </div>
                        <span class="item-name text-trunc spell-name-clickable" data-spell-id="${spell.id}">${spell.name}</span>
                    </td>
                    <td style="width: 10%; text-align: left;">
                        ${spell.system.components.verbal ? "V" : ""}${spell.system.components.somatic ? "S" : ""}${spell.system.components.material ? "M" : ""}
                    </td>
                    <td style="width: 10%; text-align: left;" data-tooltip="${spell.system.castingTime}">
                        ${spell.system.castingTime}
                    </td>
                    <td style="width: 10%; text-align: left;" data-tooltip="${spell.system.range}">
                        ${spell.system.range}
                    </td>
                    <td style="width: 10%; text-align: left;" data-tooltip="${spell.system.areaOfEffect}">
                        ${spell.system.areaOfEffect}
                    </td>
                    <td style="width: 5%; text-align: center;">
                        <div style="display: inline-flex; gap: 4px;">
                            <a class="spell-cast" data-spell-id="${spell.id}" data-spell-points="2">  <!-- Level 0 spells cost 2 points -->
                                <img src="icons/magic/fire/projectile-fireball-blue-purple.webp" title="Cast" style="width: 25px; height: 25px; cursor: pointer;" />
                            </a>
                            <a class="spell-init" data-spell-id="${spell.id}">
                                <img src="icons/svg/d20-highlight.svg" title="Roll Initiative" style="width: 25px; height: 25px; cursor: pointer;" />
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            }).join('') : `<tr style="font-size: 10pt;"><td colspan="6">No Level 0 spells available.</td></tr>`}
        </table>
    `);

    // Display levels based on available spell slots
    for (let level = 1; level <= 9; level++) {
        const slots = spellSlots[level] || 0;
        if (slots > 0) {
            const spells = spellsByLevel[level] || [];
            const isCollapsed = getCollapseState(actor.id, level);

            spellPointsSection.append(`
                <div class="spell-level-header" data-level="${level}" style="font-size: 10pt; margin-bottom: 5px;">
                    <h4><i class="fas fa-angle-${isCollapsed ? 'right' : 'down'}"></i> Level ${level} Spells</h4>
                </div>
                <table class="spell-level-group" style="width: 100%; display: ${isCollapsed ? 'none' : 'table'};">
                    ${spells.length > 0 ? spells.map(spell => {
                        const spellImage = spell.img || 'icons/svg/mystery-man.svg';
                        return `
                        <tr class="spell-row" style="font-size: 10pt;">
                            <td style="width: 20%;">
                                <div class="item-image" style="display: inline-block; width: 30px; height: 30px;">
                                    <img src="${spellImage}" alt="${spell.name}" style="width: 100%; height: 100%;" />
                                </div>
                                <span class="item-name text-trunc spell-name-clickable" data-spell-id="${spell.id}">${spell.name}</span>
                            </td>
                            <td style="width: 10%; text-align: left;">
                                ${spell.system.components.verbal ? "V" : ""}${spell.system.components.somatic ? "S" : ""}${spell.system.components.material ? "M" : ""}
                            </td>
                            <td style="width: 10%; text-align: left;" data-tooltip="${spell.system.castingTime}">
                                ${spell.system.castingTime}
                            </td>
                            <td style="width: 10%; text-align: left;" data-tooltip="${spell.system.range}">
                                ${spell.system.range}
                            </td>
                            <td style="width: 10%; text-align: left;" data-tooltip="${spell.system.areaOfEffect}">
                                ${spell.system.areaOfEffect}
                            </td>
                            <td style="width: 5%; text-align: center;">
                                <div style="display: inline-flex; gap: 4px;">
                                    <a class="spell-cast" data-spell-id="${spell.id}" data-spell-points="${spellPointConversion[level] || 0}">
                                        <img src="icons/magic/fire/projectile-fireball-blue-purple.webp" title="Cast" style="width: 25px; height: 25px; cursor: pointer;" />
                                    </a>
                                    <a class="spell-init" data-spell-id="${spell.id}">
                                        <img src="icons/svg/d20-highlight.svg" title="Roll Initiative" style="width: 25px; height: 25px; cursor: pointer;" />
                                    </a>
                                </div>
                            </td>
                        </tr>
                    `;
                    }).join('') : `<tr style="font-size: 10pt;"><td colspan="6">No spells available at this level.</td></tr>`}
                </table>
            `);
        }
    }

    // **Re-apply collapsibility after content update**
    bindCollapsibility(html, actor.id);



        // Cast Spell Action
        html.on('click', '.spell-cast', async function (event) {
            if (!actor.isOwner) return;
            event.stopImmediatePropagation();
        
            const activeTab = getActiveTabFlag(app); // Retrieve the current active tab
            const spellPointsCost = $(this).data('spell-points');
            if (currentSpellPoints >= spellPointsCost) {
                currentSpellPoints -= spellPointsCost;
                spellPointsPercentage = (currentSpellPoints / totalSpellPoints) * 100;
                statusBarColor = getStatusBarColor(spellPointsPercentage);
        
                $('#current-spell-points').text(`Current Spell Points: ${currentSpellPoints}`);
                spellPointsSection.find('.status-bar-fill').css('width', `${spellPointsPercentage}%`).css('background-color', statusBarColor);
        
                await actor.setFlag("world", "currentSpellPoints", currentSpellPoints);
            } else {
                ui.notifications.warn("Not enough spell points to cast this spell!");
            }
            setActiveTabFlag(app, activeTab); // Restore the tab after the action
        });
        



        // Roll Initiative Action
        html.on('click', '.spell-init', async function (event) {
            if (!actor.isOwner) return;
            event.stopImmediatePropagation();

            const spellID = $(this).data("spell-id");
            const spellItem = actor.items.get(spellID);
            let initModifier = parseInt(spellItem.system.castingTime) || 0;
            if (isNaN(initModifier) || initModifier > 9) initModifier = 10;

            const roll = new Roll(`1d10 + ${initModifier}`);
            await roll.evaluate();

            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor }),
                flavor: `Initiative Roll for ${spellItem.name}: 1d10 + ${initModifier}`,
            });

            const combatant = actor?.combatant;
            if (combatant) {
                await combatant.update({ initiative: roll.total });
            }
            enforceSpellPointsTab(html, app);
        });






    // Handle the "Study Spell Book" button to reset spell points
    html.on('click', '#reset-spell-points', async function (event) {
        if (!actor.isOwner) return;
        event.stopImmediatePropagation();
    
        const activeTab = getActiveTabFlag(app); // Track the currently active tab
    
        currentSpellPoints = totalSpellPoints;
        spellPointsPercentage = (currentSpellPoints / totalSpellPoints) * 100;
        statusBarColor = getStatusBarColor(spellPointsPercentage);
    
        $('#current-spell-points').text(`Current Spell Points: ${currentSpellPoints}`);
        spellPointsSection.find('.status-bar-fill').css('width', `${spellPointsPercentage}%`).css('background-color', statusBarColor);
    
        await actor.setFlag("world", "currentSpellPoints", currentSpellPoints);
    
        setActiveTabFlag(app, activeTab); // Restore the previously active tab
    });
    
    




        // Spell Name Click Action
        html.on('click', '.spell-name-clickable', async function (event) {
            if (!actor.isOwner) return;
            event.stopImmediatePropagation();
        
            const activeTab = getActiveTabFlag(app); // Track current active tab
            const spellID = $(this).data("spell-id");
            const spellItem = actor.items.get(spellID);
            if (!spellItem) return ui.notifications.warn("Spell not found!");
        
            const context = {
                item: spellItem,
                sourceActor: actor,
                sourceToken: actor.token,
                event: { clientX: 200, clientY: 100 },
                popoutOptions: { left: 200, top: 100 }
            };
            spellItem._chatRoll(context);
            setActiveTabFlag(app, activeTab); // Restore the tab
        });
        
        
});