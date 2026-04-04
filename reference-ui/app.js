const body = document.body;
const previewImage = document.getElementById("preview-image");
const titleInput = document.getElementById("field-title");
const captionInput = document.getElementById("field-caption");
const previewTitle = document.getElementById("preview-title");
const previewCaption = document.getElementById("preview-caption");
const uploadInput = document.getElementById("reference-upload");
const advancedToggle = document.getElementById("toggle-advanced");
const advancedPanel = document.getElementById("advanced-panel");
const bgColorInput = document.getElementById("bg-color");
const recommendColorButton = document.getElementById("recommend-color");

document.querySelectorAll("[data-type-target]").forEach((button) => {
    button.addEventListener("click", () => {
        const mode = button.dataset.typeTarget;
        body.dataset.typeMode = mode;

        document.querySelectorAll("[data-type-target]").forEach((item) => {
            item.classList.toggle("is-active", item === button);
        });
    });
});

if (titleInput && previewTitle) {
    titleInput.addEventListener("input", () => {
        previewTitle.textContent = titleInput.value.trim() || "未命名作品";
    });
}

if (captionInput && previewCaption) {
    captionInput.addEventListener("input", () => {
        previewCaption.textContent = captionInput.value.trim() || "填写 EXIF 或叙事文本";
    });
}

if (uploadInput && previewImage) {
    uploadInput.addEventListener("change", () => {
        const file = uploadInput.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            window.alert("请选择图片文件");
            uploadInput.value = "";
            return;
        }

        previewImage.src = URL.createObjectURL(file);
        uploadInput.value = "";
    });
}

if (advancedToggle && advancedPanel) {
    advancedToggle.addEventListener("click", () => {
        const expanded = advancedToggle.getAttribute("aria-expanded") === "true";
        advancedToggle.setAttribute("aria-expanded", String(!expanded));
        advancedPanel.hidden = expanded;
    });
}

if (bgColorInput) {
    bgColorInput.addEventListener("input", () => {
        applyMoodColor(bgColorInput.value);
    });
}

if (recommendColorButton) {
    recommendColorButton.addEventListener("click", () => {
        const swatches = ["#f7f3ee", "#f1ebe3", "#fbf8f3", "#efe6dc"];
        const nextColor = swatches[Math.floor(Math.random() * swatches.length)];

        applyMoodColor(nextColor);
        if (bgColorInput) {
            bgColorInput.value = toHex(nextColor);
        }
    });
}

if (previewImage) {
    previewImage.addEventListener("load", () => {
        tryRecommendColorFromImage();
    });
}

function tryRecommendColorFromImage() {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    const width = 24;
    const height = 24;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(previewImage, 0, 0, width, height);

    const { data } = context.getImageData(0, 0, width, height);
    let red = 0;
    let green = 0;
    let blue = 0;

    for (let index = 0; index < data.length; index += 4) {
        red += data[index];
        green += data[index + 1];
        blue += data[index + 2];
    }

    const pixels = data.length / 4;
    const rgb = [
        Math.round(red / pixels),
        Math.round(green / pixels),
        Math.round(blue / pixels),
    ];

    const mixed = rgb.map((value) => Math.round(value * 0.18 + 255 * 0.82));
    const suggested = rgbToHex(mixed[0], mixed[1], mixed[2]);
    applyMoodColor(suggested);
    bgColorInput.value = suggested;
}

function applyMoodColor(color) {
    body.style.setProperty("--bg", color);
    body.style.setProperty("--surface-strong", color);
}

function rgbToHex(red, green, blue) {
    return `#${[red, green, blue]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")}`;
}

function toHex(color) {
    if (color.startsWith("#")) return color;
    return "#f5f3ef";
}
