// scripts/party-parts/skills.js
console.log("skills.js loaded successfully.");

export class Skills {
    /**
     * Fetch and prepare dummy skills data.
     * @returns {Array} An array of skill objects with placeholder data.
     */
    static getSkills() {
        console.log("Skills | Fetching dummy skills data.");
        return [
            { name: "Perception", value: "Expert" },
            { name: "Stealth", value: "Proficient" },
            { name: "Arcana", value: "Novice" }
        ];
    }
}
