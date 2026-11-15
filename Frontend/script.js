

const API_BASE_URL = "http://127.0.0.1:8000";


const pdfInput = document.getElementById("pdf-input");
const dropZone = document.getElementById("drop-zone");

const fileDetails = document.getElementById("file-details");
const fileName = document.getElementById("file-name");
const fileSize = document.getElementById("file-size");

const analyzeButton = document.getElementById("analyze-button");
const removeButton = document.getElementById("remove-file");
const clearButton = document.getElementById("clear-button");

const processingArea = document.getElementById("processing-area");
const processingTitle = document.getElementById("processing-title");
const processingMessage = document.getElementById("processing-message");

const uploadMessage = document.getElementById("upload-message");

const summaryOutput = document.getElementById("summary-output");
const keyPointsOutput = document.getElementById("key-points-output");
const detailedNotesOutput = document.getElementById("detailed-notes-output");

const copyButton = document.getElementById("copy-button");

const questionForm = document.getElementById("question-form");
const questionInput = document.getElementById("question-input");
const askButton = document.getElementById("ask-button");
const chatMessages = document.getElementById("chat-messages");




let selectedFile = null;
let documentId = null;
let isProcessing = false;



const MAX_FILE_SIZE = 15 * 1024 * 1024;



function formatFileSize(bytes) {

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


function showMessage(message, type = "") {

    uploadMessage.textContent = message;
    uploadMessage.className = "message " + type;

}


function setProcessing(active, title = "", message = "") {

    isProcessing = active;

    processingArea.classList.toggle("hidden", !active);

    processingTitle.textContent = title;
    processingMessage.textContent = message;

    analyzeButton.disabled = active || !selectedFile;

    removeButton.disabled = active;
    clearButton.disabled = active;

    if (active) {
        document.getElementById("upload").setAttribute(
            "aria-busy", "true"
        );
    } else {
        document.getElementById("upload").removeAttribute(
            "aria-busy"
        );
    }
}



function clearGeneratedNotes() {

    summaryOutput.textContent =
        "Your document summary will appear here after analysis.";

    keyPointsOutput.replaceChildren();

    const placeholder = document.createElement("li");
    placeholder.className = "output-placeholder";
    placeholder.textContent =
        "Important concepts will appear here.";

    keyPointsOutput.appendChild(placeholder);

    detailedNotesOutput.textContent =
        "Your structured study notes will appear here.";

    detailedNotesOutput.classList.add("output-placeholder");

    copyButton.disabled = true;

    document.getElementById("notes-count").textContent = "0";

}



function handleFile(file) {

    if (isProcessing) return;

    showMessage("");

    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();

    if (extension !== "pdf") {

        selectedFile = null;
        pdfInput.value = "";

        fileDetails.classList.add("hidden");
        analyzeButton.disabled = true;

        showMessage("Invalid file. Please select a PDF.", "error");

        return;
    }


    if (file.type && file.type !== "application/pdf") {

        selectedFile = null;
        pdfInput.value = "";

        fileDetails.classList.add("hidden");
        analyzeButton.disabled = true;

        showMessage("The selected file is not a valid PDF.", "error");

        return;
    }


    if (file.size === 0) {

        selectedFile = null;
        pdfInput.value = "";

        fileDetails.classList.add("hidden");
        analyzeButton.disabled = true;

        showMessage("The selected file is empty.", "error");

        return;
    }


    if (file.size > MAX_FILE_SIZE) {

        selectedFile = null;
        pdfInput.value = "";

        fileDetails.classList.add("hidden");
        analyzeButton.disabled = true;

        showMessage("File exceeds the 15 MB size limit.", "error");

        return;
    }


    selectedFile = file;


    documentId = null;

    clearGeneratedNotes();
    chatMessages.replaceChildren();

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    fileDetails.classList.remove("hidden");

    analyzeButton.disabled = false;

    document.getElementById("document-count").textContent = "1";

    document.querySelector(".status-text").textContent = "Selected";

    showMessage("PDF selected successfully.", "success");

}



pdfInput.addEventListener("change", function () {

    handleFile(this.files[0]);

});


dropZone.addEventListener("dragover", function (event) {

    event.preventDefault();

    dropZone.classList.add("drag-over");

});


dropZone.addEventListener("dragleave", function () {

    dropZone.classList.remove("drag-over");

});


dropZone.addEventListener("drop", function (event) {

    event.preventDefault();

    dropZone.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];

    handleFile(file);

});



function removeSelectedFile() {

    if (isProcessing) return;

    selectedFile = null;
    documentId = null;

    pdfInput.value = "";

    fileDetails.classList.add("hidden");

    analyzeButton.disabled = true;

    document.getElementById("document-count").textContent = "0";

    document.querySelector(".status-text").textContent = "Ready";

    clearGeneratedNotes();

    chatMessages.replaceChildren();

    showMessage("Document removed.");

}


removeButton.addEventListener("click", removeSelectedFile);

clearButton.addEventListener("click", removeSelectedFile);



analyzeButton.addEventListener("click", async function () {

    if (!selectedFile || isProcessing) {

        showMessage("Please select a PDF first.", "error");

        return;
    }


    const formData = new FormData();

    formData.append("file", selectedFile);


    setProcessing(
        true,
        "Analyzing your document...",
        "Uploading PDF and waiting for the AI response."
    );

    document.querySelector(".status-text").textContent = "Processing";


    try {

        const response = await fetch(
            `${API_BASE_URL}/analyze`,
            {
                method: "POST",
                body: formData
            }
        );


        if (!response.ok) {

            const errorData = await response.json().catch(() => ({}));

            throw new Error(
                errorData.detail || "Document analysis failed."
            );

        }


        const data = await response.json();



        if (
            typeof data.summary !== "string" ||
            !Array.isArray(data.key_points) ||
            typeof data.notes !== "string" ||
            !data.document_id
        ) {

            throw new Error(
                "The server returned an unexpected response format."
            );

        }


        documentId = data.document_id;


        summaryOutput.textContent = data.summary;

        summaryOutput.classList.remove("output-placeholder");


        keyPointsOutput.replaceChildren();

        data.key_points.forEach(function (point) {

            const li = document.createElement("li");

            li.textContent = point;

            keyPointsOutput.appendChild(li);

        });


        detailedNotesOutput.textContent = data.notes;

        detailedNotesOutput.classList.remove("output-placeholder");


        document.getElementById("notes-count").textContent = "1";

        document.querySelector(".status-text").textContent = "Complete";


        copyButton.disabled = false;


        showMessage(
            "Your document has been analyzed successfully!",
            "success"
        );


        chatMessages.replaceChildren();


        document.getElementById("notes").scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error("Analysis error:", error);

        document.querySelector(".status-text").textContent = "Error";

        if (error instanceof TypeError) {

            showMessage(
                "Backend is not connected yet. Start the FastAPI server when ready.",
                "error"
            );

        } else {

            showMessage(error.message, "error");

        }


    } finally {

        setProcessing(false);

    }

});


copyButton.addEventListener("click", async function () {

    if (!documentId) return;


    const textToCopy =

        "IMPORTANT NOTES - GENERATED STUDY NOTES\n\n" +

        "DOCUMENT OVERVIEW\n" +

        summaryOutput.textContent +

        "\n\nKEY CONCEPTS\n" +

        Array.from(keyPointsOutput.children)

            .map(item => "- " + item.textContent)

            .join("\n") +

        "\n\nDETAILED STUDY NOTES\n" +

        detailedNotesOutput.textContent;


    try {

        await navigator.clipboard.writeText(textToCopy);

        const originalText = copyButton.textContent;

        copyButton.textContent = "✓ Copied!";

        setTimeout(() => {

            copyButton.textContent = originalText;

        }, 1800);


    } catch (error) {

        console.error("Copy error:", error);

        showMessage(
            "Could not copy notes. Try opening Important Notes through Live Server.",
            "error"
        );

    }

});


function addChatMessage(message, sender) {

    const messageElement = document.createElement("div");

    messageElement.className = "chat-message " + sender;

    if (typeof message === "string") {
        messageElement.textContent = message;
    } else {
        messageElement.textContent = JSON.stringify(message, null, 2);
    }

    chatMessages.appendChild(messageElement);

    chatMessages.scrollTop = chatMessages.scrollHeight;

}


questionForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const question = questionInput.value.trim();

    if (!question) return;

    if (!documentId) {
        addChatMessage(
            "Please upload and analyze a document before asking questions.",
            "assistant"
        );
        return;
    }

    if (askButton.disabled) return;

    addChatMessage(question, "user");

    questionInput.value = "";

    askButton.disabled = true;
    questionInput.disabled = true;


    const loadingMessage = document.createElement("div");
    loadingMessage.className = "chat-message assistant loading-message";
    loadingMessage.innerHTML = `
        <span class="loading-dots">
            Important Notes is searching your document
            <span>.</span><span>.</span><span>.</span>
        </span>
    `;

    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {

        const response = await fetch(
            `${API_BASE_URL}/ask`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    document_id: documentId,
                    question: question
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.detail || "Unable to answer the question."
            );
        }

        const data = await response.json();
        console.log("FULL BACKEND RESPONSE:", data);
        console.log("ANSWER VALUE:", data.answer);
        console.log("ANSWER TYPE:", typeof data.answer);

        if (typeof data.answer !== "string") {
            throw new Error("Invalid answer received from the server.");
        }

        loadingMessage.remove();

        addChatMessage(data.answer, "assistant");

    } catch (error) {

        console.error("Q&A error:", error);

        loadingMessage.remove();

        addChatMessage(error.message, "assistant");

    } finally {

        askButton.disabled = false;
        questionInput.disabled = false;
        questionInput.focus();

    }

});


const navLinks = document.querySelectorAll(".nav-link");


navLinks.forEach(function (link) {

    link.addEventListener("click", function () {

        navLinks.forEach(item => {

            item.classList.remove("active");

        });

        this.classList.add("active");

    });

});


clearGeneratedNotes();

document.querySelector(".status-text").textContent = "Ready";

console.log("Important Notes frontend initialized successfully.");


