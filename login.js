const container = document.getElementById("container");
const registerBtn = document.getElementById("register");

const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
    container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
    container.classList.remove("active");
});


function addPopup(text){
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
    icon.innerHTML = "&#xE5C9;"; // Close icon

    // Append icon to icon box
    iconBox.appendChild(icon);

    // Create modal title
    const modalTitle = document.createElement("h4");
    modalTitle.classList.add("modal-title", "w-100");
    modalTitle.textContent = "Uh Oh!";

    // Append icon box and modal title to modal header
    modalHeader.appendChild(iconBox);
    modalHeader.appendChild(modalTitle);

    // Create modal body
    const modalBody = document.createElement("div");
    modalBody.classList.add("modal-body");

    // Create modal body text
    const modalBodyText = document.createElement("p");
    modalBodyText.classList.add("text-center");
    modalBodyText.innerHTML  = text;

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
        $("#myModal").modal("dispose"); // Dispose of the modal instance
        $("#myModal").remove(); // Remove the modal element from the DOM
    });
}


const registerSubmit = document.getElementById("registerSubmit");
const loginSubmit = document.getElementById("loginSubmit");

const apiUrl = "https://unswvrlabbookings.onrender.com/api"; // Your backend API URL

// 1. Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 2. Check if the text starts with 'z' followed by 7 digits
function isValidZPattern(input) {
    const zPatternRegex = /^z\d{7}$/;
    return zPatternRegex.test(input);
}

// 3. Secure password validation
function isValidPassword(password) {
    // At least 8 characters, one uppercase, one lowercase, one digit, and one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return passwordRegex.test(password);
}

function isValidName(name) {
    return name.length>3;
}

// Handle user registration
registerSubmit.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("registerEmail").value;

    const zid = document.getElementById("registerZid").value;
    const fullName = document.getElementById("registerFullName").value;
    const password = document.getElementById("registerPassword").value;
    console.log(document.getElementById("registerPassword").value);
    
    if (document.getElementById("registerPassword").value!=document.getElementById("registerConfirmPassword").value) {
        addPopup("Password Doesn't Match!");
        return;
    }
    console.log(!isValidEmail(email) , !isValidZPattern(zid) , !isValidName(fullName));
    
    if (!isValidEmail(email) || !isValidZPattern(zid) || !isValidName(fullName)) {
        addPopup("Invalid Email or zID");
        return;
    }

    if (!isValidPassword(password)) {
        addPopup("Create a strong password with <b>at least 8 characters</b>, including <b>one uppercase letter</b>, <b>one lowercase letter</b>, <b>one number</b>, and <b>one special character</b>.");
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, zid, fullName, password }),
        });

        const data = await response.json();
        if (response.ok) {
            location.reload();
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        console.error("Error during registration:", error);
    }
});

// Handle user login
loginSubmit.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`${apiUrl}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("userId", data.userId);
            localStorage.setItem("email", email);

            // Optional: Redirect user to a dashboard or another page
            window.location.href = "./index.html"; 
        } else {
            addPopup("Enter Valid Credentials")
        }
    } catch (error) {
        console.error("Error during login:", error);
    }
});
