// scripts/party-parts/quests.js
console.log("quests.js loaded successfully.");

export class Quests {
    /**
     * Fetch and prepare dummy quest data.
     * @returns {Array} An array of quest objects with placeholder data.
     */
    static getQuests() {
        console.log("Quests | Fetching dummy quests data.");
        return [
            { title: "Retrieve the Lost Amulet", status: "In Progress" },
            { title: "Defeat the Bandit Leader", status: "Completed" },
            { title: "Explore the Ancient Ruins", status: "Not Started" }
        ];
    }
}
