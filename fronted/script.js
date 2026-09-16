/* =========================================================
   ResumeAI - Frontend JavaScript
   ========================================================= */

const themeButton = document.getElementById("themeButton");

const newChatButton =
    document.getElementById("newChatButton") ||
    document.querySelector(".new-chat-btn");

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");
const chatHistory = document.getElementById("chatHistory");
const sidebarToggle = document.getElementById("sidebarToggle");

const attachButton = document.getElementById("attachButton");
const attachMenu = document.getElementById("attachMenu");
const uploadResumeOption =
    document.getElementById("uploadResumeOption");

const resumeInput = document.getElementById("resumeInput");
const selectedFileContainer =
    document.getElementById("selectedFileContainer");

const jobMatchContainer =
    document.getElementById("jobMatchContainer");

const jobDescriptionInput =
    document.getElementById("jobDescriptionInput");

const analyzeJobButton =
    document.getElementById("analyzeJobButton");

const jobMatchOption =
    document.getElementById("jobMatchOption");

const closeJobMatchButton =
    document.getElementById("closeJobMatchButton");


/* =========================================================
   STATE
   ========================================================= */

let currentConversationId = null;
let selectedResumeFile = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   WELCOME SCREEN
   ========================================================= */

function showWelcome() {

    chatMessages.innerHTML = `
        <div class="welcome">

            <div class="welcome-icon">
                📄
            </div>

            <h1>
                ResumeAI
            </h1>

            <p>
                AI-powered Resume & Job Description Analyzer
                to help you improve your resume, match jobs,
                and become more ATS-friendly.
            </p>

            <div class="welcome-features">

                <div class="welcome-feature">
                    <span>📊</span>
                    <strong>Resume Score</strong>
                    <small>Overall resume evaluation</small>
                </div>

                <div class="welcome-feature">
                    <span>🤖</span>
                    <strong>ATS Analysis</strong>
                    <small>Check ATS compatibility</small>
                </div>

                <div class="welcome-feature">
                    <span>🎯</span>
                    <strong>Job Matching</strong>
                    <small>Compare your resume with a job description</small>
                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   ADD MESSAGE
   ========================================================= */

function addMessage(message, sender) {

    const messageDiv = document.createElement("div");

    messageDiv.classList.add(
        "message",
        sender
    );

    if (
        sender === "assistant" &&
        message.startsWith("[JOB_MATCH_JSON]")
    ) {

        messageDiv.classList.add(
            "job-match-message"
        );

        try {

            const jsonText =
                message
                    .replace("[JOB_MATCH_JSON]", "")
                    .trim();

            const data = JSON.parse(jsonText);

            messageDiv.innerHTML =
                renderJobMatchAnalysis(data);

        } catch (error) {

            console.error(
                "Job Match JSON parsing error:",
                error
            );

            messageDiv.innerHTML =
                marked.parse(message);
        }

    } else if (
        sender === "assistant" &&
        message.startsWith("📄 Resume Analysis")
    ) {

        messageDiv.classList.add(
            "resume-analysis"
        );

        messageDiv.innerHTML =
            marked.parse(message);

    } else if (sender === "assistant") {

        messageDiv.innerHTML =
            marked.parse(message);

    } else {

        messageDiv.textContent = message;
    }

    chatMessages.appendChild(messageDiv);

    scrollToBottom();

    return messageDiv;
}


/* =========================================================
   NEW CHAT
   ========================================================= */

async function startNewChat(event) {

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/conversations/",
            {
                method: "POST"
            }
        );

        if (!response.ok) {
            throw new Error(
                await response.text()
            );
        }

        const conversation =
            await response.json();

        /*
         * IMPORTANT:
         * Store the newly-created conversation ID.
         */
        currentConversationId =
            conversation.id;

        console.log(
            "New conversation:",
            currentConversationId
        );

        chatMessages.innerHTML = "";

        showWelcome();

        messageInput.value = "";

        clearSelectedFile();

        closeAttachMenu();

        closeJobMatch();

        closeChatMenu();

        await loadConversations();

        messageInput.focus();

    } catch (error) {

        console.error(
            "New chat error:",
            error
        );

        alert(
            "Unable to create a new chat. Please make sure the server is running."
        );
    }
}


if (newChatButton) {

    newChatButton.type = "button";

    newChatButton.addEventListener(
        "click",
        startNewChat
    );
}


/* =========================================================
   LOAD ALL CONVERSATIONS
   ========================================================= */

async function loadConversations() {

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/conversations/"
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load conversations"
            );
        }

        const conversations =
            await response.json();

        chatHistory.innerHTML = "";

        const title =
            document.createElement("div");

        title.classList.add(
            "history-title"
        );

        title.textContent =
            "Your Chats";

        chatHistory.appendChild(title);

        conversations.forEach(
            conversation => {

                const chatItem =
                    document.createElement("div");

                chatItem.classList.add(
                    "chat-item"
                );

                const chatTitle =
                    document.createElement("span");

                chatTitle.classList.add(
                    "chat-title"
                );

                chatTitle.textContent =
                    conversation.title;

                const menuButton =
                    document.createElement("button");

                menuButton.type = "button";

                menuButton.classList.add(
                    "chat-menu-button"
                );

                menuButton.textContent = "⋮";

                menuButton.title =
                    "Chat options";

                chatItem.addEventListener(
                    "click",
                    async () => {

                        closeChatMenu();

                        currentConversationId =
                            conversation.id;

                        clearSelectedFile();

                        await loadConversation(
                            conversation.id
                        );
                    }
                );

                menuButton.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();
                        event.stopPropagation();

                        showChatMenu(
                            conversation.id,
                            conversation.title,
                            menuButton
                        );
                    }
                );

                chatItem.appendChild(
                    chatTitle
                );

                chatItem.appendChild(
                    menuButton
                );

                chatHistory.appendChild(
                    chatItem
                );
            }
        );

    } catch (error) {

        console.error(
            "Load chats error:",
            error
        );
    }
}


/* =========================================================
   LOAD ONE CONVERSATION
   ========================================================= */

async function loadConversation(
    conversationId
) {

    try {

        const response = await fetch(
            `http://127.0.0.1:8000/conversations/${conversationId}/messages`
        );

        if (!response.ok) {
            throw new Error(
                "Failed to load messages"
            );
        }

        const messages =
            await response.json();

        currentConversationId =
            conversationId;

        chatMessages.innerHTML = "";

        if (messages.length === 0) {

            showWelcome();

            return;
        }

        messages.forEach(
            message => {

                addMessage(
                    message.content,
                    message.role
                );
            }
        );

        scrollToBottom();

    } catch (error) {

        console.error(
            "Load conversation error:",
            error
        );

        alert(
            "Unable to load this conversation."
        );
    }
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage(event) {

    if (event) {
        event.preventDefault();
    }

    const message =
        messageInput.value.trim();

    const fileToSend =
        selectedResumeFile;

    if (
        message === "" &&
        fileToSend === null
    ) {
        return;
    }

    if (
        currentConversationId === null
    ) {

        alert(
            "Please start or select a chat first."
        );

        return;
    }

    try {

        sendButton.disabled = true;
        attachButton.disabled = true;
        messageInput.disabled = true;

        if (message !== "") {

            addMessage(
                message,
                "user"
            );

        } else if (fileToSend) {

            addMessage(
                `📄 ${fileToSend.name}`,
                "user"
            );
        }

        messageInput.value = "";


        /* =================================================
           RESUME ANALYSIS
           ================================================= */

        if (fileToSend !== null) {

            const formData =
                new FormData();

            formData.append(
                "file",
                fileToSend
            );

            formData.append(
                "message",
                message
            );

            const response =
                await fetch(
                    `http://127.0.0.1:8000/resume/analyze/${currentConversationId}`,
                    {
                        method: "POST",
                        body: formData
                    }
                );

            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "Resume API error:",
                    errorText
                );

                throw new Error(
                    "Resume analysis failed"
                );
            }

            const reader =
                response.body.getReader();

            const decoder =
                new TextDecoder();

            let fullAnalysis = "";

            const assistantDiv =
                addMessage(
                    "📄 Resume Analysis\n\n",
                    "assistant"
                );

            while (true) {

                const {
                    value,
                    done
                } = await reader.read();

                if (done) {
                    break;
                }

                fullAnalysis +=
                    decoder.decode(
                        value,
                        {
                            stream: true
                        }
                    );

                assistantDiv.innerHTML =
                    marked.parse(
                        "📄 Resume Analysis\n\n" +
                        fullAnalysis
                    );

                scrollToBottom();
            }

            clearSelectedFile();

            await loadConversations();

            return;
        }


        /* =================================================
           NORMAL AI CHAT
           ================================================= */

        const assistantDiv =
            addMessage(
                "",
                "assistant"
            );

        const response =
            await fetch(
                `http://127.0.0.1:8000/conversations/${currentConversationId}/chat/stream`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        role: "user",
                        content: message
                    })
                }
            );

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Chat API error:",
                errorText
            );

            throw new Error(
                "AI response failed"
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let fullResponse = "";

        while (true) {

            const {
                value,
                done
            } = await reader.read();

            if (done) {
                break;
            }

            fullResponse +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );

            assistantDiv.innerHTML =
                marked.parse(
                    fullResponse
                );

            scrollToBottom();
        }

        await loadConversations();

    } catch (error) {

        console.error(
            "AI error:",
            error
        );

        addMessage(
            "Sorry, something went wrong while processing your request.",
            "assistant"
        );

    } finally {

        sendButton.disabled = false;
        attachButton.disabled = false;
        messageInput.disabled = false;

        messageInput.focus();
    }
}


/* =========================================================
   SEND BUTTON
   ========================================================= */

if (sendButton) {

    sendButton.type = "button";

    sendButton.addEventListener(
        "click",
        sendMessage
    );
}


/* =========================================================
   ENTER TO SEND
   ========================================================= */

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage(event);
            }
        }
    );
}


/* =========================================================
   THEME
   ========================================================= */

function setTheme(theme) {

    if (theme === "dark") {

        document.body.classList.add(
            "dark"
        );

        themeButton.textContent =
            "☀️";

    } else {

        document.body.classList.remove(
            "dark"
        );

        themeButton.textContent =
            "🌙";
    }
}


const savedTheme =
    localStorage.getItem("theme");

setTheme(
    savedTheme || "dark"
);


if (themeButton) {

    themeButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            const isDark =
                document.body.classList.contains(
                    "dark"
                );

            const newTheme =
                isDark
                    ? "light"
                    : "dark";

            setTheme(newTheme);

            localStorage.setItem(
                "theme",
                newTheme
            );
        }
    );
}


/* =========================================================
   CHAT MENU
   ========================================================= */

function closeChatMenu() {

    document
        .querySelectorAll(".chat-menu")
        .forEach(menu => {
            menu.remove();
        });
}


function showChatMenu(
    conversationId,
    currentTitle,
    button
) {

    closeChatMenu();

    const menu =
        document.createElement("div");

    menu.classList.add(
        "chat-menu"
    );


    /* RENAME */

    const renameButton =
        document.createElement("button");

    renameButton.type = "button";

    renameButton.textContent =
        "✏️ Rename";

    renameButton.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            menu.remove();

            showRenamePopup(
                conversationId,
                currentTitle
            );
        }
    );


    /* DELETE */

    const deleteButton =
        document.createElement("button");

    deleteButton.type = "button";

    deleteButton.textContent =
        "🗑️ Delete";

    deleteButton.addEventListener(
        "click",
        async event => {

            event.preventDefault();
            event.stopPropagation();

            const confirmed =
                confirm(
                    "Are you sure you want to delete this chat?"
                );

            if (!confirmed) {
                return;
            }

            try {

                deleteButton.disabled =
                    true;

                const response =
                    await fetch(
                        `http://127.0.0.1:8000/conversations/${conversationId}`,
                        {
                            method: "DELETE"
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        "Delete failed"
                    );
                }

                if (
                    currentConversationId ===
                    conversationId
                ) {

                    currentConversationId =
                        null;

                    chatMessages.innerHTML = "";

                    showWelcome();

                    clearSelectedFile();
                }

                menu.remove();

                await loadConversations();

            } catch (error) {

                console.error(
                    "Delete error:",
                    error
                );

                deleteButton.disabled =
                    false;

                alert(
                    "Unable to delete chat."
                );
            }
        }
    );


    menu.appendChild(
        renameButton
    );

    menu.appendChild(
        deleteButton
    );

    document.body.appendChild(
        menu
    );


    /* POSITION */

    const rect =
        button.getBoundingClientRect();

    const menuWidth = 125;
    const menuHeight = 85;

    let left =
        rect.right -
        menuWidth;

    let top =
        rect.bottom +
        5;

    if (left < 5) {
        left = 5;
    }

    if (
        left +
        menuWidth >
        window.innerWidth -
        5
    ) {

        left =
            window.innerWidth -
            menuWidth -
            5;
    }

    if (
        top +
        menuHeight >
        window.innerHeight -
        5
    ) {

        top =
            rect.top -
            menuHeight -
            5;
    }

    menu.style.left =
        `${left}px`;

    menu.style.top =
        `${top}px`;
}


document.addEventListener(
    "click",
    event => {

        const menu =
            document.querySelector(
                ".chat-menu"
            );

        if (!menu) {
            return;
        }

        if (
            menu.contains(
                event.target
            )
        ) {
            return;
        }

        if (
            event.target.closest(
                ".chat-menu-button"
            )
        ) {
            return;
        }

        closeChatMenu();
    }
);


/* =========================================================
   RENAME CHAT
   ========================================================= */

function showRenamePopup(
    conversationId,
    currentTitle
) {

    document
        .querySelector(
            ".rename-overlay"
        )
        ?.remove();

    const overlay =
        document.createElement("div");

    overlay.classList.add(
        "rename-overlay"
    );

    const popup =
        document.createElement("div");

    popup.classList.add(
        "rename-popup"
    );

    popup.innerHTML = `
        <h3>Rename Chat</h3>

        <input
            type="text"
            id="renameInput"
            placeholder="Enter new chat name"
            maxlength="100"
        >

        <div class="rename-actions">

            <button
                id="renameCancelButton"
                type="button"
            >
                Cancel
            </button>

            <button
                id="renameSaveButton"
                type="button"
            >
                Save
            </button>

        </div>
    `;

    overlay.appendChild(
        popup
    );

    document.body.appendChild(
        overlay
    );

    const input =
        document.getElementById(
            "renameInput"
        );

    const cancelButton =
        document.getElementById(
            "renameCancelButton"
        );

    const saveButton =
        document.getElementById(
            "renameSaveButton"
        );

    input.value =
        currentTitle || "";

    input.focus();

    input.select();


    cancelButton.addEventListener(
        "click",
        () => {
            overlay.remove();
        }
    );


    async function saveRename() {

        const newTitle =
            input.value.trim();

        if (newTitle === "") {
            input.focus();
            return;
        }

        try {

            saveButton.disabled =
                true;

            const response =
                await fetch(
                    `http://127.0.0.1:8000/conversations/${conversationId}?title=${encodeURIComponent(newTitle)}`,
                    {
                        method: "PATCH"
                    }
                );

            if (!response.ok) {
                throw new Error(
                    await response.text()
                );
            }

            overlay.remove();

            await loadConversations();

        } catch (error) {

            console.error(
                "Rename error:",
                error
            );

            saveButton.disabled =
                false;

            alert(
                "Unable to rename chat."
            );
        }
    }


    saveButton.addEventListener(
        "click",
        saveRename
    );


    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                saveRename();
            }

            if (event.key === "Escape") {

                overlay.remove();
            }
        }
    );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                overlay
            ) {

                overlay.remove();
            }
        }
    );
}


/* =========================================================
   ATTACHMENT MENU
   ========================================================= */

function closeAttachMenu() {

    if (!attachMenu) {
        return;
    }

    attachMenu.classList.remove(
        "show"
    );
}


if (attachButton) {

    attachButton.type = "button";

    attachButton.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            attachMenu.classList.toggle(
                "show"
            );
        }
    );
}


if (uploadResumeOption) {

    uploadResumeOption.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            closeAttachMenu();

            resumeInput.click();
        }
    );
}


document.addEventListener(
    "click",
    event => {

        if (
            attachMenu &&
            attachButton &&
            !attachMenu.contains(
                event.target
            ) &&
            !attachButton.contains(
                event.target
            )
        ) {

            closeAttachMenu();
        }
    }
);


/* =========================================================
   RESUME FILE
   ========================================================= */

if (resumeInput) {

    resumeInput.addEventListener(
        "change",
        handleResumeSelection
    );
}


function handleResumeSelection() {

    const file =
        resumeInput.files[0];

    if (!file) {
        return;
    }

    if (
        file.type !==
        "application/pdf"
    ) {

        alert(
            "Only PDF files are allowed."
        );

        resumeInput.value = "";

        return;
    }

    selectedResumeFile =
        file;

    showSelectedFile(file);

    messageInput.focus();
}


function showSelectedFile(file) {

    selectedFileContainer.innerHTML =
        "";

    const fileDiv =
        document.createElement("div");

    fileDiv.classList.add(
        "selected-file"
    );

    const icon =
        document.createElement("div");

    icon.classList.add(
        "selected-file-icon"
    );

    icon.textContent = "📄";


    const info =
        document.createElement("div");

    info.classList.add(
        "selected-file-info"
    );


    const name =
        document.createElement("div");

    name.classList.add(
        "selected-file-name"
    );

    name.textContent =
        file.name;


    const type =
        document.createElement("div");

    type.classList.add(
        "selected-file-type"
    );

    type.textContent =
        "PDF";


    const removeButton =
        document.createElement("button");

    removeButton.type =
        "button";

    removeButton.classList.add(
        "remove-file-button"
    );

    removeButton.title =
        "Remove file";

    removeButton.textContent =
        "×";


    info.appendChild(name);
    info.appendChild(type);

    fileDiv.appendChild(icon);
    fileDiv.appendChild(info);
    fileDiv.appendChild(
        removeButton
    );

    selectedFileContainer.appendChild(
        fileDiv
    );


    removeButton.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            clearSelectedFile();

            messageInput.focus();
        }
    );
}


function clearSelectedFile() {

    selectedResumeFile =
        null;

    if (resumeInput) {
        resumeInput.value = "";
    }

    if (selectedFileContainer) {
        selectedFileContainer.innerHTML =
            "";
    }
}


/* =========================================================
   SIDEBAR
   ========================================================= */

if (sidebarToggle) {

    sidebarToggle.type = "button";

    sidebarToggle.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            document.body.classList.toggle(
                "sidebar-collapsed"
            );
        }
    );
}


/* =========================================================
   JOB MATCHING
   ========================================================= */

function openJobMatch() {

    if (
        selectedResumeFile === null
    ) {

        alert(
            "Please upload your resume first."
        );

        return;
    }

    jobMatchContainer.style.display =
        "block";

    jobDescriptionInput.focus();
}


function closeJobMatch() {

    if (!jobMatchContainer) {
        return;
    }

    jobMatchContainer.style.display =
        "none";

    if (jobDescriptionInput) {
        jobDescriptionInput.value = "";
    }
}


if (jobMatchOption) {

    jobMatchOption.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();

            closeAttachMenu();

            openJobMatch();
        }
    );
}


if (closeJobMatchButton) {

    closeJobMatchButton.type =
        "button";

    closeJobMatchButton.addEventListener(
        "click",
        closeJobMatch
    );
}


/* =========================================================
   JOB MATCH RESULT
   ========================================================= */

function renderSkillList(skills) {

    if (
        !skills ||
        skills.length === 0
    ) {

        return `
            <p class="job-match-empty">
                No matching skills identified.
            </p>
        `;
    }

    return `
        <ul>
            ${skills.map(skill => `
                <li>
                    <strong>
                        ${escapeHtml(
                            skill.name || ""
                        )}
                    </strong>

                    ${
                        skill.reason
                            ? `
                                <span>
                                    — ${escapeHtml(
                                        skill.reason
                                    )}
                                </span>
                              `
                            : ""
                    }
                </li>
            `).join("")}
        </ul>
    `;
}


function renderMissingSkills(skills) {

    if (
        !skills ||
        skills.length === 0
    ) {

        return `
            <p class="job-match-empty">
                No major missing skills identified.
            </p>
        `;
    }

    return `
        <ul>
            ${skills.map(skill => `
                <li>

                    <strong>
                        ${escapeHtml(
                            skill.name || ""
                        )}
                    </strong>

                    <br>

                    <small>
                        ${escapeHtml(
                            skill.why_it_matters || ""
                        )}
                    </small>

                    <br>

                    <strong>
                        Priority:
                    </strong>

                    ${escapeHtml(
                        skill.priority || ""
                    )}

                </li>
            `).join("")}
        </ul>
    `;
}


function renderSimpleList(items) {

    if (
        !items ||
        items.length === 0
    ) {

        return `
            <p class="job-match-empty">
                Nothing specific identified.
            </p>
        `;
    }

    return `
        <ul>
            ${items.map(
                item => `
                    <li>
                        ${escapeHtml(item)}
                    </li>
                `
            ).join("")}
        </ul>
    `;
}


function renderQualificationGaps(gaps) {

    if (
        !gaps ||
        gaps.length === 0
    ) {

        return `
            <p class="job-match-empty">
                No significant qualification gaps identified.
            </p>
        `;
    }

    return `
        <table>

            <thead>
                <tr>
                    <th>Aspect</th>
                    <th>Job Requirement</th>
                    <th>Resume Status</th>
                    <th>Gap</th>
                </tr>
            </thead>

            <tbody>

                ${gaps.map(
                    gap => `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    gap.aspect || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    gap.job_requirement || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    gap.resume_status || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    gap.gap || ""
                                )}
                            </td>

                        </tr>
                    `
                ).join("")}

            </tbody>

        </table>
    `;
}


function renderATSAnalysis(ats) {

    return `

        <h4>
            ✅ Important Keywords Present
        </h4>

        ${renderSimpleList(
            ats.important_keywords_present
        )}

        <h4>
            ⚠️ Important Keywords Missing
        </h4>

        ${renderSimpleList(
            ats.important_keywords_missing
        )}

        <h4>
            💡 Keywords That Could Be Added
        </h4>

        ${renderSimpleList(
            ats.keywords_that_could_be_added
        )}

        <h4>
            🛠️ Recommendations
        </h4>

        ${renderSimpleList(
            ats.recommendations
        )}
    `;
}


function renderTailoringSuggestions(
    suggestions
) {

    return `

        <h4>
            Summary / Profile
        </h4>

        ${renderSimpleList(
            suggestions.summary_profile
        )}

        <h4>
            Skills Section
        </h4>

        ${renderSimpleList(
            suggestions.skills_section
        )}

        <h4>
            Experience
        </h4>

        ${renderSimpleList(
            suggestions.experience
        )}

        <h4>
            Projects
        </h4>

        ${renderSimpleList(
            suggestions.projects
        )}

        <h4>
            Keywords
        </h4>

        ${renderSimpleList(
            suggestions.keywords
        )}
    `;
}


function renderActionPlan(items) {

    if (
        !items ||
        items.length === 0
    ) {

        return `
            <p class="job-match-empty">
                No action plan available.
            </p>
        `;
    }

    return `
        <ol>
            ${items.map(
                item => `
                    <li>
                        ${escapeHtml(item)}
                    </li>
                `
            ).join("")}
        </ol>
    `;
}


function renderJobMatchAnalysis(data) {

    const score =
        Number(data.score || 0);

    const classification =
        data.classification ||
        "Analysis";

    let scoreClass =
        "score-low";

    if (score >= 75) {
        scoreClass =
            "score-strong";
    } else if (score >= 50) {
        scoreClass =
            "score-moderate";
    }

    const breakdown =
        data.breakdown || {};

    const technicalSkills =
        data.matched_technical_skills || [];

    const softSkills =
        data.matched_soft_skills || [];

    const missingSkills =
        data.missing_skills || [];

    const qualificationGaps =
        data.qualification_gaps || [];

    const ats =
        data.ats_analysis || {};

    const tailoring =
        data.tailoring_suggestions || {};

    const actionPlan =
        data.action_plan || [];

    return `

        <div class="job-match-result">

            <div class="job-match-header">

                <div class="job-match-eyebrow">
                    🎯 JOB MATCH ANALYSIS
                </div>

                <h2>
                    Resume vs Job Description
                </h2>

                <p>
                    AI-powered compatibility analysis
                </p>

            </div>


            <div class="job-match-score-card">

                <div class="
                    job-match-score-circle
                    ${scoreClass}
                ">

                    <span>
                        ${score}/100
                    </span>

                </div>

                <div class="job-match-score-info">

                    <span class="job-match-label">
                        Overall Match
                    </span>

                    <strong>
                        ${escapeHtml(
                            classification
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            data.explanation || ""
                        )}
                    </small>

                </div>

            </div>


            <div class="job-match-section">

                <div class="job-match-section-title">
                    📊 Match Breakdown
                </div>

                <table>

                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Score</th>
                        </tr>
                    </thead>

                    <tbody>

                        <tr>
                            <td>Technical Skills</td>
                            <td>
                                ${breakdown.technical_skills ?? 0}/100
                            </td>
                        </tr>

                        <tr>
                            <td>Experience</td>
                            <td>
                                ${breakdown.experience ?? 0}/100
                            </td>
                        </tr>

                        <tr>
                            <td>Education / Qualifications</td>
                            <td>
                                ${breakdown.education_qualifications ?? 0}/100
                            </td>
                        </tr>

                        <tr>
                            <td>Projects</td>
                            <td>
                                ${breakdown.projects ?? 0}/100
                            </td>
                        </tr>

                        <tr>
                            <td>Keywords</td>
                            <td>
                                ${breakdown.keywords ?? 0}/100
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <strong>
                                    Overall Match
                                </strong>
                            </td>

                            <td>
                                <strong>
                                    ${breakdown.overall_match ?? score}/100
                                </strong>
                            </td>
                        </tr>

                    </tbody>

                </table>

            </div>


            <div class="job-match-grid">

                <div class="job-match-card">

                    <div class="job-match-card-title">
                        ✅ Matched Skills
                    </div>

                    <div class="job-match-card-content">

                        <h4>
                            💻 Technical Skills
                        </h4>

                        ${renderSkillList(
                            technicalSkills
                        )}

                        <h4>
                            🤝 Soft Skills
                        </h4>

                        ${renderSkillList(
                            softSkills
                        )}

                    </div>

                </div>


                <div class="job-match-card">

                    <div class="job-match-card-title">
                        ⚠️ Missing Skills & Keywords
                    </div>

                    <div class="job-match-card-content">

                        ${renderMissingSkills(
                            missingSkills
                        )}

                    </div>

                </div>

            </div>


            <div class="job-match-section">

                <div class="job-match-section-title">
                    📋 Experience & Qualification Gap
                </div>

                ${renderQualificationGaps(
                    qualificationGaps
                )}

            </div>


            <div class="job-match-section">

                <div class="job-match-section-title">
                    🔑 ATS Keyword Analysis
                </div>

                ${renderATSAnalysis(ats)}

            </div>


            <div class="job-match-section">

                <div class="job-match-section-title">
                    📝 Resume Tailoring Suggestions
                </div>

                ${renderTailoringSuggestions(
                    tailoring
                )}

            </div>


            <div class="job-match-action-card">

                <div class="job-match-section-title">
                    🚀 Final Action Plan
                </div>

                ${renderActionPlan(
                    actionPlan
                )}

            </div>


            <div class="job-match-section">

                <div class="job-match-section-title">
                    🎯 Final Assessment
                </div>

                <p>
                    ${escapeHtml(
                        data.final_assessment || ""
                    )}
                </p>

            </div>

        </div>
    `;
}


/* =========================================================
   JOB MATCH BUTTON
   ========================================================= */

if (analyzeJobButton) {

    analyzeJobButton.type = "button";

    analyzeJobButton.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            const jobDescription =
                jobDescriptionInput.value.trim();

            if (
                selectedResumeFile === null
            ) {

                alert(
                    "Please upload your resume first."
                );

                return;
            }

            if (
                jobDescription === ""
            ) {

                alert(
                    "Please paste the job description."
                );

                jobDescriptionInput.focus();

                return;
            }

            if (
                currentConversationId === null
            ) {

                alert(
                    "Please start or select a chat first."
                );

                return;
            }

            try {

                analyzeJobButton.disabled =
                    true;

                analyzeJobButton.textContent =
                    "⏳ Analyzing...";

                sendButton.disabled =
                    true;

                attachButton.disabled =
                    true;


                const formData =
                    new FormData();

                formData.append(
                    "file",
                    selectedResumeFile
                );

                formData.append(
                    "job_description",
                    jobDescription
                );


                const response =
                    await fetch(
                        `http://127.0.0.1:8000/job-matching/analyze/${currentConversationId}`,
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                if (!response.ok) {

                    const errorText =
                        await response.text();

                    console.error(
                        "Job matching API error:",
                        errorText
                    );

                    throw new Error(
                        "Job matching failed"
                    );
                }


                const result =
                    await response.json();


                if (!result.success) {

                    throw new Error(
                        "Job matching failed"
                    );
                }


                const messageDiv =
                    document.createElement("div");

                messageDiv.classList.add(
                    "message",
                    "assistant",
                    "job-match-message"
                );

                messageDiv.innerHTML =
                    renderJobMatchAnalysis(
                        result.analysis
                    );

                chatMessages.appendChild(
                    messageDiv
                );

                scrollToBottom();

                closeJobMatch();

                clearSelectedFile();

                await loadConversations();

            } catch (error) {

                console.error(
                    "Job matching error:",
                    error
                );

                addMessage(
                    "Sorry, I couldn't analyze the resume against the job description. Please try again.",
                    "assistant"
                );

            } finally {

                analyzeJobButton.disabled =
                    false;

                analyzeJobButton.textContent =
                    "🎯 Analyze Job Match";

                sendButton.disabled =
                    false;

                attachButton.disabled =
                    false;
            }
        }
    );
}


/* =========================================================
   PREVENT FORM PAGE RELOAD
   ========================================================= */

document.addEventListener(
    "submit",
    event => {
        event.preventDefault();
    }
);


/* =========================================================
   START APPLICATION
   ========================================================= */

loadConversations();