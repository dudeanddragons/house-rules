// scripts/treasureBuilder.js
class TreasureBuilderWindow extends Application {
    constructor(options = {}) {
      super(options);
      this.data = { message: "Welcome to the Treasure Builder!" };
    }
  
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        title: "Treasure Builder",
        width: 400,
        height: 200,
        resizable: true,
        template: "modules/house-rules/templates/treasureBuilder.hbs"
      });
    }
  
    getData() {
      return this.data;
    }
  
    activateListeners(html) {
      super.activateListeners(html);
      html.find(".test-button").click(() => {
        ui.notifications.info("Test Button Clicked!");
      });
    }
  }
  
  // Exporting the window function
  function openTreasureBuilderWindow() {
    if (!window.treasureBuilder) {
      window.treasureBuilder = new TreasureBuilderWindow();
    }
    window.treasureBuilder.render(true);
  }
  
  // Minimal init function to register the class (no hooks)
  console.log("House Rules | Treasure Builder module loaded successfully.");
  window.openTreasureBuilderWindow = openTreasureBuilderWindow;
  