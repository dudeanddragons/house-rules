/**
 * Adds a right-click context menu option in all sidebar tabs to move documents to a folder.
 * Explicitly resolves relationships by collecting child IDs and working backwards.
 */

const SUPPORTED_TYPES = ["Actor", "Item", "RollTable", "Scene"];
const JOURNAL_HOOK = `getJournalDirectoryEntryContext`;

// Register for all supported types
SUPPORTED_TYPES.forEach(type => {
  Hooks.on(`get${type}DirectoryEntryContext`, (html, options) => {
    addMoveToFolderOption(type, options);
  });
});

// Register specifically for Journal Entries
Hooks.on(JOURNAL_HOOK, (html, options) => {
  addMoveToFolderOption("JournalEntry", options);
});

/**
 * Adds the "Move to Folder" option to the context menu.
 * @param {string} type - The document type.
 * @param {Array} options - The existing context menu options.
 */
function addMoveToFolderOption(type, options) {
  options.push({
    name: "Move to Folder",
    icon: '<i class="fas fa-folder"></i>',
    condition: li => {
      const docId = li.data("document-id");
      const document = getDocumentByType(type, docId);
      return !!document; // Ensure the document exists
    },
    callback: async li => {
      const docId = li.data("document-id");
      const document = getDocumentByType(type, docId);

      if (!document) {
        console.warn(`No ${type} found for ID:`, docId);
        ui.notifications.error(`Unable to find the selected ${type}.`);
        return;
      }

      // Filter folders by type
      const filteredFolders = game.folders.contents.filter(f => f.type === type);

      // Step 1: Collect all child relationships
      const folderMap = new Map(filteredFolders.map(f => [f._id, f]));
      const childToParent = new Map();

      filteredFolders.forEach(folder => {
        folder.children
          .map(child => child.folder?._id) // Collect child IDs
          .filter(Boolean)
          .forEach(childId => {
            childToParent.set(childId, folder._id); // Map child ID to its parent ID
          });
      });

      // Debug: Log child-to-parent relationships
      console.log("Child-to-Parent Map:", [...childToParent]);

      /**
       * Resolve the full path for a folder by walking upward.
       * @param {string} folderId - The current folder ID.
       * @returns {string} - The full path for the folder.
       */
      const resolvePath = folderId => {
        let path = folderMap.get(folderId)?.name || "Unnamed Folder";
        let currentId = folderId;

        // Walk up the hierarchy to build the full path
        while (childToParent.has(currentId)) {
          currentId = childToParent.get(currentId); // Get the parent ID
          const parentName = folderMap.get(currentId)?.name || "Unnamed Folder";
          path = `${parentName} / ${path}`;
        }

        return path;
      };

      // Step 2: Resolve all folder paths dynamically
      const resolvedPaths = filteredFolders.map(folder => ({
        id: folder._id,
        path: resolvePath(folder._id),
      }));

      // Debug: Log all resolved paths
      console.log("Resolved Paths:", resolvedPaths);

      // Step 3: Sort and filter unique paths
      const uniqueFolders = [...new Map(resolvedPaths.map(f => [f.id, f])).values()];
      uniqueFolders.sort((a, b) => a.path.localeCompare(b.path));

      // Generate dropdown options
      const folderOptions = uniqueFolders
        .map(f => `<option value="${f.id}">${f.path}</option>`)
        .join("");

      if (!folderOptions) {
        ui.notifications.warn("No folders available to move this document.");
        return;
      }

      const dialogContent = `
        <form>
          <div class="form-group">
            <label>Select a folder to move "${document.name}":</label>
            <select id="folder-select">${folderOptions}</select>
          </div>
        </form>
      `;

      new Dialog({
        title: `Move ${document.name} to Folder`,
        content: dialogContent,
        buttons: {
          move: {
            icon: '<i class="fas fa-check"></i>',
            label: "Move",
            callback: async html => {
              const folderId = html.find("#folder-select").val();
              await document.update({ folder: folderId });
              ui.notifications.info(`${document.name} has been successfully moved.`);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          }
        },
        default: "move"
      }).render(true);
    }
  });

  console.log(`${type} sidebar context menu option registered.`);
}

/**
 * Get the document by type and ID.
 * @param {string} type - The document type.
 * @param {string} docId - The document ID.
 * @returns {Document|null} - The document or null if not found.
 */
function getDocumentByType(type, docId) {
  const collection = game[type.toLowerCase()] || game.collections.get(type);
  return collection?.get(docId) || null;
}
