let NUM_SLOTS;

async function fetchBookings() {
  if (localStorage.getItem("userId") == null) {
    document.getElementsByTagName("body")[0].innerHTML = "";
    window.location.href = "./login.html";
    return;
  }

  // Fetch bookings from API
  const response = await fetch("https://unswvrlabbookings.onrender.com/api/bookings/all");
  const bookings = await response.json();

  // Fetch NUM_SLOTS from config.json
  const configResponse = await fetch('config.json');
  
  const config = await configResponse.json();
  NUM_SLOTS = config.NUM_SLOTS_CAN_BE_BOOKED;  // Assign value to global NUM_SLOTS
  
  // Return an object containing both bookings and NUM_SLOTS
  return { bookings, NUM_SLOTS };
}


fetchBookings().then((data) => {
  const { bookings, NUM_SLOTS } = data;
  console.log(NUM_SLOTS);
  
  // Call the fetch function on page load
  function addBlocks(imn) {
    let moogs_list = document.getElementById('moogs-list');
    for (let i = 0; i <= 11; i++) {
        const div = document.createElement('div');
        div.className = 'time-label';
        div.textContent = `moog${i.toString().padStart(2, '0')}`;
        moogs_list.appendChild(div);
      }
    for (let i = 0; i < timeSlots; i++) {
      const hour = Math.floor(i / 2) + startTime;
      const minutes = i % 2 === 0 ? "00" : "30";
      const timeLabel = `${hour}:${minutes.padStart(2, "0")} ${
        hour < 12 ? "AM" : "PM"
      }`;
      
      // Add time label
      const timeDiv = document.createElement("div");
      timeDiv.className = "time-label";
      timeDiv.textContent = timeLabel;
      scheduleContainer.appendChild(timeDiv);

      // Add blocks for each computer
      for (let j = 0; j < 12; j++) {
        const blockDiv = document.createElement("div");
        blockDiv.className = "computer-block";
        blockDiv.dataset.time = timeLabel;
        blockDiv.dataset.computer = `moog${j}`;
        blockDiv.style.height = "30px";

        const keys = Object.keys(bookings[j][imn]);

        if (document.getElementById("currentDate").innerText == keys[0]) {
          if (Object.values(bookings[j][imn])[0].includes(timeLabel)) {
            blockDiv.classList.add("jmd");
            blockDiv.addEventListener("click",()=>{addPopup("Uh, Oh!","Sorry, this slot is already booked!")});
          }
        }

        blockDiv.addEventListener("click", () => toggleHighlight(blockDiv));
        // blockDiv.addEventListener('mouseover', () => {
        //                 if (!blockDiv.classList.contains('selected')) {
        //                     blockDiv.classList.add('selected');
        //                 }
        //             });

        //             blockDiv.addEventListener('mouseout', () => {
        //                 if (!blockDiv.classList.contains('clicked')) {  // Ensure block is not clicked
        //                     blockDiv.classList.remove('selected');
        //                 }
        //             });
        scheduleContainer.appendChild(blockDiv);
      }
    }
  }
  const scheduleContainer = document.getElementById("schedule");
  const startTime = 6; // 6:00 AM
  const endTime = 23; // 11:00 PM
  const timeSlots = (endTime - startTime + 1) * 2; // 30-minute slots
  let selectedBlocks = [];
  let selectedComputer = null; // To keep track of the selected computer (column)

  // Dictionary to store selected times with dates as keys
  let selectedTimes = {};

  const currentDateDisplay = document.getElementById("currentDate");
  const prevDateBtn = document.getElementById("prevDate");
  const nextDateBtn = document.getElementById("nextDate");

  // Date control
  const today = new Date();
  let currentDate = new Date(today); // Initialize as today

  // Helper function to format dates as "YYYY-MM-DD"
  function formatDate(date) {
    const dates = new Date();
    const years = dates.getFullYear();
    const months = String(date.getMonth() + 1).padStart(2, "0");
    const days = String(date.getDate()).padStart(2, "0");
    return `${years}-${months}-${days}`;
  }

  // Update date display
  function updateDateDisplay() {
    currentDateDisplay.textContent = formatDate(currentDate);
    // Disable buttons if the boundaries are reached
    if (currentDate.getTime() === today.getTime()) {
      prevDateBtn.classList.add("disabled");
    } else {
      prevDateBtn.classList.remove("disabled");
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (currentDate.getTime() === tomorrow.getTime()) {
      nextDateBtn.classList.add("disabled");
    } else {
      nextDateBtn.classList.remove("disabled");
    }
  }

  // Handle left arrow (prev date)
  prevDateBtn.addEventListener("click", () => {
    if (!prevDateBtn.classList.contains("disabled")) {
      currentDate.setDate(currentDate.getDate() - 1);
      updateDateDisplay();
      scheduleContainer.innerHTML = "";
      addBlocks(0);
    }
  });

  // Handle right arrow (next date)
  nextDateBtn.addEventListener("click", () => {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (!nextDateBtn.classList.contains("disabled")) {
      currentDate.setDate(currentDate.getDate() + 1);
      updateDateDisplay();
      scheduleContainer.innerHTML = "";
      addBlocks(1);
    }
  });

  // Initial display of the current date
  updateDateDisplay();

  // Create time blocks and corresponding computer slots
  addBlocks(0);
  // Handle block selection
  function toggleHighlight(block) {
    const computer = block.dataset.computer;
    const dateKey = formatDate(currentDate); // Get the current date as the key for dictionary

    // If the user is selecting blocks from a different computer (column), clear previous selection
    if (selectedComputer && selectedComputer !== computer) {
      selectedTimes={}
      clearSelection();
    }
    if (block.classList.contains("jmd")) {
      return;
    }
    // Check if the block is already selected (to allow deselection)
    if (block.classList.contains("selected")) {
      const blockIndex = selectedBlocks.indexOf(block);
      unselectFromIndex(blockIndex);
      // Remove the time from the dictionary and clear the block text
      block.textContent = "";
      removeFromSelectedTimes(dateKey, block.dataset.time);
    } else {
      // Ensure selection does not exceed the maximum allowed or include non-adjacent blocks
      if (selectedBlocks.length < NUM_SLOTS) {
        if (selectedBlocks.length >= 1 && canFillBlocks(block)) {
          fillBlocksBetween(selectedBlocks[0], block);
        } else if (canBeSelected(block)) {
          block.classList.add("selected");
          selectedBlocks.push(block); // Add to selected blocks
          selectedComputer = computer; // Set the selected computer (column)
          block.textContent = block.dataset.time; // Add time to the block text
          addToSelectedTimes(dateKey, block.dataset.time); // Add time to dictionary
        } else {
          alert("You can only select adjacent blocks.");
        }
      } else {
        alert("You can only select a maximum of "+ NUM_SLOTS+ " adjacent blocks.");
      }
    }
  }

  // Add time to the selectedTimes dictionary
  function addToSelectedTimes(dateKey, time) {
    if (!selectedTimes[dateKey]) {
      selectedTimes[dateKey] = [];
    }
    selectedTimes[dateKey].push(time); // Add the time to the array
  }

  // Remove time from the selectedTimes dictionary
  function removeFromSelectedTimes(dateKey, time) {
    if (selectedTimes[dateKey]) {
      selectedTimes[dateKey] = selectedTimes[dateKey].filter((t) => t !== time); // Remove the time
      if (selectedTimes[dateKey].length === 0) {
        delete selectedTimes[dateKey]; // Remove the date key if no times are left
      }
    }
  }

  // Unselect blocks starting from the specified index
  function unselectFromIndex(startIndex) {
    const blocksToUnselect = selectedBlocks.slice(startIndex);
    const dateKey = formatDate(currentDate);

    blocksToUnselect.forEach((block) => {
      block.classList.remove("selected"); // Remove visual selection
      block.textContent = ""; // Clear the block text completely to reset
      removeFromSelectedTimes(dateKey, block.dataset.time); // Remove time from dictionary
    });

    // Update the selectedBlocks array by removing unselected blocks
    selectedBlocks = selectedBlocks.slice(0, startIndex);
  }

  // Automatically fill blocks between two selected blocks
  function fillBlocksBetween(startBlock, endBlock) {
    const allBlocks = Array.from(
      document.querySelectorAll(
        `.computer-block[data-computer="${startBlock.dataset.computer}"]`
      )
    );
    const startIndex = allBlocks.indexOf(startBlock);
    const endIndex = allBlocks.indexOf(endBlock);

    const [minIndex, maxIndex] = [
      Math.min(startIndex, endIndex),
      Math.max(startIndex, endIndex),
    ];
    const dateKey = formatDate(currentDate);

    // Select all blocks between start and end (inclusive)
    for (let i = minIndex; i <= maxIndex; i++) {
      if (!allBlocks[i].classList.contains("selected")) {
        allBlocks[i].classList.add("selected");
        allBlocks[i].textContent = allBlocks[i].dataset.time; // Add time to block text
        selectedBlocks.push(allBlocks[i]);
        addToSelectedTimes(dateKey, allBlocks[i].dataset.time); // Add time to dictionary
      }
    }
  }

  // Check if the new block can be selected (adjacent to the first or last selected block)
  function canBeSelected(newBlock) {
    if (selectedBlocks.length === 0) {
      return true; // If no blocks are selected, the new block is adjacent by default
    }

    const firstBlock = selectedBlocks[0];
    const lastBlock = selectedBlocks[selectedBlocks.length - 1];

    const newBlockIndex = getTimeSlotIndex(newBlock.dataset.time);
    const firstBlockIndex = getTimeSlotIndex(firstBlock.dataset.time);
    const lastBlockIndex = getTimeSlotIndex(lastBlock.dataset.time);

    // The new block must be adjacent to either the first or last selected block
    return (
      Math.abs(newBlockIndex - firstBlockIndex) === 1 ||
      Math.abs(newBlockIndex - lastBlockIndex) === 1
    );
  }

  // Check if we can automatically fill blocks between the first and the selected block
  function canFillBlocks(endBlock) {
    if (selectedBlocks.length === 0) {
      return false;
    }

    const startBlock = selectedBlocks[0];
    const startBlockIndex = getTimeSlotIndex(startBlock.dataset.time);
    const endBlockIndex = getTimeSlotIndex(endBlock.dataset.time);

    return Math.abs(startBlockIndex - endBlockIndex) <= NUM_SLOTS-1; // We can fill blocks if the gap is within 4 blocks total
  }

  // Get the index of a time slot from its label (e.g., "6:00 AM")
  function getTimeSlotIndex(timeLabel) {
    const [time, period] = timeLabel.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return (hours * 60 + minutes) / 30; // Convert the time to 30-minute slot index
  }

  // Clear all selected blocks and reset the selection
  function clearSelection() {
    selectedBlocks.forEach((block) => {
      block.classList.remove("selected");
      block.textContent = ""; // Clear the block text
    });
    selectedBlocks = [];
    selectedComputer = null;
  }

  function addPopup(text1, text2){
    const modal = document.createElement("div");
    modal.id = "myModal";
    modal.classList.add("modal", "fade");

    // Create modal dialog
    const modalDialog = document.createElement("div");
    modalDialog.classList.add("modal-dialog", "modal-confirm");

    // Create modal content
    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

    // Create modal header
    const modalHeader = document.createElement("div");
    modalHeader.classList.add("modal-header");

    // Create icon box
    const iconBox = document.createElement("div");
    iconBox.classList.add("icon-box", "over-all");

    // Create icon (material-icons)
    const icon = document.createElement("i");
    icon.classList.add("material-icons");
    icon.innerHTML = "&#xE000;"; // Close icon

    // Append icon to icon box
    iconBox.appendChild(icon);

    // Create modal title
    const modalTitle = document.createElement("h4");
    modalTitle.classList.add("modal-title", "w-100");
    modalTitle.textContent = text1;

    // Append icon box and modal title to modal header
    modalHeader.appendChild(iconBox);
    modalHeader.appendChild(modalTitle);

    // Create modal body
    const modalBody = document.createElement("div");
    modalBody.classList.add("modal-body");

    // Create modal body text
    const modalBodyText = document.createElement("p");
    modalBodyText.classList.add("text-center");
    modalBodyText.textContent = text2;

    // Append modal body text to modal body
    modalBody.appendChild(modalBodyText);

    // Create modal footer
    const modalFooter = document.createElement("div");
    modalFooter.classList.add("modal-footer");

    // Create OK button
    const okButton = document.createElement("button");
    okButton.classList.add("btn", "btn-danger", "btn-block");
    okButton.id = "close-but";
    okButton.setAttribute("data-dismiss", "modal");
    okButton.textContent = "OK";

    // Append OK button to modal footer
    modalFooter.appendChild(okButton);

    // Append header, body, and footer to modal content
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);

    // Append modal content to modal dialog
    modalDialog.appendChild(modalContent);

    // Append modal dialog to modal
    modal.appendChild(modalDialog);

    // Append modal to the body of the document
    document.body.appendChild(modal);
    $("#myModal").modal("show");
    document.getElementById("close-but").addEventListener("click", () => {
      location.reload();
    });
  }

  // Handle booking
  document.getElementById("bookButton").addEventListener("click", async () => {
    const dateKey = formatDate(currentDate);
    if (selectedBlocks.length === 0) {
      alert("No blocks selected for booking!");
    } else {
      const timesForDate = selectedTimes[dateKey] || [];
      const sortedTimes = timesForDate.sort((a, b) => compareTimes(a, b));
      let startTime = sortedTimes[0];
      let endTime = sortedTimes[sortedTimes.length - 1];
      let stringDate = document.getElementById("currentDate").innerText;
      let userId = localStorage.getItem("userId");
      const response = await fetch("https://unswvrlabbookings.onrender.com/api/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          selectedComputer,
          stringDate,
          startTime,
          endTime,
        }),
      });

      const result = await response.json();
      selectedTimes = {};

      if (result.error) {
        addPopup("Uh Oh!",result.error);
      } else {
        addPopup("Great!","Booking Successful!");      
      }
      

    }
  });

  // Function to compare two times in "HH:MM AM/PM" format
  function compareTimes(timeA, timeB) {
    const [hoursA, minutesA] = parseTime(timeA);
    const [hoursB, minutesB] = parseTime(timeB);

    // Compare hours first, then minutes
    if (hoursA !== hoursB) {
      return hoursA - hoursB;
    }
    return minutesA - minutesB;
  }

  // Helper function to parse time in "HH:MM AM/PM" format
  function parseTime(time) {
    const [timePart, period] = time.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);

    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return [hours, minutes];
  }

  document
    .getElementById("logoutButton")
    .addEventListener("click", function () {
      localStorage.removeItem("userId"); // Remove the userId from localStorage
      location.reload(); // Reload the page
    });
});
